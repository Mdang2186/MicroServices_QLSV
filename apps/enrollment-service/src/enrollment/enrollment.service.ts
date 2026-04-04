import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Redis } from 'ioredis';
import Redlock from 'redlock';

@Injectable()
export class EnrollmentService {
    private redlock: Redlock | null = null;
    private redisClient: Redis | null = null;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService
    ) {
        this.initRedis();
    }

    private initRedis() {
        const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';

        try {
            this.redisClient = new Redis(redisUrl, {
                maxRetriesPerRequest: 1, // Fail fast to use SQL fallback
                retryStrategy(times) {
                    return Math.min(times * 100, 2000);
                },
                connectTimeout: 2000,
            });

            this.redisClient.on('error', (err) => {
                console.warn('[Redis] Connection Issue (Enrollment):', err.message);
            });

            this.redisClient.on('connect', () => {
                console.log('[Redis] Connected (Enrollment) for Distributed Locking.');
            });

            this.redlock = new Redlock([this.redisClient], {
                driftFactor: 0.01,
                retryCount: 2,
                retryDelay: 150,
                retryJitter: 50,
            });

            this.redlock.on('error', (err) => {
                // Ignore lock release errors during connection blips
                if (err instanceof Error && err.name === 'LockError') return;
                console.warn('[Redlock] Issue:', err.message);
            });

        } catch (error) {
            console.warn('[Redis] Integration failed, falling back to pure SQL Server mode.');
        }
    }

    private async acquireLock(classId: string): Promise<any | null> {
        if (!this.redlock || !this.redisClient || this.redisClient.status !== 'ready') {
            return null;
        }

        const resource = `locks:registration:class:${classId}`;
        const ttl = 4000;

        try {
            return await this.redlock.acquire([resource], ttl);
        } catch (err) {
            // If it's a connection error, we fall back to SQL
            if (this.redisClient.status !== 'ready') return null;
            // If it's actually busy, we respect the lock
            throw new BadRequestException('Lớp học đang có lưu lượng truy cập cao, vui lòng thử lại sau giây lát.');
        }
    }

    async registerCourse(studentIdOrUserId: string, classId: string) {
        // --- HYBRID LOCKING ---
        // 1. Try Redis Lock (Fast distributed lock)
        // 2. Fallback to SQL Atomic transaction if Redis is down
        const lock = await this.acquireLock(classId);

        try {
            // Transaction to prevent race conditions (Database isolation)
            return await this.prisma.$transaction(async (tx) => {
                // Resolve StudentId
                let student = await tx.student.findUnique({
                    where: { id: studentIdOrUserId },
                    include: { major: true }
                });
                if (!student) {
                    student = await tx.student.findUnique({
                        where: { userId: studentIdOrUserId },
                        include: { major: true }
                    });
                }
                if (!student) throw new NotFoundException('Sinh viên không tồn tại');
                const studentId = student.id;

                // 1. Get Class Info
                const courseClass = await tx.courseClass.findUnique({
                    where: { id: classId },
                    include: {
                        subject: { include: { prerequisites: true } },
                        schedules: { include: { room: true } },
                        semester: true
                    }
                });

                if (!courseClass) throw new NotFoundException('Lớp học phần không tồn tại');

                // 2. Check Slot and Status (Initial check)
                if (courseClass.status !== 'OPEN') {
                    throw new BadRequestException('Lớp học phần chưa mở hoặc đã đóng đăng ký');
                }
                if (courseClass.currentSlots >= courseClass.maxSlots) {
                    throw new BadRequestException('Lớp đã hết chỗ (Class is full)');
                }

                // 3. Duplication check
                const existing = await tx.enrollment.findUnique({
                    where: { studentId_courseClassId: { studentId, courseClassId: classId } }
                });
                if (existing) throw new BadRequestException('Bạn đã đăng ký lớp học này rồi');

                const sameSubjectEnrollment = await tx.enrollment.findFirst({
                    where: {
                        studentId,
                        courseClass: {
                            subjectId: courseClass.subjectId,
                            semesterId: courseClass.semesterId
                        }
                    }
                });
                if (sameSubjectEnrollment) throw new BadRequestException('Bạn đã đăng ký một lớp khác của môn học này trong học kỳ');

                // 4. Prerequisite Check
                for (const prereq of courseClass.subject.prerequisites) {
                    const passed = await tx.grade.findFirst({
                        where: {
                            studentId,
                            subjectId: prereq.prerequisiteId,
                            totalScore10: { gte: 4.0 }
                        }
                    });
                    if (!passed) {
                        const subj = await tx.subject.findUnique({ where: { id: prereq.prerequisiteId } });
                        throw new BadRequestException(`Chưa đạt môn tiên quyết: ${subj?.name}`);
                    }
                }

                // 5. Schedule Conflict Check (Detailed)
                const studentEnrollments = await tx.enrollment.findMany({
                    where: { studentId, courseClass: { semesterId: courseClass.semesterId } },
                    include: { courseClass: { include: { subject: true, schedules: true } } }
                });

                const existingSchedules = studentEnrollments.flatMap(e =>
                    e.courseClass.schedules.map(s => ({ ...s, subjectName: e.courseClass.subject.name }))
                );

                const conflict = this.checkConflictDetailed(courseClass.schedules, existingSchedules);
                if (conflict.isConflicted) {
                    throw new BadRequestException(conflict.message);
                }

                // 6. Atomic Increment & Strict Slot Check (Race Condition Prevention)
                // This is our second layer of defense (SQL level)
                const updated = await tx.courseClass.updateMany({
                    where: {
                        id: classId,
                        currentSlots: { lt: courseClass.maxSlots }
                    },
                    data: {
                        currentSlots: { increment: 1 }
                    }
                });

                if (updated.count === 0) {
                    throw new BadRequestException('Lớp vừa hết chỗ, vui lòng tải lại trang và chọn lớp khác.');
                }

                // 7. Retake Logic
                const previouslyTaken = await tx.enrollment.findFirst({
                    where: {
                        studentId,
                        courseClass: { subjectId: courseClass.subjectId }
                    }
                });
                const isRetake = !!previouslyTaken;
                const multiplier = isRetake ? 1.5 : (courseClass.tuitionMultiplier || 1.0);

                // Get Price per credit (Sample constant, could be from TuitionConfig)
                const pricePerCredit = 500000;
                const tuitionFee = (courseClass.subject.credits || 0) * pricePerCredit * multiplier;

                // 8. Create Enrollment
                const enrollment = await tx.enrollment.create({
                    data: {
                        studentId,
                        courseClassId: classId,
                        status: 'REGISTERED',
                        isRetake,
                        tuitionFee
                    }
                });

                // 9. Sync Tuition
                await this.syncStudentTuition(studentId, courseClass.semesterId, tx);

                return enrollment;
            });
        } finally {
            if (lock) await lock.release();
        }
    }

    async dropCourse(studentIdOrUserId: string, classId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // Resolve Student
            let student = await tx.student.findUnique({ where: { id: studentIdOrUserId } });
            if (!student) {
                student = await tx.student.findUnique({ where: { userId: studentIdOrUserId } });
            }
            if (!student) throw new NotFoundException('Student not found');
            const studentId = student.id;

            // 1. Get Enrollment
            const enrollment = await tx.enrollment.findUnique({
                where: { studentId_courseClassId: { studentId, courseClassId: classId } }
            });
            if (!enrollment) throw new BadRequestException('Bạn chưa đăng ký lớp này');

            const courseClass = await tx.courseClass.findUnique({ where: { id: classId } });
            if (!courseClass) throw new NotFoundException('Course class not found');

            // 2. Delete Enrollment
            await tx.enrollment.delete({ where: { id: enrollment.id } });

            // 3. Decrement Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 4. Sync Tuition
            await this.syncStudentTuition(studentId, courseClass.semesterId, tx);

            return { message: 'Hủy đăng ký thành công' };
        });
    }

    private async syncStudentTuition(studentId: string, semesterId: string, tx: any) {
        // Use provided transaction client (tx) for consistency
        const prisma = tx || this.prisma;

        // 1. Get all enrollments for this student in this semester to calculate totals
        const enrollments = await prisma.enrollment.findMany({
            where: { 
                studentId,
                courseClass: { semesterId }
            },
            include: { courseClass: { include: { subject: true } } }
        });

        const totalTuition = enrollments.reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);
        const paidTuition = enrollments
            .filter(enr => enr.status === 'PAID')
            .reduce((sum, enr) => sum + Number(enr.tuitionFee), 0);

        const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
        const feeName = `Học phí ${semester?.name || semesterId}`;

        // 2. Upsert StudentFee
        await prisma.studentFee.upsert({
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

    private checkConflictDetailed(newSchedule: any[], existingSchedules: any[]) {
        const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        for (const ns of newSchedule) {
            for (const es of existingSchedules) {
                if (ns.dayOfWeek === es.dayOfWeek) {
                    const hasOverlap = Math.max(ns.startShift, es.startShift) <= Math.min(ns.endShift, es.endShift);
                    if (hasOverlap) {
                        return {
                            isConflicted: true,
                            message: `Trùng lịch học với môn ${es.subjectName || 'đã đăng ký'} vào ${days[ns.dayOfWeek]}, Tiết ${es.startShift}-${es.endShift}`
                        };
                    }
                }
            }
        }
        return { isConflicted: false };
    }

    private checkConflict(newSchedule: any[], existingSchedules: any[]) {
        return this.checkConflictDetailed(newSchedule, existingSchedules).isConflicted;
    }

    async switchClass(studentIdOrUserId: string, oldClassId: string, newClassId: string) {
        if (oldClassId === newClassId) {
            throw new BadRequestException('Bạn đang ở trong lớp này rồi');
        }

        return await this.prisma.$transaction(async (tx) => {
            // Resolve Student
            let student = await tx.student.findUnique({ where: { id: studentIdOrUserId } });
            if (!student) {
                student = await tx.student.findUnique({ where: { userId: studentIdOrUserId } });
            }
            if (!student) throw new NotFoundException('Student not found');
            const studentId = student.id;

            // 1. Check if enrolled in old class
            const oldEnrollment = await tx.enrollment.findUnique({
                where: { studentId_courseClassId: { studentId, courseClassId: oldClassId } }
            });
            if (!oldEnrollment) {
                throw new BadRequestException('Bạn không tham gia lớp cũ này');
            }

            // 2. Get New Class Info
            const newClass = await tx.courseClass.findUnique({
                where: { id: newClassId },
                include: {
                    subject: true,
                    schedules: true,
                    semester: true
                }
            });

            if (!newClass) throw new NotFoundException('Lớp học phần mới không tồn tại');
            if (newClass.status !== 'OPEN') {
                const statusLabel = newClass.status === 'LOCKED' ? 'Bị khóa' : newClass.status;
                throw new BadRequestException(`Lớp mới đang ở trạng thái '${statusLabel}', không thể đăng ký chuyển lớp.`);
            }
            if (newClass.currentSlots >= newClass.maxSlots) {
                throw new BadRequestException('Lớp mới đã đầy');
            }

            // 3. Verify it's the same subject (optional but recommended)
            const oldClass = await tx.courseClass.findUnique({
                where: { id: oldClassId },
                select: { subjectId: true }
            });
            if (oldClass?.subjectId !== newClass.subjectId) {
               throw new BadRequestException('Lớp mới không cùng môn học với lớp cũ');
            }

            // 4. Schedule Conflict Check
            // Get all OTHER enrollments for the same semester
            const otherEnrollments = await tx.enrollment.findMany({
                where: { 
                    studentId, 
                    courseClass: { 
                        semesterId: newClass.semesterId,
                        id: { not: oldClassId } 
                    } 
                },
                include: { courseClass: { include: { schedules: true } } }
            });

            const existingSchedules = otherEnrollments.flatMap(e => e.courseClass.schedules);
            const isConflicted = this.checkConflict(newClass.schedules, existingSchedules);
            if (isConflicted) {
                throw new BadRequestException('Lịch học lớp mới bị trùng với các môn khác bạn đã đăng ký');
            }

            // 5. Atomic Swap
            // Delete old enrollment
            await tx.enrollment.delete({
                where: { id: oldEnrollment.id }
            });

            // Create new enrollment
            const newEnrollment = await tx.enrollment.create({
                data: {
                    studentId,
                    courseClassId: newClassId,
                    status: 'REGISTERED',
                    tuitionFee: oldEnrollment.tuitionFee // Preserve tuition fee
                }
            });

            // 6. Update Slot Counts
            await tx.courseClass.update({
                where: { id: oldClassId },
                data: { currentSlots: { decrement: 1 } }
            });
            await tx.courseClass.update({
                where: { id: newClassId },
                data: { currentSlots: { increment: 1 } }
            });

            // 7. Sync Tuition
            await this.syncStudentTuition(studentId, newClass.semesterId, tx);

            return {
                message: 'Chuyển lớp thành công!',
                enrollment: newEnrollment
            };
        });
    }

    async getRegistrationStatus(studentIdOrUserId: string, semesterId?: string) {
        let student = await this.prisma.student.findUnique({
            where: { id: studentIdOrUserId },
            include: { major: true }
        });

        if (!student) {
            student = await this.prisma.student.findUnique({
                where: { userId: studentIdOrUserId },
                include: { major: true }
            });
        }

        if (!student) throw new NotFoundException('Student not found');
        const studentId = student.id;

        // 0. Get Target Semester (Upcoming for Registration)
        let targetSemester = await this.prisma.semester.findFirst({ where: { isRegistering: true } });
        if (!targetSemester) {
            // Fallback: If no isRegistering is set, look for the first one that starts after the current one
            const current = await this.prisma.semester.findFirst({ where: { isCurrent: true } });
            if (current) {
                targetSemester = await this.prisma.semester.findFirst({
                    where: { startDate: { gt: current.startDate } },
                    orderBy: { startDate: 'asc' }
                });
            }
        }
        
        let targetSemesterId = semesterId || targetSemester?.id;
        
        // If still none, fallback to current
        if (!targetSemesterId) {
            const current = await this.prisma.semester.findFirst({ where: { isCurrent: true } });
            targetSemesterId = current?.id;
        }

        // 1. Get Curriculum for Student's Major and Cohort (Intake)
        const curriculum = await this.prisma.curriculum.findMany({
            where: {
                majorId: student.majorId,
                cohort: student.intake || 'K16' // Fallback to K16 if not set
            },
            orderBy: {
                suggestedSemester: 'asc'
            },
            include: {
                subject: {
                    include: {
                        prerequisites: true
                    }
                }
            }
        });

        // 1.5 Find subjects that have OPEN classes in the target semester
        // Include subjects from student's major OR general education (KCB)
        const openClasses = await this.prisma.courseClass.findMany({
            where: {
                semesterId: targetSemesterId,
                status: 'OPEN',
                subject: {
                    OR: [
                        { majorId: student.majorId },
                        { major: { code: 'KCB' } } // Assuming KCB is General Education
                    ]
                }
            },
            select: { subjectId: true }
        });
        const openSubjectIds = new Set(openClasses.map(c => c.subjectId));

        // 2. Get passed subjects
        const grades = await this.prisma.grade.findMany({
            where: { studentId },
            select: { subjectId: true, totalScore10: true }
        });
        const passedSubjectIds = new Set(
            grades.filter(g => (g.totalScore10 ?? 0) >= 4.0).map(g => g.subjectId)
        );

        // 3. Get currently enrolled subjects (in classes with OPEN status) in THIS semester
        const enrolledInSemester = await this.prisma.enrollment.findMany({
            where: { 
                studentId,
                courseClass: { semesterId: targetSemesterId }
            },
            include: { courseClass: true }
        });
        const enrolledSubjectIds = new Set(enrolledInSemester.map(e => e.courseClass.subjectId));

        // 4. Map subjects with registration metadata
        // FILTER: Only show subjects offered this semester OR already enrolled this semester
        return curriculum
            .filter(item => openSubjectIds.has(item.subjectId) || enrolledSubjectIds.has(item.subjectId))
            .map(item => {
                const subject = item.subject;
                const isPassed = passedSubjectIds.has(subject.id);
                const isEnrolled = enrolledSubjectIds.has(subject.id);

                // Check if all prerequisites are passed
                const missingPrereqs = subject.prerequisites
                    .filter(p => !passedSubjectIds.has(p.prerequisiteId))
                    .map(p => p.prerequisiteId);

                return {
                    subjectId: subject.id,
                    subjectCode: subject.code,
                    subjectName: subject.name,
                    credits: subject.credits,
                    suggestedSemester: item.suggestedSemester,
                    isMandatory: item.isMandatory,
                    isPassed,
                    isEnrolled,
                    isEligible: !isPassed && !isEnrolled && missingPrereqs.length === 0,
                    missingPrereqs
                };
            });
    }

    async getSemesters() {
        return this.prisma.semester.findMany({
            orderBy: { startDate: 'desc' }
        });
    }

    async getClassesBySubject(subjectId: string, semesterId?: string) {
        let targetSemesterId = semesterId;
        if (!targetSemesterId) {
            // Priority: isRegistering -> Next Semester -> current
            const registeringSem = await this.prisma.semester.findFirst({ where: { isRegistering: true } });
            if (registeringSem) {
                targetSemesterId = registeringSem.id;
            } else {
                const current = await this.prisma.semester.findFirst({ where: { isCurrent: true } });
                if (current) {
                    const nextSem = await this.prisma.semester.findFirst({
                        where: { startDate: { gt: current.startDate } },
                        orderBy: { startDate: 'asc' }
                    });
                    targetSemesterId = nextSem?.id || current.id;
                }
            }
        }

        return this.prisma.courseClass.findMany({
            where: {
                subjectId,
                semesterId: targetSemesterId
            },
            include: {
                lecturer: true,
                adminClasses: true,
                schedules: {
                    include: { room: true }
                }
            }
        });
    }

    async getOpenClasses() {
        return this.prisma.courseClass.findMany({
            include: { subject: true, adminClasses: true },
            orderBy: { code: 'asc' }
        });
    }

    async getStudentEnrollments(studentId: string, semesterId?: string) {
        let targetSemesterId = semesterId;
        if (!targetSemesterId) {
            const registeringSem = await this.prisma.semester.findFirst({ where: { isRegistering: true } });
            if (registeringSem) {
                targetSemesterId = registeringSem.id;
            } else {
                const current = await this.prisma.semester.findFirst({ where: { isCurrent: true } });
                targetSemesterId = current?.id;
            }
        }

        return this.prisma.enrollment.findMany({
            where: { 
                studentId,
                ...(targetSemesterId ? { courseClass: { semesterId: targetSemesterId } } : {})
            },
            include: {
                courseClass: {
                    include: {
                        subject: true,
                        lecturer: true,
                        adminClasses: true,
                        schedules: {
                            include: { room: true }
                        },
                        semester: true,
                    }
                },
                attendances: true,
                student: {
                    include: { adminClass: true }
                }
            },
            orderBy: { registeredAt: 'desc' }
        });
    }

    async getAllClassesSchedule() {
        return this.prisma.courseClass.findMany({
            include: {
                subject: true,
                lecturer: true,
                schedules: {
                    include: { room: true }
                },
                _count: {
                    select: { enrollments: true }
                }
            },
            orderBy: { code: 'asc' }
        });
    }

    async getClassEnrollments(classId: string) {
        return this.prisma.enrollment.findMany({
            where: { courseClassId: classId },
            include: {
                student: {
                    include: { user: true, adminClass: true }
                },
                attendances: true
            },
            orderBy: { student: { studentCode: 'asc' } }
        });
    }

    async bulkMarkAttendance(date: string, attendances: { enrollmentId: string; status: string; note?: string }[]) {
        const attendanceDate = new Date(date);

        return await this.prisma.$transaction(
            attendances.map(att => this.prisma.attendance.upsert({
                where: {
                    enrollmentId_date: {
                        enrollmentId: att.enrollmentId,
                        date: attendanceDate
                    }
                },
                update: {
                    status: att.status,
                    note: att.note
                },
                create: {
                    enrollmentId: att.enrollmentId,
                    date: attendanceDate,
                    status: att.status,
                    note: att.note
                }
            }))
        );
    }
}
