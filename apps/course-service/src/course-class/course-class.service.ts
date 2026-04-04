import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';
import { SessionGenerator } from './session-generator.util';

const TTL_30MIN = 30 * 60 * 1000;
const TTL_10MIN = 10 * 60 * 1000;
const TTL_30SEC = 30 * 1000;

@Injectable()
export class CourseClassService {
    constructor(private prisma: PrismaService, private cache: CacheService) { }

    private async checkSemesterLock(semesterId: string, tx?: any) {
        const prisma = tx || this.prisma;
        const semester = await prisma.semester.findUnique({
            where: { id: semesterId },
            select: { isCurrent: true }
        });

        if (!semester?.isCurrent) {
            throw new BadRequestException("Thao tác không hợp lệ: Chỉ có thể thay đổi dữ liệu của học kỳ hiện tại.");
        }
    }

    private async checkConflicts(courseClassId: string | null, semesterId: string, schedules: any[], lecturerId?: string, adminClassIds?: string[], tx?: any) {
        if (!schedules || schedules.length === 0) return;
        const prisma = tx || this.prisma;

        for (const s of schedules) {
            const { dayOfWeek, startShift, endShift, roomId } = s;
            if (!dayOfWeek || !startShift || !endShift) continue;

            const start = Number(startShift);
            const end = Number(endShift);

            // B. Ràng buộc chia ca UNETI: Sáng (1-6), Chiều (7-12), Tối (13-16)
            if (start <= 6 && end >= 7) {
                throw new BadRequestException("Lịch học không hợp lệ: Không được xếp lịch vắt ngang ca Sáng và Chiều (giữa tiết 6 và 7).");
            }
            if (start <= 12 && end >= 13) {
                throw new BadRequestException("Lịch học không hợp lệ: Không được xếp lịch vắt ngang ca Chiều và Tối (giữa tiết 12 và 13).");
            }

            let currentCampus = null;

            // 1. Check Room Conflict
            if (roomId) {
                const roomConflict = await prisma.classSchedule.findFirst({
                    where: {
                        semesterId,
                        roomId,
                        dayOfWeek: Number(dayOfWeek),
                        courseClassId: courseClassId ? { not: courseClassId } : undefined,
                        OR: [
                            { startShift: { lte: Number(startShift) }, endShift: { gte: Number(startShift) } },
                            { startShift: { lte: Number(endShift) }, endShift: { gte: Number(endShift) } },
                            { startShift: { gte: Number(startShift) }, endShift: { lte: Number(endShift) } }
                        ]
                    },
                    include: { courseClass: { include: { subject: true } }, room: true }
                });
                if (roomConflict) {
                    const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;
                    throw new BadRequestException(
                        `Trùng phòng học! Phòng ${roomConflict.room?.name} đã được lớp "${roomConflict.courseClass?.name || roomConflict.courseClass?.code}" sử dụng vào ${dayLabel}, tiết ${roomConflict.startShift}-${roomConflict.endShift}.`
                    );
                }

                const roomInfo = await prisma.room.findUnique({ where: { id: roomId } });
                currentCampus = roomInfo?.campus;
            }

            // 2. Check Lecturer Conflict & Campus Distance
            if (lecturerId) {
                const lecturerConflict = await prisma.classSchedule.findFirst({
                    where: {
                        semesterId,
                        dayOfWeek: Number(dayOfWeek),
                        courseClassId: courseClassId ? { not: courseClassId } : undefined,
                        courseClass: { lecturerId },
                        OR: [
                            { startShift: { lte: Number(startShift) }, endShift: { gte: Number(startShift) } },
                            { startShift: { lte: Number(endShift) }, endShift: { gte: Number(endShift) } },
                            { startShift: { gte: Number(startShift) }, endShift: { lte: Number(endShift) } }
                        ]
                    },
                    include: { courseClass: { include: { subject: true } } }
                });
                if (lecturerConflict) {
                    const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;
                    throw new BadRequestException(
                        `Trùng lịch giảng viên! Giảng viên đã được xếp dạy lớp "${lecturerConflict.courseClass?.name || lecturerConflict.courseClass?.code}" vào ${dayLabel}, tiết ${lecturerConflict.startShift}-${lecturerConflict.endShift}.`
                    );
                }

                // C. Ràng buộc Không gian (Geographic Distance) chéo cơ sở
                if (currentCampus) {
                    const sameDaySchedules = await prisma.classSchedule.findFirst({
                        where: {
                            semesterId,
                            dayOfWeek: Number(dayOfWeek),
                            courseClassId: courseClassId ? { not: courseClassId } : undefined,
                            courseClass: { lecturerId },
                            room: { campus: { not: currentCampus, notIn: [null, ""] } }
                        },
                        include: { courseClass: true, room: true }
                    });
                    if (sameDaySchedules) {
                        const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;
                        throw new BadRequestException(
                            `Trùng cơ sở giảng dạy! Giảng viên không thể dạy tại cơ sở "${currentCampus}" vì đã có lịch dạy tại cơ sở "${sameDaySchedules.room?.campus}" trong cùng ngày ${dayLabel}.`
                        );
                    }
                }
            }

            // 3. Check Admin Class Conflict & Campus Distance
            if (adminClassIds && adminClassIds.length > 0) {
                const adminClassConflict = await prisma.classSchedule.findFirst({
                    where: {
                        semesterId,
                        dayOfWeek: Number(dayOfWeek),
                        courseClassId: courseClassId ? { not: courseClassId } : undefined,
                        courseClass: {
                            adminClasses: {
                                some: { id: { in: adminClassIds } }
                            }
                        },
                        OR: [
                            { startShift: { lte: Number(startShift) }, endShift: { gte: Number(startShift) } },
                            { startShift: { lte: Number(endShift) }, endShift: { gte: Number(endShift) } },
                            { startShift: { gte: Number(startShift) }, endShift: { lte: Number(endShift) } }
                        ]
                    },
                    include: { courseClass: { include: { adminClasses: true, subject: true } } }
                });
                if (adminClassConflict) {
                    const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;
                    const conflictedAdminClass = adminClassConflict.courseClass.adminClasses.find(ac => adminClassIds.includes(ac.id));
                    throw new BadRequestException(
                        `Trùng lịch lớp hành chính! Lớp "${conflictedAdminClass?.code}" đã có lịch học môn "${adminClassConflict.courseClass?.name || adminClassConflict.courseClass?.code}" vào ${dayLabel}, tiết ${adminClassConflict.startShift}-${adminClassConflict.endShift}.`
                    );
                }

                // C. Ràng buộc Không gian chéo cơ sở cho lớp hành chính
                if (currentCampus) {
                    const sameDayAdminClassSchedules = await prisma.classSchedule.findFirst({
                        where: {
                            semesterId,
                            dayOfWeek: Number(dayOfWeek),
                            courseClassId: courseClassId ? { not: courseClassId } : undefined,
                            courseClass: { adminClasses: { some: { id: { in: adminClassIds } } } },
                            room: { campus: { not: currentCampus, notIn: [null, ""] } }
                        },
                        include: { courseClass: { include: { adminClasses: true } }, room: true }
                    });
                    if (sameDayAdminClassSchedules) {
                        const dayLabel = dayOfWeek === 8 ? 'CN' : `Thứ ${dayOfWeek}`;
                        const conflictedAdminClass = sameDayAdminClassSchedules.courseClass.adminClasses.find(ac => adminClassIds.includes(ac.id));
                        throw new BadRequestException(
                            `Trùng cơ sở học tập! Lớp hành chính "${conflictedAdminClass?.code}" không thể học tại cơ sở "${currentCampus}" vì đã có lịch tại cơ sở "${sameDayAdminClassSchedules.room?.campus}" trong cùng ngày ${dayLabel}.`
                        );
                    }
                }
            }
        }
    }

