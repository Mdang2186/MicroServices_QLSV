import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class GpaService {
  private readonly publishedGradeStatuses = ['APPROVED', 'PUBLISHED'];

  constructor(private prisma: PrismaService) {}

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

  private resolveStudentCohortCode(student: any) {
    const directCohort = `${student?.intake || student?.adminClass?.cohort || ''}`
      .trim()
      .toUpperCase();
    if (directCohort) return directCohort;

    const legacyMeta = this.parseLegacyAdminClass(student?.adminClass?.code);
    return legacyMeta?.cohort || null;
  }

  private getCohortStartYear(cohortCode?: string | null) {
    const match = `${cohortCode || ''}`.trim().toUpperCase().match(/^K(\d{2,})$/);
    return match ? 2006 + Number(match[1]) : null;
  }

  private expectedYearForSemester(cohortStartYear: number, conceptualSemester: number) {
    return cohortStartYear + Math.floor(conceptualSemester / 2);
  }

  private parseConceptualSemester(semester?: any) {
    const source = `${semester?.code || ''} ${semester?.name || ''}`.toUpperCase();
    const match =
      source.match(/HK\s*([1-8])/) ||
      source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/) ||
      source.match(/SEMESTER\s*([1-8])/);
    return match ? Number(match[1]) : null;
  }

  private getSemesterStartYear(semester?: any) {
    if (!semester) return 0;
    const startDate = semester.startDate ? new Date(semester.startDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) {
      return startDate.getFullYear();
    }
    const codeMatch = `${semester.code || ''}`.match(/(20\d{2})/);
    if (codeMatch) return Number(codeMatch[1]);
    const nameMatch = `${semester.name || ''}`.match(/(20\d{2})\s*-\s*20\d{2}/);
    if (nameMatch) return Number(nameMatch[1]);
    return Number(semester.year || 0);
  }

  private isRetakeCourseClass(courseClass: any) {
    const source = `${courseClass?.code || ''} ${courseClass?.name || ''}`.toUpperCase();
    return (
      source.includes('_HL_') ||
      source.startsWith('HL_') ||
      source.includes('RETAKE') ||
      source.includes('HỌC LẠI') ||
      source.includes('HOC LAI') ||
      source.includes('CẢI THIỆN') ||
      source.includes('CAI THIEN')
    );
  }

  private async resolveStudentForAcademicScope(studentId: string) {
    return this.prisma.student.findFirst({
      where: {
        OR: [{ id: studentId }, { studentCode: studentId }, { userId: studentId }],
      },
      include: { adminClass: true },
    });
  }

  private async getCurriculumSemesterMap(student: any) {
    const cohort = this.resolveStudentCohortCode(student);
    if (!cohort) return new Map<string, number>();

    const template = await this.prisma.trainingPlanTemplate.findFirst({
      where: {
        majorId: student.majorId,
        cohort,
        status: { in: ['PUBLISHED', 'ACTIVE'] },
      },
      include: { items: true },
      orderBy: { version: 'desc' },
    });

    if (template?.items?.length) {
      return new Map<string, number>(
        template.items.map((item) => [
          item.subjectId,
          Number(item.conceptualSemester || 0),
        ] as [string, number]),
      );
    }

    const curriculumRows = await this.prisma.curriculum.findMany({
      where: { majorId: student.majorId, cohort },
      select: { subjectId: true, suggestedSemester: true },
    });

    return new Map<string, number>(
      curriculumRows.map((item) => [
        item.subjectId,
        Number(item.suggestedSemester || 0),
      ] as [string, number]),
    );
  }

  private filterOfficialGrades(grades: any[], curriculumSemesterMap: Map<string, number>, cohortCode?: string | null) {
    if (!curriculumSemesterMap.size) {
      return grades.filter((grade) => !this.isRetakeCourseClass(grade?.courseClass));
    }

    const cohortStartYear = this.getCohortStartYear(cohortCode);
    return grades.filter((grade) => {
      if (this.isRetakeCourseClass(grade?.courseClass)) return false;

      const subjectId = `${grade?.courseClass?.subjectId || grade?.subjectId || ''}`.trim();
      const plannedSemester = curriculumSemesterMap.get(subjectId);
      if (!plannedSemester) return false;

      const actualSemester = this.parseConceptualSemester(grade?.courseClass?.semester);
      if (actualSemester && actualSemester !== plannedSemester) return false;

      if (cohortStartYear) {
        const expectedYear = this.expectedYearForSemester(
          cohortStartYear,
          plannedSemester,
        );
        const actualYear = this.getSemesterStartYear(grade?.courseClass?.semester);
        if (actualYear && actualYear !== expectedYear) return false;
      }

      return true;
    });
  }

  private getGradePriority(grade: any) {
    let score = 0;
    if (
      this.publishedGradeStatuses.includes(
        `${grade?.status || ''}`.trim().toUpperCase(),
      )
    ) {
      score += 100;
    }
    if (grade?.isLocked) score += 20;
    if (Number.isFinite(Number(grade?.totalScore10))) {
      score += 10 + Number(grade.totalScore10);
    }
    return score;
  }

  private pickBestGradesByKey(grades: any[], getKey: (grade: any) => string) {
    const bestGrades = new Map<string, any>();

    for (const grade of grades) {
      const key = getKey(grade) || grade.id;
      const existing = bestGrades.get(key);
      if (
        !existing ||
        this.getGradePriority(grade) > this.getGradePriority(existing)
      ) {
        bestGrades.set(key, grade);
      }
    }

    return [...bestGrades.values()];
  }

  async calculateSemesterGPA(studentId: string, semesterId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const student = await this.resolveStudentForAcademicScope(studentId);
    const curriculumSemesterMap = student
      ? await this.getCurriculumSemesterMap(student)
      : new Map<string, number>();
    const cohortCode = this.resolveStudentCohortCode(student);
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        status: { in: this.publishedGradeStatuses },
        courseClass: { semesterId },
      },
      include: {
        courseClass: {
          include: { subject: true, semester: true },
        },
      },
    });

    const effectiveGrades = this.pickBestGradesByKey(
      this.filterOfficialGrades(grades, curriculumSemesterMap, cohortCode),
      (grade) => grade?.courseClass?.subjectId || grade?.subjectId || grade.id,
    );

    if (effectiveGrades.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalCredits = 0;

    for (const g of effectiveGrades) {
      const credits = g.courseClass.subject.credits;
      totalWeightedScore += (g.totalScore4 || 0) * credits;
      totalCredits += credits;
    }

    return totalCredits > 0 ? totalWeightedScore / totalCredits : 0;
  }

  async calculateCPA(studentId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const student = await this.resolveStudentForAcademicScope(studentId);
    const curriculumSemesterMap = student
      ? await this.getCurriculumSemesterMap(student)
      : new Map<string, number>();
    const cohortCode = this.resolveStudentCohortCode(student);
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        status: { in: this.publishedGradeStatuses },
      },
      include: {
        courseClass: {
          include: { subject: true, semester: true },
        },
      },
    });

    if (grades.length === 0) return 0;

    // To handle retakes: only take the best score for each subject
    const bestGrades = this.pickBestGradesByKey(
      this.filterOfficialGrades(grades, curriculumSemesterMap, cohortCode),
      (grade) => grade?.courseClass?.subjectId || grade?.subjectId || grade.id,
    );

    let totalWeightedScore = 0;
    let totalCredits = 0;

    for (const g of bestGrades) {
      const credits = g.courseClass.subject.credits;
      totalWeightedScore += (g.totalScore4 || 0) * credits;
      totalCredits += credits;
    }

    return totalCredits > 0 ? totalWeightedScore / totalCredits : 0;
  }

  async getAcademicSummary(studentId: string, semesterId: string) {
    const gpa = await this.calculateSemesterGPA(studentId, semesterId);
    const cpa = await this.calculateCPA(studentId);
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const student = await this.resolveStudentForAcademicScope(studentId);
    const curriculumSemesterMap = student
      ? await this.getCurriculumSemesterMap(student)
      : new Map<string, number>();
    const cohortCode = this.resolveStudentCohortCode(student);

    // Get total earned credits for IT major (155 target)
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        status: { in: this.publishedGradeStatuses },
        isPassed: true,
      },
      include: {
        subject: true,
        courseClass: { include: { semester: true } },
      },
    });

    const uniquePassedSubjects = new Map<string, number>();
    const officialPassedGrades = this.filterOfficialGrades(
      grades,
      curriculumSemesterMap,
      cohortCode,
    );
    for (const g of this.pickBestGradesByKey(officialPassedGrades, (grade) => grade.subjectId)) {
      uniquePassedSubjects.set(g.subjectId, g.subject.credits);
    }
    const totalCredits = Array.from(uniquePassedSubjects.values()).reduce(
      (a, b) => a + b,
      0,
    );

    let warningLevel = 0;
    if (gpa < 1.0) warningLevel = 1;
    if (gpa < 0.5) warningLevel = 2;

    const isEligibleForGraduation = totalCredits >= 155 && cpa >= 2.0;

    return {
      studentId,
      semesterId,
      gpa: Math.round(gpa * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      totalCredits,
      isEligibleForGraduation,
      warningLevel,
      statusText: warningLevel > 0 ? 'WARNING' : 'NORMAL',
      recommendation: isEligibleForGraduation
        ? 'Đủ điều kiện xét tốt nghiệp.'
        : totalCredits < 155
          ? `Cần tích lũy thêm ${155 - totalCredits} tín chỉ.`
          : 'Cần cải thiện CPA >= 2.0.',
    };
  }
}
