import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TuitionService {
  constructor(private prisma: PrismaService) {}

  private buildTuitionFeeId(studentId: string, semesterId: string) {
    const normalizedStudent =
      studentId.replace(/[^A-Za-z0-9]/g, "").slice(-16) || "STUDENT";
    const normalizedSemester =
      semesterId.replace(/[^A-Za-z0-9]/g, "").slice(-16) || "SEMESTER";
    return `TUITION_${normalizedStudent}_${normalizedSemester}`.slice(0, 50);
  }

  async getFaculties() {
    return this.prisma.faculty.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async getMajors(facultyId?: string) {
    return this.prisma.major.findMany({
      where: facultyId ? { facultyId } : {},
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async getAdminClasses(majorId?: string) {
    return this.prisma.adminClass.findMany({
      where: majorId ? { majorId } : {},
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async getStudentTuitionList(params: {
    semesterId?: string;
    facultyId?: string;
    majorId?: string;
    classId?: string;
    status?: string;
    query?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      semesterId,
      facultyId,
      majorId,
      classId,
      status,
      query,
      page = 1,
      limit = 20,
    } = params;

    const where: any = {
      AND: [],
    };

    if (facultyId) {
      where.AND.push({ major: { facultyId } });
    }
    if (majorId) {
      where.AND.push({ majorId });
    }
    if (classId) {
      where.AND.push({ adminClassId: classId });
    }
    if (params.status === "DEBT") {
      where.AND.push({
        studentFees: {
          some: {
            status: "DEBT",
            semesterId,
          },
        },
      });
    }
    if (semesterId) {
      where.AND.push({
        enrollments: {
          some: {
            courseClass: { semesterId },
          },
        },
      });
    }
    if (query) {
      where.AND.push({
        OR: [
          { studentCode: { contains: query } },
          { fullName: { contains: query } },
        ],
      });
    }

    const skip = (page - 1) * limit;

    const [total, students] = await Promise.all([
      this.prisma.student.count({ where }),
      this.prisma.student.findMany({
        where,
        include: {
          adminClass: true,
          major: { include: { faculty: true } },
          enrollments: {
            where: semesterId ? { courseClass: { semesterId } } : {},
            include: {
              courseClass: { include: { subject: true } },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { studentCode: "asc" },
      }),
    ]);

    // Fetch fixed fees for all students in the current page and semester
    // FILTER: Exclude redundant tuition summary records (names containing "Học phí")
    const studentIds = students.map((s) => s.id);
    const fixedFees = semesterId
      ? await this.prisma.studentFee.findMany({
          where: {
            studentId: { in: studentIds },
            semesterId,
            NOT: {
              name: { contains: "Học phí" },
            },
          },
        })
      : [];

    // Group fixed fees by studentId
    const fixedFeesByStudent: Record<string, typeof fixedFees> = {};
    fixedFees.forEach((f) => {
      if (!fixedFeesByStudent[f.studentId])
        fixedFeesByStudent[f.studentId] = [];
      fixedFeesByStudent[f.studentId].push(f);
    });

    return {
      total,
      page,
      limit,
      items: students.map((s) => {
        // Group enrollments by subject to avoid duplicates in display and fee calculation
        const groupedEnrollments: Record<string, any> = {};
        s.enrollments.forEach((e) => {
          const subjectId = e.courseClass.subjectId;
          if (!groupedEnrollments[subjectId]) {
            groupedEnrollments[subjectId] = { ...e };
          } else {
            // If any of the duplicates is PAID, consider the subject as PAID
            if (e.status === "PAID") {
              groupedEnrollments[subjectId].status = "PAID";
            }
          }
        });

        const semesterEnrollments = Object.values(groupedEnrollments);
        const studentFixedFees = fixedFeesByStudent[s.id] || [];

        const tuitionTotal = semesterEnrollments.reduce(
          (sum, e) => sum + Number(e.tuitionFee),
          0,
        );
        const fixedTotal = studentFixedFees.reduce(
          (sum, f) => sum + Number(f.totalAmount),
          0,
        );
        const totalFee = tuitionTotal + fixedTotal;

        const tuitionPaid = semesterEnrollments
          .filter((e) => e.status === "PAID")
          .reduce((sum, e) => sum + Number(e.tuitionFee), 0);
        const fixedPaid = studentFixedFees.reduce(
          (sum, f) => sum + Number(f.paidAmount),
          0,
        );
        const paidAmount = tuitionPaid + fixedPaid;

        const debt = totalFee - paidAmount;
        const paidCount = semesterEnrollments.filter(
          (e) => e.status === "PAID",
        ).length;

        const allItems = [
          ...semesterEnrollments.map((e) => ({
            id: e.id,
            subjectCode: e.courseClass.subject.code,
            subjectName: e.courseClass.subject.name,
            credits: e.courseClass.subject.credits,
            fee: Number(e.tuitionFee),
            status: e.status,
            type: "ENROLLMENT",
          })),
          ...studentFixedFees.map((f) => ({
            id: f.id,
            subjectCode: "N/A",
            subjectName: f.name,
            credits: 0,
            fee: Number(f.totalAmount),
            status: f.status,
            type: "FIXED_FEE",
          })),
        ];

        return {
          id: s.id,
          studentCode: s.studentCode,
          fullName: s.fullName,
          className: s.adminClass?.name || "N/A",
          majorName: s.major.name,
          facultyName: s.major.faculty.name,
          totalFee,
          paidAmount,
          debt,
          paidCount,
          totalSubjects: semesterEnrollments.length,
          status: debt <= 0 && allItems.length > 0 ? "PAID" : "DEBT",
          enrollments: allItems,
        };
      }),
    };
  }

  async updateEnrollmentPayment(
    paymentIds: string[],
    status: "PAID" | "REGISTERED",
  ) {
    // 1. Update Enrollments (and sync duplicates)
    const enrollmentsToSync = await this.prisma.enrollment.findMany({
      where: { id: { in: paymentIds } },
      include: { courseClass: true },
    });

    const enrollmentUpdatePromises = enrollmentsToSync.map((e) => {
      return this.prisma.enrollment.updateMany({
        where: {
          studentId: e.studentId,
          courseClass: {
            subjectId: e.courseClass.subjectId,
            semesterId: e.courseClass.semesterId,
          },
        },
        data: { status },
      });
    });

    // 2. Update StudentFees
    const studentFeeUpdatePromise = this.prisma.studentFee.updateMany({
      where: { id: { in: paymentIds } },
      data: {
        status: status === "PAID" ? "PAID" : "DEBT",
        paidAmount: {
          set: status === "PAID" ? undefined : 0, // This is a simplification
        },
      },
    });

    // Note: To be more accurate with paidAmount, we'd need to fetch the totalAmount.
    // However, for single-toggle UI, setting status is often the primary goal.

    return Promise.all([...enrollmentUpdatePromises, studentFeeUpdatePromise]);
  }

  async getStudentFees(studentId: string) {
    // Fetch fixed fees (BHYT, etc.) and exclude redundant tuition summary records
    const fixedFees = await this.prisma.studentFee.findMany({
      where: {
        studentId,
        NOT: {
          name: { contains: "Học phí" },
        },
      },
      include: { semester: true },
    });

    // Fetch enrollments to calculate virtual tuition fees
    const studentsWithEnrollments = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            courseClass: {
              include: { semester: true },
            },
          },
        },
      },
    });

    const studentFees = fixedFees.map((f) => ({
      id: f.id,
      name: f.name,
      semester: f.semester.name,
      totalAmount: Number(f.totalAmount),
      paidAmount: Number(f.paidAmount),
      finalAmount: Number(f.finalAmount),
      status: f.status,
      dueDate: f.dueDate,
    }));

    // Robust grouping by (semester, subject)
    const subjectsInSemester: Record<
      string,
      { total: number; paid: number; semesterName: string; semesterId: string }
    > = {};

    studentsWithEnrollments?.enrollments.forEach((e) => {
      const semesterId = e.courseClass.semesterId;
      const subjectId = e.courseClass.subjectId;
      const key = `${semesterId}_${subjectId}`;

      if (!subjectsInSemester[key]) {
        subjectsInSemester[key] = {
          total: Number(e.tuitionFee),
          paid: 0,
          semesterName: e.courseClass.semester.name,
          semesterId: semesterId,
        };
      }
      // If any registration for this subject is PAID, the subject is considered paid
      if (e.status === "PAID") {
        subjectsInSemester[key].paid = Number(e.tuitionFee);
      }
    });

    // Sum up per semester
    const enrollmentsBySemester: Record<
      string,
      { name: string; total: number; paid: number }
    > = {};
    Object.values(subjectsInSemester).forEach((data) => {
      if (!enrollmentsBySemester[data.semesterId]) {
        enrollmentsBySemester[data.semesterId] = {
          name: data.semesterName,
          total: 0,
          paid: 0,
        };
      }
      enrollmentsBySemester[data.semesterId].total += data.total;
      enrollmentsBySemester[data.semesterId].paid += data.paid;
    });

    // Inject tuition fees as line items ONLY if not already present in fixedFees
    Object.entries(enrollmentsBySemester).forEach(([semesterId, data]) => {
      if (data.total > 0) {
        // Check if there's already a fee record for this semester to avoid double counting
        const hasExistingSemesterFee = studentFees.some(
          (f) => f.semester === data.name && f.name.includes("Học phí"),
        );

        if (hasExistingSemesterFee) {
          // If already exists, we might want to update it, but for now just skip adding a new one
          return;
        }

        const debt = data.total - data.paid;
        studentFees.unshift({
          id: `tuition-${semesterId}`,
          name: `Học phí ${data.name}`,
          semester: data.name,
          totalAmount: data.total,
          paidAmount: data.paid,
          finalAmount: data.total,
          status: debt <= 0 ? "PAID" : data.paid > 0 ? "PARTIAL" : "DEBT",
          dueDate: null,
        } as any);
      }
    });

    return studentFees;
  }

  async syncStudentTuition(studentId: string, semesterId: string) {
    // 1. Get all enrollments for this student in this semester
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          where: { courseClass: { semesterId } },
          include: { courseClass: { include: { subject: true } } },
        },
      },
    });

    if (!student) return;

    // 2. Sum up total tuition fees
    const totalTuition = student.enrollments.reduce(
      (sum, enr) => sum + Number(enr.tuitionFee),
      0,
    );
    const paidTuition = student.enrollments
      .filter((enr) => enr.status === "PAID")
      .reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);

    if (totalTuition === 0 && student.enrollments.length === 0) {
      // If no enrollments, we might want to remove existing tuition fee records
      await this.prisma.studentFee.deleteMany({
        where: {
          studentId,
          semesterId,
          feeType: "TUITION",
        },
      });
      return;
    }

    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });
    const feeName = `Học phí ${semester?.name || semesterId}`;

    const feePayload = {
      totalAmount: totalTuition,
      finalAmount: totalTuition,
      paidAmount: paidTuition,
      status:
        paidTuition >= totalTuition
          ? "PAID"
          : paidTuition > 0
            ? "PARTIAL"
            : "DEBT",
    };

    const existingFee = await this.prisma.studentFee.findFirst({
      where: {
        studentId,
        semesterId,
        feeType: "TUITION",
      },
    });

    if (existingFee) {
      await this.prisma.studentFee.update({
        where: { id: existingFee.id },
        data: feePayload,
      });
      return { total: totalTuition, paid: paidTuition };
    }

    await this.prisma.studentFee.create({
      data: {
        id: this.buildTuitionFeeId(studentId, semesterId),
        studentId,
        semesterId,
        feeType: "TUITION",
        name: feeName,
        discountAmount: 0,
        isMandatory: true,
        ...feePayload,
      },
    });

    return { total: totalTuition, paid: paidTuition };
  }

  async toggleExamEligibility(
    studentId: string,
    semesterId: string,
    isEligible: boolean,
  ) {
    return this.prisma.grade.updateMany({
      where: {
        studentId,
        courseClass: { semesterId },
      },
      data: { isEligibleForExam: isEligible },
    });
  }
}
