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

            // 2. Check Slot
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
                    status: 'SUCCESS',
                    // tuitionFee calculation can be added here
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

    async getRegistrationStatus(studentIdOrUserId: string) {
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

        // 1. Get Curriculum for Student's Major and Cohort (Intake)
        const curriculum = await this.prisma.curriculum.findMany({
            where: {
                majorId: student.majorId,
                cohort: student.intake || 'K16' // Fallback to K16 if not set
            },
            include: {
                subject: {
                    include: {
                        prerequisites: true
                    }
                }
            }
        });

        // 2. Get passed subjects
        const grades = await this.prisma.grade.findMany({
            where: { studentId },
            select: { subjectId: true, totalScore10: true }
        });
        const passedSubjectIds = new Set(
            grades.filter(g => (g.totalScore10 ?? 0) >= 4.0).map(g => g.subjectId)
        );

        // 3. Get currently enrolled subjects (in classes with OPEN status)
        const currentEnrollments = await this.prisma.enrollment.findMany({
            where: { studentId },
            include: { courseClass: true }
        });
        const enrolledSubjectIds = new Set(currentEnrollments.map(e => e.courseClass.subjectId));

        // 4. Map subjects with registration metadata
        return curriculum.map(item => {
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

    async getClassesBySubject(subjectId: string) {
        // Only return classes in the current/active semester
        return this.prisma.courseClass.findMany({
            where: {
                subjectId,
                semester: { isCurrent: true },
                status: 'OPEN'
            },
            include: {
                lecturer: true,
                schedules: {
                    include: { room: true }
                }
            }
        });
    }

    async getOpenClasses() {
        return this.prisma.courseClass.findMany({
            include: { subject: true },
            orderBy: { code: 'asc' }
        });
    }

    async getStudentEnrollments(studentId: string) {
        return this.prisma.enrollment.findMany({
            where: { studentId },
            include: {
                courseClass: {
                    include: {
                        subject: true,
                        lecturer: true,
                        schedules: true,
                    }
                },
                attendances: true
            },
            orderBy: { registeredAt: 'desc' }
        });
    }

    async getAllClassesSchedule() {
        return this.prisma.courseClass.findMany({
            include: {
                subject: true,
                lecturer: true,
                schedules: true,
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