    async findAll(subjectId?: string, semesterId?: string) {
        const whereArgs: any = {};
        if (subjectId) whereArgs.subjectId = subjectId;
        if (semesterId) whereArgs.semesterId = semesterId;

        return this.prisma.courseClass.findMany({
            where: whereArgs,
            include: {
                lecturer: true,
                subject: true,
                semester: true,
                adminClasses: { include: { _count: { select: { students: true } } } },
                schedules: { include: { room: true } },
                _count: {
                    select: { enrollments: true }
                }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.courseClass.findUnique({
            where: { id },
            include: {
                lecturer: true,
                subject: true,
                semester: true,
                adminClasses: { include: { _count: { select: { students: true } } } },
                schedules: { include: { room: true } },
                sessions: { include: { room: true } },
                _count: {
                    select: { enrollments: true }
                }
            }
        });
    }

    async getFaculties() {
        return this.cache.getOrSet('faculties:all', TTL_30MIN, () =>
            this.prisma.faculty.findMany({ orderBy: { name: 'asc' } })
        );
    }

    async getSubjectsByFaculty(facultyId?: string, majorId?: string, semesterId?: string) {
        // Cache key encodes all filter params
        const cacheKey = `subjects:${facultyId || '*'}:${majorId || '*'}:${semesterId || '*'}`;

        return this.cache.getOrSet(cacheKey, TTL_10MIN, async () => {
            let subjects: any[];
            if (majorId) {
                subjects = await this.prisma.subject.findMany({
                    where: { majorId },
                    include: { major: { include: { faculty: true } } }
                });
            } else if (facultyId) {
                subjects = await this.prisma.subject.findMany({
                    where: { major: { facultyId } },
                    include: { major: { include: { faculty: true } } }
                });
            } else {
                subjects = await this.prisma.subject.findMany({
                    include: { major: { include: { faculty: true } } }
                });
            }

            if (semesterId) {
                const classCounts = await this.prisma.courseClass.groupBy({
                    by: ['subjectId'],
                    where: { semesterId },
                    _count: { id: true }
                });
                const countMap = new Map(classCounts.map(c => [c.subjectId, c._count.id]));
                return subjects.map(s => ({ ...s, classCountInSemester: countMap.get(s.id) || 0 }));
            }

            return subjects.map(s => ({ ...s, classCountInSemester: 0 }));
        });
    }

    async getAdminClassesByMajor(majorId?: string) {
        const cacheKey = `adminClasses:major:${majorId || '*'}`;
        return this.cache.getOrSet(cacheKey, TTL_10MIN, () => {
            const where: any = {};
            if (majorId) where.majorId = majorId;
            return this.prisma.adminClass.findMany({
                where,
                include: { _count: { select: { students: true } } }
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
                orderBy: { fullName: 'asc' }
            });
        });
    }

    async getLecturerSchedule(lecturerId: string, semesterId: string, excludeId?: string) {
        return this.prisma.classSchedule.findMany({
            where: {
                semesterId,
                courseClass: { 
                    lecturerId,
                    id: excludeId ? { not: excludeId } : undefined,
                    status: { not: 'CANCELLED' } // Bỏ qua các lớp bị hủy
                }
            },
            include: {
                courseClass: { include: { subject: true } },
                room: true
            }
        });
    }

    async getLecturerSessions(lecturerId: string, startDate: Date, endDate: Date) {
        return this.prisma.classSession.findMany({
            where: {
                date: { gte: startDate, lte: endDate },
                courseClass: { lecturerId }
            },
            include: {
                courseClass: {
                    include: { subject: true }
                },
                room: true
            },
            orderBy: [{ date: 'asc' }, { startShift: 'asc' }]
        });
    }

    async getAdminClassesSchedule(adminClassIds: string[], semesterId: string, excludeId?: string) {
        return this.prisma.classSchedule.findMany({
            where: {
                semesterId,
                courseClass: {
                    id: excludeId ? { not: excludeId } : undefined,
                    adminClasses: {
                        some: { id: { in: adminClassIds } }
                    }
                }
            },
            include: {
                courseClass: { include: { subject: true, adminClasses: true } },
                room: true
            }
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
                orderBy: { name: 'asc' }
            });
        });
    }

    async findByLecturerId(lecturerId: string, semesterId?: string) {
        const where: any = { lecturerId };
        if (semesterId) where.semesterId = semesterId;

        return this.prisma.courseClass.findMany({
            where,
            include: {
                lecturer: true,
                subject: true,
                semester: true,
                adminClasses: true,
                schedules: {
                    include: {
                        room: true
                    }
                },
                sessions: {
                    include: {
                        room: true
                    }
                },
                _count: {
                    select: { enrollments: true }
                }
            }
        });
    }

    async create(data: any) {
        const { adminClassIds, subjectId, semesterId, lecturerId, maxSlots, status, schedules } = data;

        return this.prisma.$transaction(async (tx) => {
            await this.checkSemesterLock(semesterId, tx);

            const subject = await tx.subject.findUnique({ where: { id: subjectId } });
            const semester = await tx.semester.findUnique({ where: { id: semesterId } });

            if (!subject || !semester) {
                throw new BadRequestException("Học phần hoặc Học kỳ không tồn tại.");
            }

            // Generate formula-based code
            const classCount = await tx.courseClass.count({ where: { subjectId, semesterId } });
            const sequence = String(classCount + 1).padStart(2, '0');
            const yearSuffix = String(semester.year).slice(-2) + String(semester.year + 1).slice(-2); // e.g., 2026 -> 2627
            // Semester term mapping: HK1 -> HK1, HK2 -> HK2, HKH -> HKH
            const term = semester.code.includes('HK1') ? 'HK1' : semester.code.includes('HK2') ? 'HK2' : 'HKH';

            let adminClassCode = '';
            if (adminClassIds && adminClassIds.length > 0) {
                const ac = await tx.adminClass.findUnique({ where: { id: adminClassIds[0] } });
                adminClassCode = ac?.code || '';
            }

            const generatedCode = `CCLASS_${subject.code}_${term}_${sequence}_${yearSuffix}`;
            const generatedName = adminClassCode 
                ? `${subject.name} - ${adminClassCode}` 
                : `${subject.name} - Nhóm ${sequence}`;

            await this.checkConflicts(null, semesterId, schedules, lecturerId, adminClassIds, tx);

            const created = await tx.courseClass.create({
                data: {
                    id: generatedCode,
                    code: generatedCode,
                    name: generatedName,
                    maxSlots: maxSlots ? Number(maxSlots) : 60,
                    status: status || 'OPEN',
                    subject: { connect: { id: subjectId } },
                    semester: { connect: { id: semesterId } },
                    lecturer: lecturerId ? { connect: { id: lecturerId } } : undefined,
                    adminClasses: adminClassIds ? {
                        connect: (adminClassIds as string[]).map(id => ({ id }))
                    } : undefined,
                    schedules: schedules ? {
                        create: (schedules as any[]).map(s => ({
                            roomId: s.roomId || null,
                            semesterId: semesterId,
                            dayOfWeek: Number(s.dayOfWeek),
                            startShift: Number(s.startShift),
                            endShift: Number(s.endShift),
                            type: s.type || 'THEORY'
                        }))
                    } : undefined
                },
                include: {
                    subject: true,
                    semester: true,
                    lecturer: true,
                    adminClasses: true,
                    schedules: { include: { room: true } }
                }
            });

            // Auto-generate discrete sessions
            if (schedules && schedules.length > 0) {
                const sessionsData = SessionGenerator.generateSessionsData(
                    created.id,
                    semesterId,
                    semester.startDate,
                    semester.endDate,
                    schedules
                );
                await tx.classSession.createMany({ data: sessionsData });
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
            orderBy: [{ date: 'asc' }, { startShift: 'asc' }]
        });
    }

    async rescheduleSession(sessionId: string, data: { date: Date, roomId: string, startShift: number, endShift: number, note?: string }) {
        return this.prisma.$transaction(async (tx) => {
            const session = await tx.classSession.findUnique({ 
                where: { id: sessionId },
                include: { courseClass: true }
            });
            if (!session) throw new BadRequestException("Không tìm thấy buổi học.");

            await this.checkSemesterLock(session.semesterId, tx);

            // Simple conflict check for manual reschedule (Only checking room for now)
            const conflict = await tx.classSession.findFirst({
                where: {
                    id: { not: sessionId },
                    semesterId: session.semesterId,
                    roomId: data.roomId,
                    date: data.date,
                    OR: [
                        { startShift: { lte: data.startShift }, endShift: { gte: data.startShift } },
                        { startShift: { lte: data.endShift }, endShift: { gte: data.endShift } }
                    ]
                }
            });
            if (conflict) {
                throw new BadRequestException(`Phòng học đã bị trùng lịch với lớp khác tại thời điểm này.`);
            }

            return tx.classSession.update({
                where: { id: sessionId },
                data: {
                    date: data.date,
                    roomId: data.roomId,
                    startShift: data.startShift,
                    endShift: data.endShift,
                    note: data.note || session.note
                }
            });
        });
    }

    async addManualSession(courseClassId: string, data: { date: Date, roomId: string, startShift: number, endShift: number, type: string, note: string }) {
        const courseClass = await this.prisma.courseClass.findUnique({ where: { id: courseClassId } });
        if (!courseClass) throw new BadRequestException("Lớp học phần không tồn tại.");

        return this.prisma.classSession.create({
            data: {
                courseClassId,
                semesterId: courseClass.semesterId,
                date: data.date,
                roomId: data.roomId,
                startShift: data.startShift,
                endShift: data.endShift,
                type: data.type,
                note: data.note
            }
        });
    }

    async deleteSession(sessionId: string) {
        const session = await this.prisma.classSession.findUnique({ where: { id: sessionId } });
        if (session) {
            await this.checkSemesterLock(session.semesterId);
        }
        return this.prisma.classSession.delete({
            where: { id: sessionId }
        });
    }

    async generateSessionsInRange(courseClassId: string, data: { startDate: Date, endDate: Date, schedules: any[], clearExisting: boolean }) {
        const courseClass = await this.prisma.courseClass.findUnique({ where: { id: courseClassId } });
        if (!courseClass) throw new BadRequestException("Lớp học phần không tồn tại.");

        await this.checkSemesterLock(courseClass.semesterId);

        const sessionsData = SessionGenerator.generateSessionsData(
            courseClassId,
            courseClass.semesterId,
            data.startDate,
            data.endDate,
            data.schedules
        );

        return this.prisma.$transaction(async (tx) => {
            if (data.clearExisting) {
                await tx.classSession.deleteMany({
                    where: { 
                        courseClassId,
                        date: { gte: data.startDate, lte: data.endDate }
                    }
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
                const { adminClassIds, subjectId, semesterId, lecturerId, code, name, maxSlots, status, schedules } = item;

                await this.checkSemesterLock(semesterId, tx);
                await this.checkConflicts(null, semesterId, schedules, lecturerId, adminClassIds, tx);

                const created = await tx.courseClass.create({
                    data: {
                        code,
                        name: name || `Lớp ${code}`,
                        maxSlots: maxSlots ? Number(maxSlots) : 60,
                        status: status || 'OPEN',
                        subject: { connect: { id: subjectId } },
                        semester: { connect: { id: semesterId } },
                        lecturer: lecturerId ? { connect: { id: lecturerId } } : undefined,
                        adminClasses: adminClassIds ? {
                            connect: (adminClassIds as string[]).map(id => ({ id }))
                        } : undefined,
                        schedules: schedules ? {
                            create: (schedules as any[]).map(s => ({
                                roomId: s.roomId || null,
                                semesterId: semesterId,
                                dayOfWeek: Number(s.dayOfWeek),
                                startShift: Number(s.startShift),
                                endShift: Number(s.endShift),
                                type: s.type || 'THEORY'
                            }))
                        } : undefined
                    }
                });
                results.push(created);
            }
            // Invalidate cache
            this.cache.invalidatePrefix('subjects:');
            this.cache.invalidatePrefix('adminClasses:');
            return results;
        });
    }

    async bulkImportByCode(data: { items: any[], semesterId: string }) {
        const { items, semesterId } = data;
        
        return this.prisma.$transaction(async (tx) => {
            const results = [];
            for (const item of items) {
                const { subjectCode, lecturerCode, adminClassCodes, maxSlots, schedules } = item;

                const subject = await tx.subject.findUnique({ where: { code: subjectCode } });
                const lecturer = lecturerCode ? await tx.lecturer.findUnique({ where: { lectureCode: lecturerCode } }) : null;
                const adminClasses = adminClassCodes ? await tx.adminClass.findMany({ where: { code: { in: adminClassCodes } } }) : [];

                // Resolve rooms by name if possible
                const enrichedSchedules = await Promise.all(schedules.map(async (s: any) => {
                    if (s.roomName) {
                        const room = await tx.room.findUnique({ where: { name: s.roomName } });
                        return { ...s, roomId: room?.id || null };
                    }
                    return s;
                }));

                const created = await this.create({
                    subjectId: subject?.id,
                    semesterId,
                    lecturerId: lecturer?.id,
                    adminClassIds: adminClasses.map(ac => ac.id),
                    maxSlots,
                    schedules: enrichedSchedules
                });
                results.push(created);
            }
            return { count: results.length };
        });
    }

    async update(id: string, data: any) {
        const { adminClassIds, subjectId, semesterId, lecturerId, code, name, maxSlots, status, schedules } = data;

        return this.prisma.$transaction(async (tx) => {
            try {
                let targetSemesterId = semesterId;
                if (!targetSemesterId) {
                    const existing = await tx.courseClass.findUnique({ where: { id }, select: { semesterId: true } });
                    targetSemesterId = existing?.semesterId;
                }

                await this.checkSemesterLock(targetSemesterId, tx);

                if (schedules) {
                    await this.checkConflicts(id, targetSemesterId, schedules, lecturerId, adminClassIds, tx);
                    await tx.classSchedule.deleteMany({
                        where: { courseClassId: id }
                    });
                }

                const updated = await tx.courseClass.update({
                    where: { id },
                    data: {
                        // code and name are now locked, but we keep them updatable via service if needed
                        maxSlots: maxSlots ? Number(maxSlots) : undefined,
                        status,
                        lecturer: lecturerId !== undefined ? (lecturerId ? { connect: { id: lecturerId } } : { disconnect: true }) : undefined,
                        adminClasses: adminClassIds ? {
                            set: (adminClassIds as string[]).map(id => ({ id }))
                        } : undefined,
                        schedules: schedules ? {
                            create: (schedules as any[]).map(s => ({
                                roomId: s.roomId || null,
                                semesterId: targetSemesterId,
                                dayOfWeek: Number(s.dayOfWeek),
                                startShift: Number(s.startShift),
                                endShift: Number(s.endShift),
                                type: s.type || 'THEORY'
                            }))
                        } : undefined
                    },
                    include: {
                        subject: true,
                        semester: true,
                        lecturer: true,
                        adminClasses: true,
                        schedules: { include: { room: true } }
                    }
                });

                // Invalidate cache
                this.cache.invalidatePrefix('subjects:');
                this.cache.invalidatePrefix('adminClasses:');
                this.cache.invalidatePrefix('lecturers:');
                return updated;
            } catch (error) {
                console.error("CourseClassService.update error:", error);
                throw error;
            }
        });
    }

    async pushStudentsFromAdminClasses(courseClassId: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Get Course Class details with Subject, Associated Admin Classes, and its Schedules
            const courseClass = await tx.courseClass.findUnique({
                where: { id: courseClassId },
                include: {
                    subject: true,
                    schedules: true,
                    adminClasses: {
                        include: {
                            students: {
                                where: { status: 'STUDYING' }
                            }
                        }
                    },
                    _count: {
                        select: { enrollments: true }
                    }
                }
            });

            if (!courseClass) {
                throw new BadRequestException("Lớp học phần không tồn tại");
            }

            await this.checkSemesterLock(courseClass.semesterId, tx);

            // 2. Identify all potential students from nominal classes
            const allNominalStudents = courseClass.adminClasses.flatMap(ac => ac.students);
            const totalNominalCount = allNominalStudents.length;
            const studentIds = allNominalStudents.map(s => s.id);

            // 3. Filter out those who are already enrolled in this subject in this semester
            const existingEnrollments = await tx.enrollment.findMany({
                where: {
                    studentId: { in: studentIds },
                    courseClass: {
                        subjectId: courseClass.subjectId,
                        semesterId: courseClass.semesterId
                    }
                }
            });

            const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId));
            let potentialStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

            if (potentialStudentIds.length === 0) {
                return { 
                    message: `Lớp danh nghĩa có ${totalNominalCount} SV. Toàn bộ đã chuyển lớp hoặc đã ghi danh vào môn học này.`,
                    stats: { totalNominal: totalNominalCount, alreadyEnrolled: existingStudentIds.size, addedCount: 0, conflictedCount: 0 }
                };
            }

            // 4. PERFORM SCHEDULE CONFLICT CHECK
            // Fetch all schedules of other classes these students are currently in
            const otherSchedules = await tx.enrollment.findMany({
                where: {
                    studentId: { in: potentialStudentIds },
                    courseClass: {
                        semesterId: courseClass.semesterId,
                        id: { not: courseClassId }
                    }
                },
                select: {
                    studentId: true,
                    courseClass: {
                        select: {
                            schedules: true
                        }
                    }
                }
            });

            // Map student to their schedules
            const studentSchedulesMap: Record<string, any[]> = {};
            otherSchedules.forEach(os => {
                if (!studentSchedulesMap[os.studentId]) studentSchedulesMap[os.studentId] = [];
                studentSchedulesMap[os.studentId].push(...os.courseClass.schedules);
            });

            const finalStudentIds = [];
            let conflictedCount = 0;

            for (const studentId of potentialStudentIds) {
                const existingSchedules = studentSchedulesMap[studentId] || [];
                const isConflicted = this.checkConflictInternal(courseClass.schedules, existingSchedules);
                
                if (isConflicted) {
                    conflictedCount++;
                } else {
                    finalStudentIds.push(studentId);
                }
            }

            if (finalStudentIds.length === 0) {
                return {
                    message: `Đã xử lý lớp danh nghĩa. Không có sinh viên nào được thêm mới (Do trùng lịch: ${conflictedCount}, Đã đăng ký: ${existingStudentIds.size}).`,
                    stats: { totalNominal: totalNominalCount, alreadyEnrolled: existingStudentIds.size, addedCount: 0, conflictedCount }
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
                data: finalStudentIds.map(studentId => ({
                    studentId,
                    courseClassId: courseClassId,
                    status: 'REGISTERED',
                    isRetake: false,
                    tuitionFee: tuitionFee
                }))
            });

            // 7. Update currentSlots and potentially maxSlots
            await tx.courseClass.update({
                where: { id: courseClassId },
                data: { 
                    currentSlots: currentEnrolledSize + finalStudentIds.length,
                    maxSlots: updatedMaxSlots 
                }
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
                    conflictedCount
                }
            };
        });
    }

