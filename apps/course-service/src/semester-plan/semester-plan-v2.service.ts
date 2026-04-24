import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PERIODS_PER_SESSION = 3;
const DEFAULT_SESSIONS_PER_WEEK = 1;
const DEFAULT_TEACHING_WEEKS = 15;
const CLASS_SHIFTS = [1, 4, 7, 10, 13];

@Injectable()
export class SemesterPlanService {
  private readonly logger = new Logger(SemesterPlanService.name);
  private readonly trainingPlanMigrationHint =
    'CSDL chưa áp migration cho module kế hoạch đào tạo. Hãy chạy script packages/database/prisma/training-plan-module-migration.sql rồi khởi động lại service.';

  constructor(private readonly prisma: PrismaService) {}

  private get prismaCompat(): any {
    return this.prisma as any;
  }

  private positive(value: any, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  private numericOrNull(value: any) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private toDateOnly(input: Date | string) {
    const d = new Date(input);
    if (isNaN(d.getTime())) return new Date();
    return new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
  }

  private addDays(input: Date, days: number) {
    const date = new Date(input);
    date.setUTCDate(date.getUTCDate() + days);
    return this.toDateOnly(date);
  }

  private sameDay(a: Date | string, b: Date | string) {
    const left = this.toDateOnly(a);
    const right = this.toDateOnly(b);
    return (
      left.getUTCFullYear() === right.getUTCFullYear() &&
      left.getUTCMonth() === right.getUTCMonth() &&
      left.getUTCDate() === right.getUTCDate()
    );
  }

  private overlaps(startA: number, endA: number, startB: number, endB: number) {
    return startA <= endB && startB <= endA;
  }

  private sanitizeCodeSegment(value: string) {
    return (value || '')
      .toString()
      .trim()
      .replace(/[^A-Za-z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();
  }

  private normalizeComparable(value?: string | null) {
    return `${value || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');
  }

  private countTeachingWeeks(startDate?: Date | string | null, endDate?: Date | string | null) {
    if (!startDate || !endDate) {
      return DEFAULT_TEACHING_WEEKS;
    }

    const start = this.toDateOnly(startDate);
    const end = this.toDateOnly(endDate);
    if (end < start) {
      return DEFAULT_TEACHING_WEEKS;
    }

    const diffDays =
      Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    return Math.max(1, Math.ceil(diffDays / 7));
  }

  private isPracticeOrientedSubject(
    subject: any,
    rawTheoryPeriods: number,
    rawPracticePeriods: number,
  ) {
    const normalizedExamType = this.normalizeComparable(subject?.examType);
    const normalizedExamForm = this.normalizeComparable(subject?.examForm);
    const hasPracticeSignal =
      rawPracticePeriods > rawTheoryPeriods ||
      (rawPracticePeriods > 0 && rawTheoryPeriods <= 0) ||
      normalizedExamType.includes('THUCHANH') ||
      normalizedExamForm.includes('THUCHANH') ||
      normalizedExamForm.includes('MAYTINH');

    return hasPracticeSignal;
  }

  private getTargetTotalPeriods(subject: any, input: any = {}) {
    const credits = this.positive(subject?.credits);
    const creditPeriods = credits * 15;

    const explicitTheoryPeriods = this.numericOrNull(input?.theoryPeriods);
    const explicitPracticePeriods = this.numericOrNull(input?.practicePeriods);

    const rawTheoryPeriods =
      explicitTheoryPeriods !== null
        ? Math.max(explicitTheoryPeriods, 0)
        : this.positive(
            subject?.theoryPeriods,
            this.positive(subject?.theoryHours),
          );
    const rawPracticePeriods =
      explicitPracticePeriods !== null
        ? Math.max(explicitPracticePeriods, 0)
        : this.positive(
            subject?.practicePeriods,
            this.positive(subject?.practiceHours),
          );

    const rawTotalPeriods = rawTheoryPeriods + rawPracticePeriods;
    const practiceOriented = this.isPracticeOrientedSubject(
      subject,
      rawTheoryPeriods,
      rawPracticePeriods,
    );

    // UNETI curriculum usually publishes explicit LT/TH(TL) periods per subject.
    // When those values exist, they are more accurate than a generic credits*15 fallback.
    if (rawTotalPeriods > 0) {
      return rawTotalPeriods;
    }

    if (credits > 0) {
      // Legacy subjects without explicit LT/TH should still follow UNETI credit rules.
      // Theory defaults to 15 periods/credit; practice-oriented subjects default
      // to the practical baseline of 30 periods/credit.
      return practiceOriented ? credits * 30 : creditPeriods;
    }

    return Math.max(rawTotalPeriods, 15);
  }

  private normalizePeriodSplit(subject: any, input: any = {}) {
    const targetTotalPeriods = this.getTargetTotalPeriods(subject, input);
    const explicitTheoryPeriods = this.numericOrNull(input?.theoryPeriods);
    const explicitPracticePeriods = this.numericOrNull(input?.practicePeriods);
    const rawTheoryPeriods =
      explicitTheoryPeriods !== null
        ? Math.max(explicitTheoryPeriods, 0)
        : this.positive(
            subject?.theoryPeriods,
            this.positive(subject?.theoryHours),
          );
    const rawPracticePeriods =
      explicitPracticePeriods !== null
        ? Math.max(explicitPracticePeriods, 0)
        : this.positive(
            subject?.practicePeriods,
            this.positive(subject?.practiceHours),
          );
    const rawTotalPeriods = rawTheoryPeriods + rawPracticePeriods;
    const practiceOriented = this.isPracticeOrientedSubject(
      subject,
      rawTheoryPeriods,
      rawPracticePeriods,
    );

    if (rawTheoryPeriods > 0 && rawPracticePeriods > 0) {
      const theoryRatio = rawTheoryPeriods / rawTotalPeriods;
      const theoryPeriods = Math.round(targetTotalPeriods * theoryRatio);
      return {
        theoryPeriods,
        practicePeriods: Math.max(targetTotalPeriods - theoryPeriods, 0),
      };
    }

    if (practiceOriented) {
      return {
        theoryPeriods: 0,
        practicePeriods: targetTotalPeriods,
      };
    }

    return {
      theoryPeriods: targetTotalPeriods,
      practicePeriods: 0,
    };
  }

  private resolveSessionsPerWeek(
    totalPeriods: number,
    configuredSessionsPerWeek: number | null,
    availableWeeks = DEFAULT_TEACHING_WEEKS,
  ) {
    if (totalPeriods <= 0) {
      return 0;
    }

    const configured =
      configuredSessionsPerWeek !== null
        ? Math.max(configuredSessionsPerWeek, 0)
        : 0;

    if (configured) {
      return configured;
    }

    const effectiveWeeks = Math.max(
      Math.min(availableWeeks, DEFAULT_TEACHING_WEEKS),
      1,
    );
    const preferredSessions = [1, 2, 3, 4];

    for (const sessions of preferredSessions) {
      const periodsPerSession = Math.ceil(
        totalPeriods / effectiveWeeks / sessions,
      );
      if (periodsPerSession <= 4) {
        return sessions;
      }
    }

    return DEFAULT_SESSIONS_PER_WEEK;
  }

  private resolvePeriodsPerSession(
    blocks: Array<{ totalPeriods: number; sessionsPerWeek: number }>,
    configuredPeriodsPerSession: number | null,
    availableWeeks: number,
  ) {
    const configured =
      configuredPeriodsPerSession !== null
        ? Math.max(configuredPeriodsPerSession, 0)
        : 0;

    const minimumPeriodsPerSession = blocks.reduce((max, block) => {
      if (block.totalPeriods <= 0 || block.sessionsPerWeek <= 0) {
        return max;
      }

      const requiredPeriods = Math.ceil(
        block.totalPeriods /
          Math.max(availableWeeks, 1) /
          Math.max(block.sessionsPerWeek, 1),
      );

      return Math.max(max, requiredPeriods);
    }, 0);

    return Math.max(configured || 0, minimumPeriodsPerSession || 1, 1);
  }

  private shouldUsePracticeRoom(
    subject: any,
    theoryPeriods: number,
    practicePeriods: number,
  ) {
    if (practicePeriods <= 0) {
      return false;
    }

    if (theoryPeriods <= 0) {
      return true;
    }

    if (practicePeriods > theoryPeriods) {
      return true;
    }

    if (practicePeriods === theoryPeriods) {
      return this.isPracticeOrientedSubject(
        subject,
        theoryPeriods,
        practicePeriods,
      );
    }

    return false;
  }

  private normalizeMajorCode(value?: string | null) {
    const raw = `${value || ''}`
      .trim()
      .toUpperCase()
      .replace(/^M[_-]/, '');
    return this.normalizeComparable(raw);
  }

  private isSplitAdminClassCode(code?: string | null, cohort?: string | null) {
    const normalizedCode = `${code || ''}`.trim().toUpperCase();
    const normalizedCohort = `${cohort || ''}`.trim().toUpperCase();
    if (!normalizedCode || !normalizedCohort) {
      return false;
    }

    return (
      normalizedCode.startsWith(`${normalizedCohort}-`) ||
      normalizedCode.startsWith(`${normalizedCohort}_`)
    );
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private chunkArray<T>(items: T[], size = 50) {
    const chunks: T[][] = [];
    for (let index = 0; index < items.length; index += size) {
      chunks.push(items.slice(index, index + size));
    }
    return chunks;
  }

  private buildCourseClassCode(
    semesterCode: string,
    subjectCode: string,
    adminClassCode: string,
  ) {
    return [
      'CCLASS',
      this.sanitizeCodeSegment(semesterCode),
      this.sanitizeCodeSegment(subjectCode),
      this.sanitizeCodeSegment(adminClassCode),
    ].join('_');
  }

  private parseConceptualSemester(semester: any) {
    const candidates = [semester?.name, semester?.code];
    for (const candidate of candidates) {
      const normalized = `${candidate || ''}`;
      // Look for "HKx - Năm y" pattern which is cohort-relative
      const cohortRelativeMatch = normalized.match(/HK\s*([1-8])\s*-\s*Năm\s*(\d)/i);
      if (cohortRelativeMatch) {
        return Number(cohortRelativeMatch[1]);
      }
    }
    return null;
  }

  private derivePlanStatus(items: any[]) {
    if (!items.length) return 'DRAFT';
    if (items.every((item) => item.status === 'EXECUTED')) return 'EXECUTED';
    if (items.some((item) => item.status === 'NEEDS_REVIEW')) return 'PARTIAL';
    if (items.some((item) => item.status === 'READY')) return 'READY';
    return 'DRAFT';
  }

  private sortTemplates(templates: any[]) {
    return [...templates].sort((a, b) => b.version - a.version);
  }

  private validateTemplateItems(items: any[]) {
    const seen = new Map<string, number>();

    for (const item of items || []) {
      const subjectId = `${item?.subjectId || ''}`.trim();
      const conceptualSemester = this.positive(
        item?.conceptualSemester ?? item?.suggestedSemester,
        1,
      );

      if (!subjectId) {
        throw new BadRequestException(
          'Template có môn học bị thiếu subjectId.',
        );
      }

      if (conceptualSemester < 1 || conceptualSemester > 8) {
        throw new BadRequestException(
          'Học kỳ khái niệm phải nằm trong khoảng từ HK1 đến HK8.',
        );
      }

      if (seen.has(subjectId)) {
        throw new BadRequestException(
          `Một môn chỉ được gán cho một học kỳ. Subject ${subjectId} đang bị lặp ở nhiều học kỳ.`,
        );
      }

      seen.set(subjectId, conceptualSemester);
    }
  }

  private sortExecutionItems(items: any[]) {
    return [...items].sort((left, right) => {
      const subjectCompare = (left.subject?.code || '').localeCompare(
        right.subject?.code || '',
      );
      if (subjectCompare !== 0) return subjectCompare;
      return (left.adminClass?.code || '').localeCompare(
        right.adminClass?.code || '',
      );
    });
  }

  private isTrainingPlanStorageError(error: any) {
    const code = `${error?.code || ''}`;
    const message = `${error?.message || ''}`;
    return (
      code === 'P2021' ||
      code === 'P2022' ||
      /TrainingPlanTemplate|TrainingPlanTemplateItem|SemesterPlanItem|SemesterPlan|AcademicCohort/i.test(
        message,
      ) ||
      /table.*does not exist|column.*does not exist|Invalid object name/i.test(
        message,
      )
    );
  }

  private throwTrainingPlanStorageError(error: any): never {
    this.logger.error(
      `Training plan storage error: ${error?.message || error}`,
      error?.stack,
    );
    throw new BadRequestException(this.trainingPlanMigrationHint);
  }

  private isUniqueConstraintError(error: any, hint?: string) {
    const code = `${error?.code || ''}`;
    const message = `${error?.message || ''}`.toLowerCase();
    if (code !== 'P2002') {
      return false;
    }
    if (!hint) {
      return true;
    }
    return message.includes(hint.toLowerCase());
  }

  private snapshotFromSubject(
    subject: any,
    input: any = {},
    options: { availableWeeks?: number } = {},
  ) {
    const availableWeeks = this.positive(
      options.availableWeeks,
      DEFAULT_TEACHING_WEEKS,
    );
    const { theoryPeriods, practicePeriods } = this.normalizePeriodSplit(
      subject,
      input,
    );
    const theoryConfig = this.numericOrNull(
      input.theorySessionsPerWeek ?? input.sessionsPerWeek,
    );
    const practiceConfig = this.numericOrNull(
      input.practiceSessionsPerWeek ?? input.sessionsPerWeek,
    );
    const theorySessionsPerWeek = this.resolveSessionsPerWeek(
      theoryPeriods,
      theoryConfig,
      availableWeeks,
    );
    const practiceSessionsPerWeek = this.resolveSessionsPerWeek(
      practicePeriods,
      practiceConfig,
      availableWeeks,
    );

    const periodsPerSession = this.resolvePeriodsPerSession(
      [
        {
          totalPeriods: theoryPeriods,
          sessionsPerWeek: theorySessionsPerWeek,
        },
        {
          totalPeriods: practicePeriods,
          sessionsPerWeek: practiceSessionsPerWeek,
        },
      ].filter((block) => block.totalPeriods > 0 && block.sessionsPerWeek > 0),
      this.numericOrNull(input.periodsPerSession),
      availableWeeks,
    );

    // CRITICAL: Capping total periods at the target split to prevent semester-duration inflation
    return {
      theoryPeriods,
      practicePeriods,
      theorySessionsPerWeek,
      practiceSessionsPerWeek,
      periodsPerSession,
    };
  }

  private buildScheduleBlocks(snapshot: any, subject: any, fallback?: any) {
    const normalized = this.snapshotFromSubject(
      subject,
      { ...(fallback || {}), ...(snapshot || {}) },
      { availableWeeks: fallback?.availableWeeks },
    );
    const availableWeeks = this.positive(
      fallback?.availableWeeks,
      DEFAULT_TEACHING_WEEKS,
    );
    const configuredPeriodsPerSession = this.numericOrNull(
      snapshot?.periodsPerSession ?? fallback?.periodsPerSession,
    );
    const usePracticeRoom = this.shouldUsePracticeRoom(
      subject,
      normalized.theoryPeriods,
      normalized.practicePeriods,
    );

    const blocks: Array<{
      type: 'THEORY' | 'PRACTICE';
      roomType: 'THEORY' | 'PRACTICE';
      totalPeriods: number;
      sessionsPerWeek: number;
      periodsPerSession: number;
    }> = [];

    if (normalized.theoryPeriods > 0 && normalized.theorySessionsPerWeek > 0) {
      blocks.push({
        type: 'THEORY',
        roomType: 'THEORY',
        totalPeriods: normalized.theoryPeriods,
        sessionsPerWeek: normalized.theorySessionsPerWeek,
        periodsPerSession: this.resolvePeriodsPerSession(
          [
            {
              totalPeriods: normalized.theoryPeriods,
              sessionsPerWeek: normalized.theorySessionsPerWeek,
            },
          ],
          configuredPeriodsPerSession,
          availableWeeks,
        ),
      });
    }

    if (
      normalized.practicePeriods > 0 &&
      normalized.practiceSessionsPerWeek > 0
    ) {
      blocks.push({
        type: 'PRACTICE',
        roomType: usePracticeRoom ? 'PRACTICE' : 'THEORY',
        totalPeriods: normalized.practicePeriods,
        sessionsPerWeek: normalized.practiceSessionsPerWeek,
        periodsPerSession: this.resolvePeriodsPerSession(
          [
            {
              totalPeriods: normalized.practicePeriods,
              sessionsPerWeek: normalized.practiceSessionsPerWeek,
            },
          ],
          configuredPeriodsPerSession,
          availableWeeks,
        ),
      });
    }

    if (blocks.length > 0) {
      return blocks;
    }

    const totalPeriods = normalized.theoryPeriods + normalized.practicePeriods;
    if (totalPeriods <= 0) {
      return [];
    }

    return [
      {
        type: usePracticeRoom ? 'PRACTICE' : 'THEORY',
        roomType: usePracticeRoom ? 'PRACTICE' : 'THEORY',
        totalPeriods,
        sessionsPerWeek: Math.max(
          normalized.theorySessionsPerWeek,
          normalized.practiceSessionsPerWeek,
          DEFAULT_SESSIONS_PER_WEEK,
        ),
        periodsPerSession: normalized.periodsPerSession,
      },
    ];
  }

  private getCourseClassTotals(
    snapshot: any,
    subject: any,
    options: { availableWeeks?: number } = {},
  ) {
    const blocks = this.buildScheduleBlocks(snapshot, subject, options);
    const primaryBlock = blocks[0];
    return {
      totalPeriods: blocks.reduce((sum, block) => sum + block.totalPeriods, 0),
      sessionsPerWeek: this.positive(
        blocks.reduce((sum, block) => sum + this.positive(block.sessionsPerWeek), 0) ||
          primaryBlock?.sessionsPerWeek ||
          snapshot?.sessionsPerWeek,
        DEFAULT_SESSIONS_PER_WEEK,
      ),
      periodsPerSession: this.positive(
        Math.max(
          ...blocks.map((block) => this.positive(block.periodsPerSession)),
          this.positive(primaryBlock?.periodsPerSession ?? snapshot?.periodsPerSession),
        ),
        DEFAULT_PERIODS_PER_SESSION,
      ),
    };
  }

  private getSessionPeriodCount(session: any) {
    const startShift = this.positive(session?.startShift);
    const endShift = this.positive(session?.endShift);
    if (!startShift || !endShift || endShift < startShift) return 0;
    return endShift - startShift + 1;
  }

  private sumSessionPeriods(sessions: any[]) {
    return sessions.reduce(
      (total, session) => total + this.getSessionPeriodCount(session),
      0,
    );
  }

  private async getCohort(code: string) {
    try {
      return await this.prismaCompat.academicCohort.findFirst({
        where: { code },
      });
    } catch (error) {
      return null;
    }
  }

  private inferCohortYears(code: string) {
    const normalized = `${code || ''}`.trim().toUpperCase();
    const preset: Record<string, { startYear: number; endYear: number }> = {
      K17: { startYear: 2023, endYear: 2027 },
      K18: { startYear: 2024, endYear: 2028 },
      K19: { startYear: 2025, endYear: 2029 },
      K20: { startYear: 2026, endYear: 2030 },
      K21: { startYear: 2027, endYear: 2031 },
      K22: { startYear: 2028, endYear: 2032 },
    };

    if (preset[normalized]) {
      return preset[normalized];
    }

    const match = normalized.match(/^K(\d{2,})$/i);
    if (!match) return null;

    const cohortNumber = Number(match[1]);
    if (!Number.isFinite(cohortNumber)) return null;

    const startYear = 2006 + cohortNumber;
    return {
      startYear,
      endYear: startYear + 4,
    };
  }

  private async ensureCohortExists(code: string) {
    const normalized = `${code || ''}`.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('Thiếu mã khóa sinh viên.');
    }

    const existing = await this.getCohort(normalized);
    if (existing) {
      return existing;
    }

    const inferred = this.inferCohortYears(normalized);
    if (!inferred) {
      throw new BadRequestException(
        `Khóa ${normalized} chưa tồn tại trong hệ thống.`,
      );
    }

    try {
      return await this.prismaCompat.academicCohort.create({
        data: {
          code: normalized,
          startYear: inferred.startYear,
          endYear: inferred.endYear,
          isActive: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        return this.getCohort(normalized);
      }
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  private async resolveConceptualSemester(semesterId: string, cohort: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId },
    });
    if (!semester) {
      throw new NotFoundException('Học kỳ không tồn tại.');
    }

    const cohortMeta = await this.getCohort(cohort);
    if (!cohortMeta) {
      const direct = this.parseConceptualSemester(semester);
      return { semester, conceptualSemester: direct || 1 };
    }

    // Always calculate based on dates if cohort info is available
    const startDate = this.toDateOnly(semester.startDate);
    const month = startDate.getMonth() + 1;
    let calculatedSemester = 1;

    if (month >= 7) {
      calculatedSemester =
        (startDate.getFullYear() - cohortMeta.startYear) * 2 + 1;
    } else {
      calculatedSemester =
        (startDate.getFullYear() - cohortMeta.startYear - 1) * 2 + 2;
    }

    // Refinement: If name explicitly says HKx - Năm y, use it if it's within range
    const namedSemester = this.parseConceptualSemester(semester);
    const finalSemester = (namedSemester && Math.abs(namedSemester - calculatedSemester) <= 1) 
      ? namedSemester 
      : calculatedSemester;

    return {
      semester,
      conceptualSemester: Math.min(Math.max(finalSemester, 1), 8),
    };
  }

  private async getLatestPublishedTemplate(majorId: string, cohort: string) {
    return this.prismaCompat.trainingPlanTemplate.findFirst({
      where: { majorId, cohort, status: 'PUBLISHED' },
      include: {
        items: {
          include: { subject: { include: { department: true, major: true } } },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  private async getActiveTemplate(majorId: string, cohort: string) {
    return (
      (await this.prismaCompat.trainingPlanTemplate.findFirst({
        where: { majorId, cohort, status: 'DRAFT' },
        include: {
          items: {
            include: {
              subject: { include: { department: true, major: true } },
            },
          },
        },
        orderBy: { version: 'desc' },
      })) || (await this.getLatestPublishedTemplate(majorId, cohort))
    );
  }

  private async selectBestLecturer(where: any, semesterId: string) {
    const lecturers = await this.prisma.lecturer.findMany({
      where,
      include: {
        classes: {
          where: { semesterId },
          select: { id: true, totalPeriods: true },
        },
      },
    });

    if (!lecturers.length) {
      return null;
    }

    return this.sortLecturersByLoad(lecturers)[0];
  }

  private getPlannedLecturerLoad(
    plannedLoad:
      | Map<string, { itemCount: number; totalPeriods: number }>
      | undefined,
    lecturerId?: string | null,
  ) {
    if (!plannedLoad || !lecturerId) {
      return { itemCount: 0, totalPeriods: 0 };
    }

    return (
      plannedLoad.get(lecturerId) || {
        itemCount: 0,
        totalPeriods: 0,
      }
    );
  }

  private sortLecturersByLoad(
    lecturers: any[],
    plannedLoad?: Map<string, { itemCount: number; totalPeriods: number }>,
  ) {
    const sorted = [...lecturers].sort((left, right) => {
      const leftPeriods = left.classes.reduce(
        (sum: number, courseClass: any) =>
          sum + this.positive(courseClass.totalPeriods),
        0,
      );
      const rightPeriods = right.classes.reduce(
        (sum: number, courseClass: any) =>
          sum + this.positive(courseClass.totalPeriods),
        0,
      );
      const leftPlanned = this.getPlannedLecturerLoad(plannedLoad, left.id);
      const rightPlanned = this.getPlannedLecturerLoad(plannedLoad, right.id);
      const leftClassLoad = left.classes.length + leftPlanned.itemCount;
      const rightClassLoad = right.classes.length + rightPlanned.itemCount;
      const leftTotalPeriods = leftPeriods + leftPlanned.totalPeriods;
      const rightTotalPeriods = rightPeriods + rightPlanned.totalPeriods;

      if (leftClassLoad !== rightClassLoad) {
        return leftClassLoad - rightClassLoad;
      }

      if (leftTotalPeriods !== rightTotalPeriods) {
        return leftTotalPeriods - rightTotalPeriods;
      }

      return left.fullName.localeCompare(right.fullName);
    });

    return sorted;
  }

  private addPlannedLecturerLoad(
    plannedLoad: Map<string, { itemCount: number; totalPeriods: number }>,
    lecturerId: string,
    totalPeriods: number,
  ) {
    const current = this.getPlannedLecturerLoad(plannedLoad, lecturerId);
    plannedLoad.set(lecturerId, {
      itemCount: current.itemCount + 1,
      totalPeriods:
        current.totalPeriods + Math.max(this.positive(totalPeriods), 0),
    });
  }

  private async resolveEquivalentMajorIds(majorId: string) {
    const selected = await this.prisma.major.findFirst({
      where: { id: majorId },
      select: { id: true, code: true, name: true },
    });

    if (!selected) {
      return [majorId];
    }

    const selectedName = this.normalizeComparable(selected.name);
    const selectedCode = this.normalizeMajorCode(selected.code);
    const majors = await this.prisma.major.findMany({
      select: { id: true, code: true, name: true },
    });

    return [
      ...new Set(
        majors
          .filter((major) => {
            if (major.id === majorId) return true;
            return (
              this.normalizeComparable(major.name) === selectedName ||
              this.normalizeMajorCode(major.code) === selectedCode
            );
          })
          .map((major) => major.id),
      ),
    ];
  }

  private async getAdminClassesForExecution(majorId: string, cohort: string) {
    const load = (majorIds: string[]) =>
      this.prisma.adminClass.findMany({
        where: {
          majorId: majorIds.length === 1 ? majorIds[0] : { in: majorIds },
          cohort,
        },
        include: {
          major: true,
          students: {
            where: { status: 'STUDYING' },
            select: { id: true },
          },
        },
        orderBy: { code: 'asc' },
      });

    const exact = await load([majorId]);
    if (exact.length > 0) {
      const splitPreferred = exact.filter((adminClass) =>
        this.isSplitAdminClassCode(adminClass.code, cohort),
      );
      return splitPreferred.length > 0 ? splitPreferred : exact;
    }

    const equivalentMajorIds = await this.resolveEquivalentMajorIds(majorId);
    if (equivalentMajorIds.length <= 1) {
      return exact;
    }

    const fallback = await load(equivalentMajorIds);
    if (fallback.length > 0) {
      this.logger.warn(
        `AdminClass fallback by equivalent major ids for major ${majorId}, cohort ${cohort}: ${equivalentMajorIds.join(', ')}`,
      );
    }
    const splitPreferred = fallback.filter((adminClass) =>
      this.isSplitAdminClassCode(adminClass.code, cohort),
    );
    return splitPreferred.length > 0 ? splitPreferred : fallback;
  }

  private async listCandidateLecturers(
    subject: any,
    majorId: string,
    semesterId: string,
    plannedLoad?: Map<string, { itemCount: number; totalPeriods: number }>,
  ) {
    const fallbackLecturers = await this.prisma.lecturer.findMany({
      include: {
        classes: {
          select: { id: true, totalPeriods: true },
        },
      },
    });
    return this.sortLecturersByLoad(fallbackLecturers, plannedLoad);
  }

  private async suggestLecturer(
    subject: any,
    majorId: string,
    semesterId: string,
    plannedLoad?: Map<string, { itemCount: number; totalPeriods: number }>,
  ) {
    const lecturers = await this.listCandidateLecturers(
      subject,
      majorId,
      semesterId,
      plannedLoad,
    );
    return lecturers[0] || null;
  }

  private async rebalanceExecutionLecturers(
    executionId: string,
    majorId: string,
    semesterId: string,
    subjectIds?: Set<string>,
  ) {
    const items = await this.prismaCompat.semesterPlanItem.findMany({
      where: {
        semesterPlanId: executionId,
        ...(subjectIds?.size ? { subjectId: { in: [...subjectIds] } } : {}),
      },
      include: {
        subject: true,
      },
      orderBy: [{ subjectId: 'asc' }, { adminClassId: 'asc' }],
    });

    if (!items.length) {
      return;
    }

    const plannedLoad = new Map<
      string,
      { itemCount: number; totalPeriods: number }
    >();

    for (const item of items) {
      const lecturers = await this.listCandidateLecturers(
        item.subject,
        majorId,
        semesterId,
        plannedLoad,
      );
      const selected = lecturers[0];
      if (!selected?.id) {
        continue;
      }

      const totalPeriods = this.getCourseClassTotals(
        item,
        item.subject,
      ).totalPeriods;

      await this.prismaCompat.semesterPlanItem.update({
        where: { id: item.id },
        data: {
          lecturerId: selected.id,
          status: item.generatedCourseClassId ? item.status : 'READY',
        },
      });

      if (item.generatedCourseClassId) {
        await this.prisma.courseClass.update({
          where: { id: item.generatedCourseClassId },
          data: { lecturerId: selected.id },
        });
      }

      this.addPlannedLecturerLoad(plannedLoad, selected.id, totalPeriods);
    }
  }

  private hasLocalConflict(plannedSessions: any[], candidate: any) {
    return plannedSessions.some((planned) => {
      if (!this.sameDay(planned.date, candidate.date)) return false;
      if (
        !this.overlaps(
          planned.startShift,
          planned.endShift,
          candidate.startShift,
          candidate.endShift,
        )
      ) {
        return false;
      }

      const roomConflict =
        candidate.roomId &&
        planned.roomId &&
        planned.roomId === candidate.roomId;
      const lecturerConflict =
        candidate.lecturerId &&
        planned.lecturerId &&
        planned.lecturerId === candidate.lecturerId;
      const adminClassConflict = (candidate.adminClassIds || []).some(
        (id: string) => (planned.adminClassIds || []).includes(id),
      );

      return roomConflict || lecturerConflict || adminClassConflict;
    });
  }

  private async hasRoomConflict(
    prisma: any,
    roomId: string,
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    excludeCourseClassId?: string,
  ) {
    return prisma.classSession.findFirst({
      where: {
        roomId,
        semesterId,
        date,
        courseClassId: excludeCourseClassId
          ? { not: excludeCourseClassId }
          : undefined,
        OR: [
          { startShift: { lte: startShift }, endShift: { gte: startShift } },
          { startShift: { lte: endShift }, endShift: { gte: endShift } },
          { startShift: { gte: startShift }, endShift: { lte: endShift } },
        ],
      },
    });
  }

  private async hasLecturerConflict(
    prisma: any,
    lecturerId: string,
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    excludeCourseClassId?: string,
  ) {
    return prisma.classSession.findFirst({
      where: {
        semesterId,
        date,
        courseClass: {
          lecturerId,
          id: excludeCourseClassId ? { not: excludeCourseClassId } : undefined,
        },
        OR: [
          { startShift: { lte: startShift }, endShift: { gte: startShift } },
          { startShift: { lte: endShift }, endShift: { gte: endShift } },
          { startShift: { gte: startShift }, endShift: { lte: endShift } },
        ],
      },
    });
  }

  private async hasAdminClassConflict(
    prisma: any,
    adminClassIds: string[],
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    excludeCourseClassId?: string,
  ) {
    if (!adminClassIds.length) return null;

    return prisma.classSession.findFirst({
      where: {
        semesterId,
        date,
        courseClass: {
          id: excludeCourseClassId ? { not: excludeCourseClassId } : undefined,
          adminClasses: { some: { id: { in: adminClassIds } } },
        },
        OR: [
          { startShift: { lte: startShift }, endShift: { gte: startShift } },
          { startShift: { lte: endShift }, endShift: { gte: endShift } },
          { startShift: { gte: startShift }, endShift: { lte: endShift } },
        ],
      },
    });
  }

  private async findAvailableRoom(
    prisma: any,
    roomType: string,
    capacity: number,
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    plannedSessions: any[],
    lecturerId?: string | null,
    adminClassIds?: string[],
    excludeCourseClassId?: string,
  ) {
    const roomFilters =
      roomType === 'PRACTICE'
        ? [
            {
              id: { startsWith: 'ROOM_' },
              type: 'PRACTICE',
              capacity: { gte: Math.max(capacity, 1) },
            },
            { id: { startsWith: 'ROOM_' }, type: 'PRACTICE' },
            { type: 'PRACTICE', capacity: { gte: Math.max(capacity, 1) } },
            { type: 'PRACTICE' },
          ]
        : [
            {
              id: { startsWith: 'ROOM_' },
              type: 'THEORY',
              capacity: { gte: Math.max(capacity, 1) },
            },
            { id: { startsWith: 'ROOM_' }, type: 'THEORY' },
            {
              id: { startsWith: 'ROOM_' },
              capacity: { gte: Math.max(capacity, 1) },
            },
            { type: 'THEORY', capacity: { gte: Math.max(capacity, 1) } },
            { capacity: { gte: Math.max(capacity, 1) } },
          ];

    const seen = new Set<string>();

    for (const where of roomFilters) {
      const rooms = await prisma.room.findMany({
        where,
        orderBy: { capacity: 'asc' },
      });

      for (const room of rooms) {
        if (seen.has(room.id)) continue;
        seen.add(room.id);

        const candidate = {
          date,
          roomId: room.id,
          lecturerId,
          adminClassIds: adminClassIds || [],
          startShift,
          endShift,
        };

        if (this.hasLocalConflict(plannedSessions, candidate)) continue;

        const roomConflict = await this.hasRoomConflict(
          prisma,
          room.id,
          semesterId,
          date,
          startShift,
          endShift,
          excludeCourseClassId,
        );
        if (roomConflict) continue;

        return room;
      }
    }

    return null;
  }

  private async createSessionsForCourseClass(
    prisma: any,
    context: {
      courseClass: any;
      semester: any;
      subject: any;
      lecturerId?: string | null;
      adminClassIds: string[];
      snapshot: any;
      requiredCapacity: number;
    },
    options: { clearExisting: boolean; fallback?: any },
  ) {
    let existingSessions = await prisma.classSession.findMany({
      where: { courseClassId: context.courseClass.id },
      select: {
        id: true,
        roomId: true,
        date: true,
        startShift: true,
        endShift: true,
        type: true,
      },
    });

    if (options.clearExisting) {
      await prisma.classSession.deleteMany({
        where: { courseClassId: context.courseClass.id },
      });
      existingSessions = [];
    }

    const isNoScheduleSubject = 
      context.subject?.examType === 'BAO_VE' || 
      /khóa luận|khoá luận|đồ án|thực tập|kltn/i.test(context.subject?.name || '');

    if (isNoScheduleSubject) {
      return {
        alreadyScheduled: true,
        scheduledSessions: 0,
        incomplete: false,
        issues: [] as string[],
      };
    }

    const semesterStart = this.toDateOnly(context.semester.startDate);
    const semesterEnd = this.toDateOnly(context.semester.endDate);
    const allBlocks = this.buildScheduleBlocks(
      context.snapshot,
      context.subject,
      {
        ...(options.fallback || {}),
        availableWeeks: this.countTeachingWeeks(
          context.semester?.startDate,
          context.semester?.endDate,
        ),
      },
    );
    const requiredPeriods = allBlocks.reduce(
      (total, block) => total + this.positive(block.totalPeriods),
      0,
    );
    let remainingExistingPeriods = this.sumSessionPeriods(existingSessions);

    const blocks = allBlocks
      .map((block) => {
        const coveredPeriods = Math.min(
          this.positive(block.totalPeriods),
          remainingExistingPeriods,
        );
        remainingExistingPeriods = Math.max(
          0,
          remainingExistingPeriods - coveredPeriods,
        );
        return {
          ...block,
          totalPeriods: Math.max(
            0,
            this.positive(block.totalPeriods) - coveredPeriods,
          ),
        };
      })
      .filter((block) => block.totalPeriods > 0);

    if (existingSessions.length > 0 && !options.clearExisting && blocks.length === 0) {
      return {
        alreadyScheduled: true,
        scheduledSessions: existingSessions.length,
        incomplete: false,
        issues: [] as string[],
      };
    }

    const plannedSessions: any[] = existingSessions.map((session: any) => ({
      roomId: session.roomId,
      date: session.date,
      startShift: session.startShift,
      endShift: session.endShift,
      lecturerId: context.lecturerId,
      adminClassIds: context.adminClassIds,
    }));
    let persistedCount = 0;
    const issues: string[] = [];
    const semesterSessions = await prisma.classSession.findMany({
      where: { semesterId: context.courseClass.semesterId },
      select: {
        date: true,
        startShift: true,
      },
    });
    const lecturerSessions = context.lecturerId
      ? await prisma.classSession.findMany({
          where: {
            semesterId: context.courseClass.semesterId,
            courseClass: {
              lecturerId: context.lecturerId,
            },
          },
          select: {
            date: true,
          },
        })
      : [];
    const adminSessions = context.adminClassIds.length
      ? await prisma.classSession.findMany({
          where: {
            semesterId: context.courseClass.semesterId,
            courseClass: {
              adminClasses: {
                some: {
                  id: { in: context.adminClassIds },
                },
              },
            },
          },
          select: {
            date: true,
          },
        })
      : [];

    const globalDayLoad = new Map<number, number>();
    const globalDayShiftLoad = new Map<string, number>();
    const lecturerDayLoad = new Map<number, number>();
    const adminDayLoad = new Map<number, number>();
    const addLoad = <T>(map: Map<T, number>, key: T, amount = 1) => {
      map.set(key, (map.get(key) || 0) + amount);
    };

    for (const session of semesterSessions) {
      const day = this.toDateOnly(session.date).getUTCDay();
      addLoad(globalDayLoad, day);
      addLoad(globalDayShiftLoad, `${day}:${session.startShift}`);
    }

    for (const session of lecturerSessions) {
      addLoad(lecturerDayLoad, this.toDateOnly(session.date).getUTCDay());
    }

    for (const session of adminSessions) {
      addLoad(adminDayLoad, this.toDateOnly(session.date).getUTCDay());
    }

    // 1. Generate Weekly Candidate Slots (Mon-Sat x 5 Shifts)
    const DAYS = [1, 2, 3, 4, 5, 6]; // Monday=1, ..., Saturday=6
    const candidates: { day: number; shift: number }[] = [];
    for (const day of DAYS) {
      for (const shift of CLASS_SHIFTS) {
        candidates.push({ day, shift });
      }
    }

    for (const block of blocks) {
      const sessionsToPlace = block.sessionsPerWeek;
      const sessionPeriods = block.periodsPerSession;
      const requiredSessions = Math.max(
        1,
        Math.ceil(block.totalPeriods / Math.max(sessionPeriods, 1)),
      );
      const foundSlots: { dates: Date[]; shift: number; room: any }[] = [];
      const candidateHashSeed = `${context.courseClass.code}:${block.type}`;

      while (foundSlots.length < sessionsToPlace) {
        const remainingCandidates = candidates.filter(
          (candidate) =>
            !foundSlots.some(
              (slot) =>
                slot.shift === candidate.shift &&
                slot.dates.some(
                  (date) => this.toDateOnly(date).getUTCDay() === candidate.day,
                ),
            ),
        );
        if (!remainingCandidates.length) break;

        const rankedCandidates = [...remainingCandidates].sort(
          (left, right) => {
            const leftFoundOnDay = foundSlots.filter((slot) =>
              slot.dates.some(
                (date) => this.toDateOnly(date).getUTCDay() === left.day,
              ),
            ).length;
            const rightFoundOnDay = foundSlots.filter((slot) =>
              slot.dates.some(
                (date) => this.toDateOnly(date).getUTCDay() === right.day,
              ),
            ).length;
            if (leftFoundOnDay !== rightFoundOnDay) {
              return leftFoundOnDay - rightFoundOnDay;
            }

            const leftAdminLoad = adminDayLoad.get(left.day) || 0;
            const rightAdminLoad = adminDayLoad.get(right.day) || 0;
            if (leftAdminLoad !== rightAdminLoad) {
              return leftAdminLoad - rightAdminLoad;
            }

            const leftLecturerLoad = lecturerDayLoad.get(left.day) || 0;
            const rightLecturerLoad = lecturerDayLoad.get(right.day) || 0;
            if (leftLecturerLoad !== rightLecturerLoad) {
              return leftLecturerLoad - rightLecturerLoad;
            }

            const leftGlobalLoad = globalDayLoad.get(left.day) || 0;
            const rightGlobalLoad = globalDayLoad.get(right.day) || 0;
            if (leftGlobalLoad !== rightGlobalLoad) {
              return leftGlobalLoad - rightGlobalLoad;
            }

            const leftShiftLoad =
              globalDayShiftLoad.get(`${left.day}:${left.shift}`) || 0;
            const rightShiftLoad =
              globalDayShiftLoad.get(`${right.day}:${right.shift}`) || 0;
            if (leftShiftLoad !== rightShiftLoad) {
              return leftShiftLoad - rightShiftLoad;
            }

            const leftTie = `${candidateHashSeed}:${left.day}:${left.shift}`;
            const rightTie = `${candidateHashSeed}:${right.day}:${right.shift}`;
            return leftTie.localeCompare(rightTie);
          },
        );

        let slotAdded = false;
        for (const candidate of rankedCandidates) {
          // Find all dates in semester for this day of week
          const occurrenceDates: Date[] = [];
          let cur = this.toDateOnly(semesterStart);
          while (cur <= semesterEnd) {
            if (cur.getUTCDay() === candidate.day) {
              occurrenceDates.push(new Date(cur));
            }
            cur = this.addDays(cur, 1);
          }

          if (occurrenceDates.length === 0) {
            continue;
          }

          const endShift = candidate.shift + sessionPeriods - 1;
          if (endShift > 15) continue;

          // Check for Lecturer/Admin conflicts across ALL weeks for this slot
          let conflictFound = false;
          for (const date of occurrenceDates) {
            if (
              context.lecturerId &&
              (this.hasLocalConflict(plannedSessions, {
                date,
                lecturerId: context.lecturerId,
                adminClassIds: [],
                startShift: candidate.shift,
                endShift,
              }) ||
                (await this.hasLecturerConflict(
                  prisma,
                  context.lecturerId,
                  context.courseClass.semesterId,
                  date,
                  candidate.shift,
                  endShift,
                  context.courseClass.id,
                )))
            ) {
              conflictFound = true;
              break;
            }

            if (
              context.adminClassIds.length &&
              (this.hasLocalConflict(plannedSessions, {
                date,
                adminClassIds: context.adminClassIds,
                startShift: candidate.shift,
                endShift,
              }) ||
                (await this.hasAdminClassConflict(
                  prisma,
                  context.adminClassIds,
                  context.courseClass.semesterId,
                  date,
                  candidate.shift,
                  endShift,
                  context.courseClass.id,
                )))
            ) {
              conflictFound = true;
              break;
            }
          }

          if (conflictFound) continue;

          // Find a room available across ALL weeks for this slot
          const room = await this.findAvailableRoomForPattern(
            prisma,
            block.roomType,
            context.requiredCapacity,
            context.courseClass.semesterId,
            occurrenceDates,
            candidate.shift,
            endShift,
            plannedSessions,
            context.lecturerId,
            context.adminClassIds,
            context.courseClass.id,
          );

          if (room) {
            foundSlots.push({
              dates: occurrenceDates,
              shift: candidate.shift,
              room,
            });
            slotAdded = true;
            break;
          }
        }

        if (!slotAdded) break;
      }

      const occurrences = foundSlots
        .flatMap((slot) =>
          slot.dates.map((date) => ({
            date: this.toDateOnly(date),
            shift: slot.shift,
            room: slot.room,
          })),
        )
        .sort((left, right) => {
          const dateCompare = left.date.getTime() - right.date.getTime();
          if (dateCompare !== 0) return dateCompare;
          return left.shift - right.shift;
        })
        .slice(0, requiredSessions);

      let blockPersistedSessions = 0;
      for (const occurrence of occurrences) {
        const endShift = occurrence.shift + sessionPeriods - 1;
        const dayOfWeek = occurrence.date.getUTCDay();
        const dayLabel = dayOfWeek === 0 ? 'CN' : `T${dayOfWeek + 1}`;

        const sessionData = {
          courseClassId: context.courseClass.id,
          semesterId: context.courseClass.semesterId,
          roomId: occurrence.room.id,
          date: occurrence.date,
          startShift: occurrence.shift,
          endShift,
          type: block.type,
          note: `Auto ${block.type} (${dayLabel})`,
        };

        try {
          await prisma.classSession.create({ data: sessionData });
          plannedSessions.push({
            ...sessionData,
            lecturerId: context.lecturerId,
            adminClassIds: context.adminClassIds,
          });
          addLoad(globalDayLoad, dayOfWeek);
          addLoad(globalDayShiftLoad, `${dayOfWeek}:${occurrence.shift}`);
          if (context.lecturerId) {
            addLoad(lecturerDayLoad, dayOfWeek);
          }
          if (context.adminClassIds.length) {
            addLoad(adminDayLoad, dayOfWeek);
          }
          blockPersistedSessions += 1;
          persistedCount += 1;
        } catch (error) {
          if (!this.isUniqueConstraintError(error, 'classsession')) throw error;
        }
      }

      if (foundSlots.length < sessionsToPlace) {
        const issue = `Chỉ tìm được ${foundSlots.length}/${sessionsToPlace} khung giờ cho lớp ${context.courseClass.code} (${block.type}).`;
        this.logger.warn(issue);
        issues.push(issue);
      }
      if (blockPersistedSessions < requiredSessions) {
        const issue = `Chỉ xếp được ${blockPersistedSessions}/${requiredSessions} buổi cho lớp ${context.courseClass.code} (${block.type}).`;
        this.logger.warn(issue);
        issues.push(issue);
      }
    }

    const finalExistingPeriods = this.sumSessionPeriods(existingSessions);
    const finalCreatedPeriods = plannedSessions
      .filter((session) => session.courseClassId === context.courseClass.id)
      .reduce(
        (total, session) =>
          total +
          Math.max(
            0,
            this.positive(session.endShift) - this.positive(session.startShift) + 1,
          ),
        0,
      );

    if (
      requiredPeriods > 0 &&
      finalExistingPeriods + finalCreatedPeriods < requiredPeriods
    ) {
      const issue = `Lớp ${context.courseClass.code} còn thiếu ${
        requiredPeriods - finalExistingPeriods - finalCreatedPeriods
      } tiết so với khung (${finalExistingPeriods + finalCreatedPeriods}/${requiredPeriods}).`;
      this.logger.warn(issue);
      issues.push(issue);
    }

    return {
      alreadyScheduled: false,
      scheduledSessions: persistedCount,
      incomplete: issues.length > 0,
      issues,
    };
  }

  private async findAvailableRoomForPattern(
    prisma: any,
    roomType: string,
    capacity: number,
    semesterId: string,
    dates: Date[],
    startShift: number,
    endShift: number,
    plannedSessions: any[],
    lecturerId?: string | null,
    adminClassIds?: string[],
    excludeCourseClassId?: string,
  ) {
    const roomFilters =
      roomType === 'PRACTICE'
        ? [
            {
              id: { startsWith: 'ROOM_' },
              type: 'PRACTICE',
              capacity: { gte: Math.max(capacity, 1) },
            },
            { id: { startsWith: 'ROOM_' }, type: 'PRACTICE' },
            { type: 'PRACTICE', capacity: { gte: Math.max(capacity, 1) } },
            { type: 'PRACTICE' },
          ]
        : [
            {
              id: { startsWith: 'ROOM_' },
              type: 'THEORY',
              capacity: { gte: Math.max(capacity, 1) },
            },
            { id: { startsWith: 'ROOM_' }, type: 'THEORY' },
            {
              id: { startsWith: 'ROOM_' },
              capacity: { gte: Math.max(capacity, 1) },
            },
            { type: 'THEORY', capacity: { gte: Math.max(capacity, 1) } },
            { capacity: { gte: Math.max(capacity, 1) } },
          ];

    for (const where of roomFilters) {
      const rooms = await prisma.room.findMany({
        where,
        orderBy: { capacity: 'asc' },
      });

      for (const room of rooms) {
        let roomConflictFound = false;
        for (const date of dates) {
          const candidate = {
            date,
            roomId: room.id,
            lecturerId,
            adminClassIds: adminClassIds || [],
            startShift,
            endShift,
          };

          if (this.hasLocalConflict(plannedSessions, candidate)) {
            roomConflictFound = true;
            break;
          }

          const dbConflict = await this.hasRoomConflict(
            prisma,
            room.id,
            semesterId,
            date,
            startShift,
            endShift,
            excludeCourseClassId,
          );
          if (dbConflict) {
            roomConflictFound = true;
            break;
          }
        }

        if (!roomConflictFound) return room;
      }
    }

    return null;
  }

  private async ensureCourseClassForItem(prisma: any, item: any) {
    const code = this.buildCourseClassCode(
      item.semesterPlan.semester.code,
      item.subject.code,
      item.adminClass.code,
    );
    const availableWeeks = this.countTeachingWeeks(
      item.semesterPlan?.semester?.startDate,
      item.semesterPlan?.semester?.endDate,
    );
    const totals = this.getCourseClassTotals(item, item.subject, {
      availableWeeks,
    });
    const maxSlots = Math.max(item.expectedStudentCount + 5, 10);

    const existing =
      (item.generatedCourseClassId
        ? await prisma.courseClass.findFirst({
            where: { id: item.generatedCourseClassId },
            include: { adminClasses: true },
          })
        : null) ||
      (await prisma.courseClass.findFirst({
        where: {
          semesterId: item.semesterPlan.semesterId,
          subjectId: item.subjectId,
          adminClasses: {
            some: { id: item.adminClassId },
          },
        },
        include: { adminClasses: true },
      })) ||
      (await prisma.courseClass.findUnique({
        where: { code },
        include: { adminClasses: true },
      }));

    const data = {
      subjectId: item.subjectId,
      semesterId: item.semesterPlan.semesterId,
      lecturerId: item.lecturerId,
      cohort: item.semesterPlan.cohort,
      code,
      name: `${item.subject.name} - ${item.adminClass.code}`,
      maxSlots,
      totalPeriods: totals.totalPeriods,
      sessionsPerWeek: totals.sessionsPerWeek,
      periodsPerSession: totals.periodsPerSession,
      status: 'OPEN',
    };

    if (existing) {
      const updated = await prisma.courseClass.update({
        where: { id: existing.id },
        data: {
          ...data,
          adminClasses: { set: [{ id: item.adminClassId }] },
        },
        include: {
          adminClasses: true,
          sessions: true,
          subject: true,
          semester: true,
        },
      });

      return { courseClass: updated, created: false };
    }

    const created = await prisma.courseClass.create({
      data: {
        ...data,
        adminClasses: { connect: [{ id: item.adminClassId }] },
      },
      include: {
        adminClasses: true,
        sessions: true,
        subject: true,
        semester: true,
      },
    });

    return { courseClass: created, created: true };
  }

  private async syncStudentsForItem(
    prisma: any,
    item: any,
    courseClassId: string,
  ) {
    const students = await prisma.student.findMany({
      where: {
        adminClassId: item.adminClassId,
        status: 'STUDYING',
      },
      select: { id: true },
    });

    const studentIds = students.map((student: any) => student.id);
    const existingEnrollments = studentIds.length
      ? await prisma.enrollment.findMany({
          where: {
            courseClassId,
            studentId: { in: studentIds },
          },
          select: { studentId: true },
        })
      : [];
    const existingIds = new Set(
      existingEnrollments.map((enrollment: any) => enrollment.studentId),
    );
    const missingIds = studentIds.filter(
      (studentId) => !existingIds.has(studentId),
    );

    if (missingIds.length > 0) {
      await prisma.enrollment.createMany({
        data: missingIds.map((studentId) => ({
          courseClassId,
          studentId,
          status: 'REGISTERED',
        })),
      });
    }

    const currentSlots = await prisma.enrollment.count({
      where: { courseClassId },
    });

    await prisma.courseClass.update({
      where: { id: courseClassId },
      data: { currentSlots },
    });

    return {
      expectedStudentCount: studentIds.length,
      enrolledCount: currentSlots,
      addedCount: missingIds.length,
    };
  }

  private async loadExecutionForMutation(id: string) {
    const execution = await this.prismaCompat.semesterPlan.findFirst({
      where: { id },
      include: {
        semester: true,
        major: true,
        template: true,
        items: {
          include: {
            adminClass: true,
            lecturer: true,
            subject: {
              include: { department: true, major: true },
            },
            generatedCourseClass: {
              include: {
                adminClasses: true,
                sessions: { include: { room: true } },
                subject: true,
                lecturer: true,
              },
            },
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Semester plan không tồn tại.');
    }

    execution.items = this.sortExecutionItems(execution.items || []);
    return execution;
  }

  async listTemplates(majorId?: string, cohort?: string) {
    try {
      const templates = await this.prismaCompat.trainingPlanTemplate.findMany({
        where: {
          ...(majorId ? { majorId } : {}),
          ...(cohort ? { cohort } : {}),
        },
        include: {
          major: true,
          academicCohort: true,
          items: {
            include: {
              subject: { include: { department: true, major: true } },
            },
          },
        },
        orderBy: [{ majorId: 'asc' }, { cohort: 'asc' }, { version: 'desc' }],
      });

      return this.sortTemplates(templates).map((template) => ({
        ...template,
        items: [...(template.items || [])].sort(
          (left, right) => left.conceptualSemester - right.conceptualSemester,
        ),
      }));
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.logger.warn(this.trainingPlanMigrationHint);
        return [];
      }
      throw error;
    }
  }

  async saveTemplate(body: {
    templateId?: string;
    majorId: string;
    cohort: string;
    items: any[];
  }) {
    try {
      const { templateId, majorId, cohort } = body;
      const items = Array.isArray(body.items) ? body.items : [];

      if (!majorId || !cohort) {
        throw new BadRequestException('Thiếu majorId hoặc cohort.');
      }

      await this.ensureCohortExists(cohort);
      this.validateTemplateItems(items);

      const subjectIds = [
        ...new Set(items.map((item) => item.subjectId).filter(Boolean)),
      ];
      const subjects = subjectIds.length
        ? await this.prisma.subject.findMany({
            where: { id: { in: subjectIds } },
            include: { department: true, major: true },
          })
        : [];
      const subjectsById = new Map(
        subjects.map((subject) => [subject.id, subject]),
      );

      if (subjectIds.length !== subjects.length) {
        throw new BadRequestException(
          'Có môn học không tồn tại trong hệ thống.',
        );
      }

      const mismatchedSubject = subjects.find(
        (subject) => subject.majorId !== majorId,
      );
      if (mismatchedSubject) {
        throw new BadRequestException(
          `Môn ${mismatchedSubject.code} không thuộc ngành đã chọn.`,
        );
      }

      const templateIdToReturn = await this.prisma.$transaction(
        async (tx: any) => {
          let template = templateId
            ? await tx.trainingPlanTemplate.findFirst({
                where: { id: templateId, majorId, cohort },
              })
            : await tx.trainingPlanTemplate.findFirst({
                where: { majorId, cohort, status: 'DRAFT' },
                orderBy: { version: 'desc' },
              });

          if (template && template.status !== 'DRAFT') {
            throw new BadRequestException(
              'Chỉ có thể cập nhật bản nháp. Hãy tạo draft version mới trước khi sửa.',
            );
          }

          if (!template) {
            const latest = await tx.trainingPlanTemplate.findFirst({
              where: { majorId, cohort },
              orderBy: { version: 'desc' },
              select: { version: true },
            });
            template = await tx.trainingPlanTemplate.create({
              data: {
                majorId,
                cohort,
                version: this.positive(latest?.version) + 1,
                status: 'DRAFT',
              },
            });
          }

          await tx.trainingPlanTemplateItem.deleteMany({
            where: { templateId: template.id },
          });

          if (items.length > 0) {
            await tx.trainingPlanTemplateItem.createMany({
              data: items.map((item) => {
                const subject = subjectsById.get(item.subjectId);
                const snapshot = this.snapshotFromSubject(subject, item);
                return {
                  templateId: template!.id,
                  subjectId: item.subjectId,
                  conceptualSemester: this.positive(
                    item.conceptualSemester ?? item.suggestedSemester,
                    1,
                  ),
                  isRequired: item.isRequired ?? true,
                  theoryPeriods: snapshot.theoryPeriods,
                  practicePeriods: snapshot.practicePeriods,
                  theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
                  practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
                  periodsPerSession: snapshot.periodsPerSession,
                };
              }),
            });
          }

          return template.id;
        },
      );

      const template = await this.prismaCompat.trainingPlanTemplate.findFirst({
        where: { id: templateIdToReturn },
        include: {
          major: true,
          academicCohort: true,
          items: {
            include: {
              subject: { include: { department: true, major: true } },
            },
          },
        },
      });

      return template;
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async publishTemplate(templateId: string) {
    try {
      const template = await this.prismaCompat.trainingPlanTemplate.findFirst({
        where: { id: templateId },
        include: { items: true },
      });

      if (!template) {
        throw new NotFoundException('Template không tồn tại.');
      }

      if (!template.items.length) {
        throw new BadRequestException('Template trống, không thể publish.');
      }

      await this.prisma.$transaction(async (tx: any) => {
        await tx.trainingPlanTemplate.updateMany({
          where: {
            majorId: template.majorId,
            cohort: template.cohort,
            status: 'PUBLISHED',
            id: { not: template.id },
          },
          data: { status: 'ARCHIVED' },
        });

        await tx.trainingPlanTemplate.update({
          where: { id: template.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
          },
        });

        await tx.curriculum.deleteMany({
          where: {
            majorId: template.majorId,
            cohort: template.cohort,
          },
        });

        await tx.curriculum.createMany({
          data: template.items.map((item) => ({
            majorId: template.majorId,
            cohort: template.cohort,
            subjectId: item.subjectId,
            suggestedSemester: item.conceptualSemester,
            isRequired: item.isRequired ?? true,
          })),
        });
      });

      return this.prismaCompat.trainingPlanTemplate.findFirst({
        where: { id: template.id },
        include: {
          major: true,
          academicCohort: true,
          items: {
            include: {
              subject: { include: { department: true, major: true } },
            },
          },
        },
      });
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async copyTemplate(templateId: string, targetCohorts: string[]) {
    try {
      const template = await this.prismaCompat.trainingPlanTemplate.findFirst({
        where: { id: templateId },
        include: { items: true },
      });

      if (!template) {
        throw new NotFoundException('Template nguồn không tồn tại.');
      }

      const cohorts = [...new Set(targetCohorts.filter(Boolean))].filter(
        (cohort) => cohort !== template.cohort,
      );
      if (!cohorts.length) {
        throw new BadRequestException('Không có khóa đích hợp lệ để sao chép.');
      }

      await Promise.all(
        cohorts.map((cohort) => this.ensureCohortExists(cohort)),
      );

      const copies = await this.prisma.$transaction(async (tx: any) => {
        const created: any[] = [];
        for (const cohort of cohorts) {
          const latest = await tx.trainingPlanTemplate.findFirst({
            where: { majorId: template.majorId, cohort },
            orderBy: { version: 'desc' },
            select: { version: true },
          });

          const clone = await tx.trainingPlanTemplate.create({
            data: {
              majorId: template.majorId,
              cohort,
              version: this.positive(latest?.version) + 1,
              status: 'DRAFT',
              copiedFromTemplateId: template.id,
            },
          });

          if (template.items.length) {
            await tx.trainingPlanTemplateItem.createMany({
              data: template.items.map((item) => ({
                templateId: clone.id,
                subjectId: item.subjectId,
                conceptualSemester: item.conceptualSemester,
                isRequired: item.isRequired ?? true,
                theoryPeriods: item.theoryPeriods,
                practicePeriods: item.practicePeriods,
                theorySessionsPerWeek: item.theorySessionsPerWeek,
                practiceSessionsPerWeek: item.practiceSessionsPerWeek,
                periodsPerSession: item.periodsPerSession,
              })),
            });
          }

          created.push(clone);
        }
        return created;
      });

      return {
        success: true,
        count: copies.length,
        targetCohorts: cohorts,
      };
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async generateExecution(semesterId: string, majorId: string, cohort: string) {
    try {
      await this.ensureCohortExists(cohort);
      const semester = await this.prisma.semester.findFirst({
        where: { id: semesterId },
        select: { startDate: true, endDate: true },
      });
      const availableWeeks = this.countTeachingWeeks(
        semester?.startDate,
        semester?.endDate,
      );
      const publishedTemplate = await this.getLatestPublishedTemplate(
        majorId,
        cohort,
      );
      if (!publishedTemplate) {
        throw new BadRequestException(
          'Chưa có template đã publish cho ngành và khóa này.',
        );
      }

      const { conceptualSemester } = await this.resolveConceptualSemester(
        semesterId,
        cohort,
      );
      const templateItems = (publishedTemplate.items || []).filter(
        (item) => item.conceptualSemester === conceptualSemester,
      );

      if (!templateItems.length) {
        throw new BadRequestException(
          `Template đã publish không có môn nào cho học kỳ ${conceptualSemester}.`,
        );
      }

      const adminClasses = await this.getAdminClassesForExecution(
        majorId,
        cohort,
      );

      if (!adminClasses.length) {
        throw new BadRequestException(
          'Không tìm thấy lớp danh nghĩa cho ngành và khóa đã chọn. Hãy kiểm tra dữ liệu AdminClass hoặc chọn khóa đã có lớp thực tế.',
        );
      }

      const existingPlan = await this.prismaCompat.semesterPlan.findFirst({
        where: { semesterId, majorId, cohort },
        include: { items: true },
      });

      // Remove the restrictive early return to allow syncing new template items into existing plans

      const planId = await this.prisma.$transaction(async (tx: any) => {
        const plan =
          existingPlan ||
          (await tx.semesterPlan.create({
            data: {
              semesterId,
              majorId,
              cohort,
              templateId: publishedTemplate.id,
              templateVersion: publishedTemplate.version,
              conceptualSemester,
              status: 'DRAFT',
            },
          }));

        if (existingPlan) {
          await tx.semesterPlan.update({
            where: { id: plan.id },
            data: {
              templateId: publishedTemplate.id,
              templateVersion: publishedTemplate.version,
              conceptualSemester,
            },
          });
        }

        const existingItems = await tx.semesterPlanItem.findMany({
          where: { semesterPlanId: plan.id },
        });
        const plannedLecturerLoad = new Map<
          string,
          { itemCount: number; totalPeriods: number }
        >();
        const existingByKey = new Map<string, any>(
          existingItems.map((item: any) => [
            `${item.subjectId}::${item.adminClassId}`,
            item,
          ]),
        );

        const desiredKeys = new Set<string>();

        for (const templateItem of templateItems) {
          for (const adminClass of adminClasses) {
            const key = `${templateItem.subjectId}::${adminClass.id}`;
            desiredKeys.add(key);
            const existingItem = existingByKey.get(key);
            const lecturer =
              existingItem?.generatedCourseClassId && existingItem?.lecturerId
                ? { id: existingItem.lecturerId }
                : await this.suggestLecturer(
                    templateItem.subject,
                    majorId,
                    semesterId,
                    plannedLecturerLoad,
                  );
            const lecturerId = lecturer?.id || existingItem?.lecturerId || null;
            const defaultSnapshot = this.buildDefaultStudySnapshot(
              templateItem.subject,
              templateItem,
              availableWeeks,
            );

            const data = {
              lecturerId,
              expectedStudentCount: adminClass.students.length,
              status: existingItem?.generatedCourseClassId
                ? existingItem.status
                : lecturerId
                  ? 'READY'
                  : 'DRAFT',
              theoryPeriods: defaultSnapshot.theoryPeriods,
              practicePeriods: defaultSnapshot.practicePeriods,
              theorySessionsPerWeek: defaultSnapshot.theorySessionsPerWeek,
              practiceSessionsPerWeek:
                defaultSnapshot.practiceSessionsPerWeek,
              periodsPerSession: defaultSnapshot.periodsPerSession,
            };

            if (existingItem) {
              await tx.semesterPlanItem.update({
                where: { id: existingItem.id },
                data,
              });
            } else {
              await tx.semesterPlanItem.create({
                data: {
                  semesterPlanId: plan.id,
                  subjectId: templateItem.subjectId,
                  adminClassId: adminClass.id,
                  ...data,
                },
              });
            }

            if (lecturerId) {
              const totalPeriods = this.getCourseClassTotals(
                data,
                templateItem.subject,
              ).totalPeriods;
              this.addPlannedLecturerLoad(
                plannedLecturerLoad,
                lecturerId,
                totalPeriods,
              );
            }
          }
        }

        if (!existingPlan) {
          return plan.id;
        }

        const removable = existingItems.filter(
          (item: any) =>
            !desiredKeys.has(`${item.subjectId}::${item.adminClassId}`) &&
            !item.generatedCourseClassId,
        );
        if (removable.length) {
          await tx.semesterPlanItem.deleteMany({
            where: { id: { in: removable.map((item: any) => item.id) } },
          });
        }

        return plan.id;
      });

      const refreshed = await this.getExecution(planId);
      await this.prismaCompat.semesterPlan.update({
        where: { id: planId },
        data: { status: this.derivePlanStatus(refreshed.items || []) },
      });

      return this.getExecution(planId);
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async findExecutionByScope(
    semesterId: string,
    majorId: string,
    cohort: string,
  ) {
    try {
      const execution = await this.prismaCompat.semesterPlan.findFirst({
        where: { semesterId, majorId, cohort },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      });

      if (!execution?.id) {
        return null;
      }

      return this.getExecution(execution.id);
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async getExecution(id: string) {
    try {
      const executionScope = await this.prismaCompat.semesterPlan.findFirst({
        where: { id },
        select: {
          id: true,
          majorId: true,
          semesterId: true,
        },
      });

      if (!executionScope) {
        throw new NotFoundException('Semester plan không tồn tại.');
      }

      await this.hydrateExecutionDraft(
        executionScope.id,
        executionScope.majorId,
        executionScope.semesterId,
      );

      const execution = await this.prismaCompat.semesterPlan.findFirst({
        where: { id },
        include: {
          semester: true,
          major: { include: { faculty: true } },
          academicCohort: true,
          template: {
            include: {
              items: {
                include: {
                  subject: { include: { department: true, major: true } },
                },
              },
            },
          },
          items: {
            include: {
              adminClass: true,
              lecturer: true,
              subject: {
                include: { department: true, major: true },
              },
              generatedCourseClass: {
                include: {
                  adminClasses: true,
                  lecturer: true,
                  subject: true,
                  sessions: { include: { room: true } },
                  _count: { select: { enrollments: true } },
                },
              },
            },
          },
        },
      });

      if (!execution) {
        throw new NotFoundException('Semester plan không tồn tại.');
      }

      execution.items = this.sortExecutionItems(execution.items || []);
      return execution;
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  private async hydrateExecutionDraft(
    executionId: string,
    majorId: string,
    semesterId: string,
  ) {
    const items = await this.prismaCompat.semesterPlanItem.findMany({
      where: { semesterPlanId: executionId },
      include: {
        subject: {
          include: { department: true, major: true },
        },
      },
      orderBy: [{ subjectId: 'asc' }, { adminClassId: 'asc' }],
    });

    if (!items.length) {
      return;
    }

    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId },
      select: { startDate: true, endDate: true },
    });
    const availableWeeks = this.countTeachingWeeks(
      semester?.startDate,
      semester?.endDate,
    );

    const plannedLoad = new Map<
      string,
      { itemCount: number; totalPeriods: number }
    >();
    for (const item of items) {
      if (!item.lecturerId) continue;
      const totalPeriods = this.getCourseClassTotals(
        item,
        item.subject,
        { availableWeeks },
      ).totalPeriods;
      this.addPlannedLecturerLoad(plannedLoad, item.lecturerId, totalPeriods);
    }

    let dirty = false;

    for (const item of items) {
      const snapshot = this.snapshotFromSubject(item.subject, item, {
        availableWeeks,
      });
      const missingScheduleConfig =
        !this.positive(item.theoryPeriods) &&
        !this.positive(item.practicePeriods);
      const missingSessionPlan =
        !this.positive(item.theorySessionsPerWeek) &&
        !this.positive(item.practiceSessionsPerWeek);
      const missingPeriodsPerSession = !this.positive(item.periodsPerSession);

      let nextLecturerId = item.lecturerId;
      if (!nextLecturerId) {
        const suggested = await this.suggestLecturer(
          item.subject,
          majorId,
          semesterId,
          plannedLoad,
        );
        nextLecturerId = suggested?.id || null;
        if (nextLecturerId) {
          const totalPeriods = this.getCourseClassTotals(
            snapshot,
            item.subject,
            { availableWeeks },
          ).totalPeriods;
          this.addPlannedLecturerLoad(
            plannedLoad,
            nextLecturerId,
            totalPeriods,
          );
        }
      }

      const nextStatus = item.generatedCourseClassId
        ? item.status === 'DRAFT' && nextLecturerId
          ? 'READY'
          : item.status
        : nextLecturerId
          ? 'READY'
          : item.status;

      const hasChanges =
        nextLecturerId !== item.lecturerId ||
        (missingScheduleConfig &&
          (snapshot.theoryPeriods !== item.theoryPeriods ||
            snapshot.practicePeriods !== item.practicePeriods)) ||
        (missingSessionPlan &&
          (snapshot.theorySessionsPerWeek !== item.theorySessionsPerWeek ||
            snapshot.practiceSessionsPerWeek !==
              item.practiceSessionsPerWeek)) ||
        (missingPeriodsPerSession &&
          snapshot.periodsPerSession !== item.periodsPerSession) ||
        nextStatus !== item.status;

      if (!hasChanges) {
        continue;
      }

      await this.prismaCompat.semesterPlanItem.update({
        where: { id: item.id },
        data: {
          lecturerId: nextLecturerId,
          theoryPeriods: missingScheduleConfig
            ? snapshot.theoryPeriods
            : item.theoryPeriods,
          practicePeriods: missingScheduleConfig
            ? snapshot.practicePeriods
            : item.practicePeriods,
          theorySessionsPerWeek: missingSessionPlan
            ? snapshot.theorySessionsPerWeek
            : item.theorySessionsPerWeek,
          practiceSessionsPerWeek: missingSessionPlan
            ? snapshot.practiceSessionsPerWeek
            : item.practiceSessionsPerWeek,
          periodsPerSession: missingPeriodsPerSession
            ? snapshot.periodsPerSession
            : item.periodsPerSession,
          status: nextStatus,
        },
      });

      if (
        item.generatedCourseClassId &&
        (nextLecturerId ||
          missingScheduleConfig ||
          missingSessionPlan ||
          missingPeriodsPerSession)
      ) {
        const totals = this.getCourseClassTotals(snapshot, item.subject, {
          availableWeeks,
        });
        await this.prisma.courseClass.update({
          where: { id: item.generatedCourseClassId },
          data: {
            lecturerId: nextLecturerId,
            totalPeriods: totals.totalPeriods,
            sessionsPerWeek: totals.sessionsPerWeek,
            periodsPerSession: totals.periodsPerSession,
          },
        });
      }

      dirty = true;
    }

    if (!dirty) {
      return;
    }

    const statuses = await this.prismaCompat.semesterPlanItem.findMany({
      where: { semesterPlanId: executionId },
      select: { status: true },
    });
    await this.prismaCompat.semesterPlan.update({
      where: { id: executionId },
      data: { status: this.derivePlanStatus(statuses) },
    });
  }

  async updateExecutionItem(id: string, data: any) {
    try {
      const existing = await this.prismaCompat.semesterPlanItem.findFirst({
        where: { id },
        include: {
          subject: true,
          semesterPlan: true,
        },
      });

      if (!existing) {
        throw new NotFoundException('Semester plan item không tồn tại.');
      }

      const next = await this.prismaCompat.semesterPlanItem.update({
        where: { id },
        data: {
          lecturerId:
            data.lecturerId === '' || data.lecturerId === undefined
              ? existing.lecturerId
              : data.lecturerId,
          theoryPeriods:
            data.theoryPeriods !== undefined
              ? this.positive(data.theoryPeriods)
              : undefined,
          practicePeriods:
            data.practicePeriods !== undefined
              ? this.positive(data.practicePeriods)
              : undefined,
          theorySessionsPerWeek:
            data.theorySessionsPerWeek !== undefined
              ? this.positive(data.theorySessionsPerWeek)
              : undefined,
          practiceSessionsPerWeek:
            data.practiceSessionsPerWeek !== undefined
              ? this.positive(data.practiceSessionsPerWeek)
              : undefined,
          periodsPerSession:
            data.periodsPerSession !== undefined
              ? this.positive(data.periodsPerSession)
              : undefined,
          status:
            data.status ||
            (data.lecturerId || existing.lecturerId
              ? 'READY'
              : existing.status),
        },
        include: {
          adminClass: true,
          lecturer: true,
          subject: true,
        },
      });

      const items = await this.prismaCompat.semesterPlanItem.findMany({
        where: { semesterPlanId: next.semesterPlanId },
        select: { status: true },
      });
      await this.prismaCompat.semesterPlan.update({
        where: { id: next.semesterPlanId },
        data: { status: this.derivePlanStatus(items) },
      });

      return next;
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  private async executeExecutionInternal(
    id: string,
    options?: {
      subjectIds?: string[];
      createSchedules?: boolean;
      clearExistingSchedules?: boolean;
      markExecuted?: boolean;
    },
  ) {
    const execution = await this.loadExecutionForMutation(id);
    const subjectIds = new Set((options?.subjectIds || []).filter(Boolean));
    const targetItems = execution.items.filter((item: any) =>
      subjectIds.size ? subjectIds.has(item.subjectId) : true,
    );

    if (!targetItems.length) {
      throw new BadRequestException(
        'Không có semester plan item nào để thực thi.',
      );
    }

    if (options?.createSchedules) {
      await this.rebalanceExecutionLecturers(
        execution.id,
        execution.majorId,
        execution.semesterId,
        subjectIds.size ? subjectIds : undefined,
      );
    }

    const summary = {
      processed: targetItems.length,
      createdClasses: 0,
      enrolledCount: 0,
      scheduledClasses: 0,
      alreadyScheduledClasses: 0,
      conflicts: [] as string[],
      executionId: execution.id,
    };

    for (const item of targetItems) {
      try {
        const prepared = await this.prisma.$transaction(
          async (tx: any) => {
            const freshItem = await tx.semesterPlanItem.findFirst({
              where: { id: item.id },
              include: {
                adminClass: true,
                subject: {
                  include: { department: true, major: true },
                },
                semesterPlan: { include: { semester: true } },
              },
            });

            if (!freshItem) {
              throw new NotFoundException(
                `Semester plan item ${item.id} không tồn tại.`,
              );
            }

            if (!freshItem.lecturerId) {
              throw new BadRequestException(
                `Môn ${freshItem.subject.code} / lớp ${freshItem.adminClass.code} chưa có giảng viên.`,
              );
            }

            const ensured = await this.ensureCourseClassForItem(tx, freshItem);
            const enrollment = await this.syncStudentsForItem(
              tx,
              freshItem,
              ensured.courseClass.id,
            );

            await tx.semesterPlanItem.update({
              where: { id: freshItem.id },
              data: {
                generatedCourseClassId: ensured.courseClass.id,
                expectedStudentCount: enrollment.expectedStudentCount,
              },
            });

            return {
              freshItem,
              courseClass: ensured.courseClass,
              created: ensured.created,
              enrollment,
            };
          },
          { maxWait: 10000, timeout: 60000 },
        );

        if (prepared.created) {
          summary.createdClasses += 1;
        }
        summary.enrolledCount += prepared.enrollment.addedCount;

        let nextStatus = options?.markExecuted ? 'EXECUTED' : 'READY';
        if (options?.createSchedules) {
          try {
            const scheduleResult = await this.prisma.$transaction(
              async (tx: any) => {
                const freshItem = await tx.semesterPlanItem.findFirst({
                  where: { id: item.id },
                  include: {
                    adminClass: true,
                    subject: true,
                    semesterPlan: { include: { semester: true } },
                  },
                });
                const freshClass = await tx.courseClass.findFirst({
                  where: { id: prepared.courseClass.id },
                });

                if (!freshItem || !freshClass) {
                  throw new NotFoundException(
                    `Không tìm thấy dữ liệu lớp để xếp lịch cho item ${item.id}.`,
                  );
                }

                return this.createSessionsForCourseClass(
                  tx,
                  {
                    courseClass: freshClass,
                    semester: freshItem.semesterPlan.semester,
                    subject: freshItem.subject,
                    lecturerId: freshItem.lecturerId,
                    adminClassIds: [freshItem.adminClassId],
                    snapshot: freshItem,
                    requiredCapacity: Math.max(
                      this.positive(freshItem.expectedStudentCount),
                      1,
                    ),
                  },
                  {
                    clearExisting: !!options?.clearExistingSchedules,
                  },
                );
              },
              { maxWait: 10000, timeout: 120000 },
            );

            if (
              scheduleResult.alreadyScheduled ||
              scheduleResult.scheduledSessions > 0
            ) {
              summary.scheduledClasses += 1;
            }

            if (scheduleResult.alreadyScheduled) {
              summary.alreadyScheduledClasses += 1;
            }

            if (
              scheduleResult.incomplete ||
              (!scheduleResult.alreadyScheduled &&
                scheduleResult.scheduledSessions <= 0)
            ) {
              nextStatus = 'NEEDS_REVIEW';
              if (scheduleResult.issues?.length) {
                summary.conflicts.push(...scheduleResult.issues);
              } else {
                summary.conflicts.push(
                  `Lớp ${prepared.courseClass.code} chưa xếp được lịch hợp lệ.`,
                );
              }
            }
          } catch (error) {
            nextStatus = 'NEEDS_REVIEW';
            summary.conflicts.push((error as Error).message);
          }
        }

        await this.prismaCompat.semesterPlanItem.update({
          where: { id: item.id },
          data: { status: nextStatus },
        });
      } catch (error) {
        await this.prismaCompat.semesterPlanItem.update({
          where: { id: item.id },
          data: { status: 'NEEDS_REVIEW' },
        });
        summary.conflicts.push((error as Error).message);
      }
    }

    const refreshedItems = await this.prismaCompat.semesterPlanItem.findMany({
      where: { semesterPlanId: execution.id },
      select: { status: true },
    });
    const nextPlanStatus = this.derivePlanStatus(refreshedItems);
    await this.prismaCompat.semesterPlan.update({
      where: { id: execution.id },
      data: {
        status: nextPlanStatus,
        executedAt:
          options?.markExecuted &&
          ['EXECUTED', 'PARTIAL'].includes(nextPlanStatus)
            ? new Date()
            : undefined,
      },
    });

    return {
      summary,
      execution: await this.getExecution(execution.id),
    };
  }

  private async initializeGradesForCourseClasses(execution: any) {
    const courseClasses = new Map<string, { subjectId: string }>();

    for (const item of execution?.items || []) {
      const classId = item?.generatedCourseClass?.id;
      const subjectId =
        item?.subjectId || item?.generatedCourseClass?.subjectId;
      if (classId && subjectId && !courseClasses.has(classId)) {
        courseClasses.set(classId, { subjectId });
      }
    }

    let createdGrades = 0;

    for (const [courseClassId, meta] of courseClasses.entries()) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseClassId },
        select: { studentId: true },
      });

      if (!enrollments.length) {
        continue;
      }

      const existingGrades = await this.prismaCompat.grade.findMany({
        where: { courseClassId },
        select: { studentId: true },
      });

      const existingStudentIds = new Set(
        existingGrades.map((grade: any) => grade.studentId),
      );
      const missingStudentIds = enrollments
        .map((enrollment) => enrollment.studentId)
        .filter((studentId) => !existingStudentIds.has(studentId));

      if (!missingStudentIds.length) {
        continue;
      }

      await this.prismaCompat.grade.createMany({
        data: missingStudentIds.map((studentId) => ({
          studentId,
          courseClassId,
          subjectId: meta.subjectId,
          isEligibleForExam: true,
          isAbsentFromExam: false,
          isPassed: false,
          isLocked: false,
          status: 'DRAFT',
        })),
      });

      createdGrades += missingStudentIds.length;
    }

    return {
      classCount: courseClasses.size,
      createdGrades,
    };
  }

  private buildDefaultStudySnapshot(
    subject: any,
    input: any = {},
    availableWeeks = DEFAULT_TEACHING_WEEKS,
  ) {
    return this.snapshotFromSubject(
      subject,
      {
        theoryPeriods: input?.theoryPeriods,
        practicePeriods: input?.practicePeriods,
        periodsPerSession: input?.periodsPerSession,
        theorySessionsPerWeek: null,
        practiceSessionsPerWeek: null,
        sessionsPerWeek: null,
      },
      { availableWeeks },
    );
  }

  private async syncOneSessionPerWeekDefaults(semesterId?: string) {
    const subjects = await this.prisma.subject.findMany({
      select: {
        id: true,
        credits: true,
        theoryHours: true,
        practiceHours: true,
        theoryPeriods: true,
        practicePeriods: true,
        theorySessionsPerWeek: true,
        practiceSessionsPerWeek: true,
        examType: true,
        examForm: true,
      },
    });
    const subjectUpdates = subjects
      .map((subject) => {
        const snapshot = this.buildDefaultStudySnapshot(subject);
        const needsUpdate =
          Number(subject.theoryHours || 0) !== snapshot.theoryPeriods ||
          Number(subject.practiceHours || 0) !== snapshot.practicePeriods ||
          Number(subject.theoryPeriods || 0) !== snapshot.theoryPeriods ||
          Number(subject.practicePeriods || 0) !== snapshot.practicePeriods ||
          Number(subject.theorySessionsPerWeek || 0) !==
            snapshot.theorySessionsPerWeek ||
          Number(subject.practiceSessionsPerWeek || 0) !==
            snapshot.practiceSessionsPerWeek;

        if (!needsUpdate) {
          return null;
        }

        return this.prisma.subject.update({
          where: { id: subject.id },
          data: {
            theoryHours: snapshot.theoryPeriods,
            practiceHours: snapshot.practicePeriods,
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
          },
        });
      })
      .filter(Boolean);

    for (const batch of this.chunkArray(subjectUpdates)) {
      if (!batch.length) continue;
      try {
        await this.prisma.$transaction(batch as any[]);
      } catch (error) {
        this.logger.error(
          `Failed to sync subject normalization batch: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log('Syncing template items normalization...');
    const templateItems = await this.prismaCompat.trainingPlanTemplateItem.findMany(
      {
        include: {
          subject: true,
        },
      },
    );
    const templateItemUpdates = templateItems
      .map((item: any) => {
        const snapshot = this.buildDefaultStudySnapshot(item.subject, item);
        const needsUpdate =
          Number(item.theoryPeriods || 0) !== snapshot.theoryPeriods ||
          Number(item.practicePeriods || 0) !== snapshot.practicePeriods ||
          Number(item.theorySessionsPerWeek || 0) !==
            snapshot.theorySessionsPerWeek ||
          Number(item.practiceSessionsPerWeek || 0) !==
            snapshot.practiceSessionsPerWeek ||
          Number(item.periodsPerSession || 0) !== snapshot.periodsPerSession;

        if (!needsUpdate) {
          return null;
        }

        return this.prismaCompat.trainingPlanTemplateItem.update({
          where: { id: item.id },
          data: {
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            periodsPerSession: snapshot.periodsPerSession,
          },
        });
      })
      .filter(Boolean);

    for (const batch of this.chunkArray(templateItemUpdates)) {
      if (!batch.length) continue;
      try {
        await this.prismaCompat.$transaction(batch as any[]);
      } catch (error) {
        this.logger.error(
          `Failed to sync template items normalization batch: ${(error as Error).message}`,
        );
      }
    }

    this.logger.log('Syncing execution items normalization...');
    const executionItems = await this.prismaCompat.semesterPlanItem.findMany({
      where: semesterId ? { semesterPlan: { semesterId } } : undefined,
      include: {
        subject: true,
        semesterPlan: {
          include: {
            semester: {
              select: {
                startDate: true,
                endDate: true,
              },
            },
          },
        },
      },
    });
    const executionItemUpdates = executionItems
      .map((item: any) => {
        const availableWeeks = this.countTeachingWeeks(
          item?.semesterPlan?.semester?.startDate,
          item?.semesterPlan?.semester?.endDate,
        );
        const snapshot = this.buildDefaultStudySnapshot(
          item.subject,
          item,
          availableWeeks,
        );
        const needsUpdate =
          Number(item.theoryPeriods || 0) !== snapshot.theoryPeriods ||
          Number(item.practicePeriods || 0) !== snapshot.practicePeriods ||
          Number(item.theorySessionsPerWeek || 0) !==
            snapshot.theorySessionsPerWeek ||
          Number(item.practiceSessionsPerWeek || 0) !==
            snapshot.practiceSessionsPerWeek ||
          Number(item.periodsPerSession || 0) !== snapshot.periodsPerSession;

        if (!needsUpdate) {
          return null;
        }

        return this.prismaCompat.semesterPlanItem.update({
          where: { id: item.id },
          data: {
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            periodsPerSession: snapshot.periodsPerSession,
          },
        });
      })
      .filter(Boolean);

    for (const batch of this.chunkArray(executionItemUpdates)) {
      if (!batch.length) continue;
      await this.prisma.$transaction(batch as any[]);
    }

    return {
      updatedSubjects: subjectUpdates.length,
      updatedTemplateItems: templateItemUpdates.length,
      updatedExecutionItems: executionItemUpdates.length,
    };
  }

  private async clearStudySessions(prisma: any, semesterId?: string) {
    const studySessionWhere = {
      ...(semesterId ? { semesterId } : {}),
      type: { not: 'EXAM' },
    };
    const sessions = await prisma.classSession.findMany({
      where: studySessionWhere,
      select: { id: true },
    });

    if (!sessions.length) {
      return {
        clearedAttendances: 0,
        clearedSessions: 0,
      };
    }

    let clearedAttendances = 0;
    for (const batch of this.chunkArray(
      sessions.map((session: any) => session.id),
      200,
    )) {
      // FIX: Delete attendances instead of setting sessionId to null (which fails if NOT NULL)
      const result = await prisma.attendance.deleteMany({
        where: { sessionId: { in: batch } },
      });
      clearedAttendances += result.count || 0;
    }

    const deleted = await prisma.classSession.deleteMany({
      where: studySessionWhere,
    });

    return {
      clearedAttendances,
      clearedSessions: deleted.count || 0,
    };
  }

  private compactExecutionResponse(execution: any) {
    if (!execution) {
      return null;
    }

    return {
      id: execution.id,
      semesterId: execution.semesterId,
      majorId: execution.majorId,
      cohort: execution.cohort,
      templateId: execution.templateId,
      templateVersion: execution.templateVersion,
      conceptualSemester: execution.conceptualSemester,
      status: execution.status,
      executedAt: execution.executedAt,
      createdAt: execution.createdAt,
      updatedAt: execution.updatedAt,
    };
  }

  async executeExecution(id: string) {
    try {
      const result = await this.executeExecutionInternal(id, {
        createSchedules: true,
        clearExistingSchedules: false,
        markExecuted: true,
      });
      const gradeInitialization = await this.initializeGradesForCourseClasses(
        result.execution,
      );
      return {
        ...result,
        execution: this.compactExecutionResponse(result.execution),
        gradeInitialization,
      };
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async zapExecution(id: string) {
    return this.executeExecution(id);
  }

  async rebuildSchedule(id: string) {
    try {
      const result = await this.executeExecutionInternal(id, {
        createSchedules: true,
        clearExistingSchedules: true,
        markExecuted: true,
      });
      const gradeInitialization = await this.initializeGradesForCourseClasses(
        result.execution,
      );
      return {
        ...result,
        execution: this.compactExecutionResponse(result.execution),
        gradeInitialization,
      };
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async resetStudySchedules(semesterId?: string) {
    this.logger.log(`Starting resetStudySchedules for semesterId: ${semesterId || 'ALL'}`);
    try {
      this.logger.log('Normalizing study defaults...');
      const normalization = await this.syncOneSessionPerWeekDefaults(
        semesterId,
      );

      this.logger.log('Clearing existing study sessions...');
      const cleared = await this.clearStudySessions(this.prisma, semesterId);
      this.logger.log(`Cleared ${cleared.clearedSessions} sessions and ${cleared.clearedAttendances} attendances.`);

      const executions = await this.prismaCompat.semesterPlan.findMany({
        where: {
          ...(semesterId ? { semesterId } : {}),
          items: {
            some: {
              generatedCourseClassId: { not: null },
            },
          },
        },
        select: {
          id: true,
          semesterId: true,
        },
        orderBy: [{ semesterId: 'asc' }, { updatedAt: 'asc' }],
      });

      this.logger.log(`Found ${executions.length} plans to rebuild.`);

      const conflicts: string[] = [];
      let rebuiltExecutions = 0;
      let rebuiltClasses = 0;
      let initializedGrades = 0;

      for (const execution of executions) {
        try {
          this.logger.log(`Rebuilding plan execution: ${execution.id}`);
          const result = await this.executeExecutionInternal(execution.id, {
            createSchedules: true,
            clearExistingSchedules: false,
            markExecuted: true,
          });
          const gradeInitialization =
            await this.initializeGradesForCourseClasses(result.execution);
          rebuiltExecutions += 1;
          rebuiltClasses += Number(result?.summary?.scheduledClasses || 0);
          initializedGrades += Number(
            gradeInitialization?.createdGrades || 0,
          );
          if (result?.summary?.conflicts?.length) {
            conflicts.push(...result.summary.conflicts);
          }
        } catch (error) {
          this.logger.error(`Error rebuilding execution ${execution.id}: ${error.message}`);
          conflicts.push(
            `Không thể dựng lại lịch cho execution ${execution.id}: ${(error as Error).message}`,
          );
        }
      }

      this.logger.log('Counting orphan classes...');
      const orphanCourseClasses = await this.prisma.courseClass.count({
        where: {
          ...(semesterId ? { semesterId } : {}),
          generatedPlanItems: {
            none: {},
          },
        },
      });

      this.logger.log('Reset process completed.');
      return {
        status: conflicts.length ? 'partial' : 'success',
        semesterId: semesterId || null,
        normalization,
        ...cleared,
        rebuiltExecutions,
        totalExecutions: executions.length,
        rebuiltClasses,
        initializedGrades,
        orphanCourseClasses,
        conflicts,
      };
    } catch (error) {
      this.logger.error(`Reset process failed critically: ${error.message}`, error.stack);
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }

  async findClasses(semesterId: string) {
    if (!semesterId) return [];
    return this.prisma.courseClass.findMany({
      where: { semesterId },
      include: {
        subject: {
          include: { department: { include: { faculty: true } } },
        },
        semester: true,
        lecturer: true,
        adminClasses: true,
        sessions: { include: { room: true } },
        _count: { select: { sessions: true, enrollments: true } },
      },
      orderBy: [{ subject: { name: 'asc' } }, { code: 'asc' }],
    });
  }

  async getCurriculumByMajor(
    majorId: string,
    cohort: string,
    semesterNumber?: number,
  ) {
    try {
      const curriculumItems = await this.prisma.curriculum.findMany({
        where: {
          majorId,
          cohort,
          ...(semesterNumber ? { suggestedSemester: semesterNumber } : {}),
        },
        include: {
          subject: { include: { department: true, major: true } },
        },
        orderBy: { suggestedSemester: 'asc' },
      });

      if (curriculumItems.length > 0) {
        return curriculumItems;
      }

      const template = await this.getLatestPublishedTemplate(majorId, cohort);
      if (!template) {
        return [];
      }

      return (template.items || [])
        .filter((item: any) =>
          semesterNumber ? item.conceptualSemester === semesterNumber : true,
        )
        .sort(
          (left: any, right: any) =>
            left.conceptualSemester - right.conceptualSemester,
        )
        .map((item: any) => ({
          id: item.id,
          majorId: template.majorId,
          subjectId: item.subjectId,
          cohort: template.cohort,
          suggestedSemester: item.conceptualSemester,
          isRequired: item.isRequired,
          subject: item.subject,
        }));
    } catch (error: any) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }

      this.logger.error(
        `Curriculum lookup failed for major=${majorId}, cohort=${cohort}, semester=${semesterNumber}: ${error?.message || error}`,
        error?.stack,
      );

      const fallbackItems = await this.prisma.curriculum.findMany({
        where: {
          majorId,
          cohort,
          ...(semesterNumber ? { suggestedSemester: semesterNumber } : {}),
        },
        include: {
          subject: true,
        },
        orderBy: { suggestedSemester: 'asc' },
      });

      return fallbackItems;
    }
  }

  async saveBlueprint(
    majorId: string,
    cohort: string,
    items: { subjectId: string; suggestedSemester: number }[],
  ) {
    const template = await this.saveTemplate({
      majorId,
      cohort,
      items: (items || []).map((item) => ({
        subjectId: item.subjectId,
        conceptualSemester: item.suggestedSemester,
        isRequired: true,
      })),
    });

    return {
      success: true,
      count: items.length,
      templateId: template?.id,
      version: template?.version,
    };
  }

  async duplicateBlueprint(
    majorId: string,
    sourceCohort: string,
    targetCohorts: string[],
  ) {
    const template = await this.getActiveTemplate(majorId, sourceCohort);
    if (!template) {
      throw new BadRequestException(
        `Không tìm thấy kế hoạch nguồn cho khóa ${sourceCohort}.`,
      );
    }
    return this.copyTemplate(template.id, targetCohorts);
  }

  async getExpectedStudents(majorId: string, cohort: string) {
    try {
      const adminClasses = await this.getAdminClassesForExecution(
        majorId,
        cohort,
      );

      return {
        totalCount: adminClasses.reduce(
          (sum, adminClass) => sum + adminClass.students.length,
          0,
        ),
        classCount: adminClasses.length,
      };
    } catch (error: any) {
      this.logger.error(
        `Expected student lookup failed for major=${majorId}, cohort=${cohort}: ${error?.message || error}`,
        error?.stack,
      );

      const majorIds = await this.resolveEquivalentMajorIds(majorId);
      const adminClasses = await this.prisma.adminClass.findMany({
        where: {
          majorId: majorIds.length === 1 ? majorIds[0] : { in: majorIds },
          cohort,
        },
        select: { id: true },
      });

      const adminClassIds = adminClasses.map((item) => item.id);
      if (!adminClassIds.length) {
        return { totalCount: 0, classCount: 0 };
      }

      const totalCount = await this.prisma.student.count({
        where: {
          adminClassId: { in: adminClassIds },
          status: 'STUDYING',
        },
      });

      return {
        totalCount,
        classCount: adminClassIds.length,
      };
    }
  }

  async copyCurriculumToSemester(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    return this.applyBlueprintToSemester(
      semesterId,
      majorId,
      cohort,
      subjectIds,
    );
  }

  async applyBlueprintToSemester(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    const execution = await this.generateExecution(semesterId, majorId, cohort);
    const result = await this.executeExecutionInternal(execution.id, {
      subjectIds,
      createSchedules: false,
      clearExistingSchedules: false,
      markExecuted: false,
    });

    return {
      created: result.summary.createdClasses,
      skipped: result.summary.conflicts.length,
      total: result.summary.processed,
      enrolledCount: result.summary.enrolledCount,
      semesterName: result.execution.semester?.name,
      executionId: result.summary.executionId,
      conflicts: result.summary.conflicts,
    };
  }

  async bulkCreatePlan(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    const execution = await this.generateExecution(semesterId, majorId, cohort);
    const result = await this.executeExecutionInternal(execution.id, {
      subjectIds,
      createSchedules: true,
      clearExistingSchedules: false,
      markExecuted: true,
    });

    return {
      status: 'success',
      setup: {
        created: result.summary.createdClasses,
        skipped: result.summary.conflicts.length,
        total: result.summary.processed,
        enrolledCount: result.summary.enrolledCount,
      },
      scheduling: {
        status: result.summary.conflicts.length ? 'partial' : 'success',
        scheduledClasses: result.summary.scheduledClasses,
        totalClasses: result.summary.processed,
        conflicts: result.summary.conflicts,
      },
      execution: result.execution,
    };
  }

  async generateFullCohortPlan(majorId: string, cohort: string) {
    const semesters = await this.prisma.semester.findMany({
      orderBy: { startDate: 'asc' },
    });
    let count = 0;

    for (const semester of semesters) {
      const conceptual = this.parseConceptualSemester(semester);
      if (!conceptual || conceptual < 1 || conceptual > 8) continue;
      try {
        await this.generateExecution(semester.id, majorId, cohort);
        count += 1;
      } catch (error) {
        this.logger.warn(
          `Skipping generateFull for semester ${semester.code}: ${(error as Error).message}`,
        );
      }
    }

    return { count };
  }

  async autoRunUpToCurrent(
    majorId: string,
    cohort: string,
    semesterIds: string[],
  ) {
    if (!majorId || !cohort) {
      throw new BadRequestException('Thiếu ngành hoặc khóa sinh viên.');
    }

    const ids = [...new Set((semesterIds || []).filter(Boolean))];
    if (!ids.length) {
      throw new BadRequestException('Không có học kỳ hợp lệ để chạy tự động.');
    }

    const template = await this.getLatestPublishedTemplate(majorId, cohort);
    if (!template?.items?.length) {
      throw new BadRequestException(
        'Chưa có mẫu kế hoạch đã phát hành cho ngành và khóa này.',
      );
    }

    const semesters = await this.prisma.semester.findMany({
      where: { id: { in: ids } },
      orderBy: { startDate: 'asc' },
    });

    if (!semesters.length) {
      throw new BadRequestException('Không tìm thấy học kỳ để chạy tự động.');
    }

    const summary = {
      requestedSemesters: ids.length,
      processedSemesters: 0,
      createdClasses: 0,
      enrolledCount: 0,
      scheduledClasses: 0,
      conflicts: [] as string[],
      runs: [] as any[],
    };

    let lastExecutionId: string | null = null;

    for (const semester of semesters) {
      const conceptualSemester = this.parseConceptualSemester(semester);
      if (
        !conceptualSemester ||
        conceptualSemester < 1 ||
        conceptualSemester > 8
      ) {
        summary.runs.push({
          semesterId: semester.id,
          semesterCode: semester.code,
          semesterName: semester.name,
          status: 'SKIPPED',
          reason: 'Học kỳ không map được vào HK1-HK8.',
        });
        continue;
      }

      const relevantItems = template.items.filter(
        (item: any) => item.conceptualSemester === conceptualSemester,
      );

      if (!relevantItems.length) {
        summary.runs.push({
          semesterId: semester.id,
          semesterCode: semester.code,
          semesterName: semester.name,
          status: 'SKIPPED',
          reason: `Không có môn học cho HK${conceptualSemester}.`,
        });
        continue;
      }

      try {
        const execution = await this.generateExecution(
          semester.id,
          majorId,
          cohort,
        );
        const result = await this.executeExecutionInternal(execution.id, {
          createSchedules: true,
          clearExistingSchedules: false,
          markExecuted: true,
        });

        lastExecutionId = result.summary.executionId;
        summary.processedSemesters += 1;
        summary.createdClasses += result.summary.createdClasses;
        summary.enrolledCount += result.summary.enrolledCount;
        summary.scheduledClasses += result.summary.scheduledClasses;
        if (result.summary.conflicts?.length) {
          summary.conflicts.push(...result.summary.conflicts);
        }

        summary.runs.push({
          semesterId: semester.id,
          semesterCode: semester.code,
          semesterName: semester.name,
          status: result.summary.conflicts?.length > 0 ? 'PARTIAL' : 'SUCCESS',
          processedItems: result.summary.processed,
          createdClasses: result.summary.createdClasses,
          scheduledClasses: result.summary.scheduledClasses,
          conflicts: result.summary.conflicts?.length || 0,
          executionId: result.summary.executionId,
        });
      } catch (error) {
        summary.runs.push({
          semesterId: semester.id,
          semesterCode: semester.code,
          semesterName: semester.name,
          status: 'ERROR',
          reason: (error as Error).message,
        });
        summary.conflicts.push((error as Error).message);
      }
    }

    return {
      success: true,
      summary,
      currentExecution: lastExecutionId
        ? await this.getExecution(lastExecutionId)
        : null,
    };
  }

  async findClassesByCohort(majorId: string, cohort: string) {
    return this.prisma.courseClass.findMany({
      where: {
        OR: [
          { cohort, subject: { majorId } },
          { adminClasses: { some: { majorId, cohort } } },
        ],
      },
      include: {
        subject: {
          include: {
            department: { include: { faculty: true } },
          },
        },
        semester: true,
        lecturer: true,
        adminClasses: true,
        sessions: { include: { room: true } },
        _count: { select: { sessions: true, enrollments: true } },
      },
      orderBy: [{ semester: { startDate: 'asc' } }, { code: 'asc' }],
    });
  }

  async updateClassFactors(
    classId: string,
    sessionsPerWeek: number,
    periodsPerSession: number,
  ) {
    return this.prisma.courseClass.update({
      where: { id: classId },
      data: {
        sessionsPerWeek: this.positive(
          sessionsPerWeek,
          DEFAULT_SESSIONS_PER_WEEK,
        ),
        periodsPerSession: this.positive(
          periodsPerSession,
          DEFAULT_PERIODS_PER_SESSION,
        ),
      },
    });
  }

  async deleteExecutionClass(classId: string) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: classId },
    });

    if (!courseClass) {
      throw new NotFoundException(
        `Không tìm thấy lớp học phần với ID ${classId}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const existingGrades = await tx.grade.findMany({
        where: { courseClassId: classId },
        select: {
          id: true,
          isLocked: true,
          attendanceScore: true,
          totalScore10: true,
          examScore1: true,
          examScore2: true,
          finalScore1: true,
          finalScore2: true,
        },
      });

      const hasProtectedGrades = existingGrades.some((grade) => {
        return (
          grade.isLocked === true ||
          grade.attendanceScore !== null ||
          grade.totalScore10 !== null ||
          grade.examScore1 !== null ||
          grade.examScore2 !== null ||
          grade.finalScore1 !== null ||
          grade.finalScore2 !== null
        );
      });

      if (hasProtectedGrades) {
        throw new BadRequestException(
          `Lớp ${courseClass.code} đã có điểm hoặc đã khóa điểm, không thể xóa để làm lại.`,
        );
      }

      const linkedItems = await tx.semesterPlanItem.findMany({
        where: { generatedCourseClassId: classId },
        select: {
          id: true,
          lecturerId: true,
          subject: { select: { credits: true } },
          subjectId: true,
          adminClassId: true,
          semesterPlanId: true,
          theoryPeriods: true,
          practicePeriods: true,
          theorySessionsPerWeek: true,
          practiceSessionsPerWeek: true,
          periodsPerSession: true,
        },
      });

      // 1. Unlink from SemesterPlanItems
      await tx.semesterPlanItem.updateMany({
        where: { generatedCourseClassId: classId },
        data: {
          generatedCourseClassId: null,
        },
      });

      // 2. Cleanup sessions and attendances (attendances are onDelete: NoAction)
      const sessions = await tx.classSession.findMany({
        where: { courseClassId: classId },
        select: { id: true },
      });
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length > 0) {
        await tx.attendance.deleteMany({
          where: { sessionId: { in: sessionIds } },
        });
      }

      await tx.classSession.deleteMany({
        where: { courseClassId: classId },
      });

      // 3. Cleanup exam assignments linked to grades/class
      const grades = await tx.grade.findMany({
        where: { courseClassId: classId },
        select: { id: true },
      });
      const gradeIds = grades.map((grade) => grade.id);

      if (gradeIds.length > 0) {
        await tx.examStudentAssignment.deleteMany({
          where: {
            OR: [{ courseClassId: classId }, { gradeId: { in: gradeIds } }],
          },
        });
      }

      await tx.grade.deleteMany({
        where: { courseClassId: classId },
      });

      // 4. Cleanup Enrollments
      await tx.enrollment.deleteMany({
        where: { courseClassId: classId },
      });

      // 5. Reset item defaults after class removal
      for (const item of linkedItems) {
        const semesterPlan = await tx.semesterPlan.findFirst({
          where: { id: item.semesterPlanId },
          include: {
            semester: {
              select: {
                startDate: true,
                endDate: true,
              },
            },
          },
        });
        const subject = await tx.subject.findFirst({
          where: { id: item.subjectId },
        });

        if (!subject || !semesterPlan?.semester) {
          continue;
        }

        const availableWeeks = this.countTeachingWeeks(
          semesterPlan.semester.startDate,
          semesterPlan.semester.endDate,
        );
        const snapshot = this.buildDefaultStudySnapshot(
          subject,
          item,
          availableWeeks,
        );

        await tx.semesterPlanItem.update({
          where: { id: item.id },
          data: {
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            periodsPerSession: snapshot.periodsPerSession,
            status: item.lecturerId ? 'READY' : 'DRAFT',
          },
        });
      }

      // 7. Delete the class itself
      const deletedClass = await tx.courseClass.delete({
        where: { id: classId },
      });

      const affectedPlanIds = [
        ...new Set(linkedItems.map((item) => item.semesterPlanId).filter(Boolean)),
      ];
      for (const semesterPlanId of affectedPlanIds) {
        const statuses = await tx.semesterPlanItem.findMany({
          where: { semesterPlanId },
          select: { status: true },
        });
        await tx.semesterPlan.update({
          where: { id: semesterPlanId },
          data: { status: this.derivePlanStatus(statuses) },
        });
      }

      return deletedClass;
    });
  }

  async resetExecutionClasses(executionId: string) {
    const execution = await this.prismaCompat.semesterPlan.findFirst({
      where: { id: executionId },
      include: {
        semester: {
          select: {
            startDate: true,
            endDate: true,
          },
        },
        items: {
          include: {
            subject: true,
            adminClass: {
              include: {
                students: {
                  where: { status: 'STUDYING' },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!execution) {
      throw new NotFoundException('Semester plan không tồn tại.');
    }

    const template = await this.getLatestPublishedTemplate(
      execution.majorId,
      execution.cohort,
    );
    const desiredAdminClassIds = new Set(
      (
        await this.getAdminClassesForExecution(
          execution.majorId,
          execution.cohort,
        )
      ).map((adminClass) => adminClass.id),
    );
    const desiredSubjectIds = new Set(
      (template?.items || [])
        .filter(
          (item: any) =>
            item.conceptualSemester === execution.conceptualSemester,
        )
        .map((item: any) => item.subjectId),
    );

    const generatedClassIds = [
      ...new Set(
        (execution.items || [])
          .map((item: any) => `${item.generatedCourseClassId || ''}`.trim())
          .filter(Boolean),
      ),
    ] as string[];

    let removedClasses = 0;
    const protectedClassIds = new Set<string>();
    const skippedProtectedClasses: string[] = [];
    for (const classId of generatedClassIds) {
      try {
        await this.deleteExecutionClass(classId);
        removedClasses += 1;
      } catch (error: any) {
        const message = `${error?.message || error}`;
        if (message.includes('không thể xóa để làm lại')) {
          protectedClassIds.add(classId);
          skippedProtectedClasses.push(message);
          continue;
        }
        throw error;
      }
    }

    const availableWeeks = this.countTeachingWeeks(
      execution?.semester?.startDate,
      execution?.semester?.endDate,
    );

    const removableItemIds = (execution.items || [])
      .filter(
        (item: any) =>
          !protectedClassIds.has(`${item.generatedCourseClassId || ''}`.trim()) &&
          (
            (desiredSubjectIds.size > 0 &&
              !desiredSubjectIds.has(item.subjectId)) ||
            (desiredAdminClassIds.size > 0 &&
              !desiredAdminClassIds.has(item.adminClassId))
          ),
      )
      .map((item: any) => item.id);

    await this.prisma.$transaction(async (tx) => {
      if (removableItemIds.length > 0) {
        await tx.semesterPlanItem.deleteMany({
          where: { id: { in: removableItemIds } },
        });
      }

      for (const item of execution.items || []) {
        if (removableItemIds.includes(item.id)) {
          continue;
        }

        const snapshot = this.buildDefaultStudySnapshot(
          item.subject,
          item,
          availableWeeks,
        );

        await tx.semesterPlanItem.update({
          where: { id: item.id },
          data: {
            generatedCourseClassId: null,
            expectedStudentCount: item.adminClass?.students?.length || 0,
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            periodsPerSession: snapshot.periodsPerSession,
            status: item.lecturerId ? 'READY' : 'DRAFT',
          },
        });
      }

      const statuses = await tx.semesterPlanItem.findMany({
        where: { semesterPlanId: execution.id },
        select: { status: true },
      });
      await tx.semesterPlan.update({
        where: { id: execution.id },
        data: {
          status: this.derivePlanStatus(statuses),
          executedAt: null,
        },
      });
    });

    return {
      execution: await this.getExecution(execution.id),
      removedClasses,
      removedItems: removableItemIds.length,
      keptItems:
        (execution.items || []).length - removableItemIds.length,
      skippedProtectedClasses,
    };
  }

  async automateScheduling(
    semesterId: string,
    config: { periodsPerSession?: number; sessionsPerWeek?: number } = {},
  ) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId },
    });
    if (!semester) {
      throw new NotFoundException('Học kỳ không tồn tại.');
    }

    const classes = await this.prisma.courseClass.findMany({
      where: { semesterId },
      include: {
        subject: true,
        adminClasses: true,
        sessions: true,
      },
    });

    const failures: string[] = [];
    let scheduledClasses = 0;
    const availableWeeks = this.countTeachingWeeks(
      semester?.startDate,
      semester?.endDate,
    );

    for (const courseClass of classes) {
      try {
        const result = await this.prisma.$transaction((tx) =>
          this.createSessionsForCourseClass(
            tx,
            {
              courseClass,
              semester,
              subject: courseClass.subject,
              lecturerId: courseClass.lecturerId,
              adminClassIds: courseClass.adminClasses.map(
                (adminClass) => adminClass.id,
              ),
              snapshot: {
                periodsPerSession:
                  courseClass.periodsPerSession || config.periodsPerSession,
                theorySessionsPerWeek:
                  courseClass.subject.theorySessionsPerWeek ||
                  config.sessionsPerWeek,
                practiceSessionsPerWeek:
                  courseClass.subject.practiceSessionsPerWeek ||
                  config.sessionsPerWeek,
                theoryPeriods: courseClass.subject.theoryPeriods,
                practicePeriods: courseClass.subject.practicePeriods,
              },
              requiredCapacity: Math.max(
                this.positive(courseClass.currentSlots),
                1,
              ),
            },
            {
              clearExisting: false,
              fallback: {
                ...config,
                availableWeeks,
              },
            },
          ),
        );

        if (result.alreadyScheduled || result.scheduledSessions > 0) {
          scheduledClasses += 1;
        }
        if (result.incomplete && result.issues?.length) {
          failures.push(...result.issues);
        }
      } catch (error) {
        failures.push((error as Error).message);
      }
    }

    return {
      status: failures.length ? 'partial' : 'success',
      scheduledClasses,
      totalClasses: classes.length,
      failures,
    };
  }

  async generateExamSchedules(semesterId: string) {
    const semester = await this.prisma.semester.findFirst({
      where: { id: semesterId },
    });
    if (!semester?.examStartDate || !semester?.examEndDate) {
      throw new BadRequestException('Học kỳ chưa có cấu hình ngày thi.');
    }

    const classes = await this.prisma.courseClass.findMany({
      where: { semesterId },
      include: { subject: true },
      orderBy: { code: 'asc' },
    });

    const created: any[] = [];
    let examDate = this.toDateOnly(semester.examStartDate);
    const examEnd = this.toDateOnly(semester.examEndDate);

    for (const courseClass of classes) {
      if (examDate > examEnd) {
        examDate = this.toDateOnly(semester.examStartDate);
      }

      if (examDate.getUTCDay() === 0) {
        examDate = this.addDays(examDate, 1);
      }

      const roomType =
        courseClass.subject.examType === 'THUC_HANH' ? 'PRACTICE' : 'THEORY';

      const room = await this.findAvailableRoom(
        this.prisma,
        roomType,
        Math.max(courseClass.currentSlots, 1),
        semesterId,
        examDate,
        1,
        3,
        [],
        courseClass.lecturerId,
        [],
        courseClass.id,
      );

      if (room) {
        created.push(
          await this.prisma.classSession.create({
            data: {
              courseClassId: courseClass.id,
              semesterId,
              roomId: room.id,
              date: examDate,
              startShift: 1,
              endShift: 3,
              type: 'EXAM',
              note: `Thi ${courseClass.subject.examForm || 'Tự luận'}`,
            },
          }),
        );
      }

      examDate = this.addDays(examDate, 1);
    }

    return { count: created.length };
  }

  async executeGlobalAutomation() {
    this.logger.log('Starting Global System-Wide Automation...');

    // 1. Fetch all published templates
    const allPublished = await this.prisma.trainingPlanTemplate.findMany({
      where: { status: 'PUBLISHED' },
      include: {
        items: true,
        major: true,
      },
      orderBy: { version: 'desc' },
    });

    // 1.1 Filter to only use the LATEST version for each (Major, Cohort)
    const templates: any[] = [];
    const seen = new Set<string>();
    for (const t of allPublished) {
      const key = `${t.majorId}::${t.cohort}`;
      if (!seen.has(key)) {
        templates.push(t);
        seen.add(key);
      }
    }

    // 2. Fetch all semesters
    const semesters = await this.prisma.semester.findMany({
      orderBy: { startDate: 'asc' },
    });

    const summary = {
      templatesProcessed: templates.length,
      semestersChecked: semesters.length,
      runs: [] as any[],
    };

    for (const template of templates) {
      for (const semester of semesters) {
        const conceptual = this.parseConceptualSemester(semester);
        if (!conceptual) continue;

        // 2.1 Smart Match: ensure the semester belongs to the cohort's intended year for this conceptual semester
        if (
          !this.isSemesterMatchingCohort(semester, template.cohort, conceptual)
        ) {
          continue;
        }

        // Check if this template has items for this conceptual semester
        const relevantItems = template.items.filter(
          (it) => it.conceptualSemester === conceptual,
        );
        if (!relevantItems.length) continue;

        this.logger.log(
          `Automating [${template.major.code}] Cohort [${template.cohort}] for Semester [${semester.code}] (Conceptual: HK${conceptual})`,
        );

        try {
          const result = await this.bulkCreatePlan(
            semester.id,
            template.majorId,
            template.cohort,
            relevantItems.map((it) => it.subjectId),
          );

          summary.runs.push({
            major: template.major.code,
            cohort: template.cohort,
            semester: semester.code,
            scheduled: result.scheduling.scheduledClasses,
            conflicts: result.scheduling.conflicts.length,
            status: 'SUCCESS',
          });
        } catch (error) {
          this.logger.warn(`Failed run: ${(error as Error).message}`);
          summary.runs.push({
            major: template.major.code,
            cohort: template.cohort,
            semester: semester.code,
            error: (error as Error).message,
            status: 'ERROR',
          });
        }
      }
    }

    return {
      success: true,
      summary,
    };
  }

  private isSemesterMatchingCohort(
    semester: any,
    cohortCode: string,
    conceptual: number,
  ) {
    // 1. Get cohort start year (e.g. K15 starting 2021)
    const cohortYearMatch = cohortCode.match(/\d{2}/);
    const cohortStartYear = 0;
    if (cohortYearMatch) {
      // Assuming K15 -> 2021 (university specific mapping logic)
      // Here we look at academicCohort meta if available, or assume K + Year diff
      // But a safer way is to check the AcademicCohort table
      // For now, let's use the year from the semester and compare with cohort's expected range
    }

    // Modern academic logic:
    // HK1,2 -> Year 1
    // HK3,4 -> Year 2 ...
    // HK7,8 -> Year 4
    const studyYear = Math.ceil(conceptual / 2);

    // We expect the semester name or code to contain something like "Năm X" where X matches studyYear
    // OR we check the semester startDate against a calculated offset.

    const semName = (semester.name || '').toLowerCase();
    const semCode = (semester.code || '').toLowerCase();

    // Check for "Năm 1", "Năm 2" etc in name
    const yearMatch = semName.match(/năm\s*(\d)/i);
    if (yearMatch) {
      const semStudyYear = parseInt(yearMatch[1]);
      if (semStudyYear !== studyYear) return false;
    }

    // Check for "HK1", "HK6" exactly
    const hkMatch = semCode.match(/hk(\d)/i) || semName.match(/hk\s*(\d)/i);
    if (hkMatch) {
      const semHk = parseInt(hkMatch[1]);
      if (semHk !== conceptual) return false;
    }

    return true;
  }

  async commitSubPlan(semesterId: string, majorId: string, cohort: string) {
    try {
      const existing = await this.prismaCompat.semesterPlan.findFirst({
        where: { semesterId, majorId, cohort },
      });
      const execution = existing
        ? await this.getExecution(existing.id)
        : await this.generateExecution(semesterId, majorId, cohort);

      return this.executeExecution(execution.id);
    } catch (error) {
      if (this.isTrainingPlanStorageError(error)) {
        this.throwTrainingPlanStorageError(error);
      }
      throw error;
    }
  }
}
