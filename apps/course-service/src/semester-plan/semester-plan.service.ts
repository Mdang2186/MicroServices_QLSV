import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SemesterPlanService {
  private readonly logger = new Logger(SemesterPlanService.name);
  constructor(private prisma: PrismaService) {}

  async findClasses(semesterId: string) {
    if (!semesterId) return [];
    return this.prisma.courseClass.findMany({
      where: { semesterId },
      include: {
        subject: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        semester: true,
        lecturer: true,
        adminClasses: true,
        sessions: {
          include: { room: true },
        },
        _count: { select: { sessions: true, enrollments: true } },
      },
    });
  }

  private async getBalancedLecturer(facultyId: string, semesterId: string) {
    const lecturers = await this.prisma.lecturer.findMany({
      where: { facultyId },
      select: {
        id: true,
        fullName: true,
        _count: {
          select: {
            classes: {
              where: { semesterId },
            },
          },
        },
      },
    });

    if (lecturers.length === 0) return null;

    // Sort by class count ascending to find the one with the least workload
    const sorted = lecturers.sort(
      (a, b) => a._count.classes - b._count.classes,
    );
    return sorted[0];
  }

  async generateFromCurriculum(
    semesterId: string,
    majorId: string,
    cohort: string,
  ) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semester) throw new Error('Semester not found');

    this.logger.log(
      `Generating plan for Semester: ${semesterId}, Major: ${majorId}, Cohort: ${cohort}`,
    );
    const isOddSemester = semester.semesterNumber % 2 !== 0;

    const curriculumItems = await this.prisma.curriculum.findMany({
      where: {
        majorId,
        cohort,
        suggestedSemester: {
          in: isOddSemester ? [1, 3, 5, 7] : [2, 4, 6, 8],
        },
      },
      include: { subject: true },
    });

    const createdClasses = [];
    for (const item of curriculumItems) {
      const classCode = `${item.subject.code}-${semester.code}-${cohort}`;
      const existing = await this.prisma.courseClass.findUnique({
        where: { code: classCode },
      });

      if (!existing) {
        // Find the faculty for this major
        const faculty = await this.prisma.faculty.findFirst({
          where: { majors: { some: { id: majorId } } },
        });

        // SMART: Find lecturer with MIN workload in this faculty and semester
        const balancedLecturer = faculty
          ? await this.getBalancedLecturer(faculty.id, semesterId)
          : null;

        const courseClass = await this.prisma.courseClass.create({
          data: {
            code: classCode,
            name: `${item.subject.name} (${cohort})`,
            subjectId: item.subjectId,
            semesterId: semesterId,
            lecturerId: balancedLecturer?.id,
            maxSlots: 60,
            totalPeriods: item.subject.credits * 15,
            status: 'OPEN',
          },
        });
        createdClasses.push(courseClass);
      }
    }

    return { count: createdClasses.length, classes: createdClasses };
  }

  async getCurriculumByMajor(
    majorId: string,
    cohort: string,
    semesterNumber?: number,
  ) {
    return this.prisma.curriculum.findMany({
      where: {
        majorId,
        cohort,
        ...(semesterNumber ? { suggestedSemester: semesterNumber } : {}),
      },
      include: { subject: true },
      orderBy: { suggestedSemester: 'asc' },
    });
  }

  async saveBlueprint(
    majorId: string,
    cohort: string,
    items: { subjectId: string; suggestedSemester: number }[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Clear existing curriculum for this major/cohort
      await tx.curriculum.deleteMany({
        where: { majorId, cohort },
      });

      // 2. Insert new blueprint items
      if (items && items.length > 0) {
        await tx.curriculum.createMany({
          data: items.map((item) => ({
            majorId,
            cohort,
            subjectId: item.subjectId,
            suggestedSemester: item.suggestedSemester,
            isRequired: true,
          })),
        });
      }

      return { success: true, count: items.length };
    });
  }

  async getExpectedStudents(majorId: string, cohort: string) {
    const adminClasses = await this.prisma.adminClass.findMany({
      where: { majorId, cohort },
      include: { _count: { select: { students: true } } },
    });

    const totalCount = adminClasses.reduce(
      (sum, ac) => sum + ac._count.students,
      0,
    );
    return { totalCount, classCount: adminClasses.length };
  }

  async duplicateBlueprint(
    majorId: string,
    sourceCohort: string,
    targetCohorts: string[],
  ) {
    const sourceBlueprint = await this.prisma.curriculum.findMany({
      where: { majorId, cohort: sourceCohort },
    });

    if (sourceBlueprint.length === 0) {
      throw new BadRequestException(
        `Không tìm thấy kế hoạch nguồn cho khóa ${sourceCohort}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let totalCreated = 0;
      for (const targetCohort of targetCohorts) {
        // Clear target
        await tx.curriculum.deleteMany({
          where: { majorId, cohort: targetCohort },
        });

        // Insert new
        await tx.curriculum.createMany({
          data: sourceBlueprint.map((item) => ({
            majorId,
            cohort: targetCohort,
            subjectId: item.subjectId,
            suggestedSemester: item.suggestedSemester,
            isRequired: item.isRequired,
          })),
        });
        totalCreated += sourceBlueprint.length;
      }
      return {
        success: true,
        createdCount: totalCreated,
        cohortCount: targetCohorts.length,
      };
    });
  }

  async copyCurriculumToSemester(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    return this.applyBlueprintToSemester(
      semesterId,
      majorId,
      cohort,
      subjectIds,
    );
  }

  /**
   * Main optimized workflow: Apply a blueprint to a real academic semester.
   * - Skips already-created classes (idempotent)
   * - Auto-assigns the least-loaded lecturer from the correct faculty/department
   * - Links the cohort's AdminClasses to each course class
   * - Returns full creation stats
   */
  async applyBlueprintToSemester(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semester) throw new Error('Học kỳ không tồn tại.');

    const subjects = await this.prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      include: {
        department: true,
        curriculums: {
          where: { majorId, cohort },
        },
      },
    });

    // ── AGGRESSIVE STUDENT DISCOVERY ──
    const activeMajor = await this.prisma.major.findUnique({
      where: { id: majorId },
      include: { faculty: true },
    });

    const targetFacultyId = activeMajor?.facultyId;

    // We look for any AdminClass belonging to the same Major OR the same Faculty
    // AND matching the cohort string (e.g., 'K18')
    const adminClasses = await this.prisma.adminClass.findMany({
      where: {
        OR: [
          // Case 1: Strict Major + Cohort match
          { majorId, cohort: { contains: cohort } },
          { majorId, code: { contains: cohort } },
          // Case 2: Same Faculty + Cohort match (Captures related sub-majors)
          {
            major: { facultyId: targetFacultyId },
            cohort: { contains: cohort },
          },
          { major: { facultyId: targetFacultyId }, code: { contains: cohort } },
        ],
      },
      include: {
        students: { select: { id: true }, where: { status: 'STUDYING' } },
      },
    });

    // DEDUPLICATE: Ensure no student is listed twice to prevent Enrollment unique constraint errors
    const rawStudentIds = adminClasses.flatMap((ac) =>
      ac.students.map((s) => s.id),
    );
    const allStudentIds = [...new Set(rawStudentIds)].filter((id) => !!id);

    // KEYWORD FALLBACK: if still 0, search for any class that clearly matches the cohort string
    if (allStudentIds.length === 0) {
      this.logger.warn(
        `No students found via Faculty/Major search for ${cohort}. Attempting global keyword match...`,
      );
      const globalClasses = await this.prisma.adminClass.findMany({
        where: {
          OR: [
            { cohort: { contains: cohort } },
            { code: { contains: cohort } },
          ],
        },
        include: {
          students: { select: { id: true }, where: { status: 'STUDYING' } },
        },
      });
      const globalIds = globalClasses.flatMap((ac) =>
        ac.students.map((s) => s.id),
      );
      allStudentIds.push(...new Set(globalIds));
      this.logger.log(
        `Global search found ${allStudentIds.length} students across all departments for ${cohort}`,
      );
    }

    this.logger.log(
      `Roadmap Enrollment Engine: Found ${adminClasses.length} nominal classes and ${allStudentIds.length} eligible students for ${cohort} in Faculty: ${activeMajor?.faculty?.name || 'ALL'}`,
    );

    const createdClasses: any[] = [];
    const skippedClasses: string[] = [];

    for (const sub of subjects) {
      try {
        const suggestedSem = sub.curriculums[0]?.suggestedSemester || 1;
        const classCode = `${sub.code}_${cohort}_S${suggestedSem}`;

        // 1. Determine Lecturer (Smart Assignment)
        let assignedLecturerId: string | null = null;
        if (sub.departmentId) {
          const deptLecturers = await this.prisma.lecturer.findMany({
            where: { departmentId: sub.departmentId },
            select: {
              id: true,
              _count: { select: { classes: { where: { semesterId } } } },
            },
            take: 10,
            orderBy: { classes: { _count: 'asc' } },
          });
          if (deptLecturers.length > 0) {
            assignedLecturerId = deptLecturers[0].id; // Pick least loaded in dept
          }
        }
        if (!assignedLecturerId) {
          const balanced = await this.getBalancedLecturer(
            (
              await this.prisma.faculty.findFirst({
                where: { majors: { some: { id: majorId } } },
              })
            )?.id || '',
            semesterId,
          );
          assignedLecturerId = balanced?.id || null;
        }

        // 1.5 Determine Intensity (Meta-Sync)
        const isPractice = (sub.practiceHours || 0) > (sub.theoryHours || 0);
        const subPeriods = isPractice ? sub.practicePeriods : sub.theoryPeriods;
        const clsPeriodsPerSession = subPeriods || 3;
        const clsSessionsPerWeek = 1; // Default

        const totalPeriods =
          (sub.theoryPeriods || sub.theoryHours || 0) +
          (sub.practicePeriods || sub.practiceHours || 0);
        let courseClass;

        // 2. CREATE or UPDATE (Claim Logic)
        const existing = await this.prisma.courseClass.findUnique({
          where: { code: classCode },
        });

        if (existing) {
          courseClass = await this.prisma.courseClass.update({
            where: { id: existing.id },
            data: {
              semesterId,
              // Only update lecturer if not currently set (prevent overwriting manual overrides)
              lecturerId: existing.lecturerId ? undefined : assignedLecturerId,
              adminClasses: {
                connect: adminClasses.map((ac) => ({ id: ac.id })),
              },
            },
          });
          this.logger.log(`Claimed & Updated existing class: ${classCode}`);
        } else {
          courseClass = await this.prisma.courseClass.create({
            data: {
              code: classCode,
              name: `${sub.name} (${cohort})`,
              subjectId: sub.id,
              semesterId: semesterId,
              lecturerId: assignedLecturerId,
              cohort: cohort,
              sessionsPerWeek: clsSessionsPerWeek,
              periodsPerSession: clsPeriodsPerSession,
              maxSlots: Math.max(allStudentIds.length + 10, 60),
              totalPeriods:
                totalPeriods > 0
                  ? totalPeriods
                  : Math.max(sub.credits * 15, 30),
              status: 'OPEN',
              adminClasses: {
                connect: adminClasses.map((ac) => ({ id: ac.id })),
              },
            },
          });
          this.logger.log(`Created new class: ${classCode}`);
        }

        // 3. BULK STUDENT PUSH (End-to-end Enrollment)
        if (allStudentIds.length > 0) {
          // Fetch existing students in this class to avoid duplicates (SQL Server skipDuplicates compatibility)
          const existingEnrollments = await this.prisma.enrollment.findMany({
            where: { courseClassId: courseClass.id },
            select: { studentId: true },
          });
          const existingIds = new Set(
            existingEnrollments.map((e) => e.studentId),
          );
          const missingIds = allStudentIds.filter((id) => !existingIds.has(id));

          if (missingIds.length > 0) {
            await this.prisma.enrollment.createMany({
              data: missingIds.map((studentId) => ({
                courseClassId: courseClass.id,
                studentId,
                status: 'REGISTERED',
              })),
            });
            this.logger.log(
              `Pushed ${missingIds.length} new students to ${classCode}`,
            );
          }
        }

        createdClasses.push(courseClass);
      } catch (err) {
        this.logger.error(`Lỗi khi xử lý môn ${sub.code}: ${err.message}`);
        skippedClasses.push(`${sub.code} (Error: ${err.message})`);
      }
    }

    this.logger.log(
      `Blueprint applied: ${createdClasses.length} created, ${skippedClasses.length} skipped. Bulk enrolled ${allStudentIds.length} students per class.`,
    );
    return {
      created: createdClasses.length,
      skipped: skippedClasses.length,
      total: subjectIds.length,
      enrolledCount: allStudentIds.length,
      semesterName: semester.name,
    };
  }

  async generateFullCohortPlan(majorId: string, cohort: string) {
    this.logger.log(
      `Generating 8-semester roadmap for Major: ${majorId}, Cohort: ${cohort}`,
    );

    const curriculumItems = await this.prisma.curriculum.findMany({
      where: { majorId, cohort },
      include: { subject: true },
    });

    if (curriculumItems.length === 0) {
      throw new Error(
        `Khung chương trình cho khóa ${cohort} chưa được thiết lập.`,
      );
    }

    // Get all future semesters ordered by date
    const allSemesters = await this.prisma.semester.findMany({
      where: { startDate: { gte: new Date() } },
      orderBy: { startDate: 'asc' },
    });

    let createdCount = 0;
    for (const item of curriculumItems) {
      // Find a semester that matches the parity
      // Logic: suggestedSemester 1,3,5,7 match odd semesters; 2,4,6,8 match even
      const isOddGoal = item.suggestedSemester % 2 !== 0;

      // Select appropriate semester from available list (simplified mapping)
      // Semester 1/2 of Roadmap maps to the 1st/2nd available semesters, etc.
      const targetSemester = allSemesters.find(
        (s) => (s.semesterNumber % 2 !== 0) === isOddGoal,
      );

      if (targetSemester) {
        const classCode = `${item.subject.code}-${targetSemester.code}-${cohort}`;
        const existing = await this.prisma.courseClass.findUnique({
          where: { code: classCode },
        });

        if (!existing) {
          await this.prisma.courseClass.create({
            data: {
              code: classCode,
              name: `${item.subject.name} (${cohort})`,
              subjectId: item.subjectId,
              semesterId: targetSemester.id,
              // @ts-ignore
              cohort: cohort,
              totalPeriods: item.subject.credits * 15,
              status: 'OPEN',
            },
          });
          createdCount++;
        }
      }
    }

    return { count: createdCount };
  }

  private async isLecturerAvailable(
    lecturerId: string,
    date: Date,
    start: number,
    end: number,
    semesterId: string,
  ) {
    const conflict = await this.prisma.classSession.findFirst({
      where: {
        courseClass: { lecturerId },
        date,
        semesterId,
        OR: [
          { startShift: { lte: start }, endShift: { gte: start } },
          { startShift: { lte: end }, endShift: { gte: end } },
          { startShift: { gte: start }, endShift: { lte: end } },
        ],
      },
    });
    return !conflict;
  }

  private async isAdminClassAvailable(
    adminClassIds: string[],
    date: Date,
    start: number,
    end: number,
    semesterId: string,
  ) {
    const conflict = await this.prisma.classSession.findFirst({
      where: {
        courseClass: { adminClasses: { some: { id: { in: adminClassIds } } } },
        date,
        semesterId,
        OR: [
          { startShift: { lte: start }, endShift: { gte: start } },
          { startShift: { lte: end }, endShift: { gte: end } },
          { startShift: { gte: start }, endShift: { lte: end } },
        ],
      },
    });
    return !conflict;
  }

  private async findAvailableRoom(
    type: string,
    semesterId: string,
    date: Date,
    start: number,
    end: number,
  ) {
    const rooms = await this.prisma.room.findMany({ where: { type } });
    for (const room of rooms) {
      const conflict = await this.prisma.classSession.findFirst({
        where: {
          roomId: room.id,
          date,
          semesterId,
          OR: [
            { startShift: { lte: start }, endShift: { gte: start } },
            { startShift: { lte: end }, endShift: { gte: end } },
            { startShift: { gte: start }, endShift: { lte: end } },
          ],
        },
      });
      if (!conflict) return room;
    }
    return null;
  }

  async automateScheduling(
    semesterId: string,
    config: { periodsPerSession: number; sessionsPerWeek: number } = {
      periodsPerSession: 3,
      sessionsPerWeek: 1,
    },
  ) {
    try {
      const semester = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!semester) throw new Error('Học kỳ không tồn tại');

      const classes = await this.prisma.courseClass.findMany({
        where: { semesterId },
        include: { subject: true, sessions: true, adminClasses: true },
      });

      let scheduledCount = 0;
      const { periodsPerSession, sessionsPerWeek } = config;

      for (const cls of classes) {
        // 3. Các tiện ích & Bảo vệ Dữ liệu: Chống ghi đè
        if (cls.sessions.length > 0) {
          this.logger.log(
            `Bỏ qua lớp ${cls.code} (Lớp Thực thi): Đã có lịch dạy.`,
          );
          continue;
        }

        const totalPeriods =
          cls.totalPeriods || (cls.subject?.credits || 0) * 15 || 45;

        // Use class-specific factors if available, fallback to Subject defaults, fallback to global config
        const isPractice =
          (cls.subject?.practiceHours || 0) > (cls.subject?.theoryHours || 0);
        const subjectDefaultPeriods = isPractice
          ? cls.subject?.practicePeriods
          : cls.subject?.theoryPeriods;

        const clsPeriodsPerSession =
          cls.periodsPerSession ||
          subjectDefaultPeriods ||
          config.periodsPerSession ||
          3;
        const clsSessionsPerWeek =
          cls.sessionsPerWeek || config.sessionsPerWeek || 1;

        // LOGIC REMAINDER+1: Calculate standard sessions and the potential remainder session
        const standardSessions = Math.floor(
          totalPeriods / clsPeriodsPerSession,
        );
        const remainder = totalPeriods % clsPeriodsPerSession;
        const sessionCount =
          remainder > 0 ? standardSessions + 1 : standardSessions;

        this.logger.log(
          `Xếp lịch lớp ${cls.code}: ${totalPeriods} tiết -> ${sessionCount} buổi (Phân bổ: ${clsSessionsPerWeek} buổi/tuần, Tiết/buổi: ${clsPeriodsPerSession})`,
        );

        const currentDate = new Date(semester.startDate);
        const offsetDays = classes.indexOf(cls) % 6;
        currentDate.setDate(currentDate.getDate() + offsetDays);

        let scheduledSessions = 0;
        const daysBetweenSessions = Math.max(
          1,
          Math.floor(7 / clsSessionsPerWeek),
        );
        let remainingPeriods = totalPeriods;

        for (let i = 0; i < sessionCount; i++) {
          while (currentDate.getDay() === 0)
            currentDate.setDate(currentDate.getDate() + 1);
          if (currentDate > semester.endDate) break;

          const roomType =
            (cls.subject?.theoryHours || 0) > 0 ? 'THEORY' : 'PRACTICE';

          // Use standard periods per session UNLESS it's the very last session
          const currentSessionPeriods =
            i === sessionCount - 1
              ? remainingPeriods
              : Math.min(clsPeriodsPerSession, remainingPeriods);

          let assignedRoom = null;
          let assignedShift = 0;

          const shifts = [1, 4, 7, 10, 13];
          const shiftOccupancy: Record<number, number> = {};
          for (const s of shifts) {
            const count = await this.prisma.classSession.count({
              where: { date: currentDate, startShift: s },
            });
            shiftOccupancy[s] = count;
          }

          const prioritizedShifts = shifts.sort(
            (a, b) => shiftOccupancy[a] - shiftOccupancy[b],
          );

          for (const shift of prioritizedShifts) {
            const shiftEnd = shift + currentSessionPeriods - 1;
            if (shiftEnd > 15) continue;

            const room = await this.findAvailableRoom(
              roomType,
              semesterId,
              currentDate,
              shift,
              shiftEnd,
            );
            if (!room) continue;

            if (cls.lecturerId) {
              const isLectFree = await this.isLecturerAvailable(
                cls.lecturerId,
                currentDate,
                shift,
                shiftEnd,
                semesterId,
              );
              if (!isLectFree) continue;
            }

            if (cls.adminClasses.length > 0) {
              const areAcFree = await this.isAdminClassAvailable(
                cls.adminClasses.map((a) => a.id),
                currentDate,
                shift,
                shiftEnd,
                semesterId,
              );
              if (!areAcFree) continue;
            }

            assignedRoom = room;
            assignedShift = shift;
            break;
          }

          if (assignedRoom) {
            await this.prisma.classSession.create({
              data: {
                courseClassId: cls.id,
                semesterId: semesterId,
                roomId: assignedRoom.id,
                date: new Date(currentDate),
                startShift: assignedShift,
                endShift: assignedShift + currentSessionPeriods - 1,
                type: 'LECTURE',
                note: `Tự động (Remainder+1) - Buổi ${i + 1}/${sessionCount}`,
              },
            });
            scheduledSessions++;
            remainingPeriods -= currentSessionPeriods;
          }

          currentDate.setDate(currentDate.getDate() + daysBetweenSessions);
        }
        if (scheduledSessions > 0) scheduledCount++;
      }

      return {
        status: 'success',
        scheduledClasses: scheduledCount,
        totalClasses: classes.length,
      };
    } catch (error) {
      this.logger.error(`Xếp lịch thất bại: ${error.message}`, error.stack);
      throw new BadRequestException(`Lỗi xếp lịch: ${error.message}`);
    }
  }

  async generateExamSchedules(semesterId: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semester || !semester.examStartDate || !semester.examEndDate) {
      throw new Error('Học kỳ chưa được thiết lập ngày thi.');
    }

    const classes = await this.prisma.courseClass.findMany({
      where: { semesterId },
      include: { subject: true },
    });

    const examsCreated = [];
    let currentExamDate = new Date(semester.examStartDate);

    for (const cls of classes) {
      const roomType =
        cls.subject.examType === 'THUC_HANH' ? 'PRACTICE' : 'THEORY';
      const room = await this.findAvailableRoom(
        roomType,
        semesterId,
        currentExamDate,
        1,
        3,
      );

      if (room) {
        const examSession = await this.prisma.classSession.create({
          data: {
            courseClassId: cls.id,
            semesterId: semesterId,
            roomId: room.id,
            date: new Date(currentExamDate),
            startShift: 1,
            endShift: 3,
            type: 'EXAM',
            note: `Thi: ${cls.subject.examForm || 'Tự luận'}`,
          },
        });
        examsCreated.push(examSession);
      }

      currentExamDate.setDate(currentExamDate.getDate() + 1);
      if (currentExamDate.getDay() === 0)
        currentExamDate.setDate(currentExamDate.getDate() + 1); // Skip Sunday
      if (currentExamDate > semester.examEndDate) {
        currentExamDate = new Date(semester.examStartDate);
      }
    }

    return { count: examsCreated.length };
  }

  async bulkCreatePlan(
    semesterId: string,
    majorId: string,
    cohort: string,
    subjectIds: string[],
  ) {
    if (!subjectIds || subjectIds.length === 0) {
      throw new Error('Không có môn học nào được chọn.');
    }

    this.logger.log(
      `Tự động hóa toàn diện cho Học kỳ: ${semesterId}, Ngành: ${majorId}, Khóa: ${cohort}`,
    );

    // 1. Áp dụng Blueprint: Tạo lớp + Gán giảng viên + Đẩy sinh viên danh nghĩa
    const setupResult = await this.applyBlueprintToSemester(
      semesterId,
      majorId,
      cohort,
      subjectIds,
    );

    // 2. Xếp lịch thông minh: Tìm phòng và thời gian cho tất cả các lớp của học kỳ này
    // Lưu ý: Chúng ta xếp lịch cho TOÀN BỘ học kỳ để đảm bảo tối ưu hóa phòng học
    const scheduleResult = await this.automateScheduling(semesterId, {
      periodsPerSession: 3,
      sessionsPerWeek: 1,
    });

    return {
      status: 'success',
      setup: setupResult,
      scheduling: scheduleResult,
      message: `Tự động hóa thành công! Đã xử lý ${setupResult.created} học phần, gán ${setupResult.enrolledCount} sinh viên và xếp lịch cho ${scheduleResult.scheduledClasses} lớp.`,
    };
  }

  async findClassesByCohort(majorId: string, cohort: string) {
    return this.prisma.courseClass.findMany({
      where: {
        OR: [
          {
            // @ts-ignore
            cohort,
            subject: { majorId },
          },
          {
            adminClasses: { some: { majorId, cohort } },
          },
        ],
      },
      include: {
        subject: {
          include: {
            department: {
              include: { faculty: true },
            },
            curriculums: {
              where: { majorId, cohort },
            },
          },
        },
        semester: true,
        lecturer: true,
        adminClasses: true,
        sessions: {
          include: { room: true },
        },
        _count: { select: { sessions: true, enrollments: true } },
      },
      orderBy: [
        { semester: { startDate: 'asc' } },
        { subject: { name: 'asc' } },
      ],
    });
  }

  async updateClassFactors(
    classId: string,
    sessionsPerWeek: number,
    periodsPerSession: number,
  ) {
    this.logger.log(
      `Cập nhật yếu tố xếp lịch cho lớp ${classId}: ${sessionsPerWeek} buổi/tuần, ${periodsPerSession} tiết/buổi`,
    );
    return this.prisma.courseClass.update({
      where: { id: classId },
      data: {
        sessionsPerWeek,
        periodsPerSession,
      },
    });
  }
}