    // Helper to check conflict without throwing
    private checkConflictInternal(newSchedules: any[], existingSchedules: any[]) {
        for (const ns of newSchedules) {
            for (const es of existingSchedules) {
                if (Number(ns.dayOfWeek) === Number(es.dayOfWeek)) {
                    const hasOverlap = Math.max(Number(ns.startShift), Number(es.startShift)) <= Math.min(Number(ns.endShift), Number(es.endShift));
                    if (hasOverlap) return true;
                }
            }
        }
        return false;
    }

    private async syncTuitionInternal(studentId: string, semesterId: string, tx: any) {
        const enrollments = await tx.enrollment.findMany({
            where: { studentId, courseClass: { semesterId } },
            include: { courseClass: { include: { subject: true } } }
        });

        const totalTuition = enrollments.reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);
        const paidTuition = enrollments.filter(e => e.status === 'PAID').reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);
        
        const semester = await tx.semester.findUnique({ where: { id: semesterId } });
        const feeName = `Học phí ${semester?.name || semesterId}`;

        await tx.studentFee.upsert({
            where: { id: `tuition-${studentId}-${semesterId}` },
            update: {
                totalAmount: totalTuition,
                finalAmount: totalTuition,
                paidAmount: paidTuition,
                status: paidTuition >= totalTuition ? 'PAID' : (paidTuition > 0 ? 'PARTIAL' : 'DEBT')
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
                status: paidTuition >= totalTuition ? 'PAID' : (paidTuition > 0 ? 'PARTIAL' : 'DEBT'),
                isMandatory: true
            }
        });
    }

    async remove(id: string) {
        const existing = await this.prisma.courseClass.findUnique({ where: { id }, select: { semesterId: true } });
        if (existing) {
            await this.checkSemesterLock(existing.semesterId);
        }

        const deleted = await this.prisma.courseClass.delete({
            where: { id }
        });

        // Invalidate cache
        this.cache.invalidatePrefix('subjects:');
        this.cache.invalidatePrefix('adminClasses:');
        return deleted;
    }
}
