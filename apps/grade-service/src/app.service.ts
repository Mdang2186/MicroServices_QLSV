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

    const uniqueClassIds = [...new Set(grades.map(g => g.courseClassId).filter(Boolean))];
    const classMap = new Map<string, { credits: number; isTheory: boolean; midtermDeadline: Date | null }>();

    for (const classId of uniqueClassIds) {
      const courseClass = await this.prisma.courseClass.findUnique({
        where: { id: classId },
        include: { 
          subject: true,
          semester: true 
        }
      });
      if (courseClass?.subject) {
        const sub = courseClass.subject as any;
        classMap.set(classId, {
          credits: sub.credits ?? 3,
          isTheory: (sub.theoryHours ?? 0) > 0 || (sub.practiceHours ?? 0) === 0,
          midtermDeadline: courseClass.semester?.midtermGradeDeadline ?? null
        });
      }
    }

    const now = new Date();
    const existingGrades = await this.prisma.grade.findMany({
      where: { id: { in: grades.map(g => g.id).filter(Boolean) } }
    });
    const existingGradeMap = new Map(existingGrades.map(g => [g.id, g]));

    return await this.prisma.$transaction(
      grades.map(g => {
        const classInfo = classMap.get(g.courseClassId);
        const { credits, isTheory, midtermDeadline } = classInfo ?? { credits: 3, isTheory: true, midtermDeadline: null };

        const isDeadlinePassed = midtermDeadline && now > midtermDeadline;
        const canUpdateProcess = isStaff || !isDeadlinePassed;

        const existing = existingGradeMap.get(g.id);
        
        // Nếu không được phép cập nhật điểm quá trình, dùng giá trị cũ từ DB
        const cc  = canUpdateProcess ? (g.attendanceScore ?? 0) : (existing?.attendanceScore ?? 0);  
        const dkd = canUpdateProcess ? (g.regularScore1   ?? 0) : (existing?.regularScore1   ?? 0);  
        const tx  = canUpdateProcess ? (g.regularScore2   ?? 0) : (existing?.regularScore2   ?? 0);  
        const fin = g.finalScore      ?? 0;  

        let total10 = 0;
        let processAvg = 0;
        let isEligible = true;

        // Bảng quy đổi chuyên cần & Cấm thi (Banned)
        // >= 50% vắng => CC=0 => Banned
        isEligible = cc > 0 || (cc === 0 && (canUpdateProcess ? g.attendanceScore === undefined : existing?.attendanceScore === undefined)); 

        if (isTheory) {
          const qt = (cc * credits + tx * 1 + dkd * 2) / (credits + 3);
          processAvg = Math.round(qt * 10) / 10;
          
          const effectiveFin = isEligible ? fin : 0;
          total10 = Math.round((processAvg * 0.4 + effectiveFin * 0.6) * 10) / 10;
        } else {
          total10 = Math.round(((cc + dkd * credits) / (1 + credits)) * 10) / 10;
          processAvg = total10;
        }

        const { letter, scale4 } = this.mapGrade10ToLetter(total10);

        const updateData: any = {
          attendanceScore: cc,
          regularScore1:   dkd,
          regularScore2:   tx,
          midtermScore:    processAvg,
          totalScore10:    total10,
          totalScore4:     scale4,
          letterGrade:     letter,
          isPassed:        total10 >= 4.0 && isEligible, 
          isEligibleForExam: isEligible,
          isAbsentFromExam: !isEligible || g.isAbsentFromExam
        };

        if (isStaff) {
          updateData.finalScore = isEligible ? fin : 0;
        }

        return this.prisma.grade.updateMany({
          where: { id: g.id, isLocked: false },
          data: updateData
        });
      })
    );
  }

  /** 
   * Tự động tính điểm chuyên cần từ lịch sử điểm danh 
   * Dựa trên: [Số buổi vắng] / [Tổng số buổi theo chương trình]
   */
  async syncAttendanceScores(classId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { courseClassId: classId },
      include: {
        attendances: true,
        courseClass: {
          include: { 
            sessions: true,
            subject: true
          }
        }
      }
    });

    for (const enr of enrollments) {
      const subject = enr.courseClass.subject as any;
      // Quy ước: 1 buổi = 3 tiết. Tổng số buổi = (Lý thuyết + Thực hành) / 3
      const totalPlannedHours = (subject.theoryHours ?? 30) + (subject.practiceHours ?? 15);
      const totalEstimatedSessions = Math.ceil(totalPlannedHours / 3);
      
      const totalSessions = totalEstimatedSessions > 0 ? totalEstimatedSessions : Math.max(enr.courseClass.sessions.length, 1);

      const absentCount = enr.attendances.filter(a => a.status === 'ABSENT').length;
      const ccScore = this.calculateAttendancePoints(absentCount, totalSessions);

      await this.prisma.grade.updateMany({
        where: { studentId: enr.studentId, courseClassId: classId },
        data: { 
          attendanceScore: ccScore,
          isEligibleForExam: ccScore > 0
        }
      });
    }

    // Refresh grades logic after sync
    const updatedGrades = await this.prisma.grade.findMany({ where: { courseClassId: classId } });
    return this.bulkUpdateGrades(updatedGrades);
  }

  private mapGrade10ToLetter(score: number): { letter: string, scale4: number } {
    if (score >= 8.5) return { letter: 'A', scale4: 4.0 };
    if (score >= 7.8) return { letter: 'B+', scale4: 3.5 };
    if (score >= 7.0) return { letter: 'B', scale4: 3.0 };
    if (score >= 6.3) return { letter: 'C+', scale4: 2.5 };
    if (score >= 5.5) return { letter: 'C', scale4: 2.0 };
    if (score >= 4.8) return { letter: 'D+', scale4: 1.5 };
    if (score >= 4.0) return { letter: 'D', scale4: 1.0 };
    return { letter: 'F', scale4: 0.0 };
  }

  public calculateAttendancePoints(missedSessions: number, totalSessions: number): number {
    if (totalSessions === 0) return 10;
    const pct = (missedSessions / totalSessions) * 100;

    if (pct === 0)   return 10;
    if (pct < 10)    return 8;
    if (pct < 20)    return 6;
    if (pct < 35)    return 4;
    if (pct < 50)    return 2;
    return 0; // >= 50%: cấm thi, điểm thi = 0
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
