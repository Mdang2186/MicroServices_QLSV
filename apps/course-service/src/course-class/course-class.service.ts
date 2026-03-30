import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

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
                    id: excludeId ? { not: excludeId } : undefined
                }
            },
            include: {
                courseClass: { include: { subject: true } },
                room: true
            }
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

    async findByLecturerId(lecturerId: string) {
        return this.prisma.courseClass.findMany({
            where: { lecturerId },
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

            const generatedCode = `CCLASS_${subject.code}_${term}_${sequence}_${yearSuffix}`;
            const generatedName = `${subject.name} - Nhóm ${sequence}`;

            await this.checkConflicts(null, semesterId, schedules, lecturerId, adminClassIds, tx);

            const created = await tx.courseClass.create({
                data: {
                    id: generatedCode, // Use generated code as ID for consistency with screenshot
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

            // Invalidate cache
            this.cache.invalidatePrefix('subjects:');
            this.cache.invalidatePrefix('adminClasses:');
            return created;
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
            // 1. Get Course Class with Subject and Associated Admin Classes
            const courseClass = await tx.courseClass.findUnique({
                where: { id: courseClassId },
                include: {
                    subject: true,
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

            // 3. Filter out those who are already enrolled in this class OR any class of the same subject in this semester
            const existingEnrollments = await tx.enrollment.findMany({
                where: {
                    studentId: { in: studentIds },
                    courseClass: {
                        subjectId: courseClass.subjectId,
                        semesterId: courseClass.semesterId
                    }
                },
                select: { studentId: true }
            });

            const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId));
            const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id));

            if (newStudentIds.length === 0) {
                return { 
                    message: `Lớp danh nghĩa có ${totalNominalCount} SV. Toàn bộ đã chuyển lớp hoặc đã ghi danh vào môn học này.`,
                    stats: {
                        totalNominal: totalNominalCount,
                        alreadyEnrolled: existingStudentIds.size,
                        addedCount: 0,
                        availableSlots: courseClass.maxSlots - courseClass._count.enrollments
                    }
                };
            }

            // 4. Check available slots and auto-expand if necessary
            const currentEnrolled = courseClass._count.enrollments;
            const availableSlots = courseClass.maxSlots - currentEnrolled;
            
            let updatedMaxSlots = courseClass.maxSlots;

            if (newStudentIds.length > availableSlots) {
                // Auto-expand maxSlots to fit all nominal students
                updatedMaxSlots = currentEnrolled + newStudentIds.length;
            }

            // 5. Create Enrollments with Tuition Fee
            const creditPrice = 500000; // Standard price per credit
            const tuitionFee = (courseClass.subject.credits || 0) * creditPrice;

            await tx.enrollment.createMany({
                data: newStudentIds.map(studentId => ({
                    studentId,
                    courseClassId: courseClassId,
                    status: 'REGISTERED',
                    isRetake: false,
                    tuitionFee: tuitionFee
                }))
            });

            // 6. Update currentSlots for the course class
            const totalEnrolled = currentEnrolled + newStudentIds.length;
            await tx.courseClass.update({
                where: { id: courseClassId },
                data: { 
                    currentSlots: totalEnrolled,
                    maxSlots: updatedMaxSlots // Override maxSlots if needed
                }
            });

            // Invalidate cache
            this.cache.invalidatePrefix('subjects:');

            return {
                message: `Đã đẩy thành công ${newStudentIds.length} sinh viên vào lớp học phần.`,
                stats: {
                    totalNominal: totalNominalCount,
                    alreadyEnrolled: existingStudentIds.size,
                    addedCount: newStudentIds.length,
                    availableSlots: courseClass.maxSlots - totalEnrolled
                }
            };
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
