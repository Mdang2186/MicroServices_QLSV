import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { GpaService } from './gpa.service';

@Injectable()
export class AppService {
  private readonly publishedGradeStatuses = ['APPROVED', 'PUBLISHED'];

  private fullDemoDataJob: {
    running: boolean;
    startedAt?: string;
    finishedAt?: string;
    result?: any;
    error?: string;
  } = { running: false };

  constructor(
    private prisma: PrismaService,
    private gpaService: GpaService,
  ) {}

  private parseLegacyAdminClass(
    adminClassCode?: string | null,
    cohortCode?: string | null,
  ) {
    const code = `${adminClassCode || ''}`.trim().toUpperCase();
    const cohort = `${cohortCode || ''}`.trim().toUpperCase();
    if (!code || code.startsWith('K')) return null;

    const match = code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
    if (!match) return null;

    return {
      cohort: cohort || `K${match[1]}`,
      section: match[2].padStart(2, '0'),
      majorCode: match[3],
    };
  }

  private async resolveLinkedStudentIds(studentId: string) {
    const student = await this.prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentCode: studentId }, { userId: studentId }],
      },
      include: { adminClass: true },
    });

    if (!student) {
      return [studentId];
    }

    const linkedStudentIds = [student.id];
    const legacyMeta = this.parseLegacyAdminClass(
      student.adminClass?.code,
      student.adminClass?.cohort || student.intake,
    );

    if (!legacyMeta) {
      return linkedStudentIds;
    }

    const mirrorAdminClass = await this.prisma.adminClass.findFirst({
      where: {
        cohort: legacyMeta.cohort,
        code: {
          startsWith: `${legacyMeta.cohort}-`,
          contains: `-${legacyMeta.majorCode}`,
          endsWith: `-${legacyMeta.section}`,
        },
      },
      orderBy: { code: 'asc' },
      select: { id: true },
    });

    if (!mirrorAdminClass) {
      return linkedStudentIds;
    }

    const mirrorStudent = await this.prisma.student.findFirst({
      where: {
        adminClassId: mirrorAdminClass.id,
        fullName: student.fullName,
        status: 'STUDYING',
      },
      select: { id: true },
    });

    if (mirrorStudent?.id) {
      linkedStudentIds.push(mirrorStudent.id);
    }

    return [...new Set(linkedStudentIds)];
  }

  private isPublishedGradeStatus(status?: string | null) {
    return this.publishedGradeStatuses.includes(
      `${status || ''}`.trim().toUpperCase(),
    );
  }

  private getGradePriority(grade: any) {
    let score = 0;
    if (this.isPublishedGradeStatus(grade?.status)) score += 100;
    if (grade?.isLocked) score += 20;
    if (Number.isFinite(Number(grade?.totalScore10))) {
      score += 10 + Number(grade.totalScore10);
    }
    if (Number.isFinite(Number(grade?.examScore2))) score += 2;
    if (Number.isFinite(Number(grade?.examScore1))) score += 1;
    return score;
  }

  private dedupeStudentGrades(grades: any[]) {
    const bestBySemesterSubject = new Map<string, any>();

    for (const grade of grades) {
      const semesterId =
        grade?.courseClass?.semester?.id || grade?.courseClass?.semesterId || '';
      const subjectId = grade?.subjectId || grade?.subject?.id || '';
      const key = semesterId && subjectId ? `${semesterId}::${subjectId}` : grade.id;

      const existing = bestBySemesterSubject.get(key);
      if (
        !existing ||
        this.getGradePriority(grade) > this.getGradePriority(existing)
      ) {
        bestBySemesterSubject.set(key, grade);
      }
    }

    return [...bestBySemesterSubject.values()].sort((left, right) => {
      const leftTime = left?.courseClass?.semester?.startDate
        ? new Date(left.courseClass.semester.startDate).getTime()
        : 0;
      const rightTime = right?.courseClass?.semester?.startDate
        ? new Date(right.courseClass.semester.startDate).getTime()
        : 0;

      if (leftTime !== rightTime) {
        return rightTime - leftTime;
      }

      return `${left?.subject?.code || ''} ${left?.subject?.name || ''}`.localeCompare(
        `${right?.subject?.code || ''} ${right?.subject?.name || ''}`,
        'vi',
      );
    });
  }

  private buildDefaultScorePayload(subject?: {
    credits?: number | null;
    practiceHours?: number | null;
  } | null) {
    const credits = Math.max(Number(subject?.credits) || 0, 1);
    const hasPractice = Number(subject?.practiceHours) > 0;

    return {
      regularScores: JSON.stringify([null, null, null]),
      coef1Scores: JSON.stringify(Array.from({ length: credits }, () => null)),
      coef2Scores: JSON.stringify(Array.from({ length: credits }, () => null)),
      practiceScores: hasPractice ? JSON.stringify([null, null]) : null,
    };
  }

  private hashSeed(value: string) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
      hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  private pickSeededScore(
    seed: string,
    min: number,
    max: number,
    step = 0.5,
  ) {
    const totalSteps = Math.max(Math.round((max - min) / step), 0);
    const bucket = this.hashSeed(seed) % (totalSteps + 1);
    return this.roundOneDecimal(min + bucket * step) ?? min;
  }

  private buildSeededScoreArray(
    seedPrefix: string,
    length: number,
    min: number,
    max: number,
  ) {
    return JSON.stringify(
      Array.from({ length }, (_, index) =>
        this.pickSeededScore(`${seedPrefix}:${index}`, min, max),
      ),
    );
  }

  private isBlankScoreArray(value?: string | null) {
    const parsed = this.parseNullableScoreArray(value ?? null);
    return parsed.length === 0 || parsed.every((item) => item === null);
  }

  private hasMeaningfulGradeData(grade: any) {
    return Boolean(
      grade?.attendanceScore !== null ||
        grade?.tbThuongKy !== null ||
        grade?.examScore1 !== null ||
        grade?.examScore2 !== null ||
        grade?.finalScore1 !== null ||
        grade?.finalScore2 !== null ||
        grade?.totalScore10 !== null ||
        grade?.totalScore4 !== null ||
        grade?.letterGrade ||
        grade?.notes ||
        !this.isBlankScoreArray(grade?.regularScores) ||
        !this.isBlankScoreArray(grade?.coef1Scores) ||
        !this.isBlankScoreArray(grade?.coef2Scores) ||
        !this.isBlankScoreArray(grade?.practiceScores),
    );
  }

  private async ensureClassGrades(
    classId: string,
    options?: {
      subjectId?: string;
      studentIds?: string[];
      seedScoreHeads?: boolean;
    },
  ) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: classId },
      select: {
        subjectId: true,
        subject: {
          select: {
            id: true,
            credits: true,
            practiceHours: true,
          },
        },
      },
    });

    const subjectId = options?.subjectId || courseClass?.subjectId;
    if (!subjectId) {
      throw new NotFoundException('Lớp học phần hoặc học phần không tồn tại');
    }

    const subject =
      courseClass?.subject ||
      (await this.prisma.subject.findUnique({
        where: { id: subjectId },
        select: {
          id: true,
          credits: true,
          practiceHours: true,
        },
      }));

    if (!subject) {
      throw new NotFoundException('Học phần không tồn tại');
    }

    const enrolledStudentIds = options?.studentIds?.length
      ? [...new Set(options.studentIds.filter(Boolean))]
      : (
          await this.prisma.enrollment.findMany({
            where: { courseClassId: classId },
            select: { studentId: true },
          })
        ).map((enrollment) => enrollment.studentId);

    const existingGrades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
      select: {
        id: true,
        studentId: true,
        regularScores: true,
        coef1Scores: true,
        coef2Scores: true,
        practiceScores: true,
      },
    });

    const defaultScores = this.buildDefaultScorePayload(subject);
    let backfilledGrades = 0;

    if (options?.seedScoreHeads) {
      for (const grade of existingGrades) {
        const needsBackfill =
          grade.regularScores === null ||
          grade.coef1Scores === null ||
          grade.coef2Scores === null ||
          (Number(subject.practiceHours) > 0 && grade.practiceScores === null);

        if (!needsBackfill) {
          continue;
        }

        await this.prisma.grade.update({
          where: { id: grade.id },
          data: {
            ...(grade.regularScores === null
              ? { regularScores: defaultScores.regularScores }
              : {}),
            ...(grade.coef1Scores === null
              ? { coef1Scores: defaultScores.coef1Scores }
              : {}),
            ...(grade.coef2Scores === null
              ? { coef2Scores: defaultScores.coef2Scores }
              : {}),
            ...(grade.practiceScores === null && defaultScores.practiceScores
              ? { practiceScores: defaultScores.practiceScores }
              : {}),
          },
        });
        backfilledGrades += 1;
      }
    }

    const existingStudentIds = new Set(existingGrades.map((g) => g.studentId));
    const missingStudentIds = enrolledStudentIds.filter(
      (studentId) => !existingStudentIds.has(studentId),
    );

    if (missingStudentIds.length > 0) {
      await this.prisma.grade.createMany({
        data: missingStudentIds.map((studentId) => ({
          studentId,
          courseClassId: classId,
          subjectId,
          isEligibleForExam: true,
          isAbsentFromExam: false,
          isPassed: false,
          isLocked: false,
          status: 'DRAFT',
          ...defaultScores,
        })),
      });
    }

    return {
      classId,
      subjectId,
      enrolledCount: enrolledStudentIds.length,
      existingGrades: existingGrades.length,
      createdGrades: missingStudentIds.length,
      backfilledGrades,
    };
  }

  getHello(): string {
    return 'Hello World!';
  }

  async getStudentGrades(studentId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        status: { in: this.publishedGradeStatuses },
      },
      include: {
        subject: true,
        courseClass: {
          include: { semester: true },
        },
      },
    });

    return this.dedupeStudentGrades(grades);
  }

  async getClassGrades(classId: string) {
    await this.ensureClassGrades(classId);
    return this.prisma.grade.findMany({
      where: { courseClassId: classId },
      include: {
        student: {
          include: { user: true, adminClass: true },
        },
      },
    });
  }

  async initializeGrades(
    classId: string,
    subjectId: string,
    studentIds: string[],
  ) {
    await this.ensureClassGrades(classId, {
      subjectId,
      studentIds,
      seedScoreHeads: true,
    });
    return this.getClassGrades(classId);
  }

  async bulkUpdateGrades(grades: any[], userRole?: string) {
    const normalizedRole = `${userRole || ''}`.trim().toUpperCase();
    const isStaff =
      normalizedRole === 'ACADEMIC_STAFF' ||
      normalizedRole === 'SUPER_ADMIN' ||
      normalizedRole === 'ADMIN';
    const nextStatus = isStaff ? 'PENDING_APPROVAL' : 'DRAFT';

    // Verify user can update
    const uniqueClassIds = [
      ...new Set(grades.map((g) => g.courseClassId).filter(Boolean)),
    ];
    // Normally we should check midtermDeadline here if needed, but we'll accept raw input for flexibility.

    const result = await this.prisma.$transaction(
      grades.map((g) => {
        const updateData: any = {};
        const scoreArrayFields = [
          'regularScores',
          'coef1Scores',
          'coef2Scores',
          'practiceScores',
        ];
        for (const field of scoreArrayFields) {
          if (Object.prototype.hasOwnProperty.call(g, field)) {
            updateData[field] = this.normalizeStoredScoreArray(g[field]);
          }
        }

        if (Object.prototype.hasOwnProperty.call(g, 'notes')) {
          updateData.notes =
            typeof g.notes === 'string' ? g.notes.trim() || null : g.notes ?? null;
        }

        if (isStaff) {
          if (Object.prototype.hasOwnProperty.call(g, 'examScore1')) {
            updateData.examScore1 = this.normalizeStoredScore(g.examScore1);
          }
          if (Object.prototype.hasOwnProperty.call(g, 'examScore2')) {
            updateData.examScore2 = this.normalizeStoredScore(g.examScore2);
          }
        }

        const booleanFields = isStaff ? ['isAbsentFromExam'] : [];
        for (const field of booleanFields) {
          if (Object.prototype.hasOwnProperty.call(g, field)) {
            updateData[field] = Boolean(g[field]);
          }
        }
        updateData.status = nextStatus;
        updateData.isLocked = false;

        return this.prisma.grade.updateMany({
          where: { id: g.id },
          data: updateData,
        });
      }),
    );

    for (const classId of uniqueClassIds) {
      await this.recalculateClassGradeResults(classId);
      await this.syncClassStudentPerformance(classId);
    }

    return result;
  }

  /**
   * Tự động tính điểm chuyên cần từ lịch sử điểm danh
   * Dựa trên: [Số buổi vắng] / [Tổng số buổi theo chương trình]
   */
  async syncAttendanceScores(
    classId: string,
    options?: {
      markPending?: boolean;
      recalculate?: boolean;
      syncPerformance?: boolean;
    },
  ) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseClassId: classId },
      include: {
        attendances: true,
        courseClass: {
          include: {
            sessions: true,
            subject: true,
          },
        },
      },
    });

    const attendanceUpdates = [];
    for (const enr of enrollments) {
      const sessions = enr.courseClass.sessions || [];
      const totalPeriods = sessions.reduce(
        (sum, session) =>
          sum + Math.max(Number(session.endShift) - Number(session.startShift) + 1, 0),
        0,
      );

      const attendanceByDate = new Map(
        (enr.attendances || []).map((attendance) => [
          new Date(attendance.date).toISOString().slice(0, 10),
          attendance.status,
        ]),
      );

      const absentPeriods = sessions.reduce((sum, session) => {
        const key = new Date(session.date).toISOString().slice(0, 10);
        const status = attendanceByDate.get(key);
        if (status !== 'ABSENT' && status !== 'ABSENT_UNEXCUSED') {
          return sum;
        }

        return (
          sum +
          Math.max(Number(session.endShift) - Number(session.startShift) + 1, 0)
        );
      }, 0);

      const totalScheduledPeriods = Math.max(totalPeriods, 1);
      const ccScore = this.calculateAttendancePoints(
        absentPeriods,
        totalScheduledPeriods,
      );

      attendanceUpdates.push(
        this.prisma.grade.updateMany({
          where: { studentId: enr.studentId, courseClassId: classId },
          data: {
            attendanceScore: ccScore,
            isEligibleForExam: ccScore > 0,
          },
        }),
      );
    }

    for (let index = 0; index < attendanceUpdates.length; index += 50) {
      await this.prisma.$transaction(attendanceUpdates.slice(index, index + 50));
    }

    if (options?.markPending !== false) {
      await this.prisma.grade.updateMany({
        where: { courseClassId: classId },
        data: { status: 'PENDING_APPROVAL', isLocked: false },
      });
    }

    if (options?.recalculate === false) {
      return { count: enrollments.length };
    }

    const result = await this.recalculateClassGradeResults(classId);
    if (options?.syncPerformance !== false) {
      await this.syncClassStudentPerformance(classId);
    }
    return result;
  }

  private mapGrade10ToLetter(score: number): {
    letter: string;
    scale4: number;
  } {
    if (score >= 8.5) return { letter: 'A', scale4: 4.0 };
    if (score >= 7.8) return { letter: 'B+', scale4: 3.5 };
    if (score >= 7.0) return { letter: 'B', scale4: 3.0 };
    if (score >= 6.3) return { letter: 'C+', scale4: 2.5 };
    if (score >= 5.5) return { letter: 'C', scale4: 2.0 };
    if (score >= 4.8) return { letter: 'D+', scale4: 1.5 };
    if (score >= 4.0) return { letter: 'D', scale4: 1.0 };
    if (score >= 3.0) return { letter: 'F+', scale4: 0.5 };
    return { letter: 'F', scale4: 0.0 };
  }

  private roundOneDecimal(value: number | null) {
    if (!Number.isFinite(Number(value))) return null;
    return Math.round(Number(value) * 10) / 10;
  }

  private normalizeStoredScore(value: unknown) {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
      const normalized = value.trim().replace(',', '.');
      if (!normalized) return null;
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed)) return null;
      return this.roundOneDecimal(Math.max(0, Math.min(10, parsed)));
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return this.roundOneDecimal(Math.max(0, Math.min(10, parsed)));
  }

  private normalizeStoredScoreArray(value: string | null | undefined) {
    if (value === null || value === undefined) return null;
    return JSON.stringify(
      this.parseNullableScoreArray(value).map((item) =>
        item === null ? null : this.normalizeStoredScore(item),
      ),
    );
  }

  private parseNullableScoreArray(jsonStr: string | null): (number | null)[] {
    try {
      const parsed = jsonStr ? JSON.parse(jsonStr) : [];
      if (!Array.isArray(parsed)) return [];
      return parsed.map((value) => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string') {
          const normalized = value.trim().replace(',', '.');
          if (!normalized) return null;
          const num = Number(normalized);
          return Number.isFinite(num)
            ? this.roundOneDecimal(Math.max(0, Math.min(10, num)))
            : null;
        }

        const num = Number(value);
        return Number.isFinite(num)
          ? this.roundOneDecimal(Math.max(0, Math.min(10, num)))
          : null;
      });
    } catch {
      return [];
    }
  }

  private calculateWeightedAverage(
    items: Array<{ value: number | null | undefined; weight: number }>,
  ) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const item of items) {
            if (item.value === null || item.value === undefined) continue; const score = Number(item.value);
      if (!Number.isFinite(score)) continue;
      weightedSum += score * item.weight;
      totalWeight += item.weight;
    }

    if (totalWeight <= 0) return null;
    return this.roundOneDecimal(weightedSum / totalWeight);
  }

  public calculateAttendancePoints(
    missedPeriods: number,
    totalPeriods: number,
  ): number {
    if (totalPeriods === 0) return 10;
    const pct = (missedPeriods / totalPeriods) * 100;

    // [UNETI RULE] Vắng mặt >= 50% số tiết => Cấm thi (0 điểm CC)
    if (pct >= 50) return 0;

    // Bảng quy đổi điểm chuyên cần UNETI:
    // 0% -> 10; <10% -> 8; [10%,20%) -> 6; [20%,35%) -> 4; [35%,50%) -> 2
    if (pct === 0) return 10;
    if (pct < 10) return 8;
    if (pct < 20) return 6;
    if (pct < 35) return 4;
    return 2;
  }

  private getTrainingClassification(score: number) {
    if (score >= 90) return 'Xuất sắc';
    if (score >= 80) return 'Tốt';
    if (score >= 70) return 'Khá';
    if (score >= 60) return 'Trung bình khá';
    if (score >= 50) return 'Trung bình';
    if (score >= 35) return 'Yếu';
    return 'Kém';
  }

  private parseCohortStartYear(cohort?: string | null) {
    const raw = `${cohort || ''}`.trim().toUpperCase();
    const parsed = Number(raw.replace(/\D/g, ''));
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    if (parsed >= 2000) return parsed;
    return 2006 + parsed;
  }

  private getGradeOutcome(grade: any) {
    if (grade?.isPassed) return 'PASSED';
    if (grade?.isAbsentFromExam && grade?.examScore2 === null) {
      return 'ABSENT_EXAM';
    }
    if (
      grade?.isEligibleForExam !== false &&
      grade?.finalScore1 !== null &&
      Number(grade?.finalScore1) < 4 &&
      grade?.examScore2 === null
    ) {
      return 'RETAKE_EXAM';
    }
    if (grade?.totalScore10 === null || grade?.tbThuongKy === null) {
      return 'INCOMPLETE';
    }
    return 'STUDY_AGAIN';
  }

  private isRetakeCourseClass(courseClass: any) {
    const code = `${courseClass?.code || ''}`.toUpperCase();
    const name = `${courseClass?.name || ''}`.toUpperCase();
    return code.includes('_HL_') || code.startsWith('HL_') || name.includes('HỌC LẠI');
  }

  private buildRetakeCourseCode(subjectCode: string, semesterCode: string) {
    const safeSubject = `${subjectCode || 'HP'}`
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 18);
    const safeSemester = `${semesterCode || 'SEM'}`
      .replace(/[^A-Za-z0-9]/g, '')
      .slice(0, 16);
    return `HL_${safeSemester}_${safeSubject}`.slice(0, 50);
  }

  async submitGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL', isLocked: false },
    });
  }

  private async recalculateClassGradeResults(
    classId: string,
    options?: { approve?: boolean },
  ) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: classId },
      include: { subject: true },
    });
    const sub = courseClass?.subject as any;
    if (!sub) return null;

    const credits = sub.credits ?? 3;
    const theoryHours = sub.theoryHours ?? 0;
    const practiceHours = sub.practiceHours ?? 0;
    const isTheory = theoryHours > 0 || practiceHours === 0;

    const grades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
    });
    const updateOperations = [];

    for (const g of grades) {
      const cc = g.attendanceScore ?? 0;
      const regular = this.parseNullableScoreArray(g.regularScores);
      const coef1 = this.parseNullableScoreArray(g.coef1Scores);
      const coef2 = this.parseNullableScoreArray(g.coef2Scores);
      const practice = this.parseNullableScoreArray(g.practiceScores);

      const hasTheoryProcessScore = [...regular, ...coef1, ...coef2].some(
        (value) => value !== null,
      );
      const hasPracticeScore = practice.some((value) => value !== null);

      let processAvg = null;
      let total10 = null;
      let finalScore1 = null;
      let finalScore2 = null;

      if (isTheory) {
        if (hasTheoryProcessScore) {
          processAvg = this.calculateWeightedAverage([
            { value: cc, weight: credits },
            ...regular.map((value) => ({ value, weight: 1 })),
            ...coef1.map((value) => ({ value, weight: 1 })),
            ...coef2.map((value) => ({ value, weight: 2 })),
          ]);
        }
      } else {
        if (hasPracticeScore) {
          processAvg = this.calculateWeightedAverage([
            { value: cc, weight: 1 },
            ...practice.map((value) => ({ value, weight: 1 })),
          ]);
        }
      }

      const isEligible =
        processAvg !== null && cc > 0 && Number(processAvg) >= 3.0;

      if (isTheory) {
        if (isEligible && !g.isAbsentFromExam && g.examScore1 !== null) {
          finalScore1 = this.roundOneDecimal(
            Number(processAvg) * 0.4 + Number(g.examScore1) * 0.6,
          );
        }

        if (isEligible && g.examScore2 !== null && g.examScore2 !== undefined) {
          finalScore2 = this.roundOneDecimal(
            Number(processAvg) * 0.4 + Number(g.examScore2) * 0.6,
          );
        }

        const finalCandidates = [finalScore1, finalScore2].filter((value) =>
          Number.isFinite(Number(value)),
        ) as number[];
        total10 =
          finalCandidates.length > 0
            ? this.roundOneDecimal(Math.max(...finalCandidates))
            : null;
      } else if (isEligible && processAvg !== null) {
        total10 = processAvg;
        finalScore1 = processAvg;
      }

      const gradeScale =
        total10 !== null ? this.mapGrade10ToLetter(Number(total10)) : null;
      const letter = gradeScale?.letter ?? null;
      const scale4 = gradeScale?.scale4 ?? null;

      updateOperations.push(
        this.prisma.grade.update({
          where: { id: g.id },
          data: {
            tbThuongKy: processAvg,
            finalScore1: finalScore1,
            finalScore2: finalScore2,
            totalScore10: total10,
            totalScore4: scale4,
            letterGrade: letter,
            isPassed: total10 !== null && Number(total10) >= 4.0 && isEligible,
            isEligibleForExam: isEligible,
            isAbsentFromExam: Boolean(g.isAbsentFromExam),
            ...(options?.approve ? { status: 'APPROVED', isLocked: false } : {}),
          },
        }),
      );
    }

    for (let index = 0; index < updateOperations.length; index += 50) {
      await this.prisma.$transaction(updateOperations.slice(index, index + 50));
    }

    return { count: grades.length };
  }

  private async syncClassStudentPerformance(classId: string) {
    const updatedGrades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
      select: { studentId: true },
    });

    const uniqueStudentIds = Array.from(
      new Set(updatedGrades.map((g) => g.studentId)),
    );
    for (const studentId of uniqueStudentIds) {
      await this.syncStudentPerformance(studentId);
    }
  }

  async approveGrades(classId: string, options?: { syncPerformance?: boolean }) {
    // 1. Tự động tính chuyên cần
    await this.syncAttendanceScores(classId, {
      markPending: false,
      recalculate: false,
      syncPerformance: false,
    });

    // 2. Tính toán và công bố toàn bộ danh sách lớp, vẫn mở để cán bộ đào tạo sửa sai sót trước khi kết thúc đợt.
    const result = await this.recalculateClassGradeResults(classId, {
      approve: true,
    });

    // 3. Đồng bộ GPA/CPA cho sinh viên trong lớp
    if (options?.syncPerformance !== false) {
      await this.syncClassStudentPerformance(classId);
    }

    return result;
  }

  async syncStudentPerformance(studentId: string) {
    try {
      // 1. Get current semester ID (from any grade of this student)
      const lastGrade = await this.prisma.grade.findFirst({
        where: {
          studentId,
          status: { in: this.publishedGradeStatuses },
        },
        include: { courseClass: true },
        orderBy: { courseClass: { semesterId: 'desc' } },
      });

      if (!lastGrade) return;
      const semesterId = lastGrade.courseClass.semesterId;

      // 2. Get academic summary
      const summary = await this.gpaService.getAcademicSummary(
        studentId,
        semesterId,
      );

      await this.prisma.student.update({
        where: { id: studentId },
        data: {
          gpa: summary.gpa,
          cpa: summary.cpa,
          warningLevel: summary.warningLevel,
          academicStatus: summary.warningLevel > 0 ? 'WARNING' : 'NORMAL',
          totalEarnedCredits: summary.totalCredits,
        },
      });
    } catch (error) {
      console.error(`Error syncing student ${studentId} performance:`, error);
    }
  }

  async syncAllStudentPerformance() {
    const students = await this.prisma.grade.findMany({
      where: { status: { in: this.publishedGradeStatuses } },
      distinct: ['studentId'],
      select: { studentId: true },
    });

    let syncedStudents = 0;
    for (let index = 0; index < students.length; index += 25) {
      const chunk = students.slice(index, index + 25);
      await Promise.all(
        chunk.map(async (student) => {
          await this.syncStudentPerformance(student.studentId);
          syncedStudents += 1;
        }),
      );
    }

    return { syncedStudents };
  }

  async lockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: false },
    });
  }

  async unlockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: false, status: 'DRAFT' }, // Unlocking reverts to DRAFT
    });
  }

  async bootstrapGrades(options?: { semesterId?: string; classId?: string }) {
    const courseClasses = await this.prisma.courseClass.findMany({
      where: {
        ...(options?.semesterId ? { semesterId: options.semesterId } : {}),
        ...(options?.classId ? { id: options.classId } : {}),
        enrollments: {
          some: {},
        },
      },
      select: { id: true },
      orderBy: { code: 'asc' },
    });

    let createdGrades = 0;
    let backfilledGrades = 0;

    for (const courseClass of courseClasses) {
      const result = await this.ensureClassGrades(courseClass.id, {
        seedScoreHeads: true,
      });
      createdGrades += result.createdGrades;
      backfilledGrades += result.backfilledGrades;
    }

    return {
      classCount: courseClasses.length,
      createdGrades,
      backfilledGrades,
    };
  }

  async seedSampleGrades(options?: {
    semesterId?: string;
    classId?: string;
    overwrite?: boolean;
    syncPerformance?: boolean;
  }) {
    const bootstrap = await this.bootstrapGrades(options);
    const overwrite = Boolean(options?.overwrite);

    const courseClasses = await this.prisma.courseClass.findMany({
      where: {
        ...(options?.semesterId ? { semesterId: options.semesterId } : {}),
        ...(options?.classId ? { id: options.classId } : {}),
        enrollments: { some: {} },
      },
      include: {
        subject: true,
        enrollments: {
          select: { studentId: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    let seededClasses = 0;
    let seededGrades = 0;
    let skippedClasses = 0;

    for (const courseClass of courseClasses) {
      const grades = await this.prisma.grade.findMany({
        where: { courseClassId: courseClass.id },
      });

      if (!grades.length) {
        continue;
      }

      if (!overwrite) {
        const hasProtectedData = grades.some(
          (grade) =>
            grade.isLocked ||
            `${grade.status || ''}`.toUpperCase() === 'APPROVED' ||
            this.hasMeaningfulGradeData(grade),
        );
        if (hasProtectedData) {
          skippedClasses += 1;
          continue;
        }
      }

      const credits = Math.max(Number(courseClass.subject?.credits || 0), 1);
      const hasPractice = Number(courseClass.subject?.practiceHours || 0) > 0;
      const isPracticeOnly =
        Number(courseClass.subject?.theoryHours || 0) <= 0 && hasPractice;

      let classChanged = false;
      const updateOperations = [];

      for (const grade of grades) {
        if (!overwrite && this.hasMeaningfulGradeData(grade)) {
          continue;
        }

        const baseSeed = `${courseClass.id}:${grade.studentId}`;
        const weakProfile = this.hashSeed(`${baseSeed}:profile`) % 9 === 0;
        const absentFromExam =
          !isPracticeOnly && this.hashSeed(`${baseSeed}:absent`) % 17 === 0;
        const hasRetakeScore =
          !isPracticeOnly && !absentFromExam && this.hashSeed(`${baseSeed}:retake`) % 6 === 0;

        const processMin = weakProfile ? 2.5 : 6.0;
        const processMax = weakProfile ? 4.5 : 9.0;
        const examMin = weakProfile ? 2.0 : 5.0;
        const examMax = weakProfile ? 5.5 : 9.0;

        updateOperations.push(
          this.prisma.grade.update({
            where: { id: grade.id },
            data: {
              regularScores: this.buildSeededScoreArray(
                `${baseSeed}:regular`,
                3,
                processMin,
                processMax,
              ),
              coef1Scores: this.buildSeededScoreArray(
                `${baseSeed}:coef1`,
                credits,
                processMin,
                processMax,
              ),
              coef2Scores: this.buildSeededScoreArray(
                `${baseSeed}:coef2`,
                credits,
                processMin,
                processMax,
              ),
              practiceScores: hasPractice
                ? this.buildSeededScoreArray(
                    `${baseSeed}:practice`,
                    2,
                    processMin,
                    processMax,
                  )
                : null,
              examScore1:
                !isPracticeOnly && !absentFromExam
                  ? this.pickSeededScore(`${baseSeed}:exam1`, examMin, examMax)
                  : null,
              examScore2: hasRetakeScore
                ? this.pickSeededScore(`${baseSeed}:exam2`, 4.0, 8.0)
                : null,
              isAbsentFromExam: absentFromExam,
              notes: weakProfile
                ? 'Dữ liệu mẫu: cần cải thiện kết quả học tập.'
                : 'Dữ liệu mẫu phục vụ trực quan thống kê.',
              isLocked: false,
              status: 'DRAFT',
            },
          }),
        );

        classChanged = true;
        seededGrades += 1;
      }

      if (!classChanged) {
        continue;
      }

      for (let index = 0; index < updateOperations.length; index += 50) {
        await this.prisma.$transaction(updateOperations.slice(index, index + 50));
      }
      await this.approveGrades(courseClass.id, {
        syncPerformance: options?.syncPerformance !== false,
      });
      seededClasses += 1;
    }

    return {
      ...bootstrap,
      classCount: courseClasses.length,
      seededClasses,
      seededGrades,
      skippedClasses,
      overwrite,
    };
  }

  async seedTrainingScores(options?: { overwrite?: boolean }) {
    const overwrite = Boolean(options?.overwrite);
    const semesters = await this.prisma.semester.findMany({
      orderBy: { startDate: 'asc' },
    });
    const currentSemester =
      semesters.find((semester) => semester.isCurrent) ||
      [...semesters]
        .reverse()
        .find((semester) => new Date(semester.startDate).getTime() <= Date.now()) ||
      semesters[semesters.length - 1];

    if (!currentSemester) {
      return { studentCount: 0, semesterCount: 0, upsertedScores: 0 };
    }

    const currentStart = new Date(currentSemester.startDate).getTime();
    const activeSemesters = semesters.filter(
      (semester) => new Date(semester.startDate).getTime() <= currentStart,
    );
    const students = await this.prisma.student.findMany({
      where: { status: 'STUDYING' },
      include: { adminClass: true },
      orderBy: { studentCode: 'asc' },
    });

    const scoreRows: any[] = [];

    for (const student of students) {
      const startYear =
        this.parseCohortStartYear(student.adminClass?.cohort || student.intake) ||
        new Date(student.admissionDate || activeSemesters[0]?.startDate || Date.now()).getFullYear();
      const studyStart = new Date(`${startYear}-08-01`).getTime();

      for (const semester of activeSemesters) {
        const semesterTime = new Date(semester.startDate).getTime();
        if (semesterTime < studyStart) continue;

        const seed = `${student.id}:${semester.id}:training`;
        const weak = this.hashSeed(`${seed}:weak`) % 11 === 0;
        const excellent = this.hashSeed(`${seed}:excellent`) % 13 === 0;
        const min = weak ? 45 : excellent ? 86 : 68;
        const max = weak ? 64 : excellent ? 98 : 88;
        const score = Math.round(this.pickSeededScore(seed, min, max, 1));
        scoreRows.push({
          studentId: student.id,
          semesterId: semester.id,
          score,
          classification: this.getTrainingClassification(score),
        });
      }
    }

    if (overwrite && scoreRows.length > 0) {
      for (let index = 0; index < scoreRows.length; index += 400) {
        const chunk = scoreRows.slice(index, index + 400);
        await this.prisma.trainingScore.deleteMany({
          where: {
            OR: chunk.map((row) => ({
              studentId: row.studentId,
              semesterId: row.semesterId,
            })),
          },
        });
      }
    }

    let upsertedScores = 0;
    for (let index = 0; index < scoreRows.length; index += 500) {
      const chunk = scoreRows.slice(index, index + 500);
      if (overwrite) {
        await this.prisma.trainingScore.createMany({ data: chunk });
        upsertedScores += chunk.length;
        continue;
      }

      await this.prisma.$transaction(
        chunk.map((row) =>
          this.prisma.trainingScore.upsert({
            where: {
              studentId_semesterId: {
                studentId: row.studentId,
                semesterId: row.semesterId,
              },
            },
            update: {
              score: row.score,
              classification: row.classification,
            },
            create: row,
          }),
        ),
      );
      upsertedScores += chunk.length;
    }

    return {
      studentCount: students.length,
      semesterCount: activeSemesters.length,
      upsertedScores,
      overwrite,
    };
  }

  async ensureRetakeCourseClasses() {
    const semesters = await this.prisma.semester.findMany({
      orderBy: { startDate: 'asc' },
    });
    const semesterIndex = new Map(semesters.map((semester, index) => [semester.id, index]));
    const failedGrades = await this.prisma.grade.findMany({
      where: {
        status: 'APPROVED',
        isPassed: false,
      },
      include: {
        student: { include: { adminClass: true } },
        subject: true,
        courseClass: { include: { semester: true } },
      },
      orderBy: [{ subjectId: 'asc' }, { studentId: 'asc' }],
    });

    const studyAgainGrades = failedGrades.filter(
      (grade) =>
        this.getGradeOutcome(grade) === 'STUDY_AGAIN' &&
        !this.isRetakeCourseClass(grade.courseClass),
    );
    const groups = new Map<string, any[]>();

    for (const grade of studyAgainGrades) {
      const index = semesterIndex.get(grade.courseClass.semesterId);
      const nextSemester = index === undefined ? null : semesters[index + 1];
      if (!nextSemester) continue;

      const key = `${nextSemester.id}:${grade.subjectId}`;
      groups.set(key, [...(groups.get(key) || []), grade]);
    }

    let openedClasses = 0;
    let touchedClasses = 0;
    let retakeEnrollments = 0;
    const touchedClassIds = new Set<string>();

    for (const [key, grades] of groups) {
      const [semesterId, subjectId] = key.split(':');
      const firstGrade = grades[0];
      const nextSemester = semesters.find((semester) => semester.id === semesterId);
      const subject = firstGrade.subject;
      if (!nextSemester || !subject) continue;

      const code = this.buildRetakeCourseCode(subject.code, nextSemester.code);
      let courseClass = await this.prisma.courseClass.findFirst({
        where: {
          semesterId,
          subjectId,
          OR: [{ code }, { code: { contains: `_HL_${subject.code}` } }],
        },
      });

      const uniqueStudents = [
        ...new Map(grades.map((grade) => [grade.studentId, grade])).values(),
      ];
      const adminClassIds = [
        ...new Set(
          uniqueStudents
            .map((grade) => grade.student?.adminClassId)
            .filter(Boolean),
        ),
      ] as string[];

      if (!courseClass) {
        courseClass = await this.prisma.courseClass.create({
          data: {
            subjectId,
            semesterId,
            lecturerId: firstGrade.courseClass.lecturerId,
            code,
            name: `Học lại - ${subject.name}`,
            status: 'OPEN',
            maxSlots: Math.max(uniqueStudents.length + 5, 20),
            currentSlots: uniqueStudents.length,
            cohort: firstGrade.student?.adminClass?.cohort || firstGrade.student?.intake || null,
            totalPeriods:
              Number(subject.theoryPeriods || 0) +
                Number(subject.practicePeriods || 0) ||
              Number(subject.theoryHours || 0) + Number(subject.practiceHours || 0) ||
              45,
            periodsPerSession: 3,
            sessionsPerWeek: 1,
            adminClasses: {
              connect: adminClassIds.map((id) => ({ id })),
            },
          },
        });
        openedClasses += 1;
      } else {
        await this.prisma.courseClass.update({
          where: { id: courseClass.id },
          data: {
            status: 'OPEN',
            maxSlots: { increment: 0 },
            adminClasses: {
              connect: adminClassIds.map((id) => ({ id })),
            },
          },
        });
      }

      touchedClassIds.add(courseClass.id);
      touchedClasses += 1;

      for (const grade of uniqueStudents) {
        await this.prisma.enrollment.upsert({
          where: {
            studentId_courseClassId: {
              studentId: grade.studentId,
              courseClassId: courseClass.id,
            },
          },
          update: { status: 'REGISTERED', isRetake: true },
          create: {
            studentId: grade.studentId,
            courseClassId: courseClass.id,
            status: 'REGISTERED',
            isRetake: true,
            tuitionFee: 0,
          },
        });
        retakeEnrollments += 1;
      }

      await this.ensureClassGrades(courseClass.id, { seedScoreHeads: true });
      await this.prisma.courseClass.update({
        where: { id: courseClass.id },
        data: { currentSlots: uniqueStudents.length },
      });
    }

    return {
      candidateStudents: studyAgainGrades.length,
      openedClasses,
      touchedClasses,
      retakeEnrollments,
      classIds: [...touchedClassIds],
    };
  }

  async seedFullAcademicData(options?: { overwrite?: boolean }) {
    const overwrite = options?.overwrite ?? true;
    const gradeSeed = await this.seedSampleGrades({
      overwrite,
      syncPerformance: false,
    });
    const retakeSetup = await this.ensureRetakeCourseClasses();

    let retakeSeededClasses = 0;
    for (const classId of retakeSetup.classIds) {
      await this.seedSampleGrades({
        classId,
        overwrite: true,
        syncPerformance: false,
      });
      retakeSeededClasses += 1;
    }

    const trainingSeed = await this.seedTrainingScores({ overwrite });
    const performanceSync = await this.syncAllStudentPerformance();

    return {
      success: true,
      gradeSeed,
      retakeSetup: {
        ...retakeSetup,
        retakeSeededClasses,
      },
      trainingSeed,
      performanceSync,
    };
  }

  startFullAcademicDataSeed(options?: { overwrite?: boolean }) {
    if (this.fullDemoDataJob.running) {
      return this.fullDemoDataJob;
    }

    this.fullDemoDataJob = {
      running: true,
      startedAt: new Date().toISOString(),
    };

    void this.seedFullAcademicData(options)
      .then((result) => {
        this.fullDemoDataJob = {
          running: false,
          startedAt: this.fullDemoDataJob.startedAt,
          finishedAt: new Date().toISOString(),
          result,
        };
      })
      .catch((error) => {
        console.error('Full academic data seed failed:', error);
        this.fullDemoDataJob = {
          running: false,
          startedAt: this.fullDemoDataJob.startedAt,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : `${error}`,
        };
      });

    return this.fullDemoDataJob;
  }

  getFullAcademicDataSeedStatus() {
    return this.fullDemoDataJob;
  }

  async getAdminClassProgress() {
    const adminClasses = await this.prisma.adminClass.findMany({
      select: {
        id: true,
        code: true,
        name: true,
        cohort: true,
        major: {
          select: {
            name: true,
            faculty: { select: { name: true } },
          },
        },
        students: {
          where: { status: 'STUDYING' },
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            gpa: true,
            cpa: true,
            totalEarnedCredits: true,
            trainingScores: {
              select: {
                score: true,
                classification: true,
                semester: { select: { startDate: true } },
              },
            },
          },
          orderBy: { studentCode: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    const studentIds = adminClasses.flatMap((adminClass) =>
      adminClass.students.map((student) => student.id),
    );

    const [grades, retakeClasses] = await Promise.all([
      studentIds.length
        ? this.prisma.grade.findMany({
            where: {
              studentId: { in: studentIds },
              status: { in: this.publishedGradeStatuses },
            },
            select: {
              id: true,
              studentId: true,
              subjectId: true,
              isPassed: true,
              isAbsentFromExam: true,
              isEligibleForExam: true,
              examScore2: true,
              finalScore1: true,
              totalScore10: true,
              tbThuongKy: true,
              letterGrade: true,
              subject: { select: { code: true, name: true } },
              courseClass: { select: { code: true } },
            },
          })
        : [],
      this.prisma.adminClass.findMany({
        where: {
          courseClasses: {
            some: {
              OR: [
                { code: { startsWith: 'HL_' } },
                { code: { contains: '_HL_' } },
                { name: { contains: 'Học lại' } },
              ],
            },
          },
        },
        select: {
          id: true,
          courseClasses: {
            where: {
              OR: [
                { code: { startsWith: 'HL_' } },
                { code: { contains: '_HL_' } },
                { name: { contains: 'Học lại' } },
              ],
            },
            select: {
              id: true,
              code: true,
              subjectId: true,
              semester: { select: { name: true } },
              enrollments: { select: { studentId: true } },
            },
          },
        },
      }),
    ]);
    const gradesByStudent = new Map<string, any[]>();
    for (const grade of grades) {
      gradesByStudent.set(grade.studentId, [
        ...(gradesByStudent.get(grade.studentId) || []),
        grade,
      ]);
    }
    const retakeClassItems = retakeClasses.flatMap((adminClass) => adminClass.courseClasses);

    return adminClasses.map((adminClass) => {
      const students = adminClass.students.map((student) => {
        const studentGrades = gradesByStudent.get(student.id) || [];
        const outcomes = studentGrades.map((grade) => ({
          grade,
          outcome: this.getGradeOutcome(grade),
        }));
        const latestTraining = [...(student.trainingScores || [])].sort(
          (left, right) =>
            new Date(right.semester?.startDate || 0).getTime() -
            new Date(left.semester?.startDate || 0).getTime(),
        )[0];
        const avgTraining =
          student.trainingScores.length > 0
            ? Math.round(
                student.trainingScores.reduce((sum, item) => sum + item.score, 0) /
                  student.trainingScores.length,
              )
            : null;

        return {
          id: student.id,
          studentCode: student.studentCode,
          fullName: student.fullName,
          gpa: student.gpa,
          cpa: student.cpa,
          totalEarnedCredits: student.totalEarnedCredits,
          passedSubjects: outcomes.filter((item) => item.outcome === 'PASSED').length,
          absentExamCount: outcomes.filter((item) => item.outcome === 'ABSENT_EXAM').length,
          retakeExamCount: outcomes.filter((item) => item.outcome === 'RETAKE_EXAM').length,
          studyAgainCount: outcomes.filter((item) => item.outcome === 'STUDY_AGAIN').length,
          latestTrainingScore: latestTraining?.score ?? null,
          latestTrainingClassification: latestTraining?.classification ?? null,
          avgTrainingScore: avgTraining,
        };
      });

      const allGrades = adminClass.students.flatMap((student) =>
        (gradesByStudent.get(student.id) || []).map((grade) => ({ ...grade, student })),
      );
      const studyAgainGrades = allGrades.filter(
        (grade) => this.getGradeOutcome(grade) === 'STUDY_AGAIN',
      );
      const subjectGroups = new Map<string, any[]>();
      for (const grade of studyAgainGrades) {
        subjectGroups.set(grade.subjectId, [
          ...(subjectGroups.get(grade.subjectId) || []),
          grade,
        ]);
      }

      const retakeSubjects = [...subjectGroups.entries()]
        .map(([subjectId, grades]) => {
          const openedClass = retakeClassItems.find(
            (courseClass) =>
              courseClass.subjectId === subjectId &&
              courseClass.enrollments.some((enrollment) =>
                grades.some((grade) => grade.studentId === enrollment.studentId),
              ),
          );
          const subject = grades[0]?.subject;
          return {
            subjectId,
            subjectCode: subject?.code,
            subjectName: subject?.name,
            studentCount: grades.length,
            openedClass: openedClass
              ? {
                  id: openedClass.id,
                  code: openedClass.code,
                  semester: openedClass.semester?.name,
                }
              : null,
            students: grades.map((grade) => ({
              id: grade.student.id,
              studentCode: grade.student.studentCode,
              fullName: grade.student.fullName,
              totalScore10: grade.totalScore10,
              letterGrade: grade.letterGrade,
              sourceClassCode: grade.courseClass?.code,
            })),
          };
        })
        .sort((left, right) => right.studentCount - left.studentCount);

      const avg = (items: number[]) =>
        items.length
          ? Math.round((items.reduce((sum, item) => sum + item, 0) / items.length) * 100) /
            100
          : 0;

      return {
        id: adminClass.id,
        code: adminClass.code,
        name: adminClass.name,
        cohort: adminClass.cohort,
        major: adminClass.major?.name,
        faculty: adminClass.major?.faculty?.name,
        summary: {
          studentCount: students.length,
          avgGpa: avg(students.map((student) => Number(student.gpa || 0))),
          avgCpa: avg(students.map((student) => Number(student.cpa || 0))),
          avgTraining: avg(
            students
              .map((student) => student.avgTrainingScore)
              .filter((score) => score !== null) as number[],
          ),
          absentExamCount: students.reduce((sum, student) => sum + student.absentExamCount, 0),
          retakeExamCount: students.reduce((sum, student) => sum + student.retakeExamCount, 0),
          studyAgainCount: students.reduce((sum, student) => sum + student.studyAgainCount, 0),
          warningCount: students.filter(
            (student) =>
              Number(student.cpa || 0) < 2 ||
              student.studyAgainCount > 0 ||
              student.retakeExamCount > 0,
          ).length,
        },
        students,
        retakeSubjects,
      };
    });
  }

  async remindAllPendingLecturers(semesterId: string, authHeader?: string) {
    const bootstrap = await this.bootstrapGrades({ semesterId });

    const semesterClasses = await this.prisma.courseClass.findMany({
      where: {
        semesterId,
        enrollments: { some: {} },
      },
      include: {
        lecturer: { include: { user: true } },
        subject: true,
      },
    });

    const pendingClasses: any[] = [];
    for (const courseClass of semesterClasses) {
      if (!courseClass.lecturer?.userId) {
        continue;
      }

      const grades = await this.prisma.grade.findMany({
        where: { courseClassId: courseClass.id },
        select: { status: true },
      });

      const hasPendingGrades =
        grades.length === 0 ||
        grades.some((grade) =>
          ['DRAFT', 'PENDING_APPROVAL'].includes(
            `${grade.status || ''}`.toUpperCase(),
          ),
        );

      if (hasPendingGrades) {
        pendingClasses.push(courseClass);
      }
    }

    const uniqueLecturers = new Map<string, any>();
    for (const cls of pendingClasses) {
      if (cls.lecturer?.userId) {
        const existing = uniqueLecturers.get(cls.lecturer.userId);
        const nextCourseNames = [
          ...(existing?.courseNames || []),
          `${cls.subject.name} (${cls.code})`,
        ];
        uniqueLecturers.set(cls.lecturer.userId, {
          userId: cls.lecturer.userId,
          lecturerName: cls.lecturer.fullName,
          courseNames: [...new Set(nextCourseNames)],
        });
      }
    }

    let notifiedCount = 0;
    for (const l of uniqueLecturers.values()) {
      try {
        const response = await fetch(`http://127.0.0.1:3001/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader || '',
          },
          body: JSON.stringify({
            userId: l.userId,
            title: `NHẮC NHỞ QUAN TRỌNG: Hạn nộp điểm học kỳ`,
            content: `Chào thầy/cô ${l.lecturerName}. Phòng Đào tạo nhắc nhở thầy/cô hoàn tất việc nhập điểm cho các lớp: ${l.courseNames.join(', ')}. Vui lòng thực hiện đúng hạn.`,
            type: 'URGENT',
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `Failed to notify lecturer ${l.userId}: ${response.status} ${errorText}`,
          );
          continue;
        }

        notifiedCount += 1;
      } catch (err) {
        console.error(`Failed to notify lecturer ${l.userId}:`, err);
      }
    }

    return {
      success: true,
      notifiedLecturers: notifiedCount,
      totalPendingClasses: pendingClasses.length,
      initializedGrades: bootstrap.createdGrades,
      backfilledGrades: bootstrap.backfilledGrades,
    };
  }
}
