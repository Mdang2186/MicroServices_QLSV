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
      if (!bestGradesMap.has(subjectId) || g.totalScore10 > bestGradesMap.get(subjectId).totalScore10) {
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

    let warningLevel = 0;
    let statusText = "Bình thường";

    // Academic Warning Thresholds
    if (gpa < 1.0) warningLevel = 1; // Basic Level 1: GPA < 1.0
    
    // Level 2/3 for extremely low scores
    if (gpa < 0.5) warningLevel = 2;

    return {
      studentId,
      semesterId,
      gpa: Math.round(gpa * 100) / 100,
      cpa: Math.round(cpa * 100) / 100,
      warningLevel,
      statusText: warningLevel > 0 ? 'WARNING' : 'NORMAL',
      recommendation: warningLevel > 0 ? "Cần tập trung cải thiện kết quả học tập." : "Kết quả tốt."
    };
  }
}
