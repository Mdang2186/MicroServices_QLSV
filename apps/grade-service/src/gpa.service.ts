import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class GpaService {
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
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
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

    let mirrorStudent = await this.prisma.student.findFirst({
      where: {
        adminClassId: mirrorAdminClass.id,
        fullName: student.fullName,
        status: 'STUDYING',
      },
      select: { id: true },
    });

    if (!mirrorStudent) {
      const codeSuffix = `${student.studentCode || ''}`.match(/(\d{2})$/)?.[1];
      if (codeSuffix) {
        mirrorStudent = await this.prisma.student.findFirst({
          where: {
            adminClassId: mirrorAdminClass.id,
            studentCode: { endsWith: codeSuffix },
            status: 'STUDYING',
          },
          select: { id: true },
        });
      }
    }

    if (mirrorStudent?.id) {
      linkedStudentIds.push(mirrorStudent.id);
    }

    return [...new Set(linkedStudentIds)];
  }

  private getGradePriority(grade: any) {
    let score = 0;
    if (`${grade?.status || ''}`.toUpperCase() === 'APPROVED') score += 100;
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
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        courseClass: { semesterId },
      },
      include: {
        courseClass: {
          include: { subject: true },
        },
      },
    });

    const effectiveGrades = this.pickBestGradesByKey(
      grades,
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
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
      },
      include: {
        courseClass: {
          include: { subject: true },
        },
      },
    });

    if (grades.length === 0) return 0;

    // To handle retakes: only take the best score for each subject
    const bestGrades = this.pickBestGradesByKey(
      grades,
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

    // Get total earned credits for IT major (155 target)
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
        isPassed: true,
      },
      include: { subject: true },
    });

    const uniquePassedSubjects = new Map<string, number>();
    for (const g of this.pickBestGradesByKey(grades, (grade) => grade.subjectId)) {
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
