import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
    constructor(private prisma: PrismaService) { }

    async registerCourse(studentIdOrUserId: string, classId: string) {
        // Transaction to prevent race conditions
        return await this.prisma.$transaction(async (tx) => {
            // Resolve StudentId if UserId was provided
            let student = await tx.student.findUnique({ where: { id: studentIdOrUserId } });
            if (!student) {
                student = await tx.student.findUnique({ where: { userId: studentIdOrUserId } });
            }
            if (!student) throw new NotFoundException('Sinh viên không tồn tại (Student not found)');
            const studentId = student.id;

            // 1. Get Class Info with Schedule and Subject
            const courseClass = await tx.courseClass.findUnique({
                where: { id: classId },
                include: {
                    subject: {
                        include: { prerequisites: true }
                    },
                    schedules: true
                }
            });

            if (!courseClass) throw new NotFoundException('Course Class not found');

            // 2. Check Slot and Status
            if (courseClass.status !== 'OPEN') {
                throw new BadRequestException('Lớp học phần chưa mở hoặc đã đóng đăng ký (Class is not open)');
            }
            if (courseClass.currentSlots >= courseClass.maxSlots) {
                throw new BadRequestException('Lớp đã đầy (Class is full)');
            }

            // 3. Check if already enrolled in this exact class
            const existing = await tx.enrollment.findUnique({
                where: {
                    studentId_courseClassId: { studentId, courseClassId: classId }
                }
            });
            if (existing) throw new BadRequestException('Bạn đã đăng ký lớp học này rồi');

            // 4. Check if already passed or enrolled in another class of same subject in current semester
            const sameSubjectEnrollment = await tx.enrollment.findFirst({
                where: {
                    studentId,
                    courseClass: {
                        subjectId: courseClass.subjectId,
                        semesterId: courseClass.semesterId
                    }
                }
            });
            if (sameSubjectEnrollment) throw new BadRequestException('Bạn đã đăng ký một lớp khác của môn học này trong học kỳ này');

            // 5. Prerequisite Check
            const prerequisites = courseClass.subject.prerequisites;
            for (const prereq of prerequisites) {
                const passed = await tx.grade.findFirst({
                    where: {
                        studentId,
                        subjectId: prereq.prerequisiteId,
                        totalScore10: { gte: 4.0 }
                    }
                });
                if (!passed) {
                    const prereqSubject = await tx.subject.findUnique({ where: { id: prereq.prerequisiteId } });
                    throw new BadRequestException(`Bạn chưa đạt môn tiên quyết: ${prereqSubject?.name || prereq.prerequisiteId}`);
                }
            }

            // 6. Schedule Conflict Check
            const studentEnrollments = await tx.enrollment.findMany({
                where: { studentId, courseClass: { semesterId: courseClass.semesterId } },
                include: { courseClass: { include: { schedules: true } } }
            });

            const existingSchedules = studentEnrollments.flatMap(e => e.courseClass.schedules);
            const isConflicted = this.checkConflict(courseClass.schedules, existingSchedules);
            if (isConflicted) throw new BadRequestException('Lịch học bị trùng với các môn đã đăng ký');

            // 7. Create Enrollment
            const enrollment = await tx.enrollment.create({
                data: {
                    studentId,
                    courseClassId: classId,
                    status: 'REGISTERED',
                    tuitionFee: (courseClass.subject.credits || 0) * 500000 // Sample: 500k per credit
                }
            });

            // 8. Increment Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { increment: 1 } }
            });

            return enrollment;
        });
    }

    private checkConflict(newSchedule: any[], existingSchedules: any[]) {
        for (const ns of newSchedule) {
            for (const es of existingSchedules) {
                if (ns.dayOfWeek === es.dayOfWeek) {
                    // Check shift overlap: [start, end]
                    const hasOverlap = Math.max(ns.startShift, es.startShift) <= Math.min(ns.endShift, es.endShift);
                    if (hasOverlap) return true;
                }
            }
        }
        return false;
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
        const openClasses = await this.prisma.courseClass.findMany({
            where: {
                semesterId: targetSemesterId,
                status: 'OPEN'
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
