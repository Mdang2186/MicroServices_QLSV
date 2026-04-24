import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_PRICE_PER_CREDIT = 500000;

type StudentTuitionListParams = {
  semesterId?: string;
  date?: string;
  facultyId?: string;
  majorId?: string;
  classId?: string;
  status?: string;
  query?: string;
  keyword?: string;
  intake?: string;
  page?: number;
  limit?: number;
};

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

  private normalizeMoney(value: unknown) {
    return Number(value || 0);
  }

  private async upsertSyncedReceipt(
    prisma: any,
    studentFeeId: string,
    paidAmount: number,
  ) {
    const amount = Math.max(this.normalizeMoney(paidAmount), 0);
    const transactionCode = `RCPT_${studentFeeId}`.slice(0, 100);

    if (amount <= 0) {
      await prisma.feeTransaction.deleteMany({
        where: { studentFeeId, transactionCode },
      });
      return null;
    }

    const existing = await prisma.feeTransaction.findFirst({
      where: { studentFeeId, transactionCode },
      orderBy: { transactionDate: "desc" },
    });

    const payload = {
      amount,
      transactionType: "PAYMENT",
      paymentMethod: "STAFF",
      transactionCode,
    };

    if (existing) {
      return prisma.feeTransaction.update({
        where: { id: existing.id },
        data: payload,
      });
    }

    return prisma.feeTransaction.create({
      data: {
        studentFeeId,
        ...payload,
      },
    });
  }

  private isTuitionSummaryFeeName(name?: string | null) {
    return `${name || ""}`.toLowerCase().includes("học phí");
  }

  private resolveFixedFeeAmount(fee: any) {
    const finalAmount = this.normalizeMoney(fee?.finalAmount);
    const totalAmount = this.normalizeMoney(fee?.totalAmount);
    return finalAmount > 0 ? finalAmount : totalAmount;
  }

  private resolveFixedFeePaidAmount(fee: any) {
    const paidAmount = this.normalizeMoney(fee?.paidAmount);
    const amount = this.resolveFixedFeeAmount(fee);
    if (`${fee?.status || ""}`.toUpperCase() === "PAID") {
      return Math.max(paidAmount, amount);
    }
    return Math.min(paidAmount, amount);
  }

  private buildStudentWhere(filters: {
    facultyId?: string;
    majorId?: string;
    classId?: string;
    query?: string;
    keyword?: string;
    intake?: string;
  }) {
    const { facultyId, majorId, classId, query, keyword, intake } = filters;
    const where: any = {};

    if (facultyId && facultyId !== "all") {
      where.major = { facultyId };
    }

    if (majorId && majorId !== "all") {
      where.majorId = majorId;
    }

    if (classId && classId !== "all") {
      where.adminClassId = classId;
    }

    if (intake && intake !== "all") {
      where.intake = intake;
    }

    const searchValue = `${query || keyword || ""}`.trim();
    if (searchValue) {
      where.OR = [
        { studentCode: { contains: searchValue } },
        { fullName: { contains: searchValue } },
      ];
    }

    return where;
  }

  private parseLegacyAdminClass(
    adminClassCode?: string | null,
    cohortCode?: string | null,
  ) {
    const code = `${adminClassCode || ""}`.trim().toUpperCase();
    const cohort = `${cohortCode || ""}`.trim().toUpperCase();
    if (!code || code.startsWith("K")) return null;

    const match = code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
    if (!match) return null;

    return {
      cohort: cohort || `K${match[1]}`,
      section: match[2].padStart(2, "0"),
      majorCode: match[3],
    };
  }

  private resolveStudentCohortCode(student: any) {
    const directCohort =
      `${student?.intake || student?.adminClass?.cohort || ""}`.trim().toUpperCase();
    if (directCohort) {
      return directCohort;
    }

    const legacyMeta = this.parseLegacyAdminClass(student?.adminClass?.code);
    return legacyMeta?.cohort || null;
  }

  private parseCohortStartYear(cohortCode?: string | null) {
    const cohortNumber = Number(`${cohortCode || ""}`.replace(/\D/g, ""));
    if (!Number.isFinite(cohortNumber) || cohortNumber <= 0) return null;
    if (cohortNumber >= 2000) return cohortNumber;
    return 2006 + cohortNumber;
  }

  private parseConceptualSemester(semester: any) {
    const source = `${semester?.code || ""} ${semester?.name || ""}`;
    const match =
      source.match(/HK\s*([1-8])/i) ||
      source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
      source.match(/SEMESTER\s*([1-8])/i);
    if (match) return Number(match[1]);

    const semesterNumber = Number(
      semester?.cohortSemesterNumber || semester?.semesterNumber || 0,
    );
    return semesterNumber >= 1 && semesterNumber <= 8 ? semesterNumber : null;
  }

  private buildCohortSemester(semester: any, student: any, slot?: number | null) {
    const cohortCode = this.resolveStudentCohortCode(student);
    const startYear = this.parseCohortStartYear(cohortCode);
    const semesterNumber = slot || this.parseConceptualSemester(semester);
    if (!cohortCode || !startYear || !semesterNumber) return semester;

    const studyYear = Math.ceil(semesterNumber / 2);
    const academicStartYear = startYear + studyYear - 1;
    const academicYearLabel = `${academicStartYear}-${academicStartYear + 1}`;
    const isOddSemester = semesterNumber % 2 === 1;

    return {
      ...semester,
      code: `${cohortCode}_HK${semesterNumber}`,
      name: `HK${semesterNumber} - Năm ${studyYear} (${academicYearLabel})`,
      year: isOddSemester ? academicStartYear : academicStartYear + 1,
      startDate: isOddSemester
        ? new Date(academicStartYear, 8, 1)
        : new Date(academicStartYear + 1, 1, 1),
      endDate: isOddSemester
        ? new Date(academicStartYear + 1, 0, 20)
        : new Date(academicStartYear + 1, 5, 30),
      semesterNumber,
      cohortCode,
      cohortSemesterNumber: semesterNumber,
      cohortStudyYear: studyYear,
      cohortAcademicYear: academicYearLabel,
    };
  }

  private getStudentSemesterBucketKey(semester: any, student: any) {
    const slot = this.parseConceptualSemester(semester);
    if (slot && slot >= 1 && slot <= 8) return `SLOT_${slot}`;
    return `${semester?.id || semester?.code || semester?.name || ""}`.trim();
  }

  private async resolveStudentRecord(
    identifier: string,
    select: any,
    prismaClient?: any,
  ) {
    if (!identifier) return null;
    const prisma = prismaClient || this.prisma;

    let student = await prisma.student.findUnique({
      where: { id: identifier },
      select,
    });

    if (!student) {
      student = await prisma.student.findUnique({
        where: { userId: identifier },
        select,
      });
    }

    if (!student) {
      student = await prisma.student.findUnique({
        where: { studentCode: identifier },
        select,
      });
    }

    return student;
  }

  private async resolveLinkedStudentIds(studentId: string) {
    const student = await this.resolveStudentRecord(studentId, {
      id: true,
      fullName: true,
      studentCode: true,
      intake: true,
      adminClass: {
        select: { id: true, code: true, cohort: true },
      },
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
      orderBy: { code: "asc" },
      select: { id: true },
    });

    if (!mirrorAdminClass) {
      return linkedStudentIds;
    }

    let mirrorStudent = await this.prisma.student.findFirst({
      where: {
        adminClassId: mirrorAdminClass.id,
        fullName: student.fullName,
        status: "STUDYING",
      },
      select: { id: true },
    });

    if (!mirrorStudent) {
      const codeSuffix = `${student.studentCode || ""}`.match(/(\d{2})$/)?.[1];
      if (codeSuffix) {
        mirrorStudent = await this.prisma.student.findFirst({
          where: {
            adminClassId: mirrorAdminClass.id,
            studentCode: { endsWith: codeSuffix },
            status: "STUDYING",
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

  private async getPlannedSemesters(student: any) {
    const cohortCode = this.resolveStudentCohortCode(student);
    if (!student?.majorId || !cohortCode) {
      return [];
    }

    const plans = await this.prisma.semesterPlan.findMany({
      where: {
        majorId: student.majorId,
        cohort: cohortCode,
      },
      include: {
        semester: true,
      },
    });

    const semesterBySlot = new Map<number, any>();

    for (const plan of plans) {
      const conceptualSemester = Number(plan.conceptualSemester);
      const slot =
        conceptualSemester >= 1 && conceptualSemester <= 8
          ? conceptualSemester
          : this.parseConceptualSemester(plan.semester);
      if (!plan.semester || !slot || semesterBySlot.has(slot)) continue;
      semesterBySlot.set(slot, this.buildCohortSemester(plan.semester, student, slot));
    }

    return [...semesterBySlot.values()].sort(
      (left, right) =>
        new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
    );
  }

  private async resolveTargetSemester(
    semesterId?: string,
    date?: string,
    prismaClient?: any,
  ) {
    const prisma = prismaClient || this.prisma;

    if (semesterId && semesterId !== "all" && semesterId !== "undefined") {
      return prisma.semester.findFirst({
        where: {
          OR: [{ id: semesterId }, { code: semesterId }],
        },
      });
    }

    if (date) {
      const targetDate = new Date(date);
      const matchedSemester = await prisma.semester.findFirst({
        where: {
          startDate: { lte: targetDate },
          endDate: { gte: targetDate },
        },
      });
      if (matchedSemester) return matchedSemester;
    }

    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
      orderBy: { startDate: "desc" },
    });
    if (currentSemester) return currentSemester;

    return prisma.semester.findFirst({
      orderBy: { startDate: "desc" },
    });
  }

  private async getPriceConfigMap(
    academicYear?: number,
    majorIds: string[] = [],
    student?: any,
  ) {
    if (!academicYear || majorIds.length === 0) {
      return new Map<string, number>();
    }

    const configs = await this.prisma.tuitionConfig.findMany({
      where: {
        academicYear,
        majorId: { in: [...new Set(majorIds.filter(Boolean))] },
        isActive: true,
      },
    });

    const priceMap = new Map<string, number>();

    // 1. Try to match specific cohort + education type first
    for (const config of configs) {
      const isMatch =
        (!config.cohort || config.cohort === student?.intake) &&
        (!config.educationType || config.educationType === student?.educationType);

      if (isMatch) {
        priceMap.set(config.majorId, this.normalizeMoney(config.pricePerCredit));
      }
    }

    // 2. Fill in gaps with generic major configs (if not already set)
    for (const config of configs) {
      if (!priceMap.has(config.majorId)) {
        priceMap.set(config.majorId, this.normalizeMoney(config.pricePerCredit));
      }
    }

    return priceMap;
  }

  private resolveEnrollmentFee(
    enrollment: any,
    priceConfigMap: Map<string, number>,
  ) {
    if (enrollment.tuitionFee && Number(enrollment.tuitionFee) > 0) {
      return Number(enrollment.tuitionFee);
    }

    const subject = enrollment?.courseClass?.subject || {};
    const credits = Number(subject.credits || 0);
    const majorId = subject.majorId || enrollment?.student?.majorId || null;
    const configuredPrice =
      (majorId && priceConfigMap.get(majorId)) || DEFAULT_PRICE_PER_CREDIT;
    const multiplier =
      Number(enrollment?.courseClass?.tuitionMultiplier || 1) *
      (enrollment?.isRetake ? 1.5 : 1);

    return Math.round(credits * configuredPrice * multiplier);
  }

  private allocateTuitionPaidAmounts(items: any[], tuitionPaidAmount: number) {
    let remainingPaidAmount = Math.max(this.normalizeMoney(tuitionPaidAmount), 0);

    return items.map((item) => {
      const itemFee = this.normalizeMoney(item?.fee);
      const paidAmount = Math.min(itemFee, remainingPaidAmount);
      remainingPaidAmount = Math.max(remainingPaidAmount - paidAmount, 0);

      return {
        ...item,
        paidAmount,
        status:
          paidAmount >= itemFee && itemFee > 0
            ? "PAID"
            : paidAmount > 0
              ? "PARTIAL"
              : item?.status === "PAID"
                ? "PAID"
                : "DEBT",
      };
    });
  }

  private buildTuitionBreakdown(data: {
    enrollments?: any[];
    fixedFees?: any[];
    tuitionSummaryFee?: any | null;
    priceConfigMap?: Map<string, number>;
    preferEnrollmentStatus?: boolean;
  }) {
    const enrollments = data.enrollments || [];
    const fixedFees = (data.fixedFees || []).filter(
      (fee) => !this.isTuitionSummaryFeeName(fee?.name),
    );
    const tuitionSummaryFee = data.tuitionSummaryFee || null;
    const priceConfigMap = data.priceConfigMap || new Map<string, number>();

    const subjectMap = new Map<string, any>();

    for (const enrollment of enrollments) {
      const subjectKey =
        enrollment?.courseClass?.subjectId ||
        enrollment?.courseClass?.subject?.id ||
        enrollment?.courseClassId ||
        enrollment?.id;
      if (!subjectKey) continue;

      const fee = this.resolveEnrollmentFee(enrollment, priceConfigMap);
      const existing = subjectMap.get(subjectKey);
      const mergedStatus =
        existing?.status === "PAID" || enrollment.status === "PAID"
          ? "PAID"
          : existing?.status || enrollment.status || "REGISTERED";

      const candidate = {
        id: existing?.id || enrollment.id,
        subjectId: subjectKey,
        subjectCode:
          enrollment?.courseClass?.subject?.code ||
          enrollment?.courseClass?.code ||
          "N/A",
        subjectName:
          enrollment?.courseClass?.subject?.name ||
          enrollment?.courseClass?.name ||
          "Học phần",
        classCode: enrollment?.courseClass?.code || null,
        credits: Number(enrollment?.courseClass?.subject?.credits || 0),
        fee: Math.max(existing?.fee || 0, fee),
        status: mergedStatus,
        type: "ENROLLMENT",
      };

      if (
        !existing ||
        candidate.fee > existing.fee ||
        (!existing.classCode && candidate.classCode)
      ) {
        subjectMap.set(subjectKey, candidate);
      } else {
        subjectMap.set(subjectKey, { ...existing, status: mergedStatus });
      }
    }

    const baseTuitionItems = [...subjectMap.values()].sort((left, right) =>
      `${left.subjectCode} ${left.subjectName}`.localeCompare(
        `${right.subjectCode} ${right.subjectName}`,
        "vi",
      ),
    );

    const tuitionItems = tuitionSummaryFee && !data.preferEnrollmentStatus
      ? this.allocateTuitionPaidAmounts(
          baseTuitionItems,
          this.resolveFixedFeePaidAmount(tuitionSummaryFee),
        )
      : baseTuitionItems.map((item) => ({
          ...item,
          paidAmount: item.status === "PAID" ? item.fee : 0,
          status: item.status === "PAID" ? "PAID" : "DEBT",
        }));

    const fixedFeeItems = fixedFees
      .map((fee) => {
        const amount = this.resolveFixedFeeAmount(fee);
        const paidAmount = this.resolveFixedFeePaidAmount(fee);
        const status =
          `${fee?.status || ""}`.toUpperCase() ||
          (paidAmount >= amount ? "PAID" : paidAmount > 0 ? "PARTIAL" : "DEBT");

        return {
          id: fee.id,
          subjectCode: "N/A",
          subjectName: fee.name,
          classCode: null,
          credits: 0,
          fee: amount,
          paidAmount,
          status,
          type: "FIXED_FEE",
        };
      })
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName, "vi"));

    const tuitionTotal = baseTuitionItems.reduce((sum, item) => sum + item.fee, 0);
    const fixedTotal = fixedFeeItems.reduce((sum, item) => sum + item.fee, 0);
    const paidTuition = Math.min(
      tuitionTotal,
      tuitionItems.reduce(
        (sum, item) => sum + this.normalizeMoney(item.paidAmount),
        0,
      ),
    );
    const paidFixed = fixedFeeItems.reduce(
      (sum, item) => sum + this.normalizeMoney(item.paidAmount),
      0,
    );

    const totalFee = tuitionTotal + fixedTotal;
    const paidAmount = paidTuition + paidFixed;
    const debt = Math.max(totalFee - paidAmount, 0);

    return {
      totalFee,
      paidAmount,
      debt,
      totalSubjects: tuitionItems.length,
      totalCredits: tuitionItems.reduce((sum, item) => sum + item.credits, 0),
      tuitionTotal,
      fixedTotal,
      paidTuition,
      paidFixed,
      items: [...tuitionItems, ...fixedFeeItems],
    };
  }

  private async getStudentSemesterTuitionDetails(
    studentId: string,
    semesterId?: string,
    prismaClient?: any,
    preferEnrollmentStatus = false,
  ) {
    const prisma = prismaClient || this.prisma;
    const semester = await this.resolveTargetSemester(semesterId, undefined, prisma);
    if (!semester) return null;
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);

    const student = await this.resolveStudentRecord(
      studentId,
      {
        id: true,
        majorId: true,
        intake: true,
        educationType: true,
        adminClass: {
          select: { cohort: true, code: true },
        },
      },
      prisma,
    );

    if (!student) return null;

    const [enrollments, studentFees, priceConfigMap] = await Promise.all([
      prisma.enrollment.findMany({
        where: {
          studentId: { in: linkedStudentIds },
          courseClass: { semesterId: semester.id },
        },
        include: {
          student: { select: { majorId: true } },
          courseClass: {
            include: {
              subject: true,
              semester: true,
            },
          },
        },
      }),
      prisma.studentFee.findMany({
        where: {
          studentId: { in: linkedStudentIds },
          semesterId: semester.id,
        },
        include: { semester: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.getPriceConfigMap(semester.year, [student.majorId], student),
    ]);

    const tuitionSummaryFee =
      studentFees.find(
        (fee) =>
          `${fee?.feeType || ""}`.toUpperCase() === "TUITION" ||
          this.isTuitionSummaryFeeName(fee?.name),
      ) || null;

    const fixedFees = studentFees.filter(
      (fee) =>
        `${fee?.feeType || ""}`.toUpperCase() !== "TUITION" &&
        !this.isTuitionSummaryFeeName(fee?.name),
    );

    const normalizedSemester = this.buildCohortSemester(semester, student);

    return {
      semester: normalizedSemester,
      ...this.buildTuitionBreakdown({
        enrollments,
        fixedFees,
        tuitionSummaryFee,
        priceConfigMap,
        preferEnrollmentStatus,
      }),
    };
  }

  private async syncStudentTuitionInternal(
    studentId: string,
    semesterId: string,
    prismaClient?: any,
  ) {
    const prisma = prismaClient || this.prisma;
    const details = await this.getStudentSemesterTuitionDetails(
      studentId,
      semesterId,
      prisma,
      true,
    );

    if (!details) return null;

    const tuitionFeeId = this.buildTuitionFeeId(studentId, details.semester.id);
    const feeName = `Học phí ${details.semester.name || details.semester.id}`;

    if (details.tuitionTotal <= 0 && details.totalSubjects === 0) {
      const staleFees = await prisma.studentFee.findMany({
        where: {
          studentId,
          semesterId: details.semester.id,
          feeType: "TUITION",
        },
        select: { id: true },
      });
      if (staleFees.length > 0) {
        await prisma.feeTransaction.deleteMany({
          where: {
            studentFeeId: { in: staleFees.map((fee) => fee.id) },
          },
        });
      }
      await prisma.studentFee.deleteMany({
        where: {
          studentId,
          semesterId: details.semester.id,
          feeType: "TUITION",
        },
      });
      return {
        semesterId: details.semester.id,
        total: 0,
        paid: 0,
        feeId: null,
      };
    }

    const existingFee = await prisma.studentFee.findFirst({
      where: {
        studentId,
        semesterId: details.semester.id,
        feeType: "TUITION",
      },
    });

    const feePayload = {
      id: tuitionFeeId,
      studentId,
      semesterId: details.semester.id,
      feeType: "TUITION",
      feeCode: "TUITION",
      name: feeName,
      discountAmount: 0,
      isMandatory: true,
      totalAmount: details.tuitionTotal,
      finalAmount: details.tuitionTotal,
      paidAmount: details.paidTuition,
      displayOrder: 0,
      status:
        details.paidTuition >= details.tuitionTotal
          ? "PAID"
          : details.paidTuition > 0
            ? "PARTIAL"
            : "DEBT",
    };

    if (existingFee) {
      await prisma.studentFee.update({
        where: { id: existingFee.id },
        data: feePayload,
      });
    } else {
      await prisma.studentFee.create({
        data: feePayload,
      });
    }

    return {
      semesterId: details.semester.id,
      total: details.tuitionTotal,
      paid: details.paidTuition,
      feeId: existingFee?.id || tuitionFeeId,
    };
  }

  async getSemesterRevenueSnapshot(filters: {
    semesterId?: string;
    date?: string;
    facultyId?: string;
    majorId?: string;
    classId?: string;
    query?: string;
    keyword?: string;
    intake?: string;
  }) {
    const semester = await this.resolveTargetSemester(filters.semesterId, filters.date);
    if (!semester) {
      return {
        semesterId: null,
        semesterName: null,
        totalRevenue: 0,
        paidRevenue: 0,
        debtRevenue: 0,
        studentCount: 0,
      };
    }

    const studentWhere = this.buildStudentWhere(filters);
    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        majorId: true,
      },
    });

    if (students.length === 0) {
      return {
        semesterId: semester.id,
        semesterName: semester.name,
        totalRevenue: 0,
        paidRevenue: 0,
        debtRevenue: 0,
        studentCount: 0,
      };
    }

    // studentIds is no longer needed here as we use nested filters below
    const priceConfigMap = await this.getPriceConfigMap(
      semester.year,
      students.map((student) => student.majorId),
    );

    const [enrollments, fixedFees] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          student: studentWhere,
          courseClass: { semesterId: semester.id },
        },
        include: {
          student: { select: { majorId: true } },
          courseClass: {
            include: {
              subject: true,
              semester: true,
            },
          },
        },
      }),
      this.prisma.studentFee.findMany({
        where: {
          student: studentWhere,
          semesterId: semester.id,
          NOT: {
            name: { contains: "Học phí" },
          },
        },
      }),
    ]);

    const enrollmentsByStudent = new Map<string, any[]>();
    const fixedFeesByStudent = new Map<string, any[]>();

    for (const enrollment of enrollments) {
      const bucket = enrollmentsByStudent.get(enrollment.studentId) || [];
      bucket.push(enrollment);
      enrollmentsByStudent.set(enrollment.studentId, bucket);
    }

    for (const fixedFee of fixedFees) {
      const bucket = fixedFeesByStudent.get(fixedFee.studentId) || [];
      bucket.push(fixedFee);
      fixedFeesByStudent.set(fixedFee.studentId, bucket);
    }

    let totalRevenue = 0;
    let paidRevenue = 0;
    let studentCount = 0;

    for (const student of students) {
      const breakdown = this.buildTuitionBreakdown({
        enrollments: enrollmentsByStudent.get(student.id) || [],
        fixedFees: fixedFeesByStudent.get(student.id) || [],
        priceConfigMap,
      });

      if (breakdown.totalFee > 0) {
        studentCount += 1;
      }

      totalRevenue += breakdown.totalFee;
      paidRevenue += breakdown.paidAmount;
    }

    return {
      semesterId: semester.id,
      semesterName: semester.name,
      totalRevenue,
      paidRevenue,
      debtRevenue: Math.max(totalRevenue - paidRevenue, 0),
      studentCount,
    };
  }

  async getFaculties() {
    return this.prisma.faculty.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
  }

  async getMajors(facultyId?: string) {
    return this.prisma.major.findMany({
      where: facultyId && facultyId !== "all" ? { facultyId } : {},
      select: { id: true, name: true, code: true, facultyId: true },
      orderBy: { name: "asc" },
    });
  }

  async getAdminClasses(majorId?: string) {
    return this.prisma.adminClass.findMany({
      where: majorId && majorId !== "all" ? { majorId } : {},
      select: { id: true, name: true, code: true, majorId: true },
      orderBy: { name: "asc" },
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

  async calculateTuitionDetails(studentId: string, semesterId: string) {
    const details = await this.getStudentSemesterTuitionDetails(studentId, semesterId);
    if (!details) return null;

    return {
      semesterId: details.semester.id,
      semesterName: details.semester.name,
      totalFee: details.totalFee,
      paidAmount: details.paidAmount,
      debt: details.debt,
      totalSubjects: details.totalSubjects,
      totalCredits: details.totalCredits,
      items: details.items,
    };
  }

  async getStudentTuitionList(params: StudentTuitionListParams) {
    const semester = await this.resolveTargetSemester(params.semesterId, params.date);
    if (!semester) {
      return { total: 0, page: params.page || 1, limit: params.limit || 20, items: [] };
    }

    const page = params.page ? Number(params.page) : 1;
    const limit = params.limit ? Number(params.limit) : 20;
    const skip = Math.max(page - 1, 0) * limit;
    const studentWhere = this.buildStudentWhere(params);

    const students = await this.prisma.student.findMany({
      where: {
        ...studentWhere,
        OR: [
          { enrollments: { some: { courseClass: { semesterId: semester.id } } } },
          { studentFees: { some: { semesterId: semester.id } } },
        ],
      },
      include: {
        adminClass: true,
        major: { include: { faculty: true } },
      },
      orderBy: { studentCode: "asc" },
    });

    if (students.length === 0) {
      return { total: 0, page, limit, items: [] };
    }

    // Step 1: Bulk resolve linked student IDs to support mirrored records
    const studentMirrorMap = new Map<string, string[]>();
    for (const s of students) {
      const linked = await this.resolveLinkedStudentIds(s.id);
      studentMirrorMap.set(s.id, linked);
    }
    const allLinkedIds = [...new Set([...studentMirrorMap.values()].flat())];

    const [enrollments, studentFees, grades] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          studentId: { in: allLinkedIds },
          courseClass: { semesterId: semester.id },
        },
        include: {
          student: { select: { majorId: true, studentCode: true } },
          courseClass: {
            include: {
              subject: true,
              semester: true,
            },
          },
        },
      }),
      this.prisma.studentFee.findMany({
        where: {
          studentId: { in: allLinkedIds },
          semesterId: semester.id,
        },
        include: { semester: true },
      }),
      this.prisma.grade.findMany({
        where: {
          studentId: { in: allLinkedIds },
          courseClass: { semesterId: semester.id },
        },
        select: {
          studentId: true,
          isEligibleForExam: true,
        },
      }),
    ]);

    const priceConfigMap = await this.getPriceConfigMap(
      semester.year,
      students.map((student) => student.majorId),
    );

    const enrollmentsByGroup = new Map<string, any[]>();
    const fixedFeesByGroup = new Map<string, any[]>();
    const tuitionSummaryByGroup = new Map<string, any>();
    const gradesByGroup = new Map<string, any[]>();

    // Helper to find which canonical student ID a record belongs to
    const findCanonicalId = (id: string) => {
      for (const [canonicalId, linkedIds] of studentMirrorMap.entries()) {
        if (linkedIds.includes(id)) return canonicalId;
      }
      return id;
    };

    for (const enrollment of enrollments) {
      const canonicalId = findCanonicalId(enrollment.studentId);
      const bucket = enrollmentsByGroup.get(canonicalId) || [];
      bucket.push(enrollment);
      enrollmentsByGroup.set(canonicalId, bucket);
    }

    for (const fee of studentFees) {
      const canonicalId = findCanonicalId(fee.studentId);
      if (this.isTuitionSummaryFeeName(fee.name) || fee.feeType === 'TUITION') {
        tuitionSummaryByGroup.set(canonicalId, fee);
      } else {
        const bucket = fixedFeesByGroup.get(canonicalId) || [];
        bucket.push(fee);
        fixedFeesByGroup.set(canonicalId, bucket);
      }
    }

    for (const grade of grades) {
      const canonicalId = findCanonicalId(grade.studentId);
      const bucket = gradesByGroup.get(canonicalId) || [];
      bucket.push(grade);
      gradesByGroup.set(canonicalId, bucket);
    }

    const summaries = students.map((student) => {
      const breakdown = this.buildTuitionBreakdown({
        enrollments: enrollmentsByGroup.get(student.id) || [],
        fixedFees: fixedFeesByGroup.get(student.id) || [],
        tuitionSummaryFee: tuitionSummaryByGroup.get(student.id),
        priceConfigMap,
      });

      const studentGrades = gradesByGroup.get(student.id) || [];
      const isEligibleForExam =
        studentGrades.length === 0
          ? true
          : studentGrades.every((grade) => grade.isEligibleForExam !== false);

      return {
        id: student.id,
        semesterId: semester.id,
        semesterName: semester.name,
        studentCode: student.studentCode,
        fullName: student.fullName,
        className: student.adminClass?.name || student.adminClass?.code || "N/A",
        majorName: student.major?.name || "N/A",
        facultyName: student.major?.faculty?.name || "N/A",
        totalFee: breakdown.totalFee,
        paidAmount: breakdown.paidAmount,
        debt: breakdown.debt,
        paidCount: breakdown.items.filter((item) => item.status === "PAID").length,
        totalSubjects: breakdown.totalSubjects,
        totalCredits: breakdown.totalCredits,
        status: breakdown.debt > 0 ? "DEBT" : breakdown.totalFee > 0 ? "PAID" : "EMPTY",
        isEligibleForExam,
        enrollments: breakdown.items,
        mirroredIds: studentMirrorMap.get(student.id) || [],
      };
    });

    const filteredSummaries =
      params.status === "DEBT"
        ? summaries.filter((summary) => summary.debt > 0)
        : summaries;

    return {
      total: filteredSummaries.length,
      page,
      limit,
      items: filteredSummaries.slice(skip, skip + limit),
    };
  }

  async updateEnrollmentTuitionFee(enrollmentId: string, customFee: number) {
    const feeAmount = Math.max(this.normalizeMoney(customFee), 0);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: { courseClass: true },
    });

    if (enrollment) {
      const linkedIds = await this.resolveLinkedStudentIds(enrollment.studentId);
      
      await this.prisma.enrollment.updateMany({
        where: {
          studentId: { in: linkedIds },
          courseClass: {
            semesterId: enrollment.courseClass.semesterId,
            subjectId: enrollment.courseClass.subjectId,
          },
        },
        data: { tuitionFee: feeAmount },
      });

      const updated = await this.prisma.enrollment.findUnique({
        where: { id: enrollmentId },
        include: {
          student: { select: { id: true } },
          courseClass: { select: { semesterId: true } },
        },
      });

      if (!updated) return null;

      const summary = await this.syncStudentTuitionInternal(
        updated.studentId,
        updated.courseClass.semesterId,
      );
      if (summary?.feeId) {
        await this.upsertSyncedReceipt(this.prisma, summary.feeId, summary.paid);
      }
      return updated;
    }

    const studentFee = await this.prisma.studentFee.findUnique({
      where: { id: enrollmentId },
    });
    if (!studentFee) {
      throw new Error("Khoản thu không tồn tại");
    }

    const paidAmount =
      `${studentFee.status || ""}`.toUpperCase() === "PAID"
        ? feeAmount
        : Math.min(this.normalizeMoney(studentFee.paidAmount), feeAmount);

    const updatedFee = await this.prisma.studentFee.update({
      where: { id: enrollmentId },
      data: {
        totalAmount: feeAmount,
        finalAmount: feeAmount,
        paidAmount,
        status:
          paidAmount >= feeAmount && feeAmount > 0
            ? "PAID"
            : paidAmount > 0
              ? "PARTIAL"
              : "DEBT",
      },
    });

    await this.upsertSyncedReceipt(this.prisma, updatedFee.id, paidAmount);
    await this.syncStudentTuitionInternal(updatedFee.studentId, updatedFee.semesterId);
    return updatedFee;
  }

  async updateEnrollmentPayment(
    paymentIds: string[],
    status: "PAID" | "REGISTERED",
  ) {
    if (!paymentIds?.length) {
      return { updatedEnrollments: 0, updatedFees: 0, affectedSemesters: 0 };
    }

    return this.prisma.$transaction(async (tx) => {
      const [enrollments, fixedFees] = await Promise.all([
        tx.enrollment.findMany({
          where: { id: { in: paymentIds } },
          include: {
            courseClass: {
              select: {
                subjectId: true,
                semesterId: true,
              },
            },
          },
        }),
        tx.studentFee.findMany({
          where: { id: { in: paymentIds } },
        }),
      ]);

      let updatedEnrollments = 0;
      let updatedFees = 0;
      const affectedStudentSemesters = new Set<string>();

      for (const enrollment of enrollments) {
        // Resolve all mirrored student IDs to ensure global status consistency
        const linkedIds = await this.resolveLinkedStudentIds(enrollment.studentId);
        
        const result = await tx.enrollment.updateMany({
          where: {
            studentId: { in: linkedIds },
            courseClass: {
              semesterId: enrollment.courseClass.semesterId,
              subjectId: enrollment.courseClass.subjectId,
            },
          },
          data: {
            status,
          },
        });
        updatedEnrollments += result.count;
        
        // Mark all linked IDs as affected for sync
        linkedIds.forEach(id => {
          affectedStudentSemesters.add(`${id}::${enrollment.courseClass.semesterId}`);
        });
      }

      for (const fee of fixedFees) {
        const paidAmount =
          status === "PAID"
            ? this.resolveFixedFeeAmount(fee)
            : 0;
        await tx.studentFee.update({
          where: { id: fee.id },
          data: {
            status: status === "PAID" ? "PAID" : "DEBT",
            paidAmount,
          },
        });
        await this.upsertSyncedReceipt(tx, fee.id, paidAmount);
        updatedFees += 1;
        affectedStudentSemesters.add(`${fee.studentId}::${fee.semesterId}`);
      }

      for (const entry of affectedStudentSemesters) {
        const [studentId, semesterId] = entry.split("::");
        const summary = await this.syncStudentTuitionInternal(studentId, semesterId, tx);
        if (summary?.feeId) {
          await this.upsertSyncedReceipt(tx, summary.feeId, summary.paid);
        }
      }

      return {
        updatedEnrollments,
        updatedFees,
        affectedSemesters: affectedStudentSemesters.size,
      };
    });
  }

  async getStudentFees(studentId: string) {
    const student = await this.resolveStudentRecord(studentId, {
      id: true,
      majorId: true,
      intake: true,
      educationType: true,
      adminClass: {
        select: { cohort: true, code: true },
      },
    });

    if (!student) return [];

    const linkedStudentIds = await this.resolveLinkedStudentIds(student.id);

    const [enrollments, studentFees, plannedSemesters] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          studentId: { in: linkedStudentIds },
        },
        include: {
          student: { select: { majorId: true } },
          courseClass: {
            include: {
              subject: true,
              semester: true,
            },
          },
        },
      }),
      this.prisma.studentFee.findMany({
        where: {
          studentId: { in: linkedStudentIds },
        },
        include: { semester: true },
      }),
      this.getPlannedSemesters(student),
    ]);

    const semesterMap = new Map<string, any>();

    for (const semester of plannedSemesters) {
      if (!semester?.id) continue;
      const key = this.getStudentSemesterBucketKey(semester, student);
      if (!key) continue;
      semesterMap.set(key, {
        semester: this.buildCohortSemester(semester, student),
        enrollments: [],
        fixedFees: [],
        tuitionSummaryFee: null,
      });
    }

    const cohortCode = this.resolveStudentCohortCode(student);
    const startYear = this.parseCohortStartYear(cohortCode);
    if (cohortCode && startYear) {
      for (let slot = 1; slot <= 8; slot += 1) {
        const key = `SLOT_${slot}`;
        if (semesterMap.has(key)) continue;
        semesterMap.set(key, {
          semester: this.buildCohortSemester(
            { id: `${cohortCode}_HK${slot}` },
            student,
            slot,
          ),
          enrollments: [],
          fixedFees: [],
          tuitionSummaryFee: null,
        });
      }
    }

    for (const enrollment of enrollments) {
      const semester = enrollment.courseClass?.semester;
      if (!semester?.id) continue;
      const key = this.getStudentSemesterBucketKey(semester, student);
      if (!key) continue;
      const normalizedSemester = this.buildCohortSemester(semester, student);
      const normalizedEnrollment = {
        ...enrollment,
        courseClass: {
          ...enrollment.courseClass,
          semester: normalizedSemester,
        },
      };
      const bucket = semesterMap.get(key) || {
        semester: normalizedSemester,
        enrollments: [],
        fixedFees: [],
        tuitionSummaryFee: null,
      };
      bucket.enrollments.push(normalizedEnrollment);
      semesterMap.set(key, bucket);
    }

    for (const fee of studentFees) {
      if (!fee.semester?.id) continue;
      const key = this.getStudentSemesterBucketKey(fee.semester, student);
      if (!key) continue;
      const normalizedSemester = this.buildCohortSemester(fee.semester, student);
      const normalizedFee = {
        ...fee,
        semester: normalizedSemester,
      };
      const bucket = semesterMap.get(key) || {
        semester: normalizedSemester,
        enrollments: [],
        fixedFees: [],
        tuitionSummaryFee: null,
      };
      if (
        `${fee?.feeType || ""}`.toUpperCase() === "TUITION" ||
        this.isTuitionSummaryFeeName(fee?.name)
      ) {
        bucket.tuitionSummaryFee = normalizedFee;
      } else {
        bucket.fixedFees.push(normalizedFee);
      }
      semesterMap.set(key, bucket);
    }

    const semesterSummaries = await Promise.all(
      [...semesterMap.values()]
        .sort(
          (left, right) =>
            new Date(right.semester.startDate).getTime() -
            new Date(left.semester.startDate).getTime(),
        )
        .map(async (entry) => {
          const priceConfigMap = await this.getPriceConfigMap(
            entry.semester?.year,
            [student.majorId],
            student,
          );
          const breakdown = this.buildTuitionBreakdown({
            enrollments: entry.enrollments,
            fixedFees: entry.fixedFees,
            tuitionSummaryFee: entry.tuitionSummaryFee,
            priceConfigMap,
          });

          const summaryStatus =
            breakdown.debt > 0
              ? breakdown.paidAmount > 0
                ? "PARTIAL"
                : "DEBT"
              : breakdown.totalFee > 0
                ? "PAID"
                : "EMPTY";

          return {
            semester: entry.semester,
            semesterId: entry.semester.id,
            summary: {
              id: this.buildTuitionFeeId(student.id, entry.semester.id),
              name: `Học phí ${entry.semester.name}`,
              totalAmount: breakdown.totalFee,
              paidAmount: breakdown.paidAmount,
              debt: breakdown.debt,
              tuitionTotal: breakdown.tuitionTotal,
              fixedTotal: breakdown.fixedTotal,
              totalCredits: breakdown.totalCredits,
              totalSubjects: breakdown.totalSubjects,
              status: summaryStatus,
            },
            items: breakdown.items.map((item) => ({
              ...item,
              amount: item.fee,
              paidAmount: this.normalizeMoney(item.paidAmount),
              isTuition: item.type === "ENROLLMENT",
            })),
          };
        }),
    );

    if (cohortCode && startYear) {
      return semesterSummaries;
    }

    const visibleSummaries = semesterSummaries.filter(
      (record) =>
        Number(record.summary?.totalAmount || 0) > 0 ||
        (Array.isArray(record.items) && record.items.length > 0) ||
        record.semester?.isCurrent ||
        record.semester?.isRegistering,
    );

    return visibleSummaries.length > 0 ? visibleSummaries : semesterSummaries.slice(0, 1);
  }

  async syncStudentTuition(studentId: string, semesterId: string) {
    return this.syncStudentTuitionInternal(studentId, semesterId);
  }

  async generateFixedFeesForSemester(semesterId: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semester) throw new Error("Kỳ học không tồn tại");

    const configs = await this.prisma.fixedFeeConfig.findMany({
      where: {
        academicYear: semester.year,
        OR: [{ semesterId: null }, { semesterId: semester.id }],
        isActive: true,
      },
      orderBy: { displayOrder: "asc" },
    });

    if (configs.length === 0) return { message: "Không có cấu hình khoản thu cố định" };

    const students = await this.prisma.student.findMany({
      select: {
        id: true,
        majorId: true,
        intake: true,
        educationType: true,
      },
    });

    let generatedCount = 0;

    for (const student of students) {
      for (const config of configs) {
        // Filter criteria
        if (config.majorId && config.majorId !== student.majorId) continue;
        if (config.cohort && config.cohort !== student.intake) continue;
        if (config.educationType && config.educationType !== student.educationType)
          continue;

        const feeId = `FIXED_${student.id.slice(-8)}_${config.id.slice(-8)}_${semester.id.slice(-8)}`;

        const existing = await this.prisma.studentFee.findUnique({
          where: { id: feeId },
        });

        if (!existing) {
          await this.prisma.studentFee.create({
            data: {
              id: feeId,
              studentId: student.id,
              semesterId: semester.id,
              feeType: "FIXED",
              feeCode: config.feeCode,
              name: config.feeName,
              isMandatory: config.isMandatory,
              totalAmount: config.amount,
              finalAmount: config.amount,
              paidAmount: 0,
              status: "DEBT",
              dueDate: config.dueDate,
              displayOrder: config.displayOrder || 100,
              configId: config.id,
            },
          });
          generatedCount += 1;
        }
      }
    }

    return {
      message: `Đã sinh ${generatedCount} khoản thu cho ${students.length} sinh viên`,
      generatedCount,
    };
  }

  async getStudentFeeTransactions(studentId: string) {
    const linkedStudentIds = await this.resolveLinkedStudentIds(studentId);
    return this.prisma.feeTransaction.findMany({
      where: {
        studentFee: {
          studentId: { in: linkedStudentIds },
        },
      },
      include: {
        studentFee: {
          include: { semester: true },
        },
      },
      orderBy: { transactionDate: "desc" },
    });
  }

  async getStudentSemesterFees(studentId: string, semesterId?: string) {
    const details = await this.getStudentSemesterTuitionDetails(studentId, semesterId);
    if (!details) return null;

    return {
      semester: details.semester,
      summary: {
        totalAmount: details.totalFee,
        paidAmount: details.paidAmount,
        debt: details.debt,
        tuitionTotal: details.tuitionTotal,
        fixedTotal: details.fixedTotal,
        totalCredits: details.totalCredits,
        totalSubjects: details.totalSubjects,
        status:
          details.debt > 0
            ? details.paidAmount > 0
              ? "PARTIAL"
              : "DEBT"
            : details.totalFee > 0
              ? "PAID"
              : "EMPTY",
      },
      items: details.items.map((item) => ({
        ...item,
        amount: item.fee,
        paidAmount: this.normalizeMoney(item.paidAmount),
        isTuition: item.type === "ENROLLMENT",
      })),
    };
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

  // Configuration Management
  async getFixedFeeConfigs(academicYear?: number) {
    return this.prisma.fixedFeeConfig.findMany({
      where: academicYear ? { academicYear: Number(academicYear) } : {},
      orderBy: { displayOrder: "asc" },
    });
  }

  async upsertFixedFeeConfig(data: any) {
    const payload: any = {
      feeName: data.feeName,
      feeCode: data.feeCode,
      amount: data.amount ? Number(data.amount) : 0,
      academicYear: data.academicYear ? Number(data.academicYear) : undefined,
      isMandatory: data.isMandatory ?? true,
      displayOrder: data.displayOrder ? Number(data.displayOrder) : 0,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      isActive: data.isActive ?? true,
    };

    if (data.id) {
      return this.prisma.fixedFeeConfig.update({
        where: { id: data.id },
        data: payload,
      });
    }
    
    return this.prisma.fixedFeeConfig.create({
      data: payload,
    });
  }

  async deleteFixedFeeConfig(id: string) {
    return this.prisma.fixedFeeConfig.delete({ where: { id } });
  }

  // Manual Individual Fees
  async createIndividualFee(data: {
    studentId: string;
    semesterId: string;
    name: string;
    amount: number;
    feeCode?: string;
    dueDate?: string;
    isMandatory?: boolean;
  }) {
    const feeId = `MANUAL_${data.studentId.slice(-4)}_${Date.now().toString().slice(-8)}`;

    const fee = await this.prisma.studentFee.create({
      data: {
        id: feeId,
        studentId: data.studentId,
        semesterId: data.semesterId,
        feeType: "OTHER",
        feeCode: data.feeCode || "MANUAL",
        name: data.name,
        totalAmount: Number(data.amount),
        finalAmount: Number(data.amount),
        paidAmount: 0,
        status: "DEBT",
        isMandatory: data.isMandatory !== false,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        displayOrder: 999,
      },
    });

    await this.syncStudentTuitionInternal(data.studentId, data.semesterId);
    return fee;
  }

  async deleteStudentFee(id: string) {
    const fee = await this.prisma.studentFee.findUnique({ where: { id } });
    if (!fee) throw new Error("Khoản thu không tồn tại");

    if (this.isTuitionSummaryFeeName(fee.name)) {
      throw new Error("Không thể xóa bản ghi tổng hợp học phí.");
    }

    const res = await this.prisma.studentFee.delete({ where: { id } });
    await this.syncStudentTuitionInternal(fee.studentId, fee.semesterId);
    return res;
  }

  async bulkAssignFixedFee(
    semesterId: string,
    configId: string,
    studentCodes: string[],
  ) {
    const config = await this.prisma.fixedFeeConfig.findUnique({
      where: { id: configId },
    });
    if (!config) throw new Error("Cấu hình phí không tồn tại");

    const students = await this.prisma.student.findMany({
      where: {
        studentCode: { in: studentCodes },
      },
      select: { id: true, studentCode: true },
    });

    const foundCodes = students.map((s) => s.studentCode);
    const missingCodes = studentCodes.filter((c) => !foundCodes.includes(c));

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of students) {
      const feeId = `FIXED_${student.id.slice(-8)}_${config.id.slice(-8)}_${semesterId.slice(-8)}`;

      const exists = await this.prisma.studentFee.findUnique({
        where: { id: feeId },
      });
      if (exists) {
        skippedCount++;
        continue;
      }

      await this.prisma.studentFee.create({
        data: {
          id: feeId,
          studentId: student.id,
          semesterId: semesterId,
          feeType: "FIXED",
          feeCode: config.feeCode,
          name: config.feeName,
          totalAmount: config.amount,
          finalAmount: config.amount,
          paidAmount: 0,
          status: "DEBT",
          isMandatory: config.isMandatory,
          dueDate: config.dueDate,
          displayOrder: config.displayOrder || 100,
          configId: config.id,
        },
      });
      createdCount++;

      await this.syncStudentTuitionInternal(student.id, semesterId);
    }

    return {
      success: true,
      createdCount,
      skippedCount,
      missingCodes,
      totalFound: students.length,
    };
  }
}
