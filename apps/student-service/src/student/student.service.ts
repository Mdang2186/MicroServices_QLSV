import { Injectable, Logger } from "@nestjs/common";
import * as xlsx from "xlsx";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateStudentDto,
  UpdateStudentDto,
  StudentResponse,
} from "@repo/shared-dto";

@Injectable()
export class StudentService {
  private readonly logger = new Logger(StudentService.name);
  constructor(private prisma: PrismaService) {}

  private readonly portalStudentInclude = {
    user: true,
    major: true,
    specialization: true,
    enrollments: {
      include: {
        courseClass: {
          include: {
            subject: true,
            sessions: {
              include: { room: true },
            },
            adminClasses: true,
            lecturer: true,
            semester: true,
          },
        },
        attendances: true,
      },
    },
    adminClass: true,
    grades: {
      include: {
        subject: true,
        courseClass: true,
      },
    },
  } as const;

  private toPortalDayOfWeek(value: Date | string) {
    const day = new Date(value).getDay();
    return day === 0 ? 8 : day + 1;
  }

  private attachSchedulesToCourseClass(courseClass: any) {
    if (!courseClass) return courseClass;
    const sessions = courseClass.sessions || [];
    return {
      ...courseClass,
      schedules: sessions
        .map((session: any) => ({
          id: session.id,
          date: session.date,
          dayOfWeek: this.toPortalDayOfWeek(session.date),
          startShift: session.startShift,
          endShift: session.endShift,
          type: session.type,
          room: session.room,
          roomId: session.roomId,
          note: session.note,
        }))
        .sort((left: any, right: any) => {
          if (left.dayOfWeek !== right.dayOfWeek) {
            return left.dayOfWeek - right.dayOfWeek;
          }
          return left.startShift - right.startShift;
        }),
    };
  }

  private getEnrollmentSemesterKey(enrollment: any) {
    return `${enrollment?.courseClass?.semester?.code || enrollment?.courseClass?.semesterId || enrollment?.courseClass?.semester?.id || ""}`.trim();
  }

  private getEnrollmentSubjectKey(enrollment: any) {
    return `${enrollment?.courseClass?.subject?.code || enrollment?.courseClass?.subjectId || enrollment?.courseClass?.code || enrollment?.courseClassId || ""}`.trim();
  }

  private getEnrollmentQualityScore(enrollment: any) {
    const courseClass = enrollment?.courseClass || {};
    const code = `${courseClass.code || ""}`.toUpperCase();
    const sessions = Array.isArray(courseClass.sessions)
      ? courseClass.sessions.length
      : 0;

    let score = sessions * 2;
    if (code.startsWith("CCLASS_")) score += 40;
    if (code.startsWith("PCC_")) score += 10;
    if (courseClass.lecturer?.fullName) score += 3;
    if (courseClass.adminClasses?.length) score += 2;
    if (courseClass.subject?.name) score += 1;
    return score;
  }

  private dedupePortalEnrollments(enrollments: any[] = []) {
    const byCourseClassId = new Map<string, any>();

    for (const enrollment of enrollments) {
      const courseClassId =
        enrollment?.courseClassId ||
        enrollment?.courseClass?.id ||
        enrollment?.id;
      if (!courseClassId) continue;

      const existing = byCourseClassId.get(courseClassId);
      if (
        !existing ||
        this.getEnrollmentQualityScore(enrollment) >
          this.getEnrollmentQualityScore(existing)
      ) {
        byCourseClassId.set(courseClassId, enrollment);
      }
    }

    const bySemesterSubject = new Map<string, any>();
    for (const enrollment of byCourseClassId.values()) {
      const semesterKey = this.getEnrollmentSemesterKey(enrollment);
      const subjectKey = this.getEnrollmentSubjectKey(enrollment);
      const dedupeKey =
        semesterKey && subjectKey
          ? `${semesterKey}::${subjectKey}`
          : `${enrollment?.courseClassId || enrollment?.courseClass?.id || enrollment?.id}`;

      const existing = bySemesterSubject.get(dedupeKey);
      if (
        !existing ||
        this.getEnrollmentQualityScore(enrollment) >
          this.getEnrollmentQualityScore(existing)
      ) {
        bySemesterSubject.set(dedupeKey, enrollment);
      }
    }

    return [...bySemesterSubject.values()].sort((left: any, right: any) => {
      const leftSemester = new Date(
        left?.courseClass?.semester?.startDate ||
          left?.courseClass?.semester?.endDate ||
          0,
      ).getTime();
      const rightSemester = new Date(
        right?.courseClass?.semester?.startDate ||
          right?.courseClass?.semester?.endDate ||
          0,
      ).getTime();

      if (leftSemester !== rightSemester) {
        return rightSemester - leftSemester;
      }

      return `${left?.courseClass?.subject?.name || left?.courseClass?.name || ""}`.localeCompare(
        `${right?.courseClass?.subject?.name || right?.courseClass?.name || ""}`,
      );
    });
  }

