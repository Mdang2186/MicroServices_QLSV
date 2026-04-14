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
      },
    });

    return semester || { id: ref, code: null };
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

    if (semester.code) {
      return {
        OR: [
          { semesterId: semester.id },
          { courseClass: { semester: { code: semester.code } } },
        ],
      };
    }

    return { semesterId: semester.id };
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

    for (const s of schedules) {
      const { dayOfWeek, startShift, endShift, roomId } = s;
      if (!dayOfWeek || !startShift || !endShift) continue;

      if (Number(dayOfWeek) === 8) {
        throw new BadRequestException(
          'Lịch học không hợp lệ: Không xếp lịch vào Chủ nhật.',
        );
      }

      if (Number(dayOfWeek) < 2 || Number(dayOfWeek) > 7) {
        throw new BadRequestException(
          'Lịch học không hợp lệ: Thứ học phải nằm trong khoảng Thứ 2 đến Thứ 7.',
        );
      }

      const start = Number(startShift);
      const end = Number(endShift);

      // B. Ràng buộc chia ca UNETI: Sáng (1-6), Chiều (7-12), Tối (13-16)
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

      const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;

      // We perform conflict check on ClassSession because it represents the actual calendar.
      // Since we are checking a recurring 'dayOfWeek', we use a raw query or filtered subquery
      // to check if ANY session exists on that DOW at that time.

      // 1. Check Room Conflict
      if (roomId) {
        const roomConflict: any = await prisma.$queryRaw`
                    SELECT TOP 1 
                        s.startShift, s.endShift, cc.name as className, cc.code as classCode
                    FROM ClassSession s
                    JOIN CourseClass cc ON s.courseClassId = cc.id
                    WHERE s.semesterId = ${semesterId}
                      AND s.roomId = ${roomId}
                      AND s.courseClassId <> ${courseClassId || ''}
                      AND DATEPART(dw, s.date) = ${dayOfWeek === 8 ? 1 : dayOfWeek} 
                      AND (
                          (${start} >= s.startShift AND ${start} <= s.endShift) OR
                          (${end} >= s.startShift AND ${end} <= s.endShift) OR
                          (s.startShift >= ${start} AND s.startShift <= ${end})
                      )
                `;

        if (roomConflict && roomConflict.length > 0) {
          throw new BadRequestException(
            `Trùng phòng học! Phòng đã được lớp "${roomConflict[0].className || roomConflict[0].classCode}" sử dụng vào ${dayLabel}, tiết ${roomConflict[0].startShift}-${roomConflict[0].endShift}.`,
          );
        }
      }

      // 2. Check Lecturer Conflict
      if (lecturerId) {
        const lecturerConflict: any = await prisma.$queryRaw`
                    SELECT TOP 1 
                        s.startShift, s.endShift, cc.name as className, cc.code as classCode
                    FROM ClassSession s
                    JOIN CourseClass cc ON s.courseClassId = cc.id
                    WHERE s.semesterId = ${semesterId}
                      AND cc.lecturerId = ${lecturerId}
                      AND cc.id <> ${courseClassId || ''}
                      AND DATEPART(dw, s.date) = ${dayOfWeek === 8 ? 1 : dayOfWeek}
                      AND (
                          (${start} >= s.startShift AND ${start} <= s.endShift) OR
                          (${end} >= s.startShift AND ${end} <= s.endShift) OR
                          (s.startShift >= ${start} AND s.startShift <= ${end})
                      )
                `;

        if (lecturerConflict && lecturerConflict.length > 0) {
          throw new BadRequestException(
            `Trùng lịch giảng viên! Giảng viên đã có lịch dạy lớp "${lecturerConflict[0].className || lecturerConflict[0].classCode}" vào ${dayLabel}, tiết ${lecturerConflict[0].startShift}-${lecturerConflict[0].endShift}.`,
          );
        }
      }

      // 3. Check Admin Class Conflict
      if (adminClassIds && adminClassIds.length > 0) {
        const acConflict: any = await prisma.$queryRaw`
                    SELECT TOP 1 
                        s.startShift, s.endShift, cc.name as className, cc.code as classCode, ac.code as adminClassCode
                    FROM ClassSession s
                    JOIN CourseClass cc ON s.courseClassId = cc.id
                    JOIN _AdminClassToCourseClass map ON cc.id = map.B
                    JOIN AdminClass ac ON map.A = ac.id
                    WHERE s.semesterId = ${semesterId}
                      AND ac.id IN (${adminClassIds.join(',')})
                      AND cc.id <> ${courseClassId || ''}
                      AND DATEPART(dw, s.date) = ${dayOfWeek === 8 ? 1 : dayOfWeek}
                      AND (
                          (${start} >= s.startShift AND ${start} <= s.endShift) OR
                          (${end} >= s.startShift AND ${end} <= s.endShift) OR
                          (s.startShift >= ${start} AND s.startShift <= ${end})
                      )
                `;

        if (acConflict && acConflict.length > 0) {
          throw new BadRequestException(
            `Trùng lịch lớp hành chính! Lớp "${acConflict[0].adminClassCode}" đã có lịch học môn "${acConflict[0].className}" vào ${dayLabel}, tiết ${acConflict[0].startShift}-${acConflict[0].endShift}.`,
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
    tx?: any,
  ) {
    const prisma = tx || this.prisma;
    const start = Number(startShift);
    const end = Number(endShift);

    const baseWhere = {
      semesterId,
      date,
      id: excludeSessionId ? { not: excludeSessionId } : undefined,
      OR: [
        { startShift: { lte: start }, endShift: { gte: start } },
        { startShift: { lte: end }, endShift: { gte: end } },
        { startShift: { gte: start }, endShift: { lte: end } },
      ],
    };

    if (roomId) {
      const roomConflict = await prisma.classSession.findFirst({
        where: { ...baseWhere, roomId },
        include: { courseClass: true },
      });
      if (roomConflict)
        throw new BadRequestException(
          `Phòng học bị trùng với lớp "${roomConflict.courseClass.name}" (Tiết ${roomConflict.startShift}-${roomConflict.endShift}).`,
        );
    }

    if (lecturerId) {
      const lecturerConflict = await prisma.classSession.findFirst({
        where: { ...baseWhere, courseClass: { lecturerId } },
        include: { courseClass: true },
      });
      if (lecturerConflict)
        throw new BadRequestException(
          `Giảng viên bị trùng lịch với lớp "${lecturerConflict.courseClass.name}" (Tiết ${lecturerConflict.startShift}-${lecturerConflict.endShift}).`,
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
          `Lớp hành chính "${acCode}" bị trùng lịch học môn "${adminConflict.courseClass.name}".`,
        );
      }
    }
  }

  async findAll(filters: {
    subjectId?: string;
    semesterId?: string;
    facultyId?: string;
    majorId?: string;
    cohort?: string;
    page?: number;
    limit?: number;
  }) {
    const { subjectId, semesterId, facultyId, majorId, cohort, page = 1, limit = 50 } = filters;
    const whereArgs: any = {};

    if (subjectId) whereArgs.subjectId = subjectId;
    if (semesterId) whereArgs.semesterId = semesterId;
    if (majorId) whereArgs.subject = { ...whereArgs.subject, majorId };
    if (facultyId)
      whereArgs.subject = {
        ...whereArgs.subject,
        major: { ...whereArgs.subject?.major, facultyId },
      };
    if (cohort) whereArgs.cohort = cohort;

    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.courseClass.count({ where: whereArgs }),
      this.prisma.courseClass.findMany({
        where: whereArgs,
        skip,
        take: limit,
        orderBy: { code: 'asc' },
        include: {
          lecturer: true,
          subject: {
            include: {
              major: true,
              department: true,
            },
          },
          semester: true,
          _count: {
            select: { enrollments: true },
          },
        },
      }),
    ]);

    return {
      data,
      metadata: {
        total,
        page,
        limit,
        lastPage: Math.ceil(total / limit),
      },
    };
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

  async rescheduleSession(
    sessionId: string,
    data: {
      date: Date;
      roomId: string;
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

      // Comprehensive discrete conflict check
      const cc = await tx.courseClass.findUnique({
        where: { id: session.courseClassId },
        include: { adminClasses: true },
      });
      await this.checkDiscreteConflict(
        session.semesterId,
        data.date,
        data.startShift,
        data.endShift,
        data.roomId,
        cc?.lecturerId,
        cc?.adminClasses.map((a) => a.id),
        sessionId,
        tx,
      );

      return tx.classSession.update({
        where: { id: sessionId },
        data: {
          date: data.date,
          roomId: data.roomId,
          startShift: data.startShift,
          endShift: data.endShift,
          note: data.note || session.note,
        },
      });
    });
  }

  async addManualSession(
    courseClassId: string,
    data: {
      date: Date;
      roomId: string;
      startShift: number;
      endShift: number;
      type: string;
      note: string;
    },
  ) {
    const courseClass = await this.prisma.courseClass.findUnique({
      where: { id: courseClassId },
      include: { adminClasses: true },
    });
    if (!courseClass)
      throw new BadRequestException('Lớp học phần không tồn tại.');

    await this.checkDiscreteConflict(
      courseClass.semesterId,
      data.date,
      data.startShift,
      data.endShift,
      data.roomId,
      courseClass.lecturerId || undefined,
      courseClass.adminClasses.map((a) => a.id),
    );

    return this.prisma.classSession.create({
      data: {
        courseClassId,
        semesterId: courseClass.semesterId,
        date: data.date,
        roomId: data.roomId,
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
        let targetSemesterId = semesterId;
        if (!targetSemesterId) {
          const existing = await tx.courseClass.findUnique({
            where: { id },
            select: { semesterId: true },
          });
          targetSemesterId = existing?.semesterId;
        }

        await this.checkSemesterLock(targetSemesterId, tx);

        // Conflict check if schedules provided
        if (schedules && schedules.length > 0) {
          await this.checkConflicts(
            id,
            targetSemesterId,
            schedules,
            lecturerId,
            adminClassIds,
            tx,
          );
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

    await tx.studentFee.upsert({
      where: { id: `tuition-${studentId}-${semesterId}` },
      update: {
        totalAmount: totalTuition,
        finalAmount: totalTuition,
        paidAmount: paidTuition,
        status:
          paidTuition >= totalTuition
            ? 'PAID'
            : paidTuition > 0
              ? 'PARTIAL'
              : 'DEBT',
      },
      create: {
        id: `tuition-${studentId}-${semesterId}`,
        studentId,
        semesterId,
        feeType: 'TUITION',
        name: feeName,
        totalAmount: totalTuition,
        discountAmount: 0,
        finalAmount: totalTuition,
        paidAmount: paidTuition,
        status:
          paidTuition >= totalTuition
            ? 'PAID'
            : paidTuition > 0
              ? 'PARTIAL'
              : 'DEBT',
        isMandatory: true,
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
}
