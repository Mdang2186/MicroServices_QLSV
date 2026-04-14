import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class GpaService {
  constructor(private prisma: PrismaService) {}

  async calculateSemesterGPA(studentId: string, semesterId: string) {
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId,
        courseClass: { semesterId },
      },
      include: {
        courseClass: {
          include: { subject: true },
        },
      },
    });

    if (grades.length === 0) return 0;

    let totalWeightedScore = 0;
    let totalCredits = 0;

    for (const g of grades) {
      const credits = g.courseClass.subject.credits;
      totalWeightedScore += (g.totalScore4 || 0) * credits;
      totalCredits += credits;
    }

    return totalCredits > 0 ? totalWeightedScore / totalCredits : 0;
  }

  async calculateCPA(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: { studentId },
      include: {
        courseClass: {
          include: { subject: true },
        },
      },
    });

    if (grades.length === 0) return 0;

    // To handle retakes: only take the best score for each subject
    const bestGradesMap = new Map<string, any>();
    for (const g of grades) {
      const subjectId = g.courseClass.subjectId;
      if (
        !bestGradesMap.has(subjectId) ||
        g.totalScore10 > bestGradesMap.get(subjectId).totalScore10
      ) {
        bestGradesMap.set(subjectId, g);
      }
    }

    let totalWeightedScore = 0;
    let totalCredits = 0;

    for (const g of bestGradesMap.values()) {
      const credits = g.courseClass.subject.credits;
      totalWeightedScore += (g.totalScore4 || 0) * credits;
      totalCredits += credits;
    }

    return totalCredits > 0 ? totalWeightedScore / totalCredits : 0;
  }

  async getAcademicSummary(studentId: string, semesterId: string) {
    const gpa = await this.calculateSemesterGPA(studentId, semesterId);
    const cpa = await this.calculateCPA(studentId);

    // Get total earned credits for IT major (155 target)
    const grades = await this.prisma.grade.findMany({
      where: { studentId, isPassed: true },
      include: { subject: true },
    });

    const uniquePassedSubjects = new Map<string, number>();
    for (const g of grades) {
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
