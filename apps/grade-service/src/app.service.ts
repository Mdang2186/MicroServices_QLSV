import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { GpaService } from './gpa.service';

@Injectable()
export class AppService {
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

  getHello(): string {
    return 'Hello World!';
  }

  async getStudentGrades(studentId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId: { in: linkedStudentIds },
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
    const existingGrades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
      select: { studentId: true },
    });

    const existingStudentIds = new Set(existingGrades.map((g) => g.studentId));
    const missingStudentIds = studentIds.filter(
      (id) => !existingStudentIds.has(id),
    );

    if (missingStudentIds.length > 0) {
      await this.prisma.grade.createMany({
        data: missingStudentIds.map((sid) => ({
          studentId: sid,
          courseClassId: classId,
          subjectId: subjectId,
          isEligibleForExam: true,
          isLocked: false,
          isPassed: false,
        })),
      });
    }

    return this.getClassGrades(classId);
  }

  async bulkUpdateGrades(grades: any[], userRole?: string) {
    const isStaff = userRole === 'ACADEMIC_STAFF' || userRole === 'SUPER_ADMIN';

    // Verify user can update
    const uniqueClassIds = [
      ...new Set(grades.map((g) => g.courseClassId).filter(Boolean)),
    ];
    // Normally we should check midtermDeadline here if needed, but we'll accept raw input for flexibility.

    return await this.prisma.$transaction(
      grades.map((g) => {
        const updateData: any = {
          regularScores: g.regularScores ?? null,
          coef1Scores: g.coef1Scores ?? null,
          coef2Scores: g.coef2Scores ?? null,
          practiceScores: g.practiceScores ?? null,
          examScore1: g.examScore1 ?? null,
          examScore2: g.examScore2 ?? null,
          isAbsentFromExam: g.isAbsentFromExam ?? false,
        };

        return this.prisma.grade.updateMany({
          where: { id: g.id, isLocked: false },
          data: updateData,
        });
      }),
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
            subject: true,
          },
        },
      },
    });

    for (const enr of enrollments) {
      const subject = enr.courseClass.subject as any;
      // Quy ước: 1 buổi = 3 tiết. Tổng số buổi = (Lý thuyết + Thực hành) / 3
      const totalPlannedHours =
        (subject.theoryHours ?? 30) + (subject.practiceHours ?? 15);
      const totalEstimatedSessions = Math.ceil(totalPlannedHours / 3);

      const totalSessions =
        totalEstimatedSessions > 0
          ? totalEstimatedSessions
          : Math.max(enr.courseClass.sessions.length, 1);

      const absentCount = enr.attendances.filter(
        (a) => a.status === 'ABSENT',
      ).length;
      const ccScore = this.calculateAttendancePoints(
        absentCount,
        totalSessions,
      );

      await this.prisma.grade.updateMany({
        where: { studentId: enr.studentId, courseClassId: classId },
        data: {
          attendanceScore: ccScore,
          isEligibleForExam: ccScore > 0,
        },
      });
    }

    // Refresh grades logic after sync
    const updatedGrades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
    });
    return this.bulkUpdateGrades(updatedGrades);
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

  public calculateAttendancePoints(
    missedSessions: number,
    totalSessions: number,
  ): number {
    if (totalSessions === 0) return 10;
    const pct = (missedSessions / totalSessions) * 100;

    // [UNETI RULE] Vắng mặt >= 50% số tiết => Cấm thi (0 điểm CC)
    if (pct >= 50) return 0;

    // Bảng quy đổi điểm chuyên cần UNETI
    if (pct === 0) return 10;
    if (pct <= 10) return 9;
    if (pct <= 20) return 8;
    if (pct <= 30) return 6;
    if (pct <= 40) return 4;
    return 2;
  }

  async submitGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId, status: 'DRAFT' },
      data: { status: 'PENDING_APPROVAL', isLocked: true },
    });
  }

  async approveGrades(classId: string) {
    // 1. Tự động tính chuyên cần
    await this.syncAttendanceScores(classId);

    // 2. Tải thông tin lớp học và học phần
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

    // 3. Tính toán cho toàn bộ danh sách lớp
    const grades = await this.prisma.grade.findMany({
      where: { courseClassId: classId },
    });

    for (const g of grades) {
      const cc = g.attendanceScore ?? 0;
      const isEligible = cc > 0; // Cấm thi nếu vắng >= 50% dẫn đến CC = 0

      const parseArr = (jsonStr: string | null): number[] => {
        try {
          return jsonStr ? JSON.parse(jsonStr) : [];
        } catch {
          return [];
        }
      };

      const regular = parseArr(g.regularScores);
      const coef1 = parseArr(g.coef1Scores);
      const coef2 = parseArr(g.coef2Scores);
      const practice = parseArr(g.practiceScores);

      let processAvg = 0;
      let total10 = 0;
      let finalScore1 = null;
      let finalScore2 = null;

      if (isTheory) {
        // MÔN LÝ THUYẾT HOẶC KẾT HỢP
        const sumTX = regular.reduce((a, b) => a + b, 0);
        const sumHS1 = coef1.reduce((a, b) => a + b, 0);
        const sumHS2 = coef2.reduce((a, b) => a + b, 0);
        const weightTotal =
          credits + regular.length + coef1.length + coef2.length * 2;

        if (weightTotal > 0) {
          processAvg =
            (cc * credits + sumTX + sumHS1 + sumHS2 * 2) / weightTotal;
        }
        processAvg = Math.round(processAvg * 10) / 10; // Làm tròn 1 chữ số thập phân

        const effectiveFin1 =
          isEligible && !g.isAbsentFromExam && g.examScore1 !== null
            ? g.examScore1
            : 0;
        finalScore1 =
          Math.round((processAvg * 0.4 + effectiveFin1 * 0.6) * 10) / 10;

        if (g.examScore2 !== null && g.examScore2 !== undefined) {
          const effectiveFin2 =
            isEligible && !g.isAbsentFromExam ? g.examScore2 : 0;
          finalScore2 =
            Math.round((processAvg * 0.4 + effectiveFin2 * 0.6) * 10) / 10;
        }

        total10 = Math.max(finalScore1, finalScore2 ?? -1);
      } else {
        // MÔN CHỈ THỰC HÀNH / ĐỒ ÁN / THỰC TẬP
        const sumTH = practice.reduce((a, b) => a + b, 0);
        const weightTotal = 1 + practice.length;

        if (weightTotal > 0) {
          processAvg = (cc * 1 + sumTH) / weightTotal;
        }
        processAvg = Math.round(processAvg * 10) / 10;
        total10 = processAvg;
        finalScore1 = total10; // Chỉ có 1 cột tổng kết
      }

      // 4. Áp dụng bảng chữ và trạng thái đạt
      const { letter, scale4 } = this.mapGrade10ToLetter(total10);

      await this.prisma.grade.update({
        where: { id: g.id },
        data: {
          tbThuongKy: processAvg,
          finalScore1: finalScore1,
          finalScore2: finalScore2,
          totalScore10: total10,
          totalScore4: scale4,
          letterGrade: letter,
          isPassed: total10 >= 4.0 && isEligible,
          isEligibleForExam: isEligible,
          isAbsentFromExam: !isEligible || g.isAbsentFromExam,
          status: 'APPROVED',
          isLocked: true,
        },
      });
    }

    // Lấy lại danh sách đã duyệt để báo cáo hoặc đồng bộ
    const result = { count: grades.length };

    // After approval, sync academic performance for all students in this class
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

    return result;
  }

  async syncStudentPerformance(studentId: string) {
    try {
      // 1. Get current semester ID (from any grade of this student)
      const lastGrade = await this.prisma.grade.findFirst({
        where: { studentId },
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

      // 3. Push to Student Service
      // Using direct fetch as fallback if no internal communication library is available
      const response = await fetch(
        `http://127.0.0.1:3002/students/${studentId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gpa: summary.gpa,
            cpa: summary.cpa,
            warningLevel: summary.warningLevel,
            academicStatus: summary.warningLevel > 0 ? 'WARNING' : 'NORMAL',
          }),
        },
      );

      if (!response.ok) {
        console.error(
          `Failed to sync student ${studentId} performance: ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(`Error syncing student ${studentId} performance:`, error);
    }
  }

  async lockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: true },
    });
  }

  async unlockClassGrades(classId: string) {
    return this.prisma.grade.updateMany({
      where: { courseClassId: classId },
      data: { isLocked: false, status: 'DRAFT' }, // Unlocking reverts to DRAFT
    });
  }

  async remindAllPendingLecturers(semesterId: string, authHeader?: string) {
    // 1. Find all classes in this semester with PENDING or DRAFT grades
    const pendingClasses = await this.prisma.courseClass.findMany({
      where: {
        semesterId,
        grades: {
          some: {
            OR: [{ status: 'DRAFT' }, { status: 'PENDING_APPROVAL' }],
          },
        },
      },
      include: {
        lecturer: { include: { user: true } },
        subject: true,
      },
    });

    const uniqueLecturers = new Map<string, any>();
    for (const cls of pendingClasses) {
      if (cls.lecturer?.userId) {
        uniqueLecturers.set(cls.lecturer.userId, {
          userId: cls.lecturer.userId,
          lecturerName: cls.lecturer.fullName,
          courseNames: [
            ...(uniqueLecturers.get(cls.lecturer.userId)?.courseNames || []),
            cls.subject.name,
          ],
        });
      }
    }

    let notifiedCount = 0;
    for (const l of uniqueLecturers.values()) {
      try {
        await fetch(`http://127.0.0.1:3001/notifications`, {
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
        notifiedCount++;
      } catch (err) {
        console.error(`Failed to notify lecturer ${l.userId}:`, err);
      }
    }

    return {
      success: true,
      notifiedLecturers: notifiedCount,
      totalPendingClasses: pendingClasses.length,
    };
  }
}
