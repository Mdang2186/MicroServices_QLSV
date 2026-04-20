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

    private toPortalDayOfWeek(value: Date | string) {
        const day = new Date(value).getDay();
        return day === 0 ? 8 : day + 1;
    }

    private mapSessionsToSchedules(sessions: any[] = []) {
        return sessions
            .map((session) => ({
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
            .sort((left, right) => {
                if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek;
                return left.startShift - right.startShift;
            });
    }

    private normalizeCourseClass(courseClass: any) {
        if (!courseClass) return courseClass;
        return {
            ...courseClass,
            schedules: this.mapSessionsToSchedules(courseClass.sessions || []),
        };
    }

    private buildTuitionFeeId(studentId: string, semesterId: string) {
        const normalizedStudent = studentId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'STUDENT';
        const normalizedSemester = semesterId.replace(/[^A-Za-z0-9]/g, '').slice(-16) || 'SEMESTER';
        return `TUITION_${normalizedStudent}_${normalizedSemester}`.slice(0, 50);
    }

    private ensureSemesterRegistrationOpen(semester: any) {
        if (!semester) {
            throw new BadRequestException('Học kỳ đăng ký không hợp lệ');
        }

        const now = new Date();
        const hasExplicitWindow = semester.registerStartDate || semester.registerEndDate;
        const startDate = semester.registerStartDate ? new Date(semester.registerStartDate) : null;
        const endDate = semester.registerEndDate ? new Date(semester.registerEndDate) : null;
        const withinWindow =
            (!startDate || now >= startDate) &&
            (!endDate || now <= endDate);

        if (semester.isRegistering || (hasExplicitWindow && withinWindow)) {
            return;
        }

        throw new BadRequestException('Học kỳ hiện không mở cổng đăng ký / đổi lớp.');
    }

    private parseLegacyAdminClass(
        adminClassCode?: string | null,
        cohortCode?: string | null,
    ) {
        const code = `${adminClassCode || ''}`.trim().toUpperCase();
        const cohort = `${cohortCode || ''}`.trim().toUpperCase();
        if (!code || code.startsWith('K')) return null;

        const match = code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
        if (!match) return null;

        return {
            cohort: cohort || `K${match[1]}`,
            section: match[2].padStart(2, '0'),
            majorCode: match[3],
        };
    }

    private resolveStudentCohortCode(student: any) {
        const directCohort = `${student?.intake || student?.adminClass?.cohort || ''}`.trim().toUpperCase();
        if (directCohort) {
            return directCohort;
        }

        const legacyMeta = this.parseLegacyAdminClass(student?.adminClass?.code);
        return legacyMeta?.cohort || null;
    }

    private async getStudentSemestersFromPlan(student: any) {
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

        const semesterMap = new Map<string, any>();
        for (const plan of plans) {
            if (plan.semester?.id) {
                semesterMap.set(plan.semester.id, plan.semester);
            }
        }

        return [...semesterMap.values()].sort(
            (left, right) =>
                new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
        );
    }

    private async calculateEnrollmentFee(
        tx: any,
        student: any,
        courseClass: any,
        isRetake: boolean
    ) {
        // 1. Resolve Multiplier
        // Priority: Retake (1.5) > Class Multiplier (Default 1.0)
        const multiplier = isRetake ? 1.5 : (courseClass.tuitionMultiplier || 1.0);

        // 2. Lookup Tuition Config
        // Strategy: Match Major + Year + Cohort + Type -> Fallback to Major + Year
        const config = await tx.tuitionConfig.findFirst({
            where: {
                majorId: student.majorId,
                academicYear: courseClass.semester.year,
                cohort: student.intake || undefined,
                educationType: student.educationType || undefined,
                isActive: true
            }
        }) || await tx.tuitionConfig.findFirst({
            where: {
                majorId: student.majorId,
                academicYear: courseClass.semester.year,
                isActive: true
            }
        });

        const pricePerCredit = config ? Number(config.pricePerCredit) : 500000;
        const credits = Number(courseClass.subject.credits || 0);

        return Math.round(credits * pricePerCredit * multiplier);
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
                        sessions: { include: { room: true } },
                        semester: true
                    }
                });

                if (!courseClass) throw new NotFoundException('Lớp học phần không tồn tại');
                this.ensureSemesterRegistrationOpen(courseClass.semester);

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
                    include: { courseClass: { include: { subject: true, sessions: true } } }
                });

                const existingSchedules = studentEnrollments.flatMap(e =>
                    (e.courseClass as any).sessions.map(s => ({ 
                        ...s, 
                        dayOfWeek: this.toPortalDayOfWeek(s.date),
                        subjectName: e.courseClass.subject.name 
                    }))
                );

                const newSchedules = (courseClass as any).sessions.map(s => ({
                    ...s,
                    dayOfWeek: this.toPortalDayOfWeek(s.date)
                }));

                const conflict = this.checkConflictDetailed(newSchedules, existingSchedules);
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

                // 7. Calculate Tuition Fee
                const previouslyTaken = await tx.enrollment.findFirst({
                    where: {
                        studentId,
                        courseClass: { subjectId: courseClass.subjectId }
                    }
                });
                const isRetake = !!previouslyTaken;
                const tuitionFee = await this.calculateEnrollmentFee(tx, student, courseClass, isRetake);

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

    async dropEnrollmentById(id: string) {
        return await this.prisma.$transaction(async (tx) => {
            const enrollment = await tx.enrollment.findUnique({
                where: { id },
                include: { courseClass: true }
            });

            if (!enrollment) throw new NotFoundException('Enrollment not found');

            const classId = enrollment.courseClassId;
            const studentId = enrollment.studentId;
            const semesterId = enrollment.courseClass.semesterId;

            // 1. Delete Enrollment
            await tx.enrollment.delete({ where: { id } });

            // 2. Decrement Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 3. Sync Tuition
            await this.syncStudentTuition(studentId, semesterId, tx);

            return { message: 'Hủy đăng ký thành công' };
        });
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

        if (totalTuition === 0 && enrollments.length === 0) {
            await prisma.studentFee.deleteMany({
                where: {
                    studentId,
                    semesterId,
                    feeType: 'TUITION',
                }
            });
            return;
        }

        const semester = await prisma.semester.findUnique({ where: { id: semesterId } });
        const feeName = `Học phí ${semester?.name || semesterId}`;

        const feePayload = {
            totalAmount: totalTuition,
            finalAmount: totalTuition,
            paidAmount: paidTuition,
            status: paidTuition >= totalTuition ? 'PAID' : (paidTuition > 0 ? 'PARTIAL' : 'DEBT')
        };

        const existingFee = await prisma.studentFee.findFirst({
            where: {
                studentId,
                semesterId,
                feeType: 'TUITION',
            }
        });

        if (existingFee) {
            await prisma.studentFee.update({
                where: { id: existingFee.id },
                data: feePayload,
            });
            return;
        }

        await prisma.studentFee.create({
            data: {
                id: this.buildTuitionFeeId(studentId, semesterId),
                studentId,
                semesterId,
                feeType: 'TUITION',
                name: feeName,
                discountAmount: 0,
                isMandatory: true,
                ...feePayload,
            }
        });
    }

    private checkConflictDetailed(newSchedule: any[], existingSchedules: any[]) {
        const days = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        for (const ns of newSchedule) {
            const nsDay = ns.dayOfWeek || this.toPortalDayOfWeek(ns.date);
            for (const es of existingSchedules) {
                const esDay = es.dayOfWeek || this.toPortalDayOfWeek(es.date);
                if (nsDay === esDay) {
                    const hasOverlap = Math.max(ns.startShift || ns.startPeriod, es.startShift || es.startPeriod) <= Math.min(ns.endShift || ns.endPeriod, es.endShift || es.endPeriod);
                    if (hasOverlap) {
                        return {
                            isConflicted: true,
                            message: `Trùng lịch học với môn ${es.subjectName || 'đã đăng ký'} vào ${days[nsDay-1] || 'N/A'}, Tiết ${es.startShift || es.startPeriod}-${es.endShift || es.endPeriod}`
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

        const lock = await this.acquireLock(newClassId);

        try {
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
                    sessions: true,
                    semester: true
                }
            });

            if (!newClass) throw new NotFoundException('Lớp học phần mới không tồn tại');
            this.ensureSemesterRegistrationOpen(newClass.semester);
            if (newClass.status !== 'OPEN') {
                const statusLabel = newClass.status === 'LOCKED' ? 'Bị khóa' : newClass.status;
                throw new BadRequestException(`Lớp mới đang ở trạng thái '${statusLabel}', không thể đăng ký chuyển lớp.`);
            }
            if (newClass.currentSlots >= newClass.maxSlots) {
                throw new BadRequestException('Lớp mới đã đầy');
            }
            if (oldEnrollment.courseClassId === newClassId) {
                throw new BadRequestException('Bạn đang ở trong lớp học phần này');
            }

            // 3. Verify it's the same subject (optional but recommended)
            const oldClass = await tx.courseClass.findUnique({
                where: { id: oldClassId },
                select: { subjectId: true, semesterId: true }
            });
            if (oldClass?.subjectId !== newClass.subjectId) {
               throw new BadRequestException('Lớp mới không cùng môn học với lớp cũ');
            }
            if (oldClass?.semesterId !== newClass.semesterId) {
               throw new BadRequestException('Chỉ được đổi sang lớp khác trong cùng học kỳ đăng ký');
            }

            const existingNewEnrollment = await tx.enrollment.findUnique({
                where: { studentId_courseClassId: { studentId, courseClassId: newClassId } }
            });
            if (existingNewEnrollment) {
                throw new BadRequestException('Bạn đã đăng ký lớp học phần đích này rồi');
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
                include: { courseClass: { include: { sessions: true } } }
            });

            const existingSchedules = otherEnrollments.flatMap(e => 
                (e.courseClass as any).sessions.map(s => ({
                    ...s,
                    dayOfWeek: this.toPortalDayOfWeek(s.date)
                }))
            );
            const newSchedules = (newClass as any).sessions.map(s => ({
                ...s,
                dayOfWeek: this.toPortalDayOfWeek(s.date)
            }));

            const conflict = this.checkConflictDetailed(newSchedules, existingSchedules);
            if (conflict.isConflicted) {
                throw new BadRequestException(conflict.message || 'Lịch học lớp mới bị trùng với các môn khác bạn đã đăng ký');
            }

            // 5. Atomic Swap
            // Calculate new fee (mandatory as multipliers or configs might differ across classes)
            const isRetake = oldEnrollment.isRetake;
            const tuitionFee = await this.calculateEnrollmentFee(tx, student, newClass, isRetake);

            const updated = await tx.courseClass.updateMany({
                where: {
                    id: newClassId,
                    currentSlots: { lt: newClass.maxSlots }
                },
                data: {
                    currentSlots: { increment: 1 }
                }
            });

            if (updated.count === 0) {
                throw new BadRequestException('Lớp mới vừa hết chỗ, vui lòng chọn lớp khác.');
            }

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
                    isRetake,
                    tuitionFee
                }
            });

            // 6. Update Slot Counts
            await tx.courseClass.update({
                where: { id: oldClassId },
                data: { currentSlots: { decrement: 1 } }
            });

            // 7. Sync Tuition
            await this.syncStudentTuition(studentId, newClass.semesterId, tx);

            return {
                message: 'Chuyển lớp thành công!',
                enrollment: newEnrollment
            };
        });
        } finally {
            if (lock) await lock.release();
        }
    }

    async getRegistrationStatus(studentIdOrUserId: string, semesterId?: string) {
        let student = await this.prisma.student.findUnique({
            where: { id: studentIdOrUserId },
            include: { major: true, adminClass: true }
        });

        if (!student) {
            student = await this.prisma.student.findUnique({
                where: { userId: studentIdOrUserId },
                include: { major: true, adminClass: true }
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

        const cohortCode = this.resolveStudentCohortCode(student);
        const semesterPlan = cohortCode && targetSemesterId
            ? await this.prisma.semesterPlan.findFirst({
                where: {
                    majorId: student.majorId,
                    cohort: cohortCode,
                    semesterId: targetSemesterId,
                },
                select: {
                    conceptualSemester: true,
                },
            })
            : null;

        const trainingTemplate = cohortCode
            ? await this.prisma.trainingPlanTemplate.findFirst({
                where: {
                    majorId: student.majorId,
                    cohort: cohortCode,
                    status: { in: ['PUBLISHED', 'ACTIVE'] },
                },
                orderBy: [
                    { publishedAt: 'desc' },
                    { version: 'desc' },
                ],
                include: {
                    items: {
                        include: {
                            subject: {
                                include: {
                                    prerequisites: true,
                                },
                            },
                        },
                    },
                },
            })
            : null;

        const templateItems = trainingTemplate?.items?.length
            ? trainingTemplate.items.map((item) => ({
                subjectId: item.subjectId,
                suggestedSemester: item.conceptualSemester,
                isRequired: item.isRequired,
                subject: item.subject,
            }))
            : [];

        const curriculum = templateItems.length > 0
            ? templateItems.filter((item) =>
                semesterPlan?.conceptualSemester
                    ? Number(item.suggestedSemester || 0) === semesterPlan.conceptualSemester
                    : true,
            )
            : await this.prisma.curriculum.findMany({
                where: {
                    majorId: student.majorId,
                    ...(cohortCode ? { cohort: cohortCode } : {}),
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
                    isRequired: item.isRequired,
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

    async getSemestersByStudent(studentIdOrUserId: string) {
        let student = await this.prisma.student.findUnique({
            where: { id: studentIdOrUserId },
            include: { adminClass: true }
        });
        if (!student) {
            student = await this.prisma.student.findUnique({
                where: { userId: studentIdOrUserId },
                include: { adminClass: true }
            });
        }
        if (!student) {
            return this.prisma.semester.findMany({ orderBy: { startDate: 'desc' } });
        }

        const [plannedSemesters, enrollments, trainingScores, studentFees] = await Promise.all([
            this.getStudentSemestersFromPlan(student),
            this.prisma.enrollment.findMany({
                where: { studentId: student.id },
                select: {
                    courseClass: {
                        select: { semester: true },
                    },
                },
            }),
            this.prisma.trainingScore.findMany({
                where: { studentId: student.id },
                select: { semester: true },
            }),
            this.prisma.studentFee.findMany({
                where: { studentId: student.id },
                select: { semester: true },
            }),
        ]);

        const semesterMap = new Map<string, any>();
        const pushSemester = (semester: any) => {
            if (semester?.id) {
                semesterMap.set(semester.id, semester);
            }
        };

        plannedSemesters.forEach(pushSemester);
        enrollments.forEach((item) => pushSemester(item.courseClass?.semester));
        trainingScores.forEach((item) => pushSemester(item.semester));
        studentFees.forEach((item) => pushSemester(item.semester));

        const semesters = [...semesterMap.values()].sort((left, right) => {
            const leftTime = left?.startDate ? new Date(left.startDate).getTime() : 0;
            const rightTime = right?.startDate ? new Date(right.startDate).getTime() : 0;
            return rightTime - leftTime;
        });

        if (semesters.length > 0) {
            return semesters;
        }

        return this.prisma.semester.findMany({ orderBy: { startDate: 'desc' } });
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

        const classes = await this.prisma.courseClass.findMany({
            where: {
                subjectId,
                semesterId: targetSemesterId
            },
            include: {
                lecturer: true,
                adminClasses: true,
                sessions: {
                    include: { room: true }
                }
            }
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
    }

    async getOpenClasses() {
        const classes = await this.prisma.courseClass.findMany({
            include: { subject: true, adminClasses: true },
            orderBy: { code: 'asc' }
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
    }

    async getStudentEnrollments(studentId: string, semesterId?: string) {
        const enrollments = await this.prisma.enrollment.findMany({
            where: { 
                studentId,
                ...(semesterId ? { courseClass: { semesterId } } : {})
            },
            include: {
                courseClass: {
                    include: {
                        subject: true,
                        lecturer: true,
                        adminClasses: true,
                        sessions: {
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

        return enrollments.map((enrollment) => ({
            ...enrollment,
            courseClass: this.normalizeCourseClass(enrollment.courseClass),
        }));
    }

    async getAllClassesSchedule() {
        const classes = await this.prisma.courseClass.findMany({
            include: {
                subject: true,
                lecturer: true,
                sessions: {
                    include: { room: true }
                },
                _count: {
                    select: { enrollments: true }
                }
            },
            orderBy: { code: 'asc' }
        });

        return classes.map((courseClass) => this.normalizeCourseClass(courseClass));
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

        return await this.prisma.$transaction(async (tx) => {
            const results = await Promise.all(
                attendances.map((att) =>
                    tx.attendance.upsert({
                        where: {
                            enrollmentId_date: {
                                enrollmentId: att.enrollmentId,
                                date: attendanceDate,
                            },
                        },
                        update: {
                            status: att.status,
                            note: att.note,
                        },
                        create: {
                            enrollmentId: att.enrollmentId,
                            date: attendanceDate,
                            status: att.status,
                            note: att.note,
                        },
                    }),
                ),
            );

            const enrollmentIds = [...new Set(attendances.map((att) => att.enrollmentId))];
            if (!enrollmentIds.length) {
                return results;
            }

            const enrollments = await tx.enrollment.findMany({
                where: { id: { in: enrollmentIds } },
                include: {
                    courseClass: {
                        include: {
                            sessions: {
                                select: {
                                    id: true,
                                    date: true,
                                    startShift: true,
                                    endShift: true,
                                },
                            },
                        },
                    },
                    attendances: {
                        select: {
                            date: true,
                            status: true,
                        },
                    },
                },
            });

            for (const enrollment of enrollments) {
                const sessions = enrollment.courseClass?.sessions || [];
                const totalPeriods = sessions.reduce(
                    (sum, session) =>
                        sum + Math.max(Number(session.endShift) - Number(session.startShift) + 1, 0),
                    0,
                );

                const attendanceByDate = new Map(
                    (enrollment.attendances || []).map((attendance) => [
                        new Date(attendance.date).toISOString().slice(0, 10),
                        attendance.status,
                    ]),
                );

                const absentPeriods = sessions.reduce((sum, session) => {
                    const key = new Date(session.date).toISOString().slice(0, 10);
                    const status = attendanceByDate.get(key);
                    if (!status || status === 'PRESENT') {
                        return sum;
                    }
                    return (
                        sum +
                        Math.max(Number(session.endShift) - Number(session.startShift) + 1, 0)
                    );
                }, 0);

                const isEligible =
                    totalPeriods > 0 ? absentPeriods / totalPeriods <= 0.5 : true;

                await tx.grade.updateMany({
                    where: {
                        studentId: enrollment.studentId,
                        courseClassId: enrollment.courseClassId,
                    },
                    data: {
                        isEligibleForExam: isEligible,
                    },
                });
            }

            return results;
        });
    }
}
