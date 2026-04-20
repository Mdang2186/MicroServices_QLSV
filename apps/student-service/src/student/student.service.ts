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

  private buildPortalScheduleItem(session: any) {
    return {
      id: session.id,
      date: session.date,
      dayOfWeek: this.toPortalDayOfWeek(session.date),
      startShift: session.startShift,
      endShift: session.endShift,
      type: session.type,
      room: session.room,
      roomId: session.roomId,
      note: session.note,
      examSbd: session.examSbd,
      seatNumber: session.seatNumber,
      examPlanId: session.examPlanId,
    };
  }

  private attachSchedulesToCourseClass(
    courseClass: any,
    extraSchedules: any[] = [],
  ) {
    if (!courseClass) return courseClass;
    const sessions = courseClass.sessions || [];
    return {
      ...courseClass,
      schedules: [...sessions, ...extraSchedules]
        .map((session: any) => this.buildPortalScheduleItem(session))
        .sort((left: any, right: any) => {
          const leftDate = new Date(left.date).getTime();
          const rightDate = new Date(right.date).getTime();
          if (leftDate !== rightDate) {
            return leftDate - rightDate;
          }
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

  private buildCourseClassSemesterSubjectKey(courseClass: any) {
    const semesterId =
      courseClass?.semesterId || courseClass?.semester?.id || "";
    const subjectId = courseClass?.subjectId || courseClass?.subject?.id || "";
    if (!semesterId || !subjectId) return "";
    return `${semesterId}::${subjectId}`;
  }

  private async buildExamSchedulesByCourseClass(
    student: any,
    linkedStudentIds: string[] = [],
  ) {
    const result = new Map<string, any[]>();
    if (!student) {
      return result;
    }

    const studentIds = [...new Set(linkedStudentIds.filter(Boolean))];
    if (studentIds.length === 0) {
      return result;
    }

    const assignments = await this.prisma.examStudentAssignment.findMany({
      where: {
        studentId: { in: studentIds },
      },
      orderBy: [{ examPlanId: "asc" }, { examSbd: "asc" }],
    });

    if (assignments.length === 0) {
      return result;
    }

    const [plans, roomAssignments] = await Promise.all([
      this.prisma.examPlan.findMany({
        where: {
          id: { in: [...new Set(assignments.map((item) => item.examPlanId))] },
        },
      }),
      this.prisma.examRoomAssignment.findMany({
        where: {
          id: {
            in: [...new Set(assignments.map((item) => item.roomAssignmentId))],
          },
        },
      }),
    ]);

    const planMap = new Map(plans.map((plan) => [plan.id, plan]));
    const roomAssignmentMap = new Map(
      roomAssignments.map((assignment) => [assignment.id, assignment]),
    );

    const enrollmentCourseClassIds = new Set<string>();
    const fallbackCourseClassMap = new Map<string, string>();

    for (const enrollment of student.enrollments || []) {
      const courseClassId =
        enrollment?.courseClassId || enrollment?.courseClass?.id;
      const fallbackKey = this.buildCourseClassSemesterSubjectKey(
        enrollment?.courseClass,
      );

      if (courseClassId) {
        enrollmentCourseClassIds.add(courseClassId);
        if (fallbackKey && !fallbackCourseClassMap.has(fallbackKey)) {
          fallbackCourseClassMap.set(fallbackKey, courseClassId);
        }
      }
    }

    for (const assignment of assignments) {
      const plan = planMap.get(assignment.examPlanId);
      const roomAssignment = roomAssignmentMap.get(assignment.roomAssignmentId);
      if (!plan) {
        continue;
      }

      const fallbackKey = `${plan.semesterId}::${plan.subjectId}`;
      const courseClassId = enrollmentCourseClassIds.has(
        assignment.courseClassId,
      )
        ? assignment.courseClassId
        : fallbackCourseClassMap.get(fallbackKey);

      if (!courseClassId) {
        continue;
      }

      const scheduleItem = {
        id: `exam-${plan.id}-${assignment.id}`,
        date: plan.examDate,
        startShift: plan.startShift,
        endShift: plan.endShift,
        type: "EXAM",
        roomId: roomAssignment?.roomId || null,
        room: roomAssignment
          ? {
              id: roomAssignment.roomId || roomAssignment.id,
              name: roomAssignment.roomName,
              building: roomAssignment.building,
              type: roomAssignment.roomType,
              capacity: roomAssignment.capacity,
            }
          : null,
        note: `SBD ${assignment.examSbd} - Ghế ${assignment.seatNumber}${
          plan.note ? ` - ${plan.note}` : ""
        }`,
        examSbd: assignment.examSbd,
        seatNumber: assignment.seatNumber,
        examPlanId: plan.id,
      };

      const bucket = result.get(courseClassId) || [];
      bucket.push(scheduleItem);
      result.set(courseClassId, bucket);
    }

    return result;
  }

  private normalizeStudentPayload(
    student: any,
    examSchedulesByCourseClass: Map<string, any[]> = new Map(),
  ) {
    if (!student) return student;
    const dedupedEnrollments = this.dedupePortalEnrollments(
      student.enrollments || [],
    );
    return {
      ...student,
      enrollments: dedupedEnrollments.map((enrollment: any) => ({
        ...enrollment,
        courseClass: this.attachSchedulesToCourseClass(
          enrollment.courseClass,
          examSchedulesByCourseClass.get(
            enrollment?.courseClassId || enrollment?.courseClass?.id,
          ) || [],
        ),
      })),
    };
  }

  private positive(value: any, fallback = 0) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : fallback;
  }

  private numericOrNull(value: any) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  private normalizeComparable(value?: string | null) {
    return `${value || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
  }

  private isPracticeOrientedSubject(
    subject: any,
    rawTheoryPeriods: number,
    rawPracticePeriods: number,
  ) {
    const normalizedExamType = this.normalizeComparable(subject?.examType);
    const normalizedExamForm = this.normalizeComparable(subject?.examForm);
    return (
      rawPracticePeriods > rawTheoryPeriods ||
      (rawPracticePeriods > 0 && rawTheoryPeriods <= 0) ||
      normalizedExamType.includes("THUCHANH") ||
      normalizedExamForm.includes("THUCHANH") ||
      normalizedExamForm.includes("MAYTINH")
    );
  }

  private getTargetTotalPeriods(subject: any, input: any = {}) {
    const credits = this.positive(subject?.credits);
    const creditPeriods = credits * 15;
    
    const explicitTheoryPeriods = this.numericOrNull(input?.theoryPeriods);
    const explicitPracticePeriods = this.numericOrNull(input?.practicePeriods);
    
    const rawTheoryPeriods =
      explicitTheoryPeriods !== null
        ? Math.max(explicitTheoryPeriods, 0)
        : this.positive(
            subject?.theoryPeriods,
            this.positive(subject?.theoryHours),
          );
    const rawPracticePeriods =
      explicitPracticePeriods !== null
        ? Math.max(explicitPracticePeriods, 0)
        : this.positive(
            subject?.practicePeriods,
            this.positive(subject?.practiceHours),
          );
    const rawTotalPeriods = rawTheoryPeriods + rawPracticePeriods;

    if (credits > 0) {
      return creditPeriods;
    }

    return Math.max(rawTotalPeriods, 15);
  }

  private normalizePeriodSplit(subject: any, input: any = {}) {
    const targetTotalPeriods = this.getTargetTotalPeriods(subject, input);
    const explicitTheoryPeriods = this.numericOrNull(input?.theoryPeriods);
    const explicitPracticePeriods = this.numericOrNull(input?.practicePeriods);
    const rawTheoryPeriods =
      explicitTheoryPeriods !== null
        ? Math.max(explicitTheoryPeriods, 0)
        : this.positive(
            subject?.theoryPeriods,
            this.positive(subject?.theoryHours),
          );
    const rawPracticePeriods =
      explicitPracticePeriods !== null
        ? Math.max(explicitPracticePeriods, 0)
        : this.positive(
            subject?.practicePeriods,
            this.positive(subject?.practiceHours),
          );

    if (rawTheoryPeriods > 0 && rawPracticePeriods > 0) {
      const rawTotal = rawTheoryPeriods + rawPracticePeriods;
      const theoryRatio = rawTheoryPeriods / Math.max(rawTotal, 1);
      const theoryPeriods = Math.round(targetTotalPeriods * theoryRatio);
      return {
        theoryPeriods,
        practicePeriods: Math.max(targetTotalPeriods - theoryPeriods, 0),
      };
    }

    if (
      this.isPracticeOrientedSubject(subject, rawTheoryPeriods, rawPracticePeriods)
    ) {
      return {
        theoryPeriods: 0,
        practicePeriods: targetTotalPeriods,
      };
    }

    return {
      theoryPeriods: targetTotalPeriods,
      practicePeriods: 0,
    };
  }

  private buildCurriculumStudySnapshot(subject: any, input: any = {}) {
    const { theoryPeriods, practicePeriods } = this.normalizePeriodSplit(
      subject,
      input,
    );
    const theorySessionsPerWeek =
      theoryPeriods > 0
        ? this.positive(
            input?.theorySessionsPerWeek,
            this.positive(subject?.theorySessionsPerWeek, 1),
          )
        : 0;
    const practiceSessionsPerWeek =
      practicePeriods > 0
        ? this.positive(
            input?.practiceSessionsPerWeek,
            this.positive(subject?.practiceSessionsPerWeek, 1),
          )
        : 0;

    return {
      theoryPeriods,
      practicePeriods,
      theorySessionsPerWeek,
      practiceSessionsPerWeek,
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

  private resolveStudentCohortCode(student: any) {
    const directCohort =
      `${student?.intake || student?.adminClass?.cohort || ""}`.trim().toUpperCase();
    if (directCohort) {
      return directCohort;
    }

    const legacyMeta = this.parseLegacyAdminClass(student?.adminClass?.code);
    return legacyMeta?.cohort || null;
  }

  private async mergeMirrorEnrollmentsForLegacyStudent(student: any) {
    const linkedStudentIds = student?.id ? [student.id] : [];
    if (!student?.adminClass?.code) {
      return {
        student,
        linkedStudentIds,
      };
    }

    const legacyMeta = this.parseLegacyAdminClass(
      student.adminClass.code,
      student.adminClass.cohort || student.intake,
    );
    if (!legacyMeta) {
      return {
        student,
        linkedStudentIds,
      };
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
      return {
        student,
        linkedStudentIds,
      };
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
      return {
        student,
        linkedStudentIds,
      };
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
      student: {
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
      },
      linkedStudentIds: [...new Set([...linkedStudentIds, mirrorStudent.id])],
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

    const { student: mergedStudent, linkedStudentIds } =
      await this.mergeMirrorEnrollmentsForLegacyStudent(student);
    const examSchedulesByCourseClass =
      await this.buildExamSchedulesByCourseClass(
        mergedStudent,
        linkedStudentIds,
      );
    return this.normalizeStudentPayload(
      mergedStudent,
      examSchedulesByCourseClass,
    ) as unknown as StudentResponse | null;
  }

  async findByUserId(userId: string): Promise<StudentResponse | null> {
    const student = await this.prisma.student.findUnique({
      where: { userId },
      include: this.portalStudentInclude,
    });

    const { student: mergedStudent, linkedStudentIds } =
      await this.mergeMirrorEnrollmentsForLegacyStudent(student);
    const examSchedulesByCourseClass =
      await this.buildExamSchedulesByCourseClass(
        mergedStudent,
        linkedStudentIds,
      );
    return this.normalizeStudentPayload(
      mergedStudent,
      examSchedulesByCourseClass,
    ) as unknown as StudentResponse | null;
  }

  async getCurriculumProgress(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { major: true, adminClass: true },
    });
    if (!student) throw new Error("Student not found");
    const intake = this.resolveStudentCohortCode(student);
    if (!intake) {
      throw new Error("Student cohort not found");
    }

    const { linkedStudentIds } =
      await this.mergeMirrorEnrollmentsForLegacyStudent(student);

    // 1. Fetch Plan (Template or Curriculum fallback)
    const template = await this.prisma.trainingPlanTemplate.findFirst({
      where: {
        majorId: student.majorId,
        cohort: intake,
        status: { in: ["PUBLISHED", "ACTIVE"] },
      },
      include: {
        items: { include: { subject: { include: { prerequisites: true } } } },
      },
    });

    const curriculumRows = await this.prisma.curriculum.findMany({
      where: { majorId: student.majorId, cohort: intake },
      include: { subject: { include: { prerequisites: true } } },
    });

    const syncOperations: any[] = [];
    const existingCurriculumBySubject = new Map(
      curriculumRows.map((item) => [item.subjectId, item]),
    );

    for (const row of curriculumRows) {
      const snapshot = this.buildCurriculumStudySnapshot(row.subject, row);
      if (
        Number(row.subject?.theoryHours || 0) !== snapshot.theoryPeriods ||
        Number(row.subject?.practiceHours || 0) !== snapshot.practicePeriods ||
        Number(row.subject?.theoryPeriods || 0) !== snapshot.theoryPeriods ||
        Number(row.subject?.practicePeriods || 0) !== snapshot.practicePeriods ||
        Number(row.subject?.theorySessionsPerWeek || 0) !==
          snapshot.theorySessionsPerWeek ||
        Number(row.subject?.practiceSessionsPerWeek || 0) !==
          snapshot.practiceSessionsPerWeek
      ) {
        syncOperations.push(
          this.prisma.subject.update({
            where: { id: row.subjectId },
            data: {
              theoryHours: snapshot.theoryPeriods,
              practiceHours: snapshot.practicePeriods,
              theoryPeriods: snapshot.theoryPeriods,
              practicePeriods: snapshot.practicePeriods,
              theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
              practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            },
          }),
        );
      }
    }

    if (template?.items?.length) {
      const missingCurriculumItems = template.items
        .filter((item) => !existingCurriculumBySubject.has(item.subjectId))
        .map((item) => ({
          majorId: student.majorId,
          cohort: intake,
          subjectId: item.subjectId,
          suggestedSemester: item.conceptualSemester,
          isRequired: item.isRequired !== false,
        }));

      if (missingCurriculumItems.length > 0) {
        syncOperations.push(
          this.prisma.curriculum.createMany({
            data: missingCurriculumItems,
          }),
        );
      }

      for (const item of template.items) {
        const snapshot = this.buildCurriculumStudySnapshot(item.subject, item);
        const curriculumRow = existingCurriculumBySubject.get(item.subjectId);

        if (
          Number(item.subject?.theoryHours || 0) !== snapshot.theoryPeriods ||
          Number(item.subject?.practiceHours || 0) !== snapshot.practicePeriods ||
          Number(item.subject?.theoryPeriods || 0) !== snapshot.theoryPeriods ||
          Number(item.subject?.practicePeriods || 0) !== snapshot.practicePeriods ||
          Number(item.subject?.theorySessionsPerWeek || 0) !==
            snapshot.theorySessionsPerWeek ||
          Number(item.subject?.practiceSessionsPerWeek || 0) !==
            snapshot.practiceSessionsPerWeek
        ) {
          syncOperations.push(
            this.prisma.subject.update({
              where: { id: item.subjectId },
              data: {
                theoryHours: snapshot.theoryPeriods,
                practiceHours: snapshot.practicePeriods,
                theoryPeriods: snapshot.theoryPeriods,
                practicePeriods: snapshot.practicePeriods,
                theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
                practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
              },
            }),
          );
        }

        if (
          Number(item.theoryPeriods || 0) !== snapshot.theoryPeriods ||
          Number(item.practicePeriods || 0) !== snapshot.practicePeriods ||
          Number(item.theorySessionsPerWeek || 0) !==
            snapshot.theorySessionsPerWeek ||
          Number(item.practiceSessionsPerWeek || 0) !==
            snapshot.practiceSessionsPerWeek
        ) {
          syncOperations.push(
            this.prisma.trainingPlanTemplateItem.update({
              where: { id: item.id },
              data: {
                theoryPeriods: snapshot.theoryPeriods,
                practicePeriods: snapshot.practicePeriods,
                theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
                practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
              },
            }),
          );
        }

        if (
          curriculumRow &&
          (Number(curriculumRow.suggestedSemester || 0) !==
            Number(item.conceptualSemester || 0) ||
            Boolean(curriculumRow.isRequired) !== Boolean(item.isRequired))
        ) {
          syncOperations.push(
            this.prisma.curriculum.update({
              where: {
                majorId_cohort_subjectId: {
                  majorId: student.majorId,
                  cohort: intake,
                  subjectId: item.subjectId,
                },
              },
              data: {
                suggestedSemester: item.conceptualSemester,
                isRequired: item.isRequired !== false,
              },
            }),
          );
        }
      }
    }

    if (syncOperations.length > 0) {
      try {
        await this.prisma.$transaction(syncOperations);
      } catch (error) {
        this.logger.warn(
          `Failed to normalize curriculum metadata for student ${studentId}: ${
            (error as Error)?.message || error
          }`,
        );
      }
    }

    const itemsData = template?.items?.length
      ? template.items.map((item) => {
          const snapshot = this.buildCurriculumStudySnapshot(
            item.subject,
            item,
          );
          return {
            ...item,
            ...item.subject,
            suggestedSemester: item.conceptualSemester,
            prerequisites: item.subject.prerequisites.map(
              (p) => p.prerequisiteId,
            ),
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            isRequired: item.isRequired !== false,
          };
        })
      : curriculumRows.map((row) => {
          const snapshot = this.buildCurriculumStudySnapshot(row.subject, row);
          return {
            ...row,
            ...row.subject,
            prerequisites: row.subject.prerequisites.map(
              (p) => p.prerequisiteId,
            ),
            theoryPeriods: snapshot.theoryPeriods,
            practicePeriods: snapshot.practicePeriods,
            theorySessionsPerWeek: snapshot.theorySessionsPerWeek,
            practiceSessionsPerWeek: snapshot.practiceSessionsPerWeek,
            isRequired: row.isRequired !== false,
          };
        });

    // 2. Map Progress
    const grades = await this.prisma.grade.findMany({
      where: { studentId: { in: linkedStudentIds } },
      select: {
        subjectId: true,
        isPassed: true,
        totalScore10: true,
      },
    });
    const subjectGrades = new Map<string, { isPassed: boolean, score: number | null }>();
    grades.forEach(g => {
        const current = subjectGrades.get(g.subjectId);
        const isPassed = g.isPassed === true || (g.totalScore10 ?? 0) >= 4.0;
        if (!current || (isPassed && !current.isPassed) || (g.totalScore10 || 0) > (current.score || 0)) {
            subjectGrades.set(g.subjectId, { isPassed, score: g.totalScore10 ?? null });
        }
    });

    const passedIds = new Set(
      Array.from(subjectGrades.entries())
        .filter(([_, data]) => data.isPassed)
        .map(([id, _]) => id)
    );

    const maxSemester =
      itemsData.reduce(
        (max, item: any) =>
          Math.max(
            max,
            Number(item.suggestedSemester || item.conceptualSemester || 0),
          ),
        0,
      ) || 1;

    const semesters = Array.from({ length: maxSemester }, (_, i) => ({
      semester: i + 1,
      items: itemsData
        .filter((it: any) => it.suggestedSemester === i + 1)
        .map((it: any) => {
            const gradeInfo = subjectGrades.get(it.subjectId || it.id);
            return {
              ...it,
              isPassed: gradeInfo?.isPassed || false,
              score: gradeInfo?.score || null,
              theoryPeriods:
                it.theoryPeriods ||
                (it.name?.includes("Thực hành") ? 0 : it.credits * 15),
              practicePeriods:
                it.practicePeriods ||
                (it.name?.includes("Thực hành") ? it.credits * 30 : 0),
            };
        }),
    })).map((s) => ({
      ...s,
      totalCredits: s.items.reduce((sum, it) => sum + it.credits, 0),
    }));

    return {
      studentId,
      studentCode: student.studentCode,
      fullName: student.fullName,
      majorName: student.major.name,
      cohort: intake,
      adminClassCode: student.adminClass?.code || student.adminClass?.name || null,
      semesters,
      stats: {
        totalCredits: itemsData.reduce((sum, it: any) => sum + it.credits, 0),
        mandatory: itemsData
          .filter((it: any) => it.isRequired)
          .reduce((sum, it: any) => sum + it.credits, 0),
        passed: itemsData
          .filter((it: any) => passedIds.has(it.subjectId || it.id))
          .reduce((sum, it: any) => sum + it.credits, 0),
        passedMandatory: itemsData
          .filter(
            (it: any) =>
              it.isRequired && passedIds.has(it.subjectId || it.id),
          )
          .reduce((sum, it: any) => sum + it.credits, 0),
      },
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

    // Update linked user if email changed or status changed and user exists
    if (student.userId && (email !== undefined || dto.isActive !== undefined)) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: {
          email: email || student.user.email,
          username: studentCode || student.user.username,
          isActive: dto.isActive !== undefined ? dto.isActive : undefined,
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
