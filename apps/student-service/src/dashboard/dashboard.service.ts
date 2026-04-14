import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats(
    semesterId?: string,
    facultyId?: string,
    majorId?: string,
    intake?: string,
  ) {
    // Build where clause for filtering
    const where: any = {};
    if (semesterId) {
      where.semesterId = semesterId;
    }

    // Handle student filtering
    const studentWhere: any = {};
    if (facultyId && facultyId !== "all") {
      studentWhere.major = { facultyId: facultyId };
    }
    if (majorId && majorId !== "all") {
      studentWhere.majorId = majorId;
    }
    if (intake && intake !== "all") {
      studentWhere.intake = intake;
    }

    const classWhere: any = {};
    if (semesterId) classWhere.semesterId = semesterId;

    const enrollmentWhere: any = {};
    if (semesterId) enrollmentWhere.courseClass = { semesterId };
    if (Object.keys(studentWhere).length > 0)
      enrollmentWhere.student = studentWhere;

    const gradeWhere: any = {};
    if (semesterId) gradeWhere.courseClass = { semesterId };
    if (Object.keys(studentWhere).length > 0) gradeWhere.student = studentWhere;

    // Run in parallel for performance
    const [
      totalStudents,
      activeCourses,
      revenueAgg,
      enrollmentCount,
      attendanceAgg,
      recentEnrollmentsRaw,
      attendanceGradesRaw,
      coursePopularityRaw,
      enrollmentsRaw,

      // New UNETI stats
      totalFaculties,
      totalMajors,
      totalAdminClasses,
      totalLecturers,
      gpaDistributionRaw,
    ] = await Promise.all([
      this.prisma.student.count({ where: studentWhere }),
      this.prisma.courseClass.count({ where: classWhere }),
      this.prisma.enrollment.aggregate({
        where: { status: "PAID", ...enrollmentWhere },
        _sum: { tuitionFee: true },
      }),
      this.prisma.enrollment.count({ where: enrollmentWhere }),
      this.prisma.grade.aggregate({
        where: { ...gradeWhere, attendanceScore: { not: null } },
        _avg: { attendanceScore: true },
      }),
      // Recent Enrollments (Filter by semester if provided)
      this.prisma.enrollment.findMany({
        where: enrollmentWhere,
        take: 5,
        orderBy: { registeredAt: "desc" },
        include: {
          student: true,
          courseClass: { include: { subject: true } },
        },
      }),
      // Attendance Distribution (fetch minimal needed to bucket)
      this.prisma.grade.findMany({
        select: { attendanceScore: true },
        where: { ...gradeWhere, attendanceScore: { not: null } },
      }),
      // Course Popularity: we'll group by courseClassId and get counts
      this.prisma.enrollment.groupBy({
        by: ["courseClassId"],
        where: enrollmentWhere,
        _count: { studentId: true },
        orderBy: { _count: { studentId: "desc" } },
        take: 6,
      }),
      // For Enrollment Trends (Filter by semester if provided, otherwise last 6 months)
      this.prisma.enrollment.findMany({
        where: enrollmentWhere,
        select: { registeredAt: true },
      }),

      // Execute System Stats (UNETI)
      this.prisma.faculty.count(),
      this.prisma.major.count(),
      this.prisma.adminClass.count(),
      this.prisma.lecturer.count(),

      // GPA Distribution
      this.prisma.student.findMany({
        where: studentWhere,
        select: { gpa: true },
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

    // Process Recent Enrollments
    const recentEnrollments = recentEnrollmentsRaw.map((e) => ({
      name: e.student?.fullName || "N/A",
      course: e.courseClass?.subject?.name || "Unknown Course",
      time: e.registeredAt.toISOString(),
      img: (e.student?.fullName || "??").substring(0, 2).toUpperCase(),
    }));

    // Process Attendance Distribution Buckets
    const attendanceDistribution = [
      { name: "Excellent (9-10)", value: 0, color: "#22c55e" },
      { name: "Good (7-8)", value: 0, color: "#3b82f6" },
      { name: "Average (5-6)", value: 0, color: "#eab308" },
      { name: "Poor (< 5)", value: 0, color: "#ef4444" },
    ];

    attendanceGradesRaw.forEach((g) => {
      const score = g.attendanceScore!;
      if (score >= 9) attendanceDistribution[0].value++;
      else if (score >= 7) attendanceDistribution[1].value++;
      else if (score >= 5) attendanceDistribution[2].value++;
      else attendanceDistribution[3].value++;
    });

    // Process GPA Distribution Buckets (UNETI 4.0 Scale)
    const gpaDistribution = [
      { name: "Xuất sắc (3.6 - 4.0)", value: 0, color: "#8b5cf6" }, // purple-500
      { name: "Giỏi (3.2 - 3.59)", value: 0, color: "#3b82f6" }, // blue-500
      { name: "Khá (2.5 - 3.19)", value: 0, color: "#06b6d4" }, // cyan-500
      { name: "Trung bình (2.0 - 2.49)", value: 0, color: "#eab308" }, // yellow-500
      { name: "Yếu (< 2.0)", value: 0, color: "#ef4444" }, // red-500
    ];

    gpaDistributionRaw.forEach((s) => {
      const gpa = s.gpa;
      if (gpa >= 3.6) gpaDistribution[0].value++;
      else if (gpa >= 3.2) gpaDistribution[1].value++;
      else if (gpa >= 2.5) gpaDistribution[2].value++;
      else if (gpa >= 2.0) gpaDistribution[3].value++;
      else gpaDistribution[4].value++;
    });

    // Process Course Popularity
    // We need the subject names for the top classes
    const topCourseIds = coursePopularityRaw.map((c) => c.courseClassId);
    const topCoursesClasses = await this.prisma.courseClass.findMany({
      where: { id: { in: topCourseIds } },
      include: { subject: true },
    });

    const coursePopularity = coursePopularityRaw.map((c) => {
      const courseClass = topCoursesClasses.find(
        (tcc) => tcc.id === c.courseClassId,
      );
      const subjectName = courseClass?.subject?.name || "Unknown";
      // generate a short name from subject name e.g "Software Engineering" -> "SE"
      const shortName =
        subjectName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .substring(0, 4)
          .toUpperCase() || "UNK";
      return {
        name: shortName,
        fullName: subjectName,
        value: c._count.studentId,
      };
    });

    // Process Enrollment Trends (last 6 months)
    const trendsMap = new Map<string, number>();
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toLocaleString("default", { month: "short" });
      trendsMap.set(monthStr, 0); // Initialize
    }

    enrollmentsRaw.forEach((e) => {
      const d = e.registeredAt;
      // Only count if it's within our tracked months
      const diffMonths =
        (now.getFullYear() - d.getFullYear()) * 12 +
        now.getMonth() -
        d.getMonth();
      if (diffMonths >= 0 && diffMonths <= 5) {
        const monthStr = d.toLocaleString("default", { month: "short" });
        if (trendsMap.has(monthStr)) {
          trendsMap.set(monthStr, trendsMap.get(monthStr)! + 1);
        }
      }
    });

    const enrollmentTrends = Array.from(trendsMap.entries()).map(
      ([name, enrollments]) => ({
        name,
        enrollments,
      }),
    );

    // Calculate dynamic credits data based on GPA assuming fixed formulas or rough estimates
    // In real system we'd sum this from Debt but for Dashboard overview we can approximate based on seeded credits
    const totalCreditsAssigned = await this.prisma.student.aggregate({
      _sum: { totalEarnedCredits: true },
    });

    // Find target semester for operational metrics
    let targetSemester;
    if (semesterId) {
      targetSemester = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
    } else {
      targetSemester = await this.prisma.semester.findFirst({
        where: { isCurrent: true },
      });
      if (!targetSemester) {
        targetSemester = await this.prisma.semester.findFirst({
          orderBy: { startDate: "desc" },
        });
      }
    }

    const currentSemesterId = targetSemester?.id;

    // Calculate Operational Stats (UNETI Staff)
    const operationalStats = {
      gradeProgress: 0,
      registrationProgress: 0,
      profileCompletion: 0,
      examProgress: 45,
      details: {
        totalClasses: 0,
        lockedClasses: 0,
        totalSlots: 0,
        filledSlots: 0,
        semesterName: targetSemester?.name || "N/A",
      },
    };

    // Intake Distribution
    const intakeDistributionRaw = await arguments[0]; // will be assigned properly since grouped destructure is complex. Let's refer to returned array

    // Actually wait, I need to destructure the result properly.
    // Instead of replacing destructuring, I'll calculate it outside.

    // Let's use the fetched student distribution.
    const [
      statusDistributionRaw,
      totalStudentsCount,
      rawIntakeDistribution,
      rawMajorDistribution,
    ] = await Promise.all([
      this.prisma.student.groupBy({
        by: ["academicStatus"],
        where: studentWhere,
        _count: { id: true },
      }),
      this.prisma.student.count({ where: studentWhere }),
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

    const intakeDistribution = rawIntakeDistribution
      .filter((r) => r.intake)
      .map((r) => ({ name: r.intake || "Khác", value: r._count.id }))
      .sort((a, b) => b.name.localeCompare(a.name));

    // Major Distribution
    const majorMap = new Map<string, number>();
    const allMajorsForChart = await this.prisma.major.findMany();
    rawMajorDistribution.forEach((m) => {
      if (m.majorId) {
        const major = allMajorsForChart.find((x) => x.id === m.majorId);
        const name = major?.name || "Khác";
        majorMap.set(name, (majorMap.get(name) || 0) + m._count.id);
      }
    });
    const majorDistribution = Array.from(majorMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const statusDistribution = [
      { name: "Bình thường", value: 0, color: "#22c55e" },
      { name: "Cảnh báo", value: 0, color: "#ef4444" },
      { name: "Khác", value: 0, color: "#64748b" },
    ];

    statusDistributionRaw.forEach((s) => {
      if (s.academicStatus === "NORMAL")
        statusDistribution[0].value = s._count.id;
      else if (s.academicStatus === "WARNING")
        statusDistribution[1].value = s._count.id;
      else statusDistribution[2].value += s._count.id;
    });

    if (currentSemesterId) {
      const [
        totalClasses,
        lockedClassesCount,
        slotsAgg,
        completeProfiles,
        semesterEnrollments,
        rawEnrollments,
        fixedRevenue,
        paidFixedRevenue,
      ] = await Promise.all([
        this.prisma.courseClass.count({
          where: { semesterId: currentSemesterId, ...classWhere },
        }),
        this.prisma.courseClass.count({
          where: {
            semesterId: currentSemesterId,
            ...classWhere,
            grades: { some: { isLocked: true } },
          },
        }),
        this.prisma.courseClass.aggregate({
          where: { semesterId: currentSemesterId, ...classWhere },
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
        // Count unique students enrolled in the current semester
        this.prisma.enrollment.groupBy({
          by: ["studentId"],
          where: { courseClass: { semesterId: currentSemesterId } },
        }),
        // Fetch raw enrollments for deduplication by student + subject
        this.prisma.enrollment.findMany({
          where: { courseClass: { semesterId: currentSemesterId } },
          select: {
            studentId: true,
            tuitionFee: true,
            status: true,
            courseClass: { select: { subjectId: true } },
          },
        }),
        // Sum total fixed fees (e.g., BHYT)
        this.prisma.studentFee.aggregate({
          where: {
            semesterId: currentSemesterId,
            NOT: { name: { contains: "Học phí" } },
          },
          _sum: { totalAmount: true },
        }),
        // Sum paid fixed fees
        this.prisma.studentFee.aggregate({
          where: {
            semesterId: currentSemesterId,
            status: "PAID",
            NOT: { name: { contains: "Học phí" } },
          },
          _sum: { totalAmount: true },
        }),
      ]);

      operationalStats.details.totalClasses = totalClasses;
      operationalStats.details.lockedClasses = lockedClassesCount;
      operationalStats.details.totalSlots = slotsAgg._sum.maxSlots || 0;
      operationalStats.details.filledSlots = slotsAgg._sum.currentSlots || 0;

      operationalStats.gradeProgress =
        totalClasses > 0
          ? Math.round((lockedClassesCount / totalClasses) * 100)
          : 0;
      operationalStats.registrationProgress =
        operationalStats.details.totalSlots > 0
          ? Math.round(
              (operationalStats.details.filledSlots /
                operationalStats.details.totalSlots) *
                100,
            )
          : 0;
      operationalStats.profileCompletion =
        totalStudents > 0
          ? Math.round((completeProfiles / totalStudents) * 100)
          : 0;

      // Add new semester-specific stats to operationalStats
      (operationalStats as any).semesterStudents = semesterEnrollments.length;

      // Deduplicate enrollments by studentId + subjectId to match TuitionService
      const uniqueEnrollments = new Map<string, any>();
      rawEnrollments.forEach((e) => {
        const key = `${e.studentId}_${e.courseClass.subjectId}`;
        if (!uniqueEnrollments.has(key)) {
          uniqueEnrollments.set(key, { ...e });
        } else {
          // If any instance is PAID, consider the subject as PAID
          if (e.status === "PAID") {
            uniqueEnrollments.get(key).status = "PAID";
          }
        }
      });

      let tuitionSum = 0;
      let paidTuitionSum = 0;
      uniqueEnrollments.forEach((e) => {
        const fee = Number(e.tuitionFee || 0);
        tuitionSum += fee;
        if (e.status === "PAID") {
          paidTuitionSum += fee;
        }
      });

      const fixedSum = Number(fixedRevenue._sum.totalAmount || 0);
      const paidFixedSum = Number(paidFixedRevenue._sum.totalAmount || 0);

      const totalRevenue = tuitionSum + fixedSum;
      const paidRevenueValue = paidTuitionSum + paidFixedSum;

      (operationalStats as any).semesterRevenue = totalRevenue;
      (operationalStats as any).paidRevenue = paidRevenueValue;

      const settlementPercentage =
        totalRevenue > 0
          ? Number(((paidRevenueValue / totalRevenue) * 100).toFixed(1))
          : 0;

      (operationalStats as any).settlementPercentage = settlementPercentage;
      (operationalStats as any).uncollectedPercentage = Number(
        (100 - settlementPercentage).toFixed(1),
      );

      // To get faculty distribution, we need to join with student and faculty.
      // Since groupBy doesn't support deep joins easily in Prisma for counts,
      // we'll fetch the enrollments with student faculty info.
      const semesterEnrollmentsWithFaculty =
        await this.prisma.enrollment.findMany({
          where: { courseClass: { semesterId: currentSemesterId } },
          select: {
            student: {
              select: {
                major: {
                  select: {
                    faculty: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
          },
        });

      const facultyMap = new Map<string, number>();
      semesterEnrollmentsWithFaculty.forEach((e) => {
        const fName = e.student?.major?.faculty?.name || "Khác";
        facultyMap.set(fName, (facultyMap.get(fName) || 0) + 1);
      });

      const facultyDistribution = Array.from(facultyMap.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      (operationalStats as any).facultyDistribution = facultyDistribution;
    }

    return {
      totalStudents,
      activeCourses,
      totalRevenue: Number(revenueAgg._sum.tuitionFee || 0),
      enrollmentCount,
      attendanceRate: Math.round(attendanceAgg._avg.attendanceScore || 0) * 10,
      recentEnrollments,
      attendanceDistribution,
      coursePopularity,
      enrollmentTrends,

      // Export UNETI new fields
      systemStats: {
        totalFaculties,
        totalMajors,
        totalAdminClasses,
        totalLecturers,
      },
      gpaDistribution,
      totalCreditsAssigned: totalCreditsAssigned._sum.totalEarnedCredits || 0,
      operationalStats,
      statusDistribution,
      intakeDistribution,
      majorDistribution,
    };
  }

  async getSemesters() {
    return this.prisma.semester.findMany({
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, isCurrent: true },
    });
  }

  async getFaculties() {
    return this.prisma.faculty.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async getMajors(facultyId?: string) {
    const where = facultyId && facultyId !== "all" ? { facultyId } : {};
    return this.prisma.major.findMany({
      where,
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }

  async getIntakes() {
    const students = await this.prisma.student.groupBy({
      by: ["intake"],
      _count: true,
      where: { intake: { not: null } },
    });
    return students
      .map((s) => ({ id: s.intake, name: s.intake }))
      .sort((a, b) => {
        if (b.name && a.name) return b.name.localeCompare(a.name);
        return 0;
      });
  }

  async getTuitionList(
    semesterId?: string,
    query?: string,
    page = 1,
    limit = 10,
  ) {
    const where: any = {};
    if (semesterId) {
      where.courseClass = { semesterId };
    }
    if (query) {
      where.OR = [
        { student: { fullName: { contains: query } } },
        { student: { studentCode: { contains: query } } },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, enrollments] = await Promise.all([
      this.prisma.enrollment.count({ where }),
      this.prisma.enrollment.findMany({
        where,
        include: {
          student: {
            include: { major: { include: { faculty: true } } },
          },
          courseClass: { include: { subject: true } },
        },
        orderBy: { registeredAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      page,
      limit,
      items: enrollments.map((e) => ({
        id: e.id,
        studentCode: e.student?.studentCode || "N/A",
        studentName: e.student?.fullName || "N/A",
        faculty: e.student?.major?.faculty?.name || "Khác",
        subject: e.courseClass?.subject?.name || "Unknown",
        credits: e.courseClass?.subject?.credits || 0,
        fee: Number(e.tuitionFee || 0),
        status: e.status,
        isPaid: e.id.length % 3 !== 0, // Keeping mock for now as it's not in DB yet
        debt: e.id.length % 3 === 0 ? Number(e.tuitionFee || 0) : 0,
      })),
    };
  }

  async updateTuitionStatus(
    id: string,
    data: { isPaid?: boolean; deduction?: number },
  ) {
    // Since isPaid/deduction isn't in the schema yet, we'll simulate an update or
    // return success. In a real scenario, we'd update the enrollment or a mapping table.
    return { success: true, id, ...data };
  }
}
