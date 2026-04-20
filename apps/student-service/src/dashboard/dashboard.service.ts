import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { TuitionService } from "../tuition/tuition.service";

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private tuitionService: TuitionService,
  ) {}

  private buildStudentWhere(filters: {
    facultyId?: string;
    majorId?: string;
    intake?: string;
    keyword?: string;
  }) {
    const { facultyId, majorId, intake, keyword } = filters;
    const where: any = {};

    if (facultyId && facultyId !== "all") {
      where.major = { facultyId };
    }

    if (majorId && majorId !== "all") {
      where.majorId = majorId;
    }

    if (intake && intake !== "all") {
      where.intake = intake;
    }

    if (keyword) {
      where.OR = [
        { fullName: { contains: keyword } },
        { studentCode: { contains: keyword } },
        { user: { email: { contains: keyword } } },
      ];
    }

    return where;
  }

  private async resolveTargetSemester(semesterId?: string, date?: string) {
    if (semesterId && semesterId !== "all" && semesterId !== "undefined") {
      const byIdOrCode = await this.prisma.semester.findFirst({
        where: {
          OR: [{ id: semesterId }, { code: semesterId }],
        },
      });
      if (byIdOrCode) return byIdOrCode;
    }

    if (date) {
      const targetDate = new Date(date);
      const matchedSemester = await this.prisma.semester.findFirst({
        where: {
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      });
      if (matchedSemester) return matchedSemester;
    }

    const currentSemester = await this.prisma.semester.findFirst({
      where: { isCurrent: true },
      orderBy: { startDate: "desc" },
    });
    if (currentSemester) return currentSemester;

    return this.prisma.semester.findFirst({
      orderBy: { startDate: "desc" },
    });
  }

  private buildEnrollmentTrend(enrollments: Array<{ registeredAt: Date }>) {
    const map = new Map<string, number>();
    const now = new Date();

    for (let index = 5; index >= 0; index -= 1) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
      const monthLabel = monthDate.toLocaleString("vi-VN", { month: "short" });
      map.set(monthLabel, 0);
    }

    for (const enrollment of enrollments) {
      const registeredAt = enrollment.registeredAt;
      const diffMonths =
        (now.getFullYear() - registeredAt.getFullYear()) * 12 +
        now.getMonth() -
        registeredAt.getMonth();

      if (diffMonths >= 0 && diffMonths <= 5) {
        const monthLabel = registeredAt.toLocaleString("vi-VN", { month: "short" });
        if (map.has(monthLabel)) {
          map.set(monthLabel, (map.get(monthLabel) || 0) + 1);
        }
      }
    }

    return [...map.entries()].map(([name, enrollmentsCount]) => ({
      name,
      enrollments: enrollmentsCount,
    }));
  }

  async getStats(
    semesterId?: string,
    date?: string,
    facultyId?: string,
    majorId?: string,
    intake?: string,
    keyword?: string,
  ) {
    const studentWhere = this.buildStudentWhere({
      facultyId,
      majorId,
      intake,
      keyword,
    });
    const targetSemester = await this.resolveTargetSemester(semesterId, date);
    const targetSemesterId = targetSemester?.id;

    const enrollmentWhere = targetSemesterId
      ? {
          courseClass: { semesterId: targetSemesterId },
          ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
        }
      : Object.keys(studentWhere).length > 0
        ? { student: studentWhere }
        : {};

    const gradeWhere = targetSemesterId
      ? {
          courseClass: { semesterId: targetSemesterId },
          ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
        }
      : Object.keys(studentWhere).length > 0
        ? { student: studentWhere }
        : {};

    const [
      totalStudents,
      totalCreditsAssigned,
      totalFaculties,
      totalMajors,
      totalAdminClasses,
      totalLecturers,
      attendanceAgg,
      recentEnrollmentsRaw,
      attendanceGradesRaw,
      coursePopularityRaw,
      enrollmentsRaw,
      gpaRows,
      statusDistributionRaw,
      rawIntakeDistribution,
      rawMajorDistribution,
    ] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.student.aggregate({
        where: studentWhere,
        _sum: { totalEarnedCredits: true },
      }),
      this.prisma.faculty.count(),
      this.prisma.major.count(),
      this.prisma.adminClass.count(),
      this.prisma.lecturer.count(),
      this.prisma.grade.aggregate({
        where: { ...gradeWhere, attendanceScore: { not: null } },
        _avg: { attendanceScore: true },
      }),
      this.prisma.enrollment.findMany({
        where: enrollmentWhere,
        take: 5,
        orderBy: { registeredAt: "desc" },
        include: {
          student: true,
          courseClass: { include: { subject: true } },
        },
      }),
      this.prisma.grade.findMany({
        select: { attendanceScore: true },
        where: { ...gradeWhere, attendanceScore: { not: null } },
      }),
      this.prisma.enrollment.groupBy({
        by: ["courseClassId"],
        where: enrollmentWhere,
        _count: { studentId: true },
        orderBy: { _count: { studentId: "desc" } },
        take: 6,
      }),
      this.prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: { registeredAt: true },
      }),
      this.prisma.student.findMany({
        where: studentWhere,
        select: { gpa: true },
      }),
      this.prisma.student.groupBy({
        by: ["academicStatus"],
        where: studentWhere,
        _count: { id: true },
      }),
      this.prisma.student.groupBy({
        by: ["intake"],
        where: studentWhere,
        _count: { id: true },
      }),
      this.prisma.student.groupBy({
        by: ["majorId"],
        where: studentWhere,
        _count: { id: true },
      }),
    ]);

    const recentEnrollments = recentEnrollmentsRaw.map((enrollment) => ({
      name: enrollment.student?.fullName || "N/A",
      course: enrollment.courseClass?.subject?.name || "Học phần",
      time: enrollment.registeredAt.toLocaleString("vi-VN"),
      img: `${enrollment.student?.fullName || "SV"}`.slice(0, 2).toUpperCase(),
    }));

    const attendanceDistribution = [
      { name: "Xuất sắc (9-10)", value: 0, color: "#22c55e" },
      { name: "Tốt (7-8)", value: 0, color: "#3b82f6" },
      { name: "Trung bình (5-6)", value: 0, color: "#eab308" },
      { name: "Yếu (<5)", value: 0, color: "#ef4444" },
    ];

    for (const grade of attendanceGradesRaw) {
      const score = Number(grade.attendanceScore || 0);
      if (score >= 9) attendanceDistribution[0].value += 1;
      else if (score >= 7) attendanceDistribution[1].value += 1;
      else if (score >= 5) attendanceDistribution[2].value += 1;
      else attendanceDistribution[3].value += 1;
    }

    const gpaDistribution = [
      { name: "Xuất sắc (3.6 - 4.0)", value: 0, color: "#8b5cf6" },
      { name: "Giỏi (3.2 - 3.59)", value: 0, color: "#3b82f6" },
      { name: "Khá (2.5 - 3.19)", value: 0, color: "#06b6d4" },
      { name: "Trung bình (2.0 - 2.49)", value: 0, color: "#eab308" },
      { name: "Yếu (< 2.0)", value: 0, color: "#ef4444" },
    ];

    for (const row of gpaRows) {
      const gpa = Number(row.gpa || 0);
      if (gpa >= 3.6) gpaDistribution[0].value += 1;
      else if (gpa >= 3.2) gpaDistribution[1].value += 1;
      else if (gpa >= 2.5) gpaDistribution[2].value += 1;
      else if (gpa >= 2.0) gpaDistribution[3].value += 1;
      else gpaDistribution[4].value += 1;
    }

    const topCourseIds = coursePopularityRaw.map((row) => row.courseClassId);
    const topCourseClasses = topCourseIds.length
      ? await this.prisma.courseClass.findMany({
          where: { id: { in: topCourseIds } },
          include: { subject: true },
        })
      : [];

    const coursePopularity = coursePopularityRaw.map((row) => {
      const courseClass = topCourseClasses.find(
        (candidate) => candidate.id === row.courseClassId,
      );
      const subjectName = courseClass?.subject?.name || "Học phần";
      const shortName =
        subjectName
          .split(" ")
          .map((word) => word[0])
          .join("")
          .slice(0, 4)
          .toUpperCase() || "HP";

      return {
        name: shortName,
        fullName: subjectName,
        value: row._count.studentId,
      };
    });

    const allMajors = await this.prisma.major.findMany({
      select: { id: true, name: true },
    });
    const majorNameMap = new Map(allMajors.map((major) => [major.id, major.name]));

    const majorDistribution = rawMajorDistribution
      .filter((row) => row.majorId)
      .map((row) => ({
        name: majorNameMap.get(row.majorId || "") || "Khác",
        value: row._count.id,
      }))
      .sort((left, right) => right.value - left.value)
      .slice(0, 6);

    const intakeDistribution = rawIntakeDistribution
      .filter((row) => row.intake)
      .map((row) => ({
        name: row.intake || "Khác",
        value: row._count.id,
      }))
      .sort((left, right) => `${right.name}`.localeCompare(`${left.name}`, "vi"));

    const statusDistribution = [
      { name: "Bình thường", value: 0, color: "#22c55e" },
      { name: "Cảnh báo", value: 0, color: "#ef4444" },
      { name: "Khác", value: 0, color: "#64748b" },
    ];

    for (const row of statusDistributionRaw) {
      if (row.academicStatus === "NORMAL") statusDistribution[0].value = row._count.id;
      else if (row.academicStatus === "WARNING") statusDistribution[1].value = row._count.id;
      else statusDistribution[2].value += row._count.id;
    }

    let activeCourses = 0;
    const operationalStats: any = {
      gradeProgress: 0,
      registrationProgress: 0,
      profileCompletion: 0,
      examProgress: 0,
      details: {
        totalClasses: 0,
        lockedClasses: 0,
        totalSlots: 0,
        filledSlots: 0,
        semesterName: targetSemester?.name || "N/A",
      },
      semesterStudents: 0,
      semesterRevenue: 0,
      paidRevenue: 0,
      settlementPercentage: 0,
      uncollectedPercentage: 0,
      facultyDistribution: [],
    };

    if (targetSemesterId) {
      const [
        totalClasses,
        lockedClasses,
        slotsAgg,
        completeProfiles,
        semesterStudentsRaw,
        facultyRows,
        revenueSnapshot,
      ] = await Promise.all([
        this.prisma.courseClass.count({
          where: { semesterId: targetSemesterId },
        }),
        this.prisma.courseClass.count({
          where: {
            semesterId: targetSemesterId,
            grades: { some: { isLocked: true } },
          },
        }),
        this.prisma.courseClass.aggregate({
          where: { semesterId: targetSemesterId },
          _sum: { maxSlots: true, currentSlots: true },
        }),
        this.prisma.student.count({
          where: {
            ...studentWhere,
            phone: { not: null },
            address: { not: null },
            citizenId: { not: null },
          },
        }),
        this.prisma.enrollment.groupBy({
          by: ["studentId"],
          where: enrollmentWhere,
        }),
        this.prisma.enrollment.findMany({
          where: enrollmentWhere,
          select: {
            student: {
              select: {
                major: {
                  select: {
                    faculty: { select: { name: true } },
                  },
                },
              },
            },
          },
        }),
        this.tuitionService.getSemesterRevenueSnapshot({
          semesterId: targetSemesterId,
          facultyId,
          majorId,
          intake,
          keyword,
        }),
      ]);

      activeCourses = totalClasses;
      operationalStats.details.totalClasses = totalClasses;
      operationalStats.details.lockedClasses = lockedClasses;
      operationalStats.details.totalSlots = Number(slotsAgg._sum.maxSlots || 0);
      operationalStats.details.filledSlots = Number(slotsAgg._sum.currentSlots || 0);
      operationalStats.gradeProgress =
        totalClasses > 0 ? Math.round((lockedClasses / totalClasses) * 100) : 0;
      operationalStats.registrationProgress =
        operationalStats.details.totalSlots > 0
          ? Math.round(
              (operationalStats.details.filledSlots /
                operationalStats.details.totalSlots) *
                100,
            )
          : 0;
      operationalStats.profileCompletion =
        totalStudents > 0 ? Math.round((completeProfiles / totalStudents) * 100) : 0;
      operationalStats.semesterStudents = semesterStudentsRaw.length;
      operationalStats.semesterRevenue = revenueSnapshot.totalRevenue;
      operationalStats.paidRevenue = revenueSnapshot.paidRevenue;
      operationalStats.settlementPercentage =
        revenueSnapshot.totalRevenue > 0
          ? Number(
              ((revenueSnapshot.paidRevenue / revenueSnapshot.totalRevenue) * 100).toFixed(
                1,
              ),
            )
          : 0;
      operationalStats.uncollectedPercentage = Number(
        Math.max(100 - operationalStats.settlementPercentage, 0).toFixed(1),
      );

      const facultyMap = new Map<string, number>();
      for (const row of facultyRows) {
        const facultyName = row.student?.major?.faculty?.name || "Khác";
        facultyMap.set(facultyName, (facultyMap.get(facultyName) || 0) + 1);
      }
      operationalStats.facultyDistribution = [...facultyMap.entries()]
        .map(([name, value]) => ({ name, value }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 6);
    }

    const totalRevenue =
      targetSemesterId && operationalStats.semesterRevenue
        ? operationalStats.semesterRevenue
        : 0;

    return {
      totalStudents,
      activeCourses,
      totalRevenue,
      enrollmentCount: await this.prisma.enrollment.count({ where: enrollmentWhere }),
      attendanceRate: Math.round(Number(attendanceAgg._avg.attendanceScore || 0) * 10),
      recentEnrollments,
      attendanceDistribution,
      coursePopularity,
      enrollmentTrends: this.buildEnrollmentTrend(enrollmentsRaw),
      systemStats: {
        totalFaculties,
        totalMajors,
        totalAdminClasses,
        totalLecturers,
      },
      gpaDistribution,
      totalCreditsAssigned: Number(totalCreditsAssigned._sum.totalEarnedCredits || 0),
      operationalStats,
      statusDistribution,
      intakeDistribution,
      majorDistribution,
    };
  }

  async getSemesters() {
    return this.prisma.semester.findMany({
      orderBy: { startDate: "desc" },
      select: {
        id: true,
        code: true,
        name: true,
        year: true,
        semesterNumber: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });
  }

  async getFaculties() {
    return this.prisma.faculty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async getMajors(facultyId?: string) {
    return this.prisma.major.findMany({
      where: facultyId && facultyId !== "all" ? { facultyId } : {},
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async getIntakes() {
    const rows = await this.prisma.student.groupBy({
      by: ["intake"],
      where: { intake: { not: null } },
      _count: { id: true },
    });

    return rows
      .filter((row) => row.intake)
      .map((row) => ({ id: row.intake, name: row.intake }))
      .sort((left, right) => `${right.name}`.localeCompare(`${left.name}`, "vi"));
  }

  async getTuitionList(
    semesterId?: string,
    query?: string,
    page = 1,
    limit = 10,
  ) {
    return this.tuitionService.getStudentTuitionList({
      semesterId,
      query,
      page,
      limit,
    });
  }

  async updateTuitionStatus(
    id: string,
    data: { isPaid?: boolean; deduction?: number },
  ) {
    if (typeof data.isPaid === "boolean") {
      return this.tuitionService.updateEnrollmentPayment(
        [id],
        data.isPaid ? "PAID" : "REGISTERED",
      );
    }

    if (typeof data.deduction === "number" && data.deduction > 0) {
      return this.tuitionService.updateEnrollmentPayment([id], "PAID");
    }

    return { success: true, id, ...data };
  }
}