  private normalizeStudentPayload(student: any) {
    if (!student) return student;
    const dedupedEnrollments = this.dedupePortalEnrollments(
      student.enrollments || [],
    );
    return {
      ...student,
      enrollments: dedupedEnrollments.map((enrollment: any) => ({
        ...enrollment,
        courseClass: this.attachSchedulesToCourseClass(enrollment.courseClass),
      })),
    };
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

  private async mergeMirrorEnrollmentsForLegacyStudent(student: any) {
    if (!student?.adminClass?.code) {
      return student;
    }

    const legacyMeta = this.parseLegacyAdminClass(
      student.adminClass.code,
      student.adminClass.cohort || student.intake,
    );
    if (!legacyMeta) {
      return student;
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
      select: { id: true, code: true },
    });

    if (!mirrorAdminClass) {
      return student;
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

    if (!mirrorStudent) {
      return student;
    }

    const mirror = await this.prisma.student.findUnique({
      where: { id: mirrorStudent.id },
      include: {
        enrollments: this.portalStudentInclude.enrollments,
      },
    });

    const currentEnrollments = Array.isArray(student.enrollments)
      ? student.enrollments
      : [];
    const existingCourseClassIds = new Set(
      currentEnrollments
        .map(
          (enrollment: any) =>
            enrollment.courseClassId || enrollment.courseClass?.id,
        )
        .filter(Boolean),
    );

    const mergedEnrollments = [...currentEnrollments];
    for (const enrollment of mirror?.enrollments || []) {
      const courseClassId =
        enrollment.courseClassId || enrollment.courseClass?.id;
      if (!courseClassId || existingCourseClassIds.has(courseClassId)) {
        continue;
      }

      existingCourseClassIds.add(courseClassId);
      mergedEnrollments.push({
        ...enrollment,
        studentId: student.id,
      });
    }

    return {
      ...student,
      enrollments: mergedEnrollments.sort((left: any, right: any) => {
        const leftDate = new Date(
          left?.courseClass?.semester?.startDate || 0,
        ).getTime();
        const rightDate = new Date(
          right?.courseClass?.semester?.startDate || 0,
        ).getTime();
        return rightDate - leftDate;
      }),
    };
  }

  async create(dto: CreateStudentDto): Promise<StudentResponse> {
    const {
      email,
      majorId,
      userId,
      dob,
      status,
      gpa,
      cpa,
      totalEarnedCredits,
      admissionDate,
      idIssueDate,
      youthUnionDate,
      partyDate,
      adminClassId,
      specializationId,
      ...studentData
    } = dto;

    return this.prisma.student.create({
      data: {
        ...studentData,
        major: { connect: { id: majorId } },
        ...(adminClassId
          ? { adminClass: { connect: { id: adminClassId } } }
          : {}),
        ...(specializationId
          ? { specialization: { connect: { id: specializationId } } }
          : {}),
        user: userId ? { connect: { id: userId } } : undefined,
        dob: new Date(dob),
        status: status || "STUDYING",
        gpa: gpa ?? 0.0,
        cpa: cpa ?? 0.0,
        totalEarnedCredits: totalEarnedCredits ?? 0,
        warningLevel: dto.warningLevel ?? 0,
        academicStatus: dto.academicStatus || "NORMAL",
        admissionDate: admissionDate ? new Date(admissionDate) : undefined,
        idIssueDate: idIssueDate ? new Date(idIssueDate) : undefined,
        youthUnionDate: youthUnionDate ? new Date(youthUnionDate) : undefined,
        partyDate: partyDate ? new Date(partyDate) : undefined,
      },
      include: {
        user: true,
        specialization: true,
        adminClass: true,
        major: true,
      },
    }) as unknown as StudentResponse;
  }

  async findAll(): Promise<StudentResponse[]> {
    return this.prisma.student.findMany({
      include: {
        user: true,
        major: true,
        specialization: true,
        adminClass: true,
      },
    }) as unknown as StudentResponse[];
  }

  async findOne(id: string): Promise<StudentResponse | null> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: this.portalStudentInclude,
    });

    const mergedStudent =
      await this.mergeMirrorEnrollmentsForLegacyStudent(student);
    return this.normalizeStudentPayload(
      mergedStudent,
    ) as unknown as StudentResponse | null;
  }

  async findByUserId(userId: string): Promise<StudentResponse | null> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: this.portalStudentInclude,
    });

    const mergedStudent =
      await this.mergeMirrorEnrollmentsForLegacyStudent(student);
    return this.normalizeStudentPayload(
      mergedStudent,
    ) as unknown as StudentResponse | null;
  }

  async getCurriculumProgress(studentId: string) {
    const student = await this.prisma.student.findUnique({ where: { id: studentId }, include: { major: true } });
    if (!student) throw new Error("Student not found");
    const intake = student.intake || "K18";

    // 1. Fetch Plan (Template or Curriculum fallback)
    const template = await this.prisma.trainingPlanTemplate.findFirst({
      where: { majorId: student.majorId, cohort: intake, status: { in: ["PUBLISHED", "ACTIVE"] } },
      include: { items: { include: { subject: { include: { prerequisites: true } } } } }
    });

    const itemsData = template?.items?.length ? template.items.map(i => ({
      ...i, ...i.subject, suggestedSemester: i.conceptualSemester, prerequisites: i.subject.prerequisites.map(p => p.prerequisiteId)
    })) : (await this.prisma.curriculum.findMany({
      where: { majorId: student.majorId, cohort: intake },
      include: { subject: { include: { prerequisites: true } } }
    })).map(c => ({
      ...c, ...c.subject, prerequisites: c.subject.prerequisites.map(p => p.prerequisiteId)
    }));

    // 2. Map Progress
    const grades = await this.prisma.grade.findMany({ where: { studentId } });
    const passedIds = new Set(grades.filter(g => (g.totalScore10 ?? 0) >= 4.0).map(g => g.subjectId));

    const semesters = Array.from({ length: 8 }, (_, i) => ({
      semester: i + 1,
      items: itemsData.filter((it: any) => it.suggestedSemester === i + 1).map((it: any) => ({
        ...it, 
        isPassed: passedIds.has(it.subjectId || it.id),
        theoryPeriods: it.theoryPeriods || (it.name?.includes("Thực hành") ? 0 : it.credits * 15),
        practicePeriods: it.practicePeriods || (it.name?.includes("Thực hành") ? it.credits * 30 : 0)
      }))
    })).map(s => ({ ...s, totalCredits: s.items.reduce((sum, it) => sum + it.credits, 0) }));

    return {
      studentId, majorName: student.major.name, cohort: intake, semesters,
      stats: {
        totalCredits: itemsData.reduce((sum, it: any) => sum + it.credits, 0),
        mandatory: itemsData.filter((it: any) => it.isRequired).reduce((sum, it: any) => sum + it.credits, 0),
        passed: itemsData.filter((it: any) => passedIds.has(it.subjectId || it.id)).reduce((sum, it: any) => sum + it.credits, 0)
      }
    };
  }

  async update(id: string, dto: UpdateStudentDto): Promise<StudentResponse> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!student) throw new Error("Student not found");

    const {
      dob,
      email,
      studentCode,
      majorId,
      admissionDate,
      idIssueDate,
      youthUnionDate,
      partyDate,
      adminClassId,
      specializationId,
      ...rest
    } = dto;

    // Update linked user if email changed and user exists
    if (email && student.user && email !== student.user.email) {
      await this.prisma.user.update({
        where: { id: student.userId! },
        data: {
          email: email,
          username: studentCode || student.user.username,
        },
      });
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        fullName: rest.fullName,
        phone: rest.phone,
        address: rest.address,
        gender: rest.gender,
        citizenId: rest.citizenId,
        emailPersonal: rest.emailPersonal,
        idIssuePlace: rest.idIssuePlace,
        campus: rest.campus,
        educationLevel: rest.educationLevel,
        educationType: rest.educationType,
        intake: rest.intake,
        ethnicity: rest.ethnicity,
        religion: rest.religion,
        nationality: rest.nationality,
        region: rest.region,
        policyBeneficiary: rest.policyBeneficiary,
        birthPlace: rest.birthPlace,
        permanentAddress: rest.permanentAddress,
        bankName: rest.bankName,
        bankBranch: rest.bankBranch,
        bankAccountName: rest.bankAccountName,
        bankAccountNumber: rest.bankAccountNumber,
        status: rest.status,
        gpa: rest.gpa,
        cpa: rest.cpa,
        totalEarnedCredits: rest.totalEarnedCredits,
        warningLevel: rest.warningLevel,
        academicStatus: rest.academicStatus,
        studentCode,
        major: majorId ? { connect: { id: majorId } } : undefined,
        adminClass: adminClassId
          ? { connect: { id: adminClassId } }
          : undefined,
        specialization: specializationId
          ? { connect: { id: specializationId } }
          : undefined,
        dob: dob && !isNaN(Date.parse(dob)) ? new Date(dob) : undefined,
        admissionDate:
          admissionDate && !isNaN(Date.parse(admissionDate))
            ? new Date(admissionDate)
            : undefined,
        idIssueDate:
          idIssueDate && !isNaN(Date.parse(idIssueDate))
            ? new Date(idIssueDate)
            : undefined,
        youthUnionDate:
          youthUnionDate && !isNaN(Date.parse(youthUnionDate))
            ? new Date(youthUnionDate)
            : undefined,
        partyDate:
          partyDate && !isNaN(Date.parse(partyDate))
            ? new Date(partyDate)
            : undefined,
      },
      include: {
        user: true,
        specialization: true,
        adminClass: true,
        major: true,
      },
    }) as unknown as StudentResponse;
  }

  async remove(id: string) {
    const student = await this.prisma.student.findUnique({ where: { id } });
    if (!student) return null;

    if (student.userId) {
      // Delete the user record, which will cascade delete the student profile
      return this.prisma.user.delete({ where: { id: student.userId } });
    } else {
      // Just delete the student profile
      return this.prisma.student.delete({ where: { id } });
    }
  }

  async getTemplate() {
    try {
      // Create a clean sample student without nested relation objects
      // User requested all SQL columns, so we provide them as null/empty
      const sample = {
        studentCode: "SV26001",
        fullName: "Nguyễn Văn A",
        dob: "2004-01-01",
        gender: "MALE",
        phone: "0123456789",
        address: "Hà Nội",
        citizenId: "123456789",
        emailPersonal: "a@gmail.com",
        admissionDate: "2024-09-01",
        status: "STUDYING",
        majorId: "CNTT",
        adminClassId: "AC_01",
      };

      const ws = xlsx.utils.json_to_sheet([sample]);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Template");
      return xlsx.write(wb, { type: "base64", bookType: "xlsx" });
    } catch (err) {
      this.logger.error("Error generating template: " + err.message);
      throw err;
    }
  }

  async exportExcel() {
    try {
      const students = await this.prisma.student.findMany();

      // Explicitly map only scalar fields to avoid circular ref issues with relations
      const data = students.map((s) => ({
        id: s.id,
        userId: s.userId,
        adminClassId: s.adminClassId,
        majorId: s.majorId,
        studentCode: s.studentCode,
        fullName: s.fullName,
        dob: s.dob ? new Date(s.dob).toLocaleDateString("vi-VN") : "",
        gender: s.gender,
        phone: s.phone,
        address: s.address,
        citizenId: s.citizenId,
        emailPersonal: s.emailPersonal,
        admissionDate: s.admissionDate
          ? new Date(s.admissionDate).toLocaleDateString("vi-VN")
          : "",
        campus: s.campus,
        educationLevel: s.educationLevel,
        educationType: s.educationType,
        intake: s.intake,
        ethnicity: s.ethnicity,
        religion: s.religion,
        nationality: s.nationality,
        birthPlace: s.birthPlace,
        permanentAddress: s.permanentAddress,
        bankName: s.bankName,
        bankBranch: s.bankBranch,
        bankAccountName: s.bankAccountName,
        bankAccountNumber: s.bankAccountNumber,
        gpa: s.gpa,
        cpa: s.cpa,
        totalEarnedCredits: s.totalEarnedCredits,
        status: s.status,
        specializationId: s.specializationId,
        academicStatus: s.academicStatus,
        warningLevel: s.warningLevel,
      }));

      const ws = xlsx.utils.json_to_sheet(data);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, "Students");

      const wscols = Object.keys(data[0] || {}).map(() => ({ wch: 15 }));
      ws["!cols"] = wscols;

      return xlsx.write(wb, { type: "base64", bookType: "xlsx" });
    } catch (err) {
      this.logger.error("Error exporting excel: " + err.message);
      throw err;
    }
  }

  async importExcel(buffer: Buffer) {
    const wb = xlsx.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data: any[] = xlsx.utils.sheet_to_json(ws);

    const stats = { updated: 0, created: 0, errors: 0 };

    for (const row of data) {
      const code = row["studentCode"] || row["Mã Sinh Viên"];
      if (!code) {
        stats.errors++;
        continue;
      }

      try {
        const studentData: any = {};

        // Dynamic mapping: if the column name exists in Student model, we update it
        // We exclude sensitive or internal fields like 'id', 'userId', 'createdAt'
        const excludeFields = ["id", "userId", "createdAt", "updatedAt"];

        Object.keys(row).forEach((key) => {
          if (excludeFields.includes(key)) return;

          let val = row[key];

          // Handle Dates
          if (key.toLowerCase().includes("date") || key === "dob") {
            if (val && typeof val === "string") {
              const parts = val.split("/");
              if (parts.length === 3) {
                val = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
              } else {
                val = new Date(val);
              }
            }
          }

          // Handle Numbers
          if (
            ["gpa", "cpa", "totalEarnedCredits", "warningLevel"].includes(key)
          ) {
            val = Number(val);
          }

          studentData[key] = val;
        });

        const existing = await this.prisma.student.findUnique({
          where: { studentCode: code.toString() },
        });

        if (existing) {
          await this.prisma.student.update({
            where: { studentCode: code.toString() },
            data: studentData,
          });
          stats.updated++;
        } else {
          // For create, we need mandatory fields
          await this.prisma.student.create({
            data: {
              ...studentData,
              studentCode: code.toString(),
              fullName: studentData.fullName || "N/A",
              dob: studentData.dob || new Date(),
              majorId: studentData.majorId || "GEN_MAJOR",
            },
          });
          stats.created++;
        }
      } catch (err) {
        this.logger.error(`Error importing student ${code}: ${err.message}`);
        stats.errors++;
      }
    }

    return stats;
  }
}
