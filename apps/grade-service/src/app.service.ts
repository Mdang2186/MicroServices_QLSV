import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { GpaService } from './gpa.service';

@Injectable()
export class AppService {
  constructor(
    private prisma: PrismaService,
    private gpaService: GpaService
  ) { }

  getHello(): string {
    return 'Hello World!';
  }

  async getStudentGrades(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId },
      include: {
        subject: true,
        courseClass: true,
      },
    });
  }

  async getClassGrades(classId: string) {
    return this.prisma.grade.findMany({
      where: { courseClassId: classId },
      include: {
        student: {
          include: { user: true, adminClass: true }
        }
      }
    });
  }

  async initializeGrades(classId: string, subjectId: string, studentIds: string[]) {
    const existingGrades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
      select: { studentId: true }
    });

    const existingStudentIds = new Set(existingGrades.map(g => g.studentId));
    const missingStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

    if (missingStudentIds.length > 0) {
      await this.prisma.grade.createMany({
        data: missingStudentIds.map(sid => ({
          studentId: sid,
          courseClassId: classId,
          subjectId: subjectId,
          isEligibleForExam: true,
          isLocked: false,
          isPassed: false
        }))
      });
    }

    return this.getClassGrades(classId);
  }

  async bulkUpdateGrades(grades: any[], userRole?: string) {
    const isStaff = userRole === 'ACADEMIC_STAFF' || userRole === 'SUPER_ADMIN';

    return await this.prisma.$transaction(
      grades.map(g => {
        // Fetch current grade to prevent overriding if role is restricted
        // Ideally we'd combine this but for MVP:
        const currentFinalScore = g.finalScore; // This comes from input
        // Fetch course info to check if it's Theory or Practical
        // (In a real high-traffic app, we should fetch this once before the loop)
        const isTheory = g.subject?.theoryHours > 0 || !g.subject?.practiceHours;

        const attendanceScore = g.attendanceScore ?? 0;
        const tx1 = g.regularScore1 ?? 0;
        const tx2 = g.regularScore2 ?? 0;
        const final = g.finalScore ?? 0;
        const practice = g.practiceScore ?? 0;

        let total10 = 0;
        let processAvg = 0;

        if (isTheory) {
          // Rule 1: Point process = (CC*1 + TX1*2 + TX2*1) / 4
          processAvg = Math.round(((attendanceScore + 2 * tx1 + tx2) / 4) * 10) / 10;
          // Rule 2: FinalTotal = ProcessAvg * 0.4 + FinalScore * 0.6
          total10 = Math.round((processAvg * 0.4 + final * 0.6) * 10) / 10;
        } else {
          // Practical/Essay: Average of components
          // Implementation depends on which components are provided
          const components = [attendanceScore, practice, final].filter(v => v !== null);
          total10 = components.length > 0 
            ? Math.round((components.reduce((a, b) => a + b, 0) / components.length) * 10) / 10
            : 0;
        }

        const { letter, scale4 } = this.mapGrade10ToLetter(total10);

        const updateData: any = {
          attendanceScore,
          regularScore1: tx1,
          regularScore2: tx2,
          practiceScore: practice,
          midtermScore: processAvg,
          totalScore10: total10,
          totalScore4: scale4,
          letterGrade: letter,
          isPassed: total10 >= 5.5,
          isEligibleForExam: attendanceScore > 0
        };

        if (isStaff) {
          updateData.finalScore = final;
          if (g.isLocked !== undefined) updateData.isLocked = g.isLocked;
          if (g.status !== undefined) updateData.status = g.status;
        }

        if (isStaff) {
          updateData.finalScore = final;
        }

        // If staff, allow updating final score. If not staff, ONLY allow if finalScore is null or keep current
        if (isStaff) {
          updateData.finalScore = final;
        }
        // If Lecturer, they cannot change finalScore once it is set 
        // (Actually, they shouldn't even pass it, but if they do, we ignore it)

        return this.prisma.grade.updateMany({
          where: { 
            id: g.id,
            status: 'DRAFT'
          },
          data: updateData
        });
      })
    );
  }

  /**
   * Maps 10-point scale to Letter Grade and 4.0 Scale
   * Based on UNETI/Standard rules:
   * 8.5 - 10: A (4.0)
   * 7.8 - 8.4: B+ (3.5)
   * 7.0 - 7.7: B (3.0)
   * 6.3 - 6.9: C+ (2.5)
   * 5.5 - 6.2: C (2.0)
   * 4.8 - 5.4: D+ (1.5)
   * 4.0 - 4.7: D (1.0)
   * 3.0 - 3.9: F+ (0.5)
   * 0.0 - 2.9: F (0.0)
   */
  private mapGrade10ToLetter(score: number): { letter: string, scale4: number } {
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

  /**
   * Calculates Attendance Points (0-10) based on missed periods
   */
  public calculateAttendancePoints(missedPeriods: number, totalPeriods: number): number {
    if (totalPeriods === 0) return 10;
    const missedPercent = (missedPeriods / totalPeriods) * 100;

    if (missedPercent === 0) return 10;
    if (missedPercent < 10) return 8;
    if (missedPercent < 20) return 6;
    if (missedPercent < 35) return 4;
    if (missedPercent < 50) return 2;
    return 0; // Banned from exam
  }

  async submitGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL', isLocked: true }
    });
  }

  async approveGrades(classId: string) {
    const result = await this.prisma.grade.updateMany({
      where: { courseClassId: classId, status: 'PENDING_APPROVAL' },
      data: { status: 'APPROVED' }
    });

    // After approval, sync academic performance for all students in this class
    const grades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
      select: { studentId: true }
    });
    
    const uniqueStudentIds = Array.from(new Set(grades.map(g => g.studentId)));
    for (const studentId of uniqueStudentIds) {
      await this.syncStudentPerformance(studentId);
    }

    return result;
  }

  async syncStudentPerformance(studentId: string) {
    try {
      // 1. Get current semester ID (from any grade of this student)
      const lastGrade = await this.prisma.grade.findFirst({
        where: { studentId },
        include: { courseClass: true },
        orderBy: { courseClass: { semesterId: 'desc' } }
      });
      
      if (!lastGrade) return;
      const semesterId = lastGrade.courseClass.semesterId;

      // 2. Get academic summary
      const summary = await this.gpaService.getAcademicSummary(studentId, semesterId);

      // 3. Push to Student Service
      // Using direct fetch as fallback if no internal communication library is available
      const response = await fetch(`http://127.0.0.1:3002/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gpa: summary.gpa,
          cpa: summary.cpa,
          warningLevel: summary.warningLevel,
          academicStatus: summary.warningLevel > 0 ? "WARNING" : "NORMAL"
        })
      });

      if (!response.ok) {
        console.error(`Failed to sync student ${studentId} performance: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error syncing student ${studentId} performance:`, error);
    }
  }

  async lockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: true }
    });
  }

  async unlockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: false, status: 'DRAFT' } // Unlocking reverts to DRAFT
    });
  }
}
