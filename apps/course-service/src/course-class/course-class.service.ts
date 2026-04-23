import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SessionGenerator } from './session-generator.util';

const TTL_30MIN = 30 * 60 * 1000;
const TTL_10MIN = 10 * 60 * 1000;
const TTL_30SEC = 30 * 1000;

@Injectable()
export class CourseClassService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  private buildTuitionFeeId(studentId: string, semesterId: string) {
    const normalizedStudent =
      studentId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'STUDENT';
    const normalizedSemester =
      semesterId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'SEMESTER';
    return `TUITION_${normalizedStudent}_${normalizedSemester}`.slice(0, 50);
  }

  private async resolveSemesterRef(semesterRef?: string) {
    const ref = `${semesterRef || ''}`.trim();
    if (!ref) return null;

    const semester = await this.prisma.semester.findFirst({
      where: {
        OR: [{ id: ref }, { code: ref }],
      },
      select: {
        id: true,
        code: true,
        startDate: true,
        endDate: true,
      },
    });

    return semester || { id: ref, code: null, startDate: null, endDate: null };
  }

  private async buildCourseClassSemesterWhere(semesterRef?: string) {
    const semester = await this.resolveSemesterRef(semesterRef);
    if (!semester) return null;

    if (semester.code) {
      return {
        OR: [
          { semesterId: semester.id },
          { semester: { code: semester.code } },
        ],
      };
    }

    return { semesterId: semester.id };
  }

  private async buildClassSessionSemesterWhere(semesterRef?: string) {
    const semester = await this.resolveSemesterRef(semesterRef);
    if (!semester) return null;

    const semesterScope = semester.code
      ? {
          OR: [
            { semesterId: semester.id },
            { courseClass: { semester: { code: semester.code } } },
          ],
        }
      : { semesterId: semester.id };

    const dateRange: any = {};
    if (semester.startDate || semester.endDate) {
      dateRange.date = {
        ...(semester.startDate ? { gte: new Date(semester.startDate) } : {}),
        ...(semester.endDate ? { lte: new Date(semester.endDate) } : {}),
      };
    }

    if (!dateRange.date) {
      return semesterScope;
    }

    return {
      AND: [semesterScope, dateRange],
    };
  }

  private async checkSemesterLock(semesterId: string, tx?: any) {
    const prisma = tx || this.prisma;
    const semester = await prisma.semester.findUnique({
      where: { id: semesterId },
      select: { isCurrent: true, endDate: true },
    });

    // Relaxed for Staff management: can edit Current or FUTURE semesters.
    // Cannot edit past (historic) semesters to maintain record integrity.
    const today = new Date();
    if (
      !semester?.isCurrent &&
      semester?.endDate &&
      new Date(semester.endDate) < today
    ) {
      throw new BadRequestException(
        'Thao tác không hợp lệ: Không thể thay đổi dữ liệu của học kỳ đã kết thúc trong quá khứ.',
      );
    }
  }

  private async checkConflicts(
    courseClassId: string | null,
    semesterId: string,
    schedules: any[],
    lecturerId?: string,
    adminClassIds?: string[],
    tx?: any,
  ) {
    if (!schedules || schedules.length === 0) return;
    const prisma = tx || this.prisma;
    const normalizedSchedules = schedules.map((schedule, index) =>
      this.normalizeRecurringSchedule(schedule, index),
    );

    for (let index = 0; index < normalizedSchedules.length; index += 1) {
      const current = normalizedSchedules[index];
      for (
        let candidateIndex = index + 1;
        candidateIndex < normalizedSchedules.length;
        candidateIndex += 1
      ) {
        const candidate = normalizedSchedules[candidateIndex];
        if (
          current.dayOfWeek !== candidate.dayOfWeek ||
          !this.hasShiftOverlap(
            current.startShift,
            current.endShift,
            candidate.startShift,
            candidate.endShift,
          )
        ) {
          continue;
        }

        throw new BadRequestException(
          `Lịch học không hợp lệ: Lớp đang có 2 khung giờ trùng nhau vào ${this.formatDayLabel(
            current.dayOfWeek,
          )}, tiết ${Math.max(
            current.startShift,
            candidate.startShift,
          )}-${Math.min(current.endShift, candidate.endShift)}.`,
        );
      }
    }

    const roomIds = [
      ...new Set(
        normalizedSchedules.map((schedule) => schedule.roomId).filter(Boolean),
      ),
    ];
    const filters: any[] = [];

    if (roomIds.length > 0) {
      filters.push({ roomId: { in: roomIds } });
    }
    if (lecturerId) {
      filters.push({ courseClass: { lecturerId } });
    }
    if (adminClassIds && adminClassIds.length > 0) {
      filters.push({
        courseClass: {
          adminClasses: {
            some: { id: { in: adminClassIds } },
          },
        },
      });
    }

    if (filters.length === 0) {
      return;
    }

    const existingSessions = await prisma.classSession.findMany({
      where: {
        semesterId,
        courseClassId: courseClassId ? { not: courseClassId } : undefined,
        OR: filters,
      },
      include: {
        room: true,
        courseClass: {
          include: {
            lecturer: true,
            adminClasses: true,
          },
        },
      },
    });

    for (const schedule of normalizedSchedules) {
      const dayLabel = this.formatDayLabel(schedule.dayOfWeek);

      for (const existingSession of existingSessions) {
        if (
          this.toPortalDayOfWeek(existingSession.date) !== schedule.dayOfWeek ||
          !this.hasShiftOverlap(
            schedule.startShift,
            schedule.endShift,
            existingSession.startShift,
            existingSession.endShift,
          )
        ) {
          continue;
        }

        if (
          schedule.roomId &&
          existingSession.roomId &&
          schedule.roomId === existingSession.roomId
        ) {
          throw new BadRequestException(
            `Trùng phòng học! Phòng đã được lớp "${existingSession.courseClass?.name || existingSession.courseClass?.code}" sử dụng vào ${dayLabel}, tiết ${existingSession.startShift}-${existingSession.endShift}.`,
          );
        }

        if (
          lecturerId &&
          existingSession.courseClass?.lecturerId &&
          existingSession.courseClass.lecturerId === lecturerId
        ) {
          throw new BadRequestException(
            `Trùng lịch giảng viên! Giảng viên đã có lịch dạy lớp "${existingSession.courseClass?.name || existingSession.courseClass?.code}" vào ${dayLabel}, tiết ${existingSession.startShift}-${existingSession.endShift}.`,
          );
        }

        const sharedAdminClass =
          existingSession.courseClass?.adminClasses?.find((adminClass: any) =>
            adminClassIds?.includes(adminClass.id),
          );
        if (sharedAdminClass) {
          throw new BadRequestException(
            `Trùng lịch lớp hành chính! Lớp "${sharedAdminClass.code}" đã có lịch học môn "${existingSession.courseClass?.name || existingSession.courseClass?.code}" vào ${dayLabel}, tiết ${existingSession.startShift}-${existingSession.endShift}.`,
          );
        }
      }
    }
  }

  private async checkDiscreteConflict(
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    roomId?: string,
    lecturerId?: string,
    adminClassIds?: string[],
    excludeSessionId?: string,
    excludeCourseClassId?: string,
    tx?: any,
  ) {
    const prisma = tx || this.prisma;
    const normalizedDate = this.validateDiscreteSessionInput(
      date,
      startShift,
      endShift,
    );
    const start = Number(startShift);
    const end = Number(endShift);

    const baseWhere = {
      semesterId,
      date: normalizedDate,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      courseClassId: excludeCourseClassId
        ? { not: excludeCourseClassId }
        : undefined,
      OR: this.buildShiftOverlapWhere(start, end),
    };

    if (roomId) {
      const roomConflict = await prisma.classSession.findFirst({
        where: { ...baseWhere, roomId },
        include: { courseClass: true },
      });
      if (roomConflict)
        throw new BadRequestException(
          `Phòng học bị trùng với lớp "${roomConflict.courseClass.name}" vào ngày ${this.formatDateVi(
            normalizedDate,
          )} (Tiết ${roomConflict.startShift}-${roomConflict.endShift}).`,
        );
    }

    if (lecturerId) {
      const lecturerConflict = await prisma.classSession.findFirst({
        where: { ...baseWhere, courseClass: { lecturerId } },
        include: { courseClass: true },
      });
      if (lecturerConflict)
        throw new BadRequestException(
          `Giảng viên bị trùng lịch với lớp "${lecturerConflict.courseClass.name}" vào ngày ${this.formatDateVi(
            normalizedDate,
          )} (Tiết ${lecturerConflict.startShift}-${lecturerConflict.endShift}).`,
        );
    }

    if (adminClassIds && adminClassIds.length > 0) {
      const adminConflict = await prisma.classSession.findFirst({
        where: {
          ...baseWhere,
          courseClass: {
            adminClasses: { some: { id: { in: adminClassIds } } },
          },
        },
        include: { courseClass: { include: { adminClasses: true } } },
      });
      if (adminConflict) {
        const acCode = adminConflict.courseClass.adminClasses.find((ac) =>
          adminClassIds.includes(ac.id),
        )?.code;
        throw new BadRequestException(
          `Lớp hành chính "${acCode}" bị trùng lịch học môn "${adminConflict.courseClass.name}" vào ngày ${this.formatDateVi(
            normalizedDate,
          )}.`,
        );
      }
    }
  }

  async findAll(filters: {
    subjectId?: string;
    semesterId?: string;
    status?: string;
    facultyId?: string;
    majorId?: string;
    departmentId?: string;
    cohort?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      subjectId,
      semesterId,
      status,
      facultyId,
      majorId,
      departmentId,
      cohort,
      search,
      page = 1,
      limit = 50,
    } = filters;
    const whereArgs: any = {};

    if (subjectId) whereArgs.subjectId = subjectId;
    if (semesterId) whereArgs.semesterId = semesterId;
    if (status) whereArgs.status = status;
    if (majorId) whereArgs.subject = { ...whereArgs.subject, majorId };
    if (departmentId)
      whereArgs.subject = {
        ...whereArgs.subject,
        departmentId,
      };
    if (facultyId)
      whereArgs.subject = {
        ...whereArgs.subject,
        major: { ...whereArgs.subject?.major, facultyId },
      };
    if (cohort) whereArgs.cohort = cohort;

    const normalizedKeyword = this.normalizeSearchableText(search);
    const tokens = normalizedKeyword.split(' ').filter(Boolean);
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const skip = (safePage - 1) * safeLimit;
    const detailInclude: any = {
      lecturer: true,
      subject: {
        include: {
          major: {
            include: {
              faculty: true,
            },
          },
          department: true,
        },
      },
      semester: true,
      adminClasses: {
        select: {
          code: true,
          name: true,
        },
      },
      _count: {
        select: { enrollments: true },
      },
    };

    if (tokens.length === 0) {
      const [total, data] = await Promise.all([
        this.prisma.courseClass.count({ where: whereArgs }),
        this.prisma.courseClass.findMany({
          where: whereArgs,
          skip,
          take: safeLimit,
          orderBy: { code: 'asc' },
          include: detailInclude,
        }),
      ]);

      return {
        data,
        metadata: {
          total,
          page: safePage,
          limit: safeLimit,
          lastPage: Math.max(1, Math.ceil(total / safeLimit)),
        },
      };
    }

    const searchableRows = await this.prisma.courseClass.findMany({
      where: whereArgs,
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        cohort: true,
        status: true,
        lecturer: {
          select: {
            fullName: true,
          },
        },
        subject: {
          select: {
            code: true,
            name: true,
            department: {
              select: {
                code: true,
                name: true,
              },
            },
            major: {
              select: {
                code: true,
                name: true,
                faculty: {
                  select: {
                    code: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        semester: {
          select: {
            code: true,
            name: true,
          },
        },
      },
    });

    const adminClassMap = await this.getCourseClassAdminClassMap(
      searchableRows.map((courseClass) => courseClass.id),
    );

    const matchedIds = searchableRows
      .filter((courseClass) =>
        this.matchesCourseClassSearch(
          {
            ...courseClass,
            adminClasses: adminClassMap.get(courseClass.id) || [],
          },
          tokens,
        ),
      )
      .map((courseClass) => courseClass.id);

    const total = matchedIds.length;
    const pageIds = matchedIds.slice(skip, skip + safeLimit);
    const data =
      pageIds.length === 0
        ? []
        : await this.prisma.courseClass.findMany({
            where: {
              id: { in: pageIds },
            },
            include: detailInclude,
          });
    const dataMap = new Map(data.map((courseClass) => [courseClass.id, courseClass]));
    const orderedData = pageIds
      .map((courseClassId) => dataMap.get(courseClassId))
      .filter(Boolean);

    return {
      data: orderedData,
      metadata: {
        total,
        page: safePage,
        limit: safeLimit,
        lastPage: Math.max(1, Math.ceil(total / safeLimit)),
      },
    };
  }

  private normalizeSearchableText(value?: string | null) {
    return `${value || ''}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private matchesCourseClassSearch(courseClass: any, tokens: string[]) {
    const searchIndex = this.normalizeSearchableText(
      [
        courseClass?.code,
        courseClass?.name,
        courseClass?.cohort,
        courseClass?.status,
        courseClass?.subject?.code,
        courseClass?.subject?.name,
        courseClass?.subject?.department?.code,
        courseClass?.subject?.department?.name,
        courseClass?.subject?.major?.code,
        courseClass?.subject?.major?.name,
        courseClass?.subject?.major?.faculty?.code,
        courseClass?.subject?.major?.faculty?.name,
        courseClass?.lecturer?.fullName,
        courseClass?.semester?.code,
        courseClass?.semester?.name,
        ...(courseClass?.adminClasses || []).flatMap((adminClass: any) => [
          adminClass?.code,
          adminClass?.name,
        ]),
      ].join(' '),
    );

    return tokens.every((token) => searchIndex.includes(token));
  }

  private async getCourseClassAdminClassMap(courseClassIds: string[]) {
    const adminClassMap = new Map<string, Array<{ code: string; name: string }>>();
    const validIds = courseClassIds.filter(Boolean);
    const chunkSize = 400;

    for (let index = 0; index < validIds.length; index += chunkSize) {
      const chunkIds = validIds.slice(index, index + chunkSize);
      const rows = await this.prisma.courseClass.findMany({
        where: {
          id: { in: chunkIds },
        },
        select: {
          id: true,
          adminClasses: {
            select: {
              code: true,
              name: true,
            },
          },
        },
      });

      for (const row of rows) {
        adminClassMap.set(row.id, row.adminClasses || []);
      }
    }

    return adminClassMap;
  }

  async findOne(id: string) {
    return this.prisma.courseClass.findUnique({
      where: { id },
      include: {
        lecturer: true,
        subject: {
          include: {
            major: true,
            department: true,
          },
        },
        semester: true,
        adminClasses: {
          include: {
            major: true,
            _count: { select: { students: true } },
          },
        },
        sessions: { include: { room: true } },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async getFaculties() {
    return this.cache.getOrSet('faculties:all', TTL_30MIN, () =>
      this.prisma.faculty.findMany({ orderBy: { name: 'asc' } }),
    );
  }

  async getCohorts() {
    return this.cache.getOrSet('cohorts:all', TTL_30MIN, () =>
      this.prisma.academicCohort.findMany({
        where: { isActive: true },
        orderBy: { startYear: 'desc' },
      }),
    );
  }

  async getSubjectsByFaculty(
    facultyId?: string,
    majorId?: string,
    semesterId?: string,
  ) {
    // Cache key encodes all filter params
    const cacheKey = `subjects:${facultyId || '*'}:${majorId || '*'}:${semesterId || '*'}`;

    return this.cache.getOrSet(cacheKey, TTL_10MIN, async () => {
      let subjects: any[];
      if (majorId) {
        subjects = await this.prisma.subject.findMany({
          where: { majorId },
          include: { major: { include: { faculty: true } } },
        });
      } else if (facultyId) {
        subjects = await this.prisma.subject.findMany({
          where: { major: { facultyId } },
          include: { major: { include: { faculty: true } } },
        });
      } else {
        subjects = await this.prisma.subject.findMany({
          include: { major: { include: { faculty: true } } },
        });
      }

      if (semesterId) {
        const classCounts = await this.prisma.courseClass.groupBy({
          by: ['subjectId'],
          where: { semesterId },
          _count: { id: true },
        });
        const countMap = new Map(
          classCounts.map((c) => [c.subjectId, c._count.id]),
        );
        return subjects.map((s) => ({
          ...s,
          classCountInSemester: countMap.get(s.id) || 0,
        }));
      }

      return subjects.map((s) => ({ ...s, classCountInSemester: 0 }));
    });
  }

  async getAdminClassesByMajor(majorId?: string) {
    const cacheKey = `adminClasses:major:${majorId || '*'}`;
    return this.cache.getOrSet(cacheKey, TTL_10MIN, () => {
      const where: any = {};
      if (majorId) where.majorId = majorId;
      return this.prisma.adminClass.findMany({
        where,
        include: { _count: { select: { students: true } } },
      });
    });
  }

  async getLecturersByFaculty(facultyId?: string) {
    const cacheKey = `lecturers:${facultyId || '*'}`;
    return this.cache.getOrSet(cacheKey, TTL_10MIN, () => {
      const where: any = {};
      if (facultyId) where.facultyId = facultyId;
      return this.prisma.lecturer.findMany({
        where,
        include: { faculty: true },
        orderBy: { fullName: 'asc' },
      });
    });
  }

  async getLecturerSchedule(
    lecturerId: string,
    semesterId: string,
    excludeId?: string,
  ) {
    const semesterWhere = await this.buildClassSessionSemesterWhere(semesterId);
    return this.prisma.classSession.findMany({
      where: semesterWhere
        ? {
            AND: [
              semesterWhere,
              {
                courseClass: {
                  lecturerId,
                  id: excludeId ? { not: excludeId } : undefined,
                  status: { not: 'CANCELLED' },
                },
              },
            ],
          }
        : {
            courseClass: {
              lecturerId,
              id: excludeId ? { not: excludeId } : undefined,
              status: { not: 'CANCELLED' },
            },
          },
      include: {
        courseClass: {
          include: {
            subject: { include: { major: true, department: true } },
            adminClasses: { include: { major: true } },
            semester: true,
          },
        },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
    });
  }

  async getLecturerSessions(
    lecturerId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.classSession.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
        courseClass: { lecturerId },
      },
      include: {
        courseClass: {
          include: {
            subject: { include: { major: true, department: true } },
            adminClasses: { include: { major: true } },
            semester: true,
          },
        },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
    });
  }

  async getAdminClassesSchedule(
    adminClassIds: string[],
    semesterId: string,
    excludeId?: string,
  ) {
    const semesterWhere = await this.buildClassSessionSemesterWhere(semesterId);
    return this.prisma.classSession.findMany({
      where: semesterWhere
        ? {
            AND: [
              semesterWhere,
              {
                courseClass: {
                  id: excludeId ? { not: excludeId } : undefined,
                  adminClasses: {
                    some: { id: { in: adminClassIds } },
                  },
                },
              },
            ],
          }
        : {
            courseClass: {
              id: excludeId ? { not: excludeId } : undefined,
              adminClasses: {
                some: { id: { in: adminClassIds } },
              },
            },
          },
      include: {
        courseClass: { include: { subject: true, adminClasses: true } },
        room: true,
      },
      orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
    });
  }

  async getMajors(facultyId?: string) {
    const cacheKey = `majors:${facultyId || '*'}`;
    return this.cache.getOrSet(cacheKey, TTL_30MIN, () => {
      const where: any = {};
      if (facultyId) where.facultyId = facultyId;
      return this.prisma.major.findMany({
        where,
        include: { faculty: true },
        orderBy: { name: 'asc' },
      });
    });
  }

  async findByLecturerId(lecturerId: string, semesterId?: string) {
    const semesterWhere = await this.buildCourseClassSemesterWhere(semesterId);
    const where: any = semesterWhere
      ? { AND: [{ lecturerId }, semesterWhere] }
      : { lecturerId };

    return this.prisma.courseClass.findMany({
      where,
      include: {
        lecturer: true,
        subject: {
          include: {
            major: true,
            department: true,
          },
        },
        semester: true,
        adminClasses: {
          include: {
            major: true,
          },
        },
        sessions: {
          include: {
            room: true,
          },
        },
        _count: {
          select: { enrollments: true },
        },
      },
    });
  }

  async create(data: any) {
    const {
      adminClassIds,
      subjectId,
      semesterId,
      lecturerId,
      maxSlots,
      status,
      schedules,
    } = data;

    return this.prisma.$transaction(async (tx) => {
      await this.checkSemesterLock(semesterId, tx);

      const subject = await tx.subject.findUnique({ where: { id: subjectId } });
      const semester = await tx.semester.findUnique({
        where: { id: semesterId },
      });

      if (!subject || !semester) {
        throw new BadRequestException('Học phần hoặc Học kỳ không tồn tại.');
      }

      // Generate formula-based code
      const classCount = await tx.courseClass.count({
        where: { subjectId, semesterId },
      });
      const sequence = String(classCount + 1).padStart(2, '0');
      const yearSuffix =
        String(semester.year).slice(-2) + String(semester.year + 1).slice(-2); // e.g., 2026 -> 2627
      // Semester term mapping: HK1 -> HK1, HK2 -> HK2, HKH -> HKH
      const term = semester.code.includes('HK1')
        ? 'HK1'
        : semester.code.includes('HK2')
          ? 'HK2'
          : 'HKH';

      let adminClassCode = '';
      if (adminClassIds && adminClassIds.length > 0) {
        const ac = await tx.adminClass.findUnique({
          where: { id: adminClassIds[0] },
        });
        adminClassCode = ac?.code || '';
      }

      const generatedCode = `CCLASS_${subject.code}_${term}_${sequence}_${yearSuffix}`;
      const generatedName = adminClassCode
        ? `${subject.name} - ${adminClassCode}`
        : `${subject.name} - Nhóm ${sequence}`;

      await this.checkConflicts(
        null,
        semesterId,
        schedules,
        lecturerId,
        adminClassIds,
        tx,
      );

      const created = await tx.courseClass.create({
        data: {
          code: generatedCode,
          name: generatedName,
          maxSlots: maxSlots ? Number(maxSlots) : 60,
          // The 'schedules' property was removed from CourseClass model.
          // Sessions are generated below using SessionGenerator.
          status: status || 'OPEN',
          subject: { connect: { id: subjectId } },
          semester: { connect: { id: semesterId } },
          lecturer: lecturerId ? { connect: { id: lecturerId } } : undefined,
          adminClasses:
            adminClassIds && adminClassIds.length > 0
              ? {
                  connect: (adminClassIds as string[]).map((id) => ({ id })),
                }
              : undefined,
        },
        include: {
          subject: true,
          semester: true,
          lecturer: true,
          adminClasses: true,
          sessions: { include: { room: true } },
        },
      });

      // 1. Auto-generate discrete sessions
      if (schedules && schedules.length > 0) {
        const sessionsData = SessionGenerator.generateSessionsData(
          created.id,
          semesterId,
          semester.startDate,
          semester.endDate,
          schedules, // schedules here is the method argument representing the weekly slots
        );
        await this.validateSessionBatch(
          semesterId,
          sessionsData,
          lecturerId,
          adminClassIds,
          undefined,
          tx,
        );
        await tx.classSession.createMany({ data: sessionsData });
      }

      // 2. NEW: Auto-enroll all students from connected AdminClasses
      if (adminClassIds && adminClassIds.length > 0) {
        const students = await tx.student.findMany({
          where: { adminClassId: { in: adminClassIds } },
        });

        if (students.length > 0) {
          await tx.enrollment.createMany({
            data: students.map((s) => ({
              studentId: s.id,
              courseClassId: created.id,
              status: 'REGISTERED',
            })),
          });

          // Update current slots count
          await tx.courseClass.update({
            where: { id: created.id },
            data: { currentSlots: students.length },
          });
        }
      }

      // Invalidate cache
      this.cache.invalidatePrefix('subjects:');
      this.cache.invalidatePrefix('adminClasses:');
      return created;
    });
  }

  async getSessions(courseClassId: string) {
    return this.prisma.classSession.findMany({
      where: { courseClassId },
      include: { room: true },
      orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
    });
  }

  async getConflictReport(courseClassId: string) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: {
        subject: true,
        lecturer: true,
        adminClasses: true,
        sessions: {
          where: {
            type: { not: 'EXAM' },
          },
          include: {
            room: true,
          },
          orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
        },
      },
    });

    if (!courseClass) {
      throw new BadRequestException('Lớp học phần không tồn tại.');
    }

    const issues: Array<{
      type: 'SELF' | 'ROOM' | 'LECTURER' | 'ADMIN_CLASS';
      sessionId: string;
      conflictSessionId: string;
      date: Date;
      startShift: number;
      endShift: number;
      roomName?: string | null;
      counterpartClassId: string;
      counterpartClassCode: string;
      counterpartClassName: string;
      counterpartLecturerName?: string | null;
      adminClassCodes: string[];
      message: string;
    }> = [];

    const issueKeys = new Set<string>();

    for (let index = 0; index < courseClass.sessions.length; index += 1) {
      const current = courseClass.sessions[index];

      for (
        let candidateIndex = index + 1;
        candidateIndex < courseClass.sessions.length;
        candidateIndex += 1
      ) {
        const candidate = courseClass.sessions[candidateIndex];

        if (
          current.date.getTime() !== candidate.date.getTime() ||
          !this.hasShiftOverlap(
            current.startShift,
            current.endShift,
            candidate.startShift,
            candidate.endShift,
          )
        ) {
          continue;
        }

        const issueKey = ['SELF', current.id, candidate.id].join('::');
        if (issueKeys.has(issueKey)) continue;
        issueKeys.add(issueKey);

        issues.push({
          type: 'SELF',
          sessionId: current.id,
          conflictSessionId: candidate.id,
          date: current.date,
          startShift: current.startShift,
          endShift: current.endShift,
          roomName: current.room?.name || candidate.room?.name || null,
          counterpartClassId: courseClass.id,
          counterpartClassCode: courseClass.code,
          counterpartClassName: courseClass.name,
          counterpartLecturerName: courseClass.lecturer?.fullName || null,
          adminClassCodes: courseClass.adminClasses.map((adminClass) => adminClass.code),
          message: `Học phần đang có 2 buổi học chồng nhau vào ngày ${this.formatDateVi(
            current.date,
          )}, tiết ${Math.max(
            current.startShift,
            candidate.startShift,
          )}-${Math.min(current.endShift, candidate.endShift)}.`,
        });
      }
    }

    for (const session of courseClass.sessions) {
      const overlappingSessions = await this.prisma.classSession.findMany({
        where: {
          semesterId: courseClass.semesterId,
          courseClassId: { not: courseClass.id },
          type: { not: 'EXAM' },
          date: session.date,
          id: { not: session.id },
          OR: [
            {
              startShift: { lte: session.startShift },
              endShift: { gte: session.startShift },
            },
            {
              startShift: { lte: session.endShift },
              endShift: { gte: session.endShift },
            },
            {
              startShift: { gte: session.startShift },
              endShift: { lte: session.endShift },
            },
          ],
        },
        include: {
          room: true,
          courseClass: {
            include: {
              lecturer: true,
              subject: true,
              adminClasses: true,
            },
          },
        },
      });

      for (const candidate of overlappingSessions) {
        const sharedAdminClasses = candidate.courseClass.adminClasses.filter(
          (ac) =>
            courseClass.adminClasses.some(
              (currentAc) => currentAc.id === ac.id,
            ),
        );

        const checks = [
          {
            active:
              !!session.roomId &&
              !!candidate.roomId &&
              session.roomId === candidate.roomId,
            type: 'ROOM' as const,
            message: `Trùng phòng ${session.room?.name || candidate.room?.name || 'chưa gán'} với lớp "${candidate.courseClass.name}" vào ngày ${session.date.toLocaleDateString('vi-VN')}, tiết ${session.startShift}-${session.endShift}.`,
          },
          {
            active:
              !!courseClass.lecturerId &&
              !!candidate.courseClass.lecturerId &&
              courseClass.lecturerId === candidate.courseClass.lecturerId,
            type: 'LECTURER' as const,
            message: `Giảng viên ${courseClass.lecturer?.fullName || candidate.courseClass.lecturer?.fullName || 'đang phụ trách'} bị trùng lịch với lớp "${candidate.courseClass.name}" vào ngày ${session.date.toLocaleDateString('vi-VN')}, tiết ${session.startShift}-${session.endShift}.`,
          },
          {
            active: sharedAdminClasses.length > 0,
            type: 'ADMIN_CLASS' as const,
            message: `Lớp hành chính ${sharedAdminClasses.map((ac) => ac.code).join(', ')} bị trùng lịch với lớp "${candidate.courseClass.name}" vào ngày ${session.date.toLocaleDateString('vi-VN')}, tiết ${session.startShift}-${session.endShift}.`,
          },
        ];

        for (const check of checks) {
          if (!check.active) continue;

          const issueKey = [
            check.type,
            session.id,
            candidate.id,
            candidate.courseClassId,
          ].join('::');

          if (issueKeys.has(issueKey)) continue;
          issueKeys.add(issueKey);

          issues.push({
            type: check.type,
            sessionId: session.id,
            conflictSessionId: candidate.id,
            date: session.date,
            startShift: session.startShift,
            endShift: session.endShift,
            roomName: session.room?.name || candidate.room?.name || null,
            counterpartClassId: candidate.courseClassId,
            counterpartClassCode: candidate.courseClass.code,
            counterpartClassName: candidate.courseClass.name,
            counterpartLecturerName: candidate.courseClass.lecturer?.fullName,
            adminClassCodes: sharedAdminClasses.map((ac) => ac.code),
            message: check.message,
          });
        }
      }
    }

    return {
      courseClassId: courseClass.id,
      totalSessions: courseClass.sessions.length,
      summary: {
        self: issues.filter((issue) => issue.type === 'SELF').length,
        room: issues.filter((issue) => issue.type === 'ROOM').length,
        lecturer: issues.filter((issue) => issue.type === 'LECTURER').length,
        adminClass: issues.filter((issue) => issue.type === 'ADMIN_CLASS')
          .length,
      },
      issues,
    };
  }

  async rescheduleSession(
    sessionId: string,
    data: {
      date: any;
      roomId?: string;
      startShift: number;
      endShift: number;
      note?: string;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const session = await tx.classSession.findUnique({
        where: { id: sessionId },
        include: { courseClass: true },
      });
      if (!session) throw new BadRequestException('Không tìm thấy buổi học.');

      await this.checkSemesterLock(session.semesterId, tx);

      const nextDate = this.validateDiscreteSessionInput(
        data.date ?? session.date,
        data.startShift ?? session.startShift,
        data.endShift ?? session.endShift,
      );
      const nextStartShift = Number(data.startShift ?? session.startShift);
      const nextEndShift = Number(data.endShift ?? session.endShift);
      const nextRoomId =
        data.roomId !== undefined
          ? data.roomId || null
          : session.roomId || null;

      // Comprehensive discrete conflict check
      const cc = await tx.courseClass.findUnique({
        where: { id: session.courseClassId },
        include: { adminClasses: true },
      });

      await this.checkDiscreteConflict(
        session.semesterId,
        nextDate,
        nextStartShift,
        nextEndShift,
        nextRoomId || undefined,
        cc?.lecturerId,
        cc?.adminClasses.map((a) => a.id),
        sessionId,
        undefined,
        tx,
      );

      return tx.classSession.update({
        where: { id: sessionId },
        data: {
          date: nextDate,
          roomId: nextRoomId,
          startShift: nextStartShift,
          endShift: nextEndShift,
          note: data.note !== undefined ? data.note : session.note,
        },
      });
    });
  }

  async addManualSession(
    courseClassId: string,
    data: {
      date: any;
      roomId?: string;
      startShift: number;
      endShift: number;
      type: string;
      note?: string;
    },
  ) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: { adminClasses: true },
    });
    if (!courseClass)
      throw new BadRequestException('Lớp học phần không tồn tại.');

    await this.checkSemesterLock(courseClass.semesterId);

    const parsedDate = this.validateDiscreteSessionInput(
      data.date,
      data.startShift,
      data.endShift,
    );

    await this.checkDiscreteConflict(
      courseClass.semesterId,
      parsedDate,
      data.startShift,
      data.endShift,
      data.roomId || undefined,
      courseClass.lecturerId || undefined,
      courseClass.adminClasses.map((a) => a.id),
    );

    return this.prisma.classSession.create({
      data: {
        courseClassId,
        semesterId: courseClass.semesterId,
        date: parsedDate,
        roomId: data.roomId || null,
        startShift: data.startShift,
        endShift: data.endShift,
        type: data.type,
        note: data.note,
      },
    });
  }

  async deleteSession(sessionId: string) {
    const session = await this.prisma.classSession.findUnique({
      where: { id: sessionId },
    });
    if (session) {
      await this.checkSemesterLock(session.semesterId);
    }
    return this.prisma.classSession.delete({
      where: { id: sessionId },
    });
  }

  async generateSessionsInRange(
    courseClassId: string,
    data: {
      startDate: Date;
      endDate: Date;
      schedules: any[];
      clearExisting: boolean;
    },
  ) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: { adminClasses: true },
    });
    if (!courseClass)
      throw new BadRequestException('Lớp học phần không tồn tại.');

    await this.checkSemesterLock(courseClass.semesterId);

    const sessionsData = SessionGenerator.generateSessionsData(
      courseClassId,
      courseClass.semesterId,
      data.startDate,
      data.endDate,
      data.schedules,
    );

    return this.prisma.$transaction(async (tx) => {
      await this.validateSessionBatch(
        courseClass.semesterId,
        sessionsData,
        courseClass.lecturerId || undefined,
        courseClass.adminClasses.map((adminClass) => adminClass.id),
        courseClassId,
        tx,
      );

      if (data.clearExisting) {
        await tx.classSession.deleteMany({
          where: {
            courseClassId,
            date: { gte: data.startDate, lte: data.endDate },
          },
        });
      }
      return tx.classSession.createMany({ data: sessionsData });
    });
  }

  private buildSessionsFromSelectedDates(
    courseClassId: string,
    semesterId: string,
    selectedSessions: any[] = [],
  ) {
    return selectedSessions.map((session, index) => ({
      courseClassId,
      semesterId,
      roomId: session?.roomId || null,
      date: this.toDateOnly(session?.date),
      startShift: Number(session?.startShift),
      endShift: Number(session?.endShift),
      type: `${session?.type || 'LECTURE'}`.trim().toUpperCase(),
      note:
        `${session?.note || ''}`.trim() ||
        `Lịch chọn ngày #${String(index + 1).padStart(2, '0')}`,
    }));
  }

  async cleanupConflictingSessions(courseClassId: string) {
    return this.prisma.$transaction(async (tx) => {
      const courseClass = await tx.courseClass.findUnique({
        where: { id: courseClassId },
        include: {
          lecturer: true,
          adminClasses: true,
          sessions: {
            where: {
              type: { not: 'EXAM' },
            },
            include: {
              room: true,
            },
            orderBy: [
              { date: 'asc' },
              { startShift: 'asc' },
              { endShift: 'asc' },
              { id: 'asc' },
            ],
          },
        },
      });

      if (!courseClass) {
        throw new BadRequestException('Lớp học phần không tồn tại.');
      }

      await this.checkSemesterLock(courseClass.semesterId, tx);

      const deleteIds = new Set<string>();
      const deletedSessions: Array<{
        sessionId: string;
        date: Date;
        startShift: number;
        endShift: number;
        roomName?: string | null;
        reason: string;
      }> = [];

      const pushDeletedSession = (session: any, reason: string) => {
        if (deleteIds.has(session.id)) return;
        deleteIds.add(session.id);
        deletedSessions.push({
          sessionId: session.id,
          date: session.date,
          startShift: session.startShift,
          endShift: session.endShift,
          roomName: session.room?.name || null,
          reason,
        });
      };

      for (let index = 0; index < courseClass.sessions.length; index += 1) {
        const current = courseClass.sessions[index];
        if (deleteIds.has(current.id)) continue;

        for (
          let candidateIndex = index + 1;
          candidateIndex < courseClass.sessions.length;
          candidateIndex += 1
        ) {
          const candidate = courseClass.sessions[candidateIndex];
          if (
            current.date.getTime() !== candidate.date.getTime() ||
            !this.hasShiftOverlap(
              current.startShift,
              current.endShift,
              candidate.startShift,
              candidate.endShift,
            )
          ) {
            continue;
          }

          pushDeletedSession(
            candidate,
            `Trùng với một buổi khác của chính học phần vào ngày ${this.formatDateVi(
              candidate.date,
            )}, tiết ${candidate.startShift}-${candidate.endShift}.`,
          );
        }
      }

      for (const session of courseClass.sessions) {
        if (deleteIds.has(session.id)) continue;

        const overlappingSessions = await tx.classSession.findMany({
          where: {
            semesterId: courseClass.semesterId,
            courseClassId: { not: courseClass.id },
            type: { not: 'EXAM' },
            date: session.date,
            OR: this.buildShiftOverlapWhere(
              session.startShift,
              session.endShift,
            ),
          },
          include: {
            room: true,
            courseClass: {
              include: {
                lecturer: true,
                adminClasses: true,
              },
            },
          },
          orderBy: [
            { startShift: 'asc' },
            { endShift: 'asc' },
            { id: 'asc' },
          ],
        });

        for (const candidate of overlappingSessions) {
          if (
            session.roomId &&
            candidate.roomId &&
            session.roomId === candidate.roomId
          ) {
            pushDeletedSession(
              session,
              `Trùng phòng ${session.room?.name || candidate.room?.name || 'N/A'} với lớp "${candidate.courseClass?.name || candidate.courseClass?.code}" vào ngày ${this.formatDateVi(
                session.date,
              )}, tiết ${session.startShift}-${session.endShift}.`,
            );
            break;
          }

          if (
            courseClass.lecturerId &&
            candidate.courseClass?.lecturerId &&
            courseClass.lecturerId === candidate.courseClass.lecturerId
          ) {
            pushDeletedSession(
              session,
              `Trùng lịch giảng viên với lớp "${candidate.courseClass?.name || candidate.courseClass?.code}" vào ngày ${this.formatDateVi(
                session.date,
              )}, tiết ${session.startShift}-${session.endShift}.`,
            );
            break;
          }

          const sharedAdminClass = candidate.courseClass?.adminClasses?.find(
            (adminClass: any) =>
              courseClass.adminClasses.some(
                (currentAdminClass) => currentAdminClass.id === adminClass.id,
              ),
          );
          if (sharedAdminClass) {
            pushDeletedSession(
              session,
              `Trùng lịch lớp hành chính ${sharedAdminClass.code} với lớp "${candidate.courseClass?.name || candidate.courseClass?.code}" vào ngày ${this.formatDateVi(
                session.date,
              )}, tiết ${session.startShift}-${session.endShift}.`,
            );
            break;
          }
        }
      }

      if (deleteIds.size > 0) {
        await tx.classSession.deleteMany({
          where: {
            id: { in: [...deleteIds] },
          },
        });
      }

      const remainingSessions = await tx.classSession.findMany({
        where: {
          courseClassId,
          type: { not: 'EXAM' },
        },
        include: { room: true },
        orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
      });

      return {
        courseClassId,
        deletedCount: deleteIds.size,
        deletedSessions,
        remainingSessions,
      };
    });
  }

  async replanSchedule(
    courseClassId: string,
    data: {
      mode: 'WEEKLY' | 'SELECTED_DATES';
      startDate?: Date | string;
      endDate?: Date | string;
      schedules?: any[];
      selectedSessions?: any[];
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const courseClass = await tx.courseClass.findUnique({
        where: { id: courseClassId },
        include: {
          semester: true,
          adminClasses: true,
        },
      });

      if (!courseClass) {
        throw new BadRequestException('Lớp học phần không tồn tại.');
      }

      await this.checkSemesterLock(courseClass.semesterId, tx);

      const mode = `${data?.mode || 'WEEKLY'}`.trim().toUpperCase();
      let sessionsData: any[] = [];

      if (mode === 'SELECTED_DATES') {
        const selectedSessions = Array.isArray(data?.selectedSessions)
          ? data.selectedSessions
          : [];
        if (selectedSessions.length === 0) {
          throw new BadRequestException(
            'Vui lòng chọn ít nhất một ngày học để xếp lại lịch.',
          );
        }

        sessionsData = this.buildSessionsFromSelectedDates(
          courseClassId,
          courseClass.semesterId,
          selectedSessions,
        );
      } else {
        const startDate = data?.startDate
          ? this.toDateOnly(data.startDate)
          : this.toDateOnly(courseClass.semester.startDate);
        const endDate = data?.endDate
          ? this.toDateOnly(data.endDate)
          : this.toDateOnly(courseClass.semester.endDate);

        if (startDate.getTime() > endDate.getTime()) {
          throw new BadRequestException(
            'Khoảng thời gian lặp lại theo tuần không hợp lệ.',
          );
        }

        const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
        if (schedules.length === 0) {
          throw new BadRequestException(
            'Vui lòng khai báo ít nhất một mẫu lịch lặp theo tuần.',
          );
        }

        const normalizedSchedules = schedules.map((schedule, index) => {
          const normalized = this.normalizeRecurringSchedule(schedule, index);
          return {
            ...normalized,
            type: `${schedule?.type || 'LECTURE'}`.trim().toUpperCase(),
            note: `${schedule?.note || ''}`.trim() || null,
          };
        });

        sessionsData = SessionGenerator.generateSessionsData(
          courseClassId,
          courseClass.semesterId,
          startDate,
          endDate,
          normalizedSchedules,
        );
      }

      await this.validateSessionBatch(
        courseClass.semesterId,
        sessionsData,
        courseClass.lecturerId || undefined,
        courseClass.adminClasses.map((adminClass) => adminClass.id),
        courseClassId,
        tx,
      );

      await tx.classSession.deleteMany({
        where: {
          courseClassId,
          type: { not: 'EXAM' },
        },
      });

      await tx.classSession.createMany({
        data: sessionsData,
      });

      const sessions = await tx.classSession.findMany({
        where: {
          courseClassId,
          type: { not: 'EXAM' },
        },
        include: { room: true },
        orderBy: [{ date: 'asc' }, { startShift: 'asc' }],
      });

      return {
        courseClassId,
        mode,
        createdCount: sessions.length,
        sessions,
      };
    });
  }

  async createBulk(items: any[]) {
    if (!items || items.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of items) {
        const {
          adminClassIds,
          subjectId,
          semesterId,
          lecturerId,
          code,
          name,
          maxSlots,
          status,
          schedules,
        } = item;

        await this.checkSemesterLock(semesterId, tx);
        await this.checkConflicts(
          null,
          semesterId,
          schedules,
          lecturerId,
          adminClassIds,
          tx,
        );

        const created = await tx.courseClass.create({
          data: {
            code,
            name: name || `Lớp ${code}`,
            maxSlots: maxSlots ? Number(maxSlots) : 60,
            status: status || 'OPEN',
            subject: { connect: { id: subjectId } },
            semester: { connect: { id: semesterId } },
            lecturer: lecturerId ? { connect: { id: lecturerId } } : undefined,
            adminClasses: adminClassIds
              ? {
                  connect: (adminClassIds as string[]).map((id) => ({ id })),
                }
              : undefined,
          },
        });
        results.push(created);
      }
      // Invalidate cache
      this.cache.invalidatePrefix('subjects:');
      this.cache.invalidatePrefix('adminClasses:');
      return results;
    });
  }

  async bulkImportByCode(data: { items: any[]; semesterId: string }) {
    const { items, semesterId } = data;

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const item of items) {
        const {
          subjectCode,
          lecturerCode,
          adminClassCodes,
          maxSlots,
          schedules,
        } = item;

        const subject = await tx.subject.findUnique({
          where: { code: subjectCode },
        });
        const lecturer = lecturerCode
          ? await tx.lecturer.findUnique({
              where: { lectureCode: lecturerCode },
            })
          : null;
        const adminClasses = adminClassCodes
          ? await tx.adminClass.findMany({
              where: { code: { in: adminClassCodes } },
            })
          : [];

        // Resolve rooms by name if possible
        const enrichedSchedules = await Promise.all(
          schedules.map(async (s: any) => {
            if (s.roomName) {
              const room = await tx.room.findUnique({
                where: { name: s.roomName },
              });
              return { ...s, roomId: room?.id || null };
            }
            return s;
          }),
        );

        const created = await this.create({
          subjectId: subject?.id,
          semesterId,
          lecturerId: lecturer?.id,
          adminClassIds: adminClasses.map((ac) => ac.id),
          maxSlots,
          schedules: enrichedSchedules,
        });
        results.push(created);
      }
      return { count: results.length };
    });
  }

  async update(id: string, data: any) {
    const {
      adminClassIds,
      subjectId,
      semesterId,
      lecturerId,
      code,
      name,
      maxSlots,
      status,
      schedules,
    } = data;

    return this.prisma.$transaction(async (tx) => {
      try {
        const existing = await tx.courseClass.findUnique({
          where: { id },
          include: {
            adminClasses: true,
            sessions: true,
          },
        });

        let targetSemesterId = semesterId;
        if (!targetSemesterId) {
          targetSemesterId = existing?.semesterId;
        }

        if (!existing || !targetSemesterId) {
          throw new BadRequestException('Lớp học phần không tồn tại.');
        }

        await this.checkSemesterLock(targetSemesterId, tx);

        const effectiveLecturerId =
          lecturerId === undefined ? existing.lecturerId : lecturerId;
        const effectiveAdminClassIds =
          adminClassIds === undefined
            ? existing.adminClasses.map((adminClass) => adminClass.id)
            : adminClassIds;

        // Conflict check if schedules provided
        if (schedules && schedules.length > 0) {
          await this.checkConflicts(
            id,
            targetSemesterId,
            schedules,
            effectiveLecturerId || undefined,
            effectiveAdminClassIds,
            tx,
          );
        } else if (
          (lecturerId !== undefined || adminClassIds !== undefined) &&
          existing.sessions.length > 0
        ) {
          for (const session of existing.sessions) {
            await this.checkDiscreteConflict(
              targetSemesterId,
              session.date,
              session.startShift,
              session.endShift,
              undefined,
              effectiveLecturerId || undefined,
              effectiveAdminClassIds,
              undefined,
              id,
              tx,
            );
          }
        }

        const updated: any = await tx.courseClass.update({
          where: { id },
          data: {
            maxSlots: maxSlots ? Number(maxSlots) : undefined,
            status: status,
            lecturer: lecturerId
              ? { connect: { id: lecturerId } }
              : lecturerId === null
                ? { disconnect: true }
                : undefined,
            adminClasses: adminClassIds
              ? {
                  set: (adminClassIds as string[]).map((id) => ({ id })),
                }
              : undefined,
          },
          include: {
            subject: true,
            semester: true,
            lecturer: true,
            adminClasses: true,
            sessions: { include: { room: true } },
          },
        });

        if (schedules && schedules.length > 0) {
          await tx.classSession.deleteMany({ where: { courseClassId: id } });
          const sessionsData = SessionGenerator.generateSessionsData(
            id,
            updated.semesterId,
            updated.semester.startDate,
            updated.semester.endDate,
            schedules,
          );
          await this.validateSessionBatch(
            updated.semesterId,
            sessionsData,
            updated.lecturerId || undefined,
            updated.adminClasses.map((adminClass: any) => adminClass.id),
            id,
            tx,
          );
          await tx.classSession.createMany({ data: sessionsData });
        }

        // Invalidate cache
        this.cache.invalidatePrefix('subjects:');
        this.cache.invalidatePrefix('adminClasses:');
        this.cache.invalidatePrefix('lecturers:');
        return updated;
      } catch (error) {
        console.error('CourseClassService.update error:', error);
        throw error;
      }
    });
  }

  async pushStudentsFromAdminClasses(courseClassId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Get Course Class details with Subject, Associated Admin Classes, and its Sessions
      const courseClass = await tx.courseClass.findUnique({
        where: { id: courseClassId },
        include: {
          subject: true,
          sessions: true,
          adminClasses: {
            include: {
              students: {
                where: { status: 'STUDYING' },
              },
            },
          },
          _count: {
            select: { enrollments: true },
          },
        },
      });

      if (!courseClass) {
        throw new BadRequestException('Lớp học phần không tồn tại');
      }

      await this.checkSemesterLock(courseClass.semesterId, tx);

      // 2. Identify all potential students from nominal classes
      const allNominalStudents = courseClass.adminClasses.flatMap(
        (ac) => ac.students,
      );
      const totalNominalCount = allNominalStudents.length;
      const studentIds = allNominalStudents.map((s) => s.id);

      // 3. Filter out those who are already enrolled in this subject in this semester
      const existingEnrollments = await tx.enrollment.findMany({
        where: {
          studentId: { in: studentIds },
          courseClass: {
            subjectId: courseClass.subjectId,
            semesterId: courseClass.semesterId,
          },
        },
      });

      const existingStudentIds = new Set(
        existingEnrollments.map((e) => e.studentId),
      );
      const potentialStudentIds = studentIds.filter(
        (id) => !existingStudentIds.has(id),
      );

      if (potentialStudentIds.length === 0) {
        return {
          message: `Lớp danh nghĩa có ${totalNominalCount} SV. Toàn bộ đã chuyển lớp hoặc đã ghi danh vào môn học này.`,
          stats: {
            totalNominal: totalNominalCount,
            alreadyEnrolled: existingStudentIds.size,
            addedCount: 0,
            conflictedCount: 0,
          },
        };
      }

      // 4. PERFORM SCHEDULE CONFLICT CHECK
      // Fetch all sessions of other classes these students are currently in
      const otherSessions = await tx.enrollment.findMany({
        where: {
          studentId: { in: potentialStudentIds },
          courseClass: {
            semesterId: courseClass.semesterId,
            id: { not: courseClassId },
          },
        },
        select: {
          studentId: true,
          courseClass: {
            select: {
              sessions: true,
            },
          },
        },
      });

      const studentSchedulesMap: Record<string, any[]> = {};
      (otherSessions as any[]).forEach((os) => {
        if (!studentSchedulesMap[os.studentId])
          studentSchedulesMap[os.studentId] = [];
        studentSchedulesMap[os.studentId].push(
          ...(os.courseClass.sessions || []),
        );
      });

      const finalStudentIds = [];
      let conflictedCount = 0;

      for (const studentId of potentialStudentIds) {
        const existingSchedules = studentSchedulesMap[studentId] || [];
        // We use checkConflictInternal but we need to map the objects correctly
        const courseClassSchedules = (courseClass as any).sessions.map(
          (s: any) => ({
            dayOfWeek: new Date(s.date).getDay() + 1, // Map to UNETI style
            startShift: s.startShift,
            endShift: s.endShift,
          }),
        );
        const otherClassSchedules = existingSchedules.map((s: any) => ({
          dayOfWeek: new Date(s.date).getDay() + 1,
          startShift: s.startShift,
          endShift: s.endShift,
        }));

        const isConflicted = this.checkConflictInternal(
          courseClassSchedules,
          otherClassSchedules,
        );

        if (isConflicted) {
          conflictedCount++;
        } else {
          finalStudentIds.push(studentId);
        }
      }

      if (finalStudentIds.length === 0) {
        return {
          message: `Đã xử lý lớp danh nghĩa. Không có sinh viên nào được thêm mới (Do trùng lịch: ${conflictedCount}, Đã đăng ký: ${existingStudentIds.size}).`,
          stats: {
            totalNominal: totalNominalCount,
            alreadyEnrolled: existingStudentIds.size,
            addedCount: 0,
            conflictedCount,
          },
        };
      }

      // 5. Expand Slots if needed
      const currentEnrolledSize = courseClass._count.enrollments;
      let updatedMaxSlots = courseClass.maxSlots;
      if (currentEnrolledSize + finalStudentIds.length > courseClass.maxSlots) {
        updatedMaxSlots = currentEnrolledSize + finalStudentIds.length;
      }

      // 6. Create Enrollments with Tuition Fee
      const creditPrice = 500000;
      const tuitionFee = (courseClass.subject.credits || 0) * creditPrice;

      await tx.enrollment.createMany({
        data: finalStudentIds.map((studentId) => ({
          studentId,
          courseClassId: courseClassId,
          status: 'REGISTERED',
          isRetake: false,
          tuitionFee: tuitionFee,
        })),
      });

      // 7. Update currentSlots and potentially maxSlots
      await tx.courseClass.update({
        where: { id: courseClassId },
        data: {
          currentSlots: currentEnrolledSize + finalStudentIds.length,
          maxSlots: updatedMaxSlots,
        },
      });

      // 8. PERSIST TUITION FEES (Reactive Updates)
      for (const studentId of finalStudentIds) {
        await this.syncTuitionInternal(studentId, courseClass.semesterId, tx);
      }

      // Invalidate cache
      this.cache.invalidatePrefix('subjects:');

      return {
        message: `Đã đẩy thành công ${finalStudentIds.length} sinh viên. (Bỏ qua ${conflictedCount} SV do trùng lịch).`,
        stats: {
          totalNominal: totalNominalCount,
          alreadyEnrolled: existingStudentIds.size,
          addedCount: finalStudentIds.length,
          conflictedCount,
        },
      };
    });
  }

  // Helper to check conflict without throwing
  private checkConflictInternal(newSchedules: any[], existingSchedules: any[]) {
    for (const ns of newSchedules) {
      for (const es of existingSchedules) {
        if (Number(ns.dayOfWeek) === Number(es.dayOfWeek)) {
          const hasOverlap =
            Math.max(Number(ns.startShift), Number(es.startShift)) <=
            Math.min(Number(ns.endShift), Number(es.endShift));
          if (hasOverlap) return true;
        }
      }
    }
    return false;
  }

  private async syncTuitionInternal(
    studentId: string,
    semesterId: string,
    tx: any,
  ) {
    const enrollments = await tx.enrollment.findMany({
      where: { studentId, courseClass: { semesterId } },
      include: { courseClass: { include: { subject: true } } },
    });

    const totalTuition = enrollments.reduce(
      (sum, enr) => sum + Number(enr.tuitionFee),
      0,
    );
    const paidTuition = enrollments
      .filter((e) => e.status === 'PAID')
      .reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);

    const semester = await tx.semester.findUnique({
      where: { id: semesterId },
    });
    const feeName = `Học phí ${semester?.name || semesterId}`;

    const tuitionFeeId = this.buildTuitionFeeId(studentId, semesterId);
    const feePayload = {
      totalAmount: totalTuition,
      finalAmount: totalTuition,
      paidAmount: paidTuition,
      status:
        paidTuition >= totalTuition
          ? 'PAID'
          : paidTuition > 0
            ? 'PARTIAL'
            : 'DEBT',
    };

    const existingFee = await tx.studentFee.findFirst({
      where: {
        OR: [
          { id: tuitionFeeId },
          { studentId, semesterId, feeType: 'TUITION' },
        ],
      },
    });

    if (existingFee) {
      await tx.studentFee.update({
        where: { id: existingFee.id },
        data: {
          id: tuitionFeeId,
          name: feeName,
          feeType: 'TUITION',
          isMandatory: true,
          discountAmount: 0,
          ...feePayload,
        },
      });
      return;
    }

    await tx.studentFee.create({
      data: {
        id: tuitionFeeId,
        studentId,
        semesterId,
        feeType: 'TUITION',
        name: feeName,
        discountAmount: 0,
        isMandatory: true,
        ...feePayload,
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.courseClass.findUnique({
      where: { id },
      select: { semesterId: true },
    });
    if (existing) {
      await this.checkSemesterLock(existing.semesterId);
    }

    const deleted = await this.prisma.courseClass.delete({
      where: { id },
    });

    // Invalidate cache
    this.cache.invalidatePrefix('subjects:');
    this.cache.invalidatePrefix('adminClasses:');
    return deleted;
  }

  private normalizeExamCohort(cohort?: string | null) {
    return `${cohort || ''}`.trim().toUpperCase();
  }

  private resolveGradeCohort(grade: any) {
    return this.normalizeExamCohort(
      grade?.student?.adminClass?.cohort ||
        grade?.student?.intake ||
        grade?.courseClass?.cohort,
    );
  }

  private resolveExamPreferredRoomTypes(examType?: string | null) {
    switch (`${examType || ''}`.trim().toUpperCase()) {
      case 'THUC_HANH':
        return ['PRACTICE'];
      case 'BAO_VE':
        return ['EXAM_HALL', 'THEORY'];
      case 'THE_CHAT':
      case 'THUC_HANH_THE_CHAT':
        return ['SPORTS', 'EXAM_HALL', 'THEORY'];
      case 'TU_LUAN':
      case 'TRAC_NGHIEM':
      default:
        return ['THEORY', 'EXAM_HALL'];
    }
  }

  private getExamShiftOptions() {
    return [
      { startShift: 1, endShift: 3, label: 'Ca 1 • Tiết 1-3' },
      { startShift: 4, endShift: 6, label: 'Ca 2 • Tiết 4-6' },
      { startShift: 7, endShift: 9, label: 'Ca 3 • Tiết 7-9' },
      { startShift: 10, endShift: 12, label: 'Ca 4 • Tiết 10-12' },
    ];
  }

  private getRoomAssignmentCapacity(
    room: any,
    studentsPerRoom?: number | null,
  ) {
    const physicalCapacity = Math.max(Number(room?.capacity) || 0, 0);
    const examCapacity = Math.max(Number(room?.examCapacity) || 0, 0);

    // Prefer examCapacity if defined (>0), otherwise fallback to physical capacity
    const effectiveCapacity =
      examCapacity > 0 ? examCapacity : physicalCapacity;

    const manualCapacity = Math.max(Number(studentsPerRoom) || 0, 0);
    return manualCapacity > 0
      ? Math.min(effectiveCapacity, manualCapacity)
      : effectiveCapacity;
  }

  private applyRoomAssignmentCap(
    rooms: any[] = [],
    studentsPerRoom?: number | null,
  ) {
    return rooms
      .map((room) => ({
        ...room,
        assignmentCapacity: this.getRoomAssignmentCapacity(
          room,
          studentsPerRoom,
        ),
      }))
      .filter((room) => room.assignmentCapacity > 0);
  }

  private sumRoomAssignmentCapacity(rooms: any[] = []) {
    return rooms.reduce(
      (total, room) =>
        total +
        Math.max(Number(room.assignmentCapacity ?? room.capacity) || 0, 0),
      0,
    );
  }

  private toPortalDayOfWeek(value: Date | string) {
    const day = this.toDateOnly(value).getUTCDay();
    return day === 0 ? 8 : day + 1;
  }

  private formatDayLabel(dayOfWeek: number) {
    return dayOfWeek === 8 ? 'Chủ nhật' : `Thứ ${dayOfWeek}`;
  }

  private formatDateVi(value: Date | string) {
    return this.toDateOnly(value).toLocaleDateString('vi-VN');
  }

  private hasShiftOverlap(
    startShiftA: number,
    endShiftA: number,
    startShiftB: number,
    endShiftB: number,
  ) {
    return startShiftA <= endShiftB && startShiftB <= endShiftA;
  }

  private validateShiftRange(startShift: number, endShift: number) {
    const start = Number(startShift);
    const end = Number(endShift);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 1 ||
      end < 1 ||
      start > 16 ||
      end > 16
    ) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Tiết học phải nằm trong khoảng 1-16.',
      );
    }

    if (start > end) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Tiết bắt đầu không được lớn hơn tiết kết thúc.',
      );
    }

    if (start <= 6 && end >= 7) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Không được xếp lịch vắt ngang ca Sáng và Chiều (giữa tiết 6 và 7).',
      );
    }

    if (start <= 12 && end >= 13) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Không được xếp lịch vắt ngang ca Chiều và Tối (giữa tiết 12 và 13).',
      );
    }

    return { start, end };
  }

  private normalizeRecurringSchedule(schedule: any, index: number) {
    const dayOfWeek = Number(schedule?.dayOfWeek);
    if (!Number.isFinite(dayOfWeek)) {
      throw new BadRequestException(
        `Lịch học không hợp lệ: Thiếu thứ học ở dòng ${index + 1}.`,
      );
    }

    if (dayOfWeek === 8) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Không xếp lịch vào Chủ nhật.',
      );
    }

    if (dayOfWeek < 2 || dayOfWeek > 7) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Thứ học phải nằm trong khoảng Thứ 2 đến Thứ 7.',
      );
    }

    const { start, end } = this.validateShiftRange(
      schedule?.startShift,
      schedule?.endShift,
    );

    return {
      dayOfWeek,
      startShift: start,
      endShift: end,
      roomId: schedule?.roomId || null,
    };
  }

  private validateDiscreteSessionInput(
    date: Date | string,
    startShift: number,
    endShift: number,
  ) {
    const normalizedDate = this.toDateOnly(date);
    if (Number.isNaN(normalizedDate.getTime())) {
      throw new BadRequestException('Ngày học không hợp lệ.');
    }

    if (this.toPortalDayOfWeek(normalizedDate) === 8) {
      throw new BadRequestException(
        'Lịch học không hợp lệ: Không xếp lịch vào Chủ nhật.',
      );
    }

    this.validateShiftRange(startShift, endShift);
    return normalizedDate;
  }

  private async validateSessionBatch(
    semesterId: string,
    sessions: Array<{
      date: Date | string;
      startShift: number;
      endShift: number;
      roomId?: string | null;
    }>,
    lecturerId?: string | null,
    adminClassIds: string[] = [],
    excludeCourseClassId?: string,
    tx?: any,
  ) {
    const normalizedSessions = sessions.map((session) => ({
      date: this.validateDiscreteSessionInput(
        session.date,
        session.startShift,
        session.endShift,
      ),
      startShift: Number(session.startShift),
      endShift: Number(session.endShift),
      roomId: session.roomId || null,
    }));

    for (let index = 0; index < normalizedSessions.length; index += 1) {
      const current = normalizedSessions[index];

      for (
        let candidateIndex = index + 1;
        candidateIndex < normalizedSessions.length;
        candidateIndex += 1
      ) {
        const candidate = normalizedSessions[candidateIndex];
        if (
          current.date.getTime() !== candidate.date.getTime() ||
          !this.hasShiftOverlap(
            current.startShift,
            current.endShift,
            candidate.startShift,
            candidate.endShift,
          )
        ) {
          continue;
        }

        throw new BadRequestException(
          `Lịch học không hợp lệ: Lớp đang có 2 buổi trùng nhau vào ngày ${this.formatDateVi(
            current.date,
          )}, tiết ${Math.max(
            current.startShift,
            candidate.startShift,
          )}-${Math.min(current.endShift, candidate.endShift)}.`,
        );
      }

      await this.checkDiscreteConflict(
        semesterId,
        current.date,
        current.startShift,
        current.endShift,
        current.roomId || undefined,
        lecturerId || undefined,
        adminClassIds,
        undefined,
        excludeCourseClassId,
        tx,
      );
    }
  }

  private buildShiftOverlapWhere(startShift: number, endShift: number) {
    return [
      {
        startShift: { lte: startShift },
        endShift: { gte: startShift },
      },
      {
        startShift: { lte: endShift },
        endShift: { gte: endShift },
      },
      {
        startShift: { gte: startShift },
        endShift: { lte: endShift },
      },
    ];
  }

  private toDateOnly(value: Date | string) {
    const date = new Date(value);
    return new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
  }

  private chooseOptimalRoomCombination(rooms: any[], requiredSeats: number) {
    if (requiredSeats <= 0) return [];

    const normalizedRooms = rooms
      .map((room, index) => ({
        ...room,
        capacity: Math.max(Number(room.capacity) || 0, 0),
        assignmentCapacity: Math.max(
          Number(room.assignmentCapacity ?? room.capacity) || 0,
          0,
        ),
        __index: index,
      }))
      .filter((room) => room.assignmentCapacity > 0);

    if (normalizedRooms.length === 0) return [];

    const dp = new Map<number, number[]>();
    dp.set(0, []);

    for (const room of normalizedRooms) {
      const entries = [...dp.entries()].sort(
        (left, right) => right[0] - left[0],
      );
      for (const [capacity, combo] of entries) {
        const nextCapacity = capacity + room.assignmentCapacity;
        const nextCombo = [...combo, room.__index];
        const existingCombo = dp.get(nextCapacity);
        if (
          !existingCombo ||
          nextCombo.length < existingCombo.length ||
          (nextCombo.length === existingCombo.length &&
            nextCombo.join(',') < existingCombo.join(','))
        ) {
          dp.set(nextCapacity, nextCombo);
        }
      }
    }

    let bestCapacity = -1;
    let bestCombo: number[] | null = null;

    for (const [capacity, combo] of dp.entries()) {
      if (capacity < requiredSeats) continue;
      if (
        bestCombo === null ||
        capacity < bestCapacity ||
        (capacity === bestCapacity && combo.length < bestCombo.length)
      ) {
        bestCapacity = capacity;
        bestCombo = combo;
      }
    }

    if (!bestCombo) {
      return [];
    }

    return bestCombo.map((index) => normalizedRooms[index]);
  }

  private buildExamPlanSummary(
    plan: any,
    roomAssignments: any[] = [],
    studentAssignments: any[] = [],
  ) {
    return {
      ...plan,
      roomAssignments: roomAssignments.map((room) => ({
        ...room,
        students: studentAssignments
          .filter((student) => student.roomAssignmentId === room.id)
          .sort((left, right) => left.seatNumber - right.seatNumber),
      })),
      students: studentAssignments.sort((left, right) => {
        if (left.roomAssignmentId !== right.roomAssignmentId) {
          return left.roomAssignmentId.localeCompare(right.roomAssignmentId);
        }
        return left.seatNumber - right.seatNumber;
      }),
    };
  }

  private sortExamGradesForAssignment(
    grades: any[] = [],
    sortKey?: string | null,
  ) {
    const normalizedSortKey = `${sortKey || 'adminClass'}`
      .trim()
      .toLowerCase();

    return [...grades].sort((left, right) => {
      const leftAdminClass = `${left.student?.adminClass?.code || ''}`;
      const rightAdminClass = `${right.student?.adminClass?.code || ''}`;
      const leftStudentCode = `${left.student?.studentCode || ''}`;
      const rightStudentCode = `${right.student?.studentCode || ''}`;
      const leftStudentName = `${left.student?.fullName || ''}`;
      const rightStudentName = `${right.student?.fullName || ''}`;
      const leftProcess = Number(left.tbThuongKy || 0);
      const rightProcess = Number(right.tbThuongKy || 0);

      if (normalizedSortKey === 'process') {
        if (leftProcess !== rightProcess) {
          return rightProcess - leftProcess;
        }
      } else if (normalizedSortKey === 'code') {
        if (leftStudentCode !== rightStudentCode) {
          return leftStudentCode.localeCompare(rightStudentCode);
        }
      } else if (normalizedSortKey === 'name') {
        if (leftStudentName !== rightStudentName) {
          return leftStudentName.localeCompare(rightStudentName);
        }
      } else {
        if (leftAdminClass !== rightAdminClass) {
          return leftAdminClass.localeCompare(rightAdminClass);
        }
      }

      if (leftAdminClass !== rightAdminClass) {
        return leftAdminClass.localeCompare(rightAdminClass);
      }
      if (leftStudentCode !== rightStudentCode) {
        return leftStudentCode.localeCompare(rightStudentCode);
      }
      return leftStudentName.localeCompare(rightStudentName);
    });
  }

  private async getRemainingExamEligibilityContext(
    group: any,
    semesterId: string,
    subjectId: string,
    cohort: string,
    excludedPlanIds: string[] = [],
    tx: any = this.prisma,
  ) {
    const normalizedCohort = this.normalizeExamCohort(cohort);
    const normalizedExcludedPlanIds = [...new Set(excludedPlanIds.filter(Boolean))];

    const otherPlans = await tx.examPlan.findMany({
      where: {
        semesterId,
        subjectId,
        cohort: normalizedCohort,
        ...(normalizedExcludedPlanIds.length > 0
          ? {
              id: {
                notIn: normalizedExcludedPlanIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
        examDate: true,
        startShift: true,
        endShift: true,
      },
      orderBy: [{ examDate: 'asc' }, { startShift: 'asc' }],
    });

    const otherAssignments =
      otherPlans.length > 0
        ? await tx.examStudentAssignment.findMany({
            where: {
              examPlanId: { in: otherPlans.map((plan) => plan.id) },
            },
            select: {
              examPlanId: true,
              gradeId: true,
              examSbd: true,
            },
          })
        : [];

    const scheduledGradeIds = new Set(
      otherAssignments.map((assignment) => assignment.gradeId),
    );

    return {
      normalizedCohort,
      otherPlans,
      otherAssignments,
      scheduledGradeIds,
      remainingEligibleGrades: group.eligibleGrades.filter(
        (grade) => !scheduledGradeIds.has(grade.id),
      ),
    };
  }

  private async getExamPlanSnapshot(planId: string, tx: any = this.prisma) {
    const [plan, roomAssignments, studentAssignments] = await Promise.all([
      tx.examPlan.findUnique({ where: { id: planId } }),
      tx.examRoomAssignment.findMany({
        where: { examPlanId: planId },
        orderBy: [{ sortOrder: 'asc' }, { roomName: 'asc' }],
      }),
      tx.examStudentAssignment.findMany({
        where: { examPlanId: planId },
        orderBy: [{ examSbd: 'asc' }],
      }),
    ]);

    if (!plan) {
      return null;
    }

    return this.buildExamPlanSummary(plan, roomAssignments, studentAssignments);
  }

  private async getBusyRoomIdsForExam(
    date: Date,
    startShift: number,
    endShift: number,
    excludeExamPlanId?: string,
    tx: any = this.prisma,
  ) {
    const examDate = this.toDateOnly(date);
    const sessions = await tx.classSession.findMany({
      where: {
        date: examDate,
        OR: this.buildShiftOverlapWhere(startShift, endShift),
      },
      select: {
        roomId: true,
      },
    });

    const busyPlanWhere: any = {
      examDate,
      OR: this.buildShiftOverlapWhere(startShift, endShift),
    };

    if (excludeExamPlanId) {
      busyPlanWhere.id = { not: excludeExamPlanId };
    }

    const busyPlans = await tx.examPlan.findMany({
      where: busyPlanWhere,
      select: { id: true },
    });

    const busyPlanAssignments =
      busyPlans.length > 0
        ? await tx.examRoomAssignment.findMany({
            where: {
              examPlanId: { in: busyPlans.map((plan) => plan.id) },
              roomId: { not: null },
            },
            select: { roomId: true },
          })
        : [];

    return new Set(
      [...sessions, ...busyPlanAssignments]
        .map((item) => item.roomId)
        .filter(Boolean),
    );
  }

  private async getExamPlanConflictsForStudents(
    date: Date,
    startShift: number,
    endShift: number,
    studentIds: string[],
    excludeExamPlanId?: string,
    tx: any = this.prisma,
  ) {
    const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];
    if (uniqueStudentIds.length === 0) {
      return [];
    }

    const examDate = this.toDateOnly(date);
    const overlapWhere: any = {
      examDate,
      OR: this.buildShiftOverlapWhere(startShift, endShift),
    };

    if (excludeExamPlanId) {
      overlapWhere.id = { not: excludeExamPlanId };
    }

    const plans = await tx.examPlan.findMany({
      where: overlapWhere,
      select: {
        id: true,
        subjectId: true,
        cohort: true,
        startShift: true,
        endShift: true,
      },
    });

    if (plans.length === 0) {
      return [];
    }

    const assignments = await tx.examStudentAssignment.findMany({
      where: {
        examPlanId: { in: plans.map((plan) => plan.id) },
        studentId: { in: uniqueStudentIds },
      },
      select: {
        examPlanId: true,
        studentCode: true,
      },
    });

    if (assignments.length === 0) {
      return [];
    }

    const subjects = await tx.subject.findMany({
      where: {
        id: { in: [...new Set(plans.map((plan) => plan.subjectId))] },
      },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    const planMap = new Map<string, (typeof plans)[number]>(
      plans.map((plan) => [plan.id, plan]),
    );
    const subjectMap = new Map<string, (typeof subjects)[number]>(
      subjects.map((subject) => [subject.id, subject]),
    );
    const conflictMap = new Map<string, any>();

    for (const assignment of assignments) {
      const plan = planMap.get(assignment.examPlanId);
      if (!plan) {
        continue;
      }

      const subject = subjectMap.get(plan.subjectId);
      const existing = conflictMap.get(plan.id) || {
        planId: plan.id,
        subjectCode: subject?.code || null,
        subjectName: subject?.name || 'Môn học',
        cohort: plan.cohort,
        startShift: plan.startShift,
        endShift: plan.endShift,
        studentCount: 0,
        sampleStudentCodes: [] as string[],
      };

      existing.studentCount += 1;
      if (
        assignment.studentCode &&
        existing.sampleStudentCodes.length < 3 &&
        !existing.sampleStudentCodes.includes(assignment.studentCode)
      ) {
        existing.sampleStudentCodes.push(assignment.studentCode);
      }

      conflictMap.set(plan.id, existing);
    }

    return [...conflictMap.values()].sort(
      (left, right) => right.studentCount - left.studentCount,
    );
  }

  private async getStudySessionConflictsForStudents(
    semesterId: string,
    date: Date,
    startShift: number,
    endShift: number,
    studentIds: string[],
    tx: any = this.prisma,
  ) {
    const uniqueStudentIds = [...new Set(studentIds.filter(Boolean))];
    if (uniqueStudentIds.length === 0) {
      return [];
    }

    const examDate = this.toDateOnly(date);
    const sessions = await tx.classSession.findMany({
      where: {
        semesterId,
        date: examDate,
        OR: this.buildShiftOverlapWhere(startShift, endShift),
        courseClass: {
          status: { not: 'CANCELLED' },
          enrollments: {
            some: {
              studentId: { in: uniqueStudentIds },
            },
          },
        },
      },
      include: {
        courseClass: {
          select: {
            id: true,
            code: true,
            name: true,
            subject: {
              select: {
                code: true,
                name: true,
              },
            },
          },
        },
        room: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ startShift: 'asc' }, { id: 'asc' }],
      take: 20,
    });

    const conflictMap = new Map<string, any>();

    for (const session of sessions) {
      const key = session.id;
      if (conflictMap.has(key)) {
        continue;
      }

      conflictMap.set(key, {
        sessionId: session.id,
        courseClassCode: session.courseClass?.code || 'N/A',
        courseClassName: session.courseClass?.name || 'Lớp học phần',
        subjectCode: session.courseClass?.subject?.code || null,
        subjectName: session.courseClass?.subject?.name || 'Môn học',
        roomName: session.room?.name || null,
        startShift: session.startShift,
        endShift: session.endShift,
      });
    }

    return [...conflictMap.values()];
  }

  private async upsertCustomVenue(customVenue: any, tx: any = this.prisma) {
    const venueName = `${customVenue?.name || ''}`.trim();
    const capacity = Number(customVenue?.capacity || 0);

    if (!venueName) {
      throw new BadRequestException(
        'Tên địa điểm thủ công không được để trống.',
      );
    }

    if (capacity <= 0) {
      throw new BadRequestException(
        'Sức chứa của địa điểm thủ công phải lớn hơn 0.',
      );
    }

    const venueType = `${customVenue?.type || 'EXAM_HALL'}`
      .trim()
      .toUpperCase();
    const building = `${customVenue?.building || ''}`.trim() || null;

    const existingRoom = await tx.room.findFirst({
      where: { name: venueName },
    });

    if (existingRoom) {
      return tx.room.update({
        where: { id: existingRoom.id },
        data: {
          capacity,
          type: venueType,
          building,
        },
      });
    }

    return tx.room.create({
      data: {
        name: venueName,
        capacity,
        type: venueType,
        building,
      },
    });
  }

  private async resolveExamGroupData(
    semesterId: string,
    subjectId: string,
    cohort: string,
    tx: any = this.prisma,
  ) {
    const normalizedCohort = this.normalizeExamCohort(cohort);
    if (!normalizedCohort) {
      throw new BadRequestException('Khóa sinh viên không hợp lệ.');
    }

    const grades = await tx.grade.findMany({
      where: {
        courseClass: {
          semesterId,
          subjectId,
        },
      },
      select: {
        id: true,
        isEligibleForExam: true,
        examSbd: true,
        attendanceScore: true,
        tbThuongKy: true,
        studentId: true,
        courseClassId: true,
        student: {
          select: {
            id: true,
            studentCode: true,
            fullName: true,
            intake: true,
            adminClass: {
              select: {
                code: true,
                cohort: true,
              },
            },
          },
        },
        courseClass: {
          select: {
            id: true,
            code: true,
            name: true,
            cohort: true,
            lecturerId: true,
            subject: {
              select: {
                id: true,
                code: true,
                name: true,
                examType: true,
                examForm: true,
                examDuration: true,
                credits: true,
                major: {
                  select: {
                    faculty: {
                      select: {
                        id: true,
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const matchedGrades = grades.filter(
      (grade) => this.resolveGradeCohort(grade) === normalizedCohort,
    );

    if (matchedGrades.length === 0) {
      const subject = await tx.subject.findUnique({
        where: { id: subjectId },
        select: {
          id: true,
          code: true,
          name: true,
          examType: true,
          examForm: true,
          examDuration: true,
          credits: true,
          major: {
            select: {
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!subject) {
        throw new BadRequestException('Môn học không tồn tại.');
      }

      return {
        subject,
        allGrades: [],
        eligibleGrades: [],
        normalizedCohort,
        courseClasses: [],
      };
    }

    const courseClassMap = new Map<string, any>();
    for (const grade of matchedGrades) {
      if (!courseClassMap.has(grade.courseClass.id)) {
        courseClassMap.set(grade.courseClass.id, grade.courseClass);
      }
    }

    return {
      subject: matchedGrades[0].courseClass.subject,
      allGrades: matchedGrades,
      eligibleGrades: matchedGrades.filter(
        (grade) => grade.isEligibleForExam !== false,
      ),
      normalizedCohort,
      courseClasses: [...courseClassMap.values()].sort((left, right) =>
        left.code.localeCompare(right.code),
      ),
    };
  }

  async getExamPlanningGroups(filters: {
    semesterId: string;
    search?: string;
    facultyId?: string;
    cohort?: string;
    subjectId?: string;
  }) {
    const { semesterId, search, facultyId, cohort, subjectId } = filters;
    const normalizedCohort = this.normalizeExamCohort(cohort);

    const [grades, plans] = await Promise.all([
      this.prisma.grade.findMany({
        where: {
          courseClass: {
            semesterId,
            ...(subjectId ? { subjectId } : {}),
            ...(facultyId
              ? {
                  subject: {
                    major: {
                      facultyId,
                    },
                  },
                }
              : {}),
          },
        },
        select: {
          id: true,
          isEligibleForExam: true,
          student: {
            select: {
              studentCode: true,
              intake: true,
              adminClass: {
                select: {
                  code: true,
                  cohort: true,
                },
              },
            },
          },
          courseClass: {
            select: {
              id: true,
              code: true,
              name: true,
              cohort: true,
              subjectId: true,
              subject: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  examType: true,
                  examForm: true,
                  examDuration: true,
                  credits: true,
                  major: {
                    select: {
                      faculty: {
                        select: {
                          id: true,
                          code: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.examPlan.findMany({
        where: { semesterId },
        orderBy: [{ updatedAt: 'desc' }],
      }),
    ]);

    const planMap = new Map(
      plans.map((plan) => [`${plan.subjectId}::${plan.cohort}`, plan]),
    );
    const groupMap = new Map<string, any>();

    for (const grade of grades) {
      const cohort = this.resolveGradeCohort(grade);
      if (!cohort) continue;
      if (normalizedCohort && cohort !== normalizedCohort) continue;

      const key = `${grade.courseClass.subjectId}::${cohort}`;
      if (!groupMap.has(key)) {
        const existingPlan = planMap.get(key) || null;
        groupMap.set(key, {
          key,
          semesterId,
          subjectId: grade.courseClass.subjectId,
          cohort,
          subject: grade.courseClass.subject,
          examType: grade.courseClass.subject.examType,
          examForm: grade.courseClass.subject.examForm,
          examDuration: grade.courseClass.subject.examDuration,
          facultyId: grade.courseClass.subject.major?.faculty?.id || null,
          facultyCode: grade.courseClass.subject.major?.faculty?.code || null,
          facultyName: grade.courseClass.subject.major?.faculty?.name || null,
          totalStudents: 0,
          eligibleCount: 0,
          classCount: 0,
          courseClassIds: new Set<string>(),
          courseClassCodes: new Set<string>(),
          adminClassCodes: new Set<string>(),
          plan: existingPlan,
        });
      }

      const group = groupMap.get(key);
      group.totalStudents += 1;
      if (grade.isEligibleForExam !== false) {
        group.eligibleCount += 1;
      }
      if (!group.courseClassIds.has(grade.courseClass.id)) {
        group.courseClassIds.add(grade.courseClass.id);
        group.classCount += 1;
      }
      group.courseClassCodes.add(grade.courseClass.code);
      if (grade.student?.adminClass?.code) {
        group.adminClassCodes.add(grade.student.adminClass.code);
      }
    }

    const keyword = `${search || ''}`.trim().toLowerCase();

    return [...groupMap.values()]
      .map((group) => ({
        key: group.key,
        semesterId: group.semesterId,
        subjectId: group.subjectId,
        cohort: group.cohort,
        subject: group.subject,
        examType: group.examType,
        examForm: group.examForm,
        examDuration: group.examDuration,
        facultyId: group.facultyId,
        facultyCode: group.facultyCode,
        facultyName: group.facultyName,
        totalStudents: group.totalStudents,
        eligibleCount: group.eligibleCount,
        classCount: group.classCount,
        courseClassIds: [...group.courseClassIds],
        courseClassCodes: [...group.courseClassCodes].sort(),
        adminClassCodes: [...group.adminClassCodes].sort(),
        hasPlan: Boolean(group.plan),
        plan: group.plan
          ? {
              id: group.plan.id,
              examDate: group.plan.examDate,
              startShift: group.plan.startShift,
              endShift: group.plan.endShift,
              totalRooms: group.plan.totalRooms,
              totalStudents: group.plan.totalStudents,
              venueMode: group.plan.venueMode,
              updatedAt: group.plan.updatedAt,
            }
          : null,
      }))
      .filter((group) => {
        if (!keyword) return true;
        const haystack = [
          group.subject?.code,
          group.subject?.name,
          group.cohort,
          ...group.adminClassCodes,
          ...group.courseClassCodes,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(keyword);
      })
      .sort((left, right) => {
        if (`${left.facultyName || ''}` !== `${right.facultyName || ''}`) {
          return `${left.facultyName || ''}`.localeCompare(
            `${right.facultyName || ''}`,
          );
        }
        if (left.subject?.name !== right.subject?.name) {
          return `${left.subject?.name || ''}`.localeCompare(
            `${right.subject?.name || ''}`,
          );
        }
        return left.cohort.localeCompare(right.cohort);
      });
  }

  async getExamPlanningDetail(
    semesterId: string,
    subjectId: string,
    cohort: string,
  ) {
    const group = await this.resolveExamGroupData(
      semesterId,
      subjectId,
      cohort,
    );

    const existingPlans = await this.prisma.examPlan.findMany({
      where: {
        semesterId,
        subjectId,
        cohort: group.normalizedCohort,
      },
      orderBy: [{ examDate: 'asc' }, { startShift: 'asc' }],
    });

    const plans = await Promise.all(
      existingPlans.map((plan) => this.getExamPlanSnapshot(plan.id)),
    );

    return {
      semesterId,
      subject: group.subject,
      cohort: group.normalizedCohort,
      totalStudents: group.allGrades.length,
      eligibleCount: group.eligibleGrades.length,
      classCount: group.courseClasses.length,
      courseClasses: group.courseClasses,
      students: group.allGrades
        .map((grade) => ({
          gradeId: grade.id,
          studentId: grade.studentId,
          courseClassId: grade.courseClassId,
          courseClassCode: grade.courseClass.code,
          courseClassName: grade.courseClass.name,
          studentCode: grade.student?.studentCode || 'N/A',
          studentName: grade.student?.fullName || 'Sinh viên',
          adminClassCode: grade.student?.adminClass?.code || null,
          cohort: this.resolveGradeCohort(grade),
          isEligibleForExam: grade.isEligibleForExam !== false,
          attendanceScore: grade.attendanceScore ?? null,
          processScore: grade.tbThuongKy ?? null,
          examSbd: grade.examSbd || null,
        }))
        .sort((left, right) => {
          if (left.studentName !== right.studentName) {
            return `${left.studentName || ''}`.localeCompare(
              `${right.studentName || ''}`,
            );
          }
          return left.studentCode.localeCompare(right.studentCode);
        }),
      plans,
      preferredRoomTypes: this.resolveExamPreferredRoomTypes(
        group.subject.examType,
      ),
    };
  }

  async getScheduledExamPlans(semesterId?: string) {
    const plans = await this.prisma.examPlan.findMany({
      where: semesterId ? { semesterId } : undefined,
      orderBy: [{ examDate: 'asc' }, { startShift: 'asc' }, { cohort: 'asc' }],
    });

    if (plans.length === 0) {
      return [];
    }

    const [subjects, semesters, rooms, students] = await Promise.all([
      this.prisma.subject.findMany({
        where: {
          id: { in: [...new Set(plans.map((plan) => plan.subjectId))] },
        },
        select: {
          id: true,
          code: true,
          name: true,
          examType: true,
          examForm: true,
          examDuration: true,
          credits: true,
          major: {
            select: {
              faculty: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.semester.findMany({
        where: {
          id: { in: [...new Set(plans.map((plan) => plan.semesterId))] },
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      }),
      this.prisma.examRoomAssignment.findMany({
        where: { examPlanId: { in: plans.map((plan) => plan.id) } },
        orderBy: [{ sortOrder: 'asc' }, { roomName: 'asc' }],
      }),
      this.prisma.examStudentAssignment.findMany({
        where: { examPlanId: { in: plans.map((plan) => plan.id) } },
        orderBy: [{ examSbd: 'asc' }],
      }),
    ]);

    const subjectMap = new Map(
      subjects.map((subject) => [subject.id, subject]),
    );
    const semesterMap = new Map(
      semesters.map((semester) => [semester.id, semester]),
    );

    return plans.map((plan) =>
      this.buildExamPlanSummary(
        {
          ...plan,
          subject: subjectMap.get(plan.subjectId) || null,
          semester: semesterMap.get(plan.semesterId) || null,
        },
        rooms.filter((room) => room.examPlanId === plan.id),
        students.filter((student) => student.examPlanId === plan.id),
      ),
    );
  }

  async getExamPlanningAvailability(data: {
    semesterId: string;
    subjectId: string;
    cohort: string;
    dateFrom: string;
    dateTo?: string;
    studentsPerRoom?: number;
    limit?: number;
    selectedDate?: string;
    selectedStartShift?: number;
  }) {
    const dateFrom = this.toDateOnly(data.dateFrom);
    const dateTo = this.toDateOnly(data.dateTo || data.dateFrom);
    const studentsPerRoom = Math.max(Number(data.studentsPerRoom) || 0, 0);
    const limit = Math.min(Math.max(Number(data.limit) || 12, 1), 60);

    if (!data.semesterId || !data.subjectId || !data.cohort) {
      throw new BadRequestException(
        'Thiếu thông tin học kỳ, môn học hoặc khóa sinh viên.',
      );
    }

    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime())) {
      throw new BadRequestException('Khoảng ngày gợi ý không hợp lệ.');
    }

    if (dateTo.getTime() < dateFrom.getTime()) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu.');
    }

    const dayCount =
      Math.floor((dateTo.getTime() - dateFrom.getTime()) / 86400000) + 1;
    if (dayCount > 31) {
      throw new BadRequestException(
        'Chỉ hỗ trợ gợi ý lịch thi trong tối đa 31 ngày mỗi lần.',
      );
    }

    const group = await this.resolveExamGroupData(
      data.semesterId,
      data.subjectId,
      data.cohort,
    );

    if (group.eligibleGrades.length === 0) {
      throw new BadRequestException(
        'Không có sinh viên đủ điều kiện dự thi cho môn và khóa đã chọn.',
      );
    }

    const selectedDate = data.selectedDate
      ? this.toDateOnly(data.selectedDate)
      : null;
    const selectedStartShift = Number(data.selectedStartShift || 0) || null;
    const selectedPlan =
      selectedDate && selectedStartShift
        ? await this.prisma.examPlan.findUnique({
            where: {
              semesterId_subjectId_cohort_examDate_startShift: {
                semesterId: data.semesterId,
                subjectId: data.subjectId,
                cohort: group.normalizedCohort,
                examDate: selectedDate,
                startShift: selectedStartShift,
              },
            },
          })
        : null;

    const remainingContext = await this.getRemainingExamEligibilityContext(
      group,
      data.semesterId,
      data.subjectId,
      group.normalizedCohort,
      selectedPlan?.id ? [selectedPlan.id] : [],
    );

    const preferredTypes = this.resolveExamPreferredRoomTypes(
      group.subject.examType,
    );
    const allRooms = await this.prisma.room.findMany({
      orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
    });
    const preferredRooms = this.applyRoomAssignmentCap(
      allRooms.filter((room) => preferredTypes.includes(room.type)),
      studentsPerRoom,
    );
    const fallbackRooms = this.applyRoomAssignmentCap(
      allRooms,
      studentsPerRoom,
    );
    const requiredSeats = remainingContext.remainingEligibleGrades.length;
    const studentIds: string[] = [
      ...new Set<string>(
        remainingContext.remainingEligibleGrades
          .map((grade) => `${grade.studentId || ''}`.trim())
          .filter((studentId) => studentId.length > 0),
      ),
    ];

    const slotResults: any[] = [];
    const shifts = this.getExamShiftOptions();

    for (
      let cursor = new Date(dateFrom);
      cursor.getTime() <= dateTo.getTime();
      cursor = new Date(cursor.getTime() + 86400000)
    ) {
      if (cursor.getDay() === 0) {
        continue;
      }

      for (const shift of shifts) {
        const [conflictingExamPlans, conflictingStudySessions, busyRoomIds] =
          await Promise.all([
            this.getExamPlanConflictsForStudents(
              cursor,
              shift.startShift,
              shift.endShift,
              studentIds,
              selectedPlan?.id,
            ),
            this.getStudySessionConflictsForStudents(
              data.semesterId,
              cursor,
              shift.startShift,
              shift.endShift,
              studentIds,
            ),
            this.getBusyRoomIdsForExam(
              cursor,
              shift.startShift,
              shift.endShift,
              selectedPlan?.id,
            ),
          ]);

        const availablePreferredRooms = preferredRooms.filter(
          (room) => !busyRoomIds.has(room.id),
        );
        const availableFallbackRooms = fallbackRooms.filter(
          (room) => !busyRoomIds.has(room.id),
        );

        let suggestedRooms = this.chooseOptimalRoomCombination(
          availablePreferredRooms,
          requiredSeats,
        );

        if (suggestedRooms.length === 0) {
          suggestedRooms = this.chooseOptimalRoomCombination(
            availableFallbackRooms,
            requiredSeats,
          );
        }

        const reasons: string[] = [];

        if (conflictingExamPlans.length > 0) {
          reasons.push(
            `Trùng lịch thi với ${conflictingExamPlans[0].studentCount} sinh viên.`,
          );
        }

        if (conflictingStudySessions.length > 0) {
          reasons.push(
            `Trùng lịch học với ${conflictingStudySessions.length} lớp học phần.`,
          );
        }

        if (suggestedRooms.length === 0) {
          reasons.push('Không đủ phòng trống đáp ứng sức chứa.');
        }

        slotResults.push({
          date: new Date(cursor),
          dateLabel: cursor.toLocaleDateString('vi-VN'),
          startShift: shift.startShift,
          endShift: shift.endShift,
          shiftLabel: shift.label,
          preferredRoomTypes: preferredTypes,
          status: reasons.length === 0 ? 'AVAILABLE' : 'BLOCKED',
          reasons,
          requiredSeats,
          totalCapacity: this.sumRoomAssignmentCapacity(suggestedRooms),
          suggestedRooms: suggestedRooms.map((room) => ({
            id: room.id,
            name: room.name,
            building: room.building || null,
            type: room.type,
            capacity: room.capacity,
            assignmentCapacity:
              Number(room.assignmentCapacity ?? room.capacity) || 0,
          })),
          availableRooms: availableFallbackRooms.map((room) => ({
            id: room.id,
            name: room.name,
            building: room.building || null,
            type: room.type,
            capacity: room.capacity,
            assignmentCapacity:
              Number(room.assignmentCapacity ?? room.capacity) || 0,
            isPreferred: preferredTypes.includes(room.type),
          })),
        });
      }
    }

    const suggestions = slotResults
      .sort((left, right) => {
        if (left.status !== right.status) {
          return left.status === 'AVAILABLE' ? -1 : 1;
        }
        if (left.date.getTime() !== right.date.getTime()) {
          return left.date.getTime() - right.date.getTime();
        }
        if (left.suggestedRooms.length !== right.suggestedRooms.length) {
          return left.suggestedRooms.length - right.suggestedRooms.length;
        }
        return left.startShift - right.startShift;
      })
      .slice(0, limit)
      .map((item) => ({
        ...item,
        date: item.date.toISOString(),
      }));

    return {
      semesterId: data.semesterId,
      subject: group.subject,
      cohort: group.normalizedCohort,
      requiredSeats,
      studentsPerRoom: studentsPerRoom || null,
      preferredRoomTypes: preferredTypes,
      suggestions,
    };
  }

  async scheduleExamPlan(data: {
    semesterId: string;
    subjectId: string;
    cohort: string;
    date: string;
    startShift: number;
    endShift: number;
    studentsPerRoom?: number;
    selectedRoomIds?: string[];
    shifts?: Array<{
      startShift: number;
      endShift: number;
    }>;
    allowAutoFill?: boolean;
    customVenue?: {
      name: string;
      capacity: number;
      type?: string;
      building?: string;
    } | null;
    note?: string;
    studentSortKey?: string;
  }) {
    const examDate = this.toDateOnly(data.date);
    const studentsPerRoom = Math.max(Number(data.studentsPerRoom) || 0, 0);
    const selectedRoomIds = [...new Set(data.selectedRoomIds || [])];
    const shiftOptions = this.getExamShiftOptions();
    const shiftOptionMap = new Map(
      shiftOptions.map((shift) => [
        `${shift.startShift}-${shift.endShift}`,
        shift,
      ]),
    );
    const requestedShifts =
      Array.isArray(data.shifts) && data.shifts.length > 0
        ? data.shifts
        : [
            {
              startShift: Number(data.startShift),
              endShift: Number(data.endShift),
            },
          ];

    const normalizedShifts = [...new Set(
      requestedShifts.map(
        (shift) =>
          `${Number(shift?.startShift || 0)}-${Number(shift?.endShift || 0)}`,
      ),
    )]
      .map((key) => shiftOptionMap.get(key))
      .filter(Boolean)
      .sort((left, right) => left.startShift - right.startShift);

    if (!data.semesterId || !data.subjectId || !data.cohort) {
      throw new BadRequestException(
        'Thiếu thông tin học kỳ, môn học hoặc khóa sinh viên.',
      );
    }

    if (!data.date || Number.isNaN(examDate.getTime())) {
      throw new BadRequestException('Ngày thi không hợp lệ.');
    }

    if (normalizedShifts.length === 0) {
      throw new BadRequestException('Cần chọn ít nhất một ca thi hợp lệ.');
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await this.resolveExamGroupData(
        data.semesterId,
        data.subjectId,
        data.cohort,
        tx,
      );

      if (group.eligibleGrades.length === 0) {
        throw new BadRequestException(
          'Không có sinh viên đủ điều kiện dự thi cho môn và khóa đã chọn.',
        );
      }

      let customVenueRoom: any = null;
      if (data.customVenue?.name) {
        customVenueRoom = await this.upsertCustomVenue(data.customVenue, tx);
      }

      const manualRoomIds = [...selectedRoomIds];
      if (customVenueRoom) {
        manualRoomIds.push(customVenueRoom.id);
      }

      const existingPlansOnSelectedShifts = await tx.examPlan.findMany({
        where: {
          semesterId: data.semesterId,
          subjectId: data.subjectId,
          cohort: group.normalizedCohort,
          examDate,
          startShift: { in: normalizedShifts.map((shift) => shift.startShift) },
        },
      });

      const existingSelectedPlanIds = existingPlansOnSelectedShifts.map(
        (plan) => plan.id,
      );

      const remainingContext = await this.getRemainingExamEligibilityContext(
        group,
        data.semesterId,
        data.subjectId,
        group.normalizedCohort,
        existingSelectedPlanIds,
        tx,
      );

      let remainingEligibleGrades = this.sortExamGradesForAssignment(
        remainingContext.remainingEligibleGrades,
        data.studentSortKey,
      );

      if (
        remainingEligibleGrades.length === 0 &&
        existingPlansOnSelectedShifts.length === 0
      ) {
        throw new BadRequestException(
          'Tất cả sinh viên đủ điều kiện đã được xếp vào các ca thi khác.',
        );
      }

      const preferredTypes = this.resolveExamPreferredRoomTypes(
        group.subject.examType,
      );

      const selectedRooms =
        manualRoomIds.length > 0
          ? await tx.room.findMany({
              where: {
                id: { in: manualRoomIds },
              },
            })
          : [];

      if (selectedRooms.length !== manualRoomIds.length) {
        throw new BadRequestException(
          'Một hoặc nhiều phòng/địa điểm thủ công không tồn tại.',
        );
      }

      const cappedSelectedRooms = this.applyRoomAssignmentCap(
        selectedRooms,
        studentsPerRoom,
      );
      const allowAutoFill = data.allowAutoFill !== false;

      const roomOrder = new Map(
        manualRoomIds.map((roomId, index) => [roomId, index]),
      );

      if (existingSelectedPlanIds.length > 0) {
        const previousAssignments = await tx.examStudentAssignment.findMany({
          where: { examPlanId: { in: existingSelectedPlanIds } },
          select: { gradeId: true },
        });

        if (previousAssignments.length > 0) {
          await tx.grade.updateMany({
            where: {
              id: {
                in: previousAssignments.map((assignment) => assignment.gradeId),
              },
            },
            data: {
              examSbd: null,
            },
          });
        }

        await tx.examStudentAssignment.deleteMany({
          where: { examPlanId: { in: existingSelectedPlanIds } },
        });
        await tx.examRoomAssignment.deleteMany({
          where: { examPlanId: { in: existingSelectedPlanIds } },
        });
        await tx.examPlan.deleteMany({
          where: { id: { in: existingSelectedPlanIds } },
        });
      }

      let runningSbdIndex = remainingContext.otherAssignments.length;
      let totalAssignedCount = 0;
      const createdPlanSummaries: any[] = [];
      const originalRequiredSeats = remainingEligibleGrades.length;

      for (
        let shiftIndex = 0;
        shiftIndex < normalizedShifts.length;
        shiftIndex += 1
      ) {
        const shift = normalizedShifts[shiftIndex];

        if (remainingEligibleGrades.length === 0) {
          break;
        }

        const busyRoomIds = await this.getBusyRoomIdsForExam(
          examDate,
          shift.startShift,
          shift.endShift,
          undefined,
          tx,
        );

        const busySelectedRooms = cappedSelectedRooms.filter((room) =>
          busyRoomIds.has(room.id),
        );

        if (busySelectedRooms.length > 0) {
          throw new BadRequestException(
            `Các phòng/địa điểm đã bận ở ${shift.label}: ${busySelectedRooms
              .map((room) => room.name)
              .join(', ')}`,
          );
        }

        const shiftsLeft = normalizedShifts.length - shiftIndex;
        const selectedCapacity =
          this.sumRoomAssignmentCapacity(cappedSelectedRooms);
        const targetSeatsPerShift =
          cappedSelectedRooms.length > 0
            ? remainingEligibleGrades.length
            : Math.ceil(remainingEligibleGrades.length / shiftsLeft);

        let chosenRooms = [...cappedSelectedRooms];

        if (!(selectedRooms.length > 0 && !allowAutoFill)) {
          const targetAutoFillSeats =
            selectedRooms.length > 0
              ? Math.max(targetSeatsPerShift - selectedCapacity, 0)
              : targetSeatsPerShift;

          if (targetAutoFillSeats > 0) {
            const autoCandidates = await tx.room.findMany({
              where: {
                id: { notIn: chosenRooms.map((room) => room.id) },
                type: { in: preferredTypes },
              },
              orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
            });

            const availableAutoCandidates = this.applyRoomAssignmentCap(
              autoCandidates.filter((room) => !busyRoomIds.has(room.id)),
              studentsPerRoom,
            );

            let optimalAutoRooms = this.chooseOptimalRoomCombination(
              availableAutoCandidates,
              targetAutoFillSeats,
            );

            if (optimalAutoRooms.length === 0) {
              const fallbackCandidates = await tx.room.findMany({
                where: {
                  id: { notIn: chosenRooms.map((room) => room.id) },
                },
                orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
              });

              optimalAutoRooms = this.chooseOptimalRoomCombination(
                this.applyRoomAssignmentCap(
                  fallbackCandidates.filter((room) => !busyRoomIds.has(room.id)),
                  studentsPerRoom,
                ),
                targetAutoFillSeats,
              );
            }

            if (optimalAutoRooms.length > 0) {
              chosenRooms = [...chosenRooms, ...optimalAutoRooms];
            }
          }
        }

        chosenRooms.sort((left, right) => {
          const leftManualOrder = roomOrder.get(left.id);
          const rightManualOrder = roomOrder.get(right.id);
          if (leftManualOrder !== undefined || rightManualOrder !== undefined) {
            return (leftManualOrder ?? 9999) - (rightManualOrder ?? 9999);
          }
          if (left.capacity !== right.capacity) {
            return (
              Number(left.assignmentCapacity ?? left.capacity) -
              Number(right.assignmentCapacity ?? right.capacity)
            );
          }
          return left.name.localeCompare(right.name);
        });

        const totalCapacity = this.sumRoomAssignmentCapacity(chosenRooms);

        if (totalCapacity <= 0) {
          if (selectedRooms.length > 0) {
            throw new BadRequestException(
              `Nhóm phòng đã chọn không còn sức chứa hợp lệ cho ${shift.label}.`,
            );
          }
          throw new BadRequestException(
            `Không tìm được phòng trống để xếp ca thi ${shift.label}.`,
          );
        }

        const candidateGrades = remainingEligibleGrades.slice(
          0,
          Math.min(remainingEligibleGrades.length, totalCapacity),
        );

        const candidateStudentIds: string[] = [
          ...new Set<string>(
            candidateGrades
              .map((grade) => `${grade.studentId || ''}`.trim())
              .filter((studentId) => studentId.length > 0),
          ),
        ];

        const [conflictingExamPlans, conflictingStudySessions] =
          await Promise.all([
            this.getExamPlanConflictsForStudents(
              examDate,
              shift.startShift,
              shift.endShift,
              candidateStudentIds,
              undefined,
              tx,
            ),
            this.getStudySessionConflictsForStudents(
              data.semesterId,
              examDate,
              shift.startShift,
              shift.endShift,
              candidateStudentIds,
              tx,
            ),
          ]);

        if (conflictingExamPlans.length > 0) {
          throw new BadRequestException(
            `${shift.label} đang trùng với lịch thi khác của sinh viên: ${conflictingExamPlans
              .slice(0, 3)
              .map(
                (conflict) =>
                  `${conflict.subjectCode || conflict.subjectName} - khóa ${conflict.cohort} (${conflict.studentCount} SV)`,
              )
              .join('; ')}.`,
          );
        }

        if (conflictingStudySessions.length > 0) {
          throw new BadRequestException(
            `${shift.label} đang trùng với lịch học của sinh viên: ${conflictingStudySessions
              .slice(0, 3)
              .map(
                (session) =>
                  `${session.courseClassCode} - ${session.subjectName} (${session.startShift}-${session.endShift})`,
              )
              .join('; ')}.`,
          );
        }

        const plan = await tx.examPlan.create({
          data: {
            semesterId: data.semesterId,
            subjectId: data.subjectId,
            cohort: group.normalizedCohort,
            examDate,
            startShift: shift.startShift,
            endShift: shift.endShift,
            examType: group.subject.examType,
            examForm: group.subject.examForm,
            preferredRoomType: preferredTypes[0] || null,
            venueMode:
              selectedRooms.length === 0
                ? 'AUTO'
                : chosenRooms.length > cappedSelectedRooms.length
                  ? 'HYBRID'
                  : 'MANUAL',
            note: `${data.note || ''}`.trim() || null,
            totalStudents: candidateGrades.length,
            totalRooms: chosenRooms.length,
          },
        });

        const roomAssignments: any[] = [];
        const studentAssignments: any[] = [];
        let studentIndex = 0;

        for (let roomIndex = 0; roomIndex < chosenRooms.length; roomIndex++) {
          const room = chosenRooms[roomIndex];
          const remainingStudents = candidateGrades.length - studentIndex;
          if (remainingStudents <= 0) break;

          const assignCount = Math.min(
            Number(room.assignmentCapacity ?? room.capacity) || 0,
            remainingStudents,
          );

          const roomAssignment = await tx.examRoomAssignment.create({
            data: {
              examPlanId: plan.id,
              roomId: room.id,
              roomName: room.name,
              roomType: room.type,
              building: room.building,
              capacity: Number(room.assignmentCapacity ?? room.capacity) || 0,
              assignedCount: assignCount,
              sortOrder: roomIndex + 1,
            },
          });

          roomAssignments.push(roomAssignment);

          for (let seatIndex = 0; seatIndex < assignCount; seatIndex++) {
            const grade = candidateGrades[studentIndex];
            const examSbd = String(runningSbdIndex + 1).padStart(6, '0');

            await tx.grade.update({
              where: { id: grade.id },
              data: {
                examSbd,
              },
            });

            const studentAssignment = await tx.examStudentAssignment.create({
              data: {
                examPlanId: plan.id,
                roomAssignmentId: roomAssignment.id,
                gradeId: grade.id,
                studentId: grade.studentId,
                courseClassId: grade.courseClassId,
                studentCode: grade.student?.studentCode || 'N/A',
                studentName: grade.student?.fullName || 'Sinh viên',
                adminClassCode: grade.student?.adminClass?.code || null,
                examSbd,
                seatNumber: seatIndex + 1,
              },
            });

            studentAssignments.push(studentAssignment);
            studentIndex += 1;
            runningSbdIndex += 1;
          }
        }

        totalAssignedCount += candidateGrades.length;
        remainingEligibleGrades = remainingEligibleGrades.slice(
          candidateGrades.length,
        );

        createdPlanSummaries.push(
          this.buildExamPlanSummary(plan, roomAssignments, studentAssignments),
        );
      }

      if (remainingEligibleGrades.length > 0) {
        throw new BadRequestException(
          `Tổng sức chứa của ${normalizedShifts.length} ca thi chưa đủ để xếp hết sinh viên. Còn thiếu ${remainingEligibleGrades.length} sinh viên chưa được phân ca.`,
        );
      }

      return {
        message:
          createdPlanSummaries.length > 1
            ? `Đã xếp ${totalAssignedCount}/${originalRequiredSeats} sinh viên vào ${createdPlanSummaries.length} ca thi cho môn ${group.subject.name} - khóa ${group.normalizedCohort}.`
            : `Đã xếp ${totalAssignedCount} sinh viên vào ${createdPlanSummaries[0]?.roomAssignments?.length || 0} phòng cho môn ${group.subject.name} - khóa ${group.normalizedCohort}.`,
        plan: createdPlanSummaries[0] || null,
        plans: createdPlanSummaries,
        summary: {
          totalAssigned: totalAssignedCount,
          plannedShifts: createdPlanSummaries.length,
          remainingStudents: remainingEligibleGrades.length,
        },
      };
    });
  }

  // --- EXAM SCHEDULING ---
  async getEligibleStudents(courseClassId: string) {
    return this.prisma.grade.findMany({
      where: { courseClassId, isEligibleForExam: true },
      include: {
        student: {
          include: { adminClass: true },
        },
      },
      orderBy: { student: { fullName: 'asc' } },
    });
  }

  async scheduleExam(
    courseClassId: string,
    data: { date: Date; startShift: number; endShift: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const courseClass = await tx.courseClass.findUnique({
        where: { id: courseClassId },
        include: { subject: true },
      });
      if (!courseClass)
        throw new BadRequestException('Lớp học phần không tồn tại.');

      const eligibleGrades = await tx.grade.findMany({
        where: { courseClassId, isEligibleForExam: true },
        include: { student: true },
        orderBy: [
          { student: { fullName: 'asc' } },
          { student: { studentCode: 'asc' } },
        ],
      });

      if (eligibleGrades.length === 0) {
        throw new BadRequestException(
          'Không có sinh viên nào đủ điều kiện dự thi.',
        );
      }

      const isPractice = courseClass.subject.examType === 'THUC_HANH';
      let requiredRoomType = isPractice ? 'PRACTICE' : 'THEORY';

      const studentsPerRoom = 30;
      const roomsNeeded = Math.ceil(eligibleGrades.length / studentsPerRoom);

      let availableRooms = await tx.room.findMany({
        where: {
          type: requiredRoomType,
          sessions: {
            none: {
              date: data.date,
              OR: [
                {
                  startShift: { lte: data.startShift },
                  endShift: { gte: data.startShift },
                },
                {
                  startShift: { lte: data.endShift },
                  endShift: { gte: data.endShift },
                },
                {
                  startShift: { gte: data.startShift },
                  endShift: { lte: data.endShift },
                },
              ],
            },
          },
        },
        take: roomsNeeded,
      });

      // Fallback if strict type lacks rooms
      if (availableRooms.length < roomsNeeded) {
        const allAvailableRooms = await tx.room.findMany({
          where: {
            sessions: {
              none: {
                date: data.date,
                OR: [
                  {
                    startShift: { lte: data.startShift },
                    endShift: { gte: data.startShift },
                  },
                  {
                    startShift: { lte: data.endShift },
                    endShift: { gte: data.endShift },
                  },
                  {
                    startShift: { gte: data.startShift },
                    endShift: { lte: data.endShift },
                  },
                ],
              },
            },
          },
          take: roomsNeeded,
        });
        if (allAvailableRooms.length < roomsNeeded) {
          throw new BadRequestException(
            `Không đủ phòng trống. Cần ${roomsNeeded} phòng, tìm thấy ${allAvailableRooms.length} phòng.`,
          );
        }
        availableRooms = allAvailableRooms;
      }

      await tx.classSession.deleteMany({
        where: { courseClassId, type: 'EXAM' },
      });

      await tx.grade.updateMany({
        where: { courseClassId },
        data: { examSessionId: null, examSbd: null },
      });

      const resultSessions = [];
      let studentIndex = 0;

      for (let i = 0; i < roomsNeeded; i++) {
        const room = availableRooms[i];

        const session = await tx.classSession.create({
          data: {
            courseClassId,
            semesterId: courseClass.semesterId,
            roomId: room.id,
            date: data.date,
            startShift: data.startShift,
            endShift: data.endShift,
            type: 'EXAM',
            note: `Thi cuối kỳ môn ${courseClass.subject.name}`,
          },
        });

        resultSessions.push(session);

        const chunk = eligibleGrades.slice(
          studentIndex,
          studentIndex + studentsPerRoom,
        );

        for (let j = 0; j < chunk.length; j++) {
          const sbd = String(studentIndex + j + 1).padStart(6, '0');
          await tx.grade.update({
            where: { id: chunk[j].id },
            data: {
              examSessionId: session.id,
              examSbd: sbd,
            },
          });
        }

        studentIndex += chunk.length;
      }

      return {
        message: `Đã xếp ${eligibleGrades.length} SV vào ${roomsNeeded} phòng thi.`,
        sessions: resultSessions,
      };
    });
  }

  async getExamSchedule(courseClassId: string) {
    return this.prisma.classSession.findMany({
      where: { courseClassId, type: 'EXAM' },
      include: { room: true },
    });
  }

  async getMyExamSchedule(studentId: string) {
    const grades = await this.prisma.grade.findMany({
      where: {
        studentId,
        examSessionId: { not: null },
      },
      include: {
        courseClass: {
          include: {
            subject: true,
            semester: true,
          },
        },
      },
    });

    const sessionIds = [
      ...new Set(grades.map((g) => (g as any).examSessionId).filter(Boolean)),
    ];
    const sessions = await this.prisma.classSession.findMany({
      where: { id: { in: sessionIds as string[] } },
      include: { room: true },
    });

    const sessionMap = new Map(sessions.map((s) => [s.id, s]));

    return grades
      .map((g) => ({
        ...g,
        examSession: sessionMap.get((g as any).examSessionId as string) || null,
      }))
      .sort((a, b) => {
        if (!a.examSession || !b.examSession) return 0;
        return (
          new Date(a.examSession.date).getTime() -
          new Date(b.examSession.date).getTime()
        );
      });
  }
}
