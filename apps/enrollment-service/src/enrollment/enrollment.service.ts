import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
    constructor(private prisma: PrismaService) { }

    async registerCourse(studentId: string, classId: string) {
        // Transaction to prevent race conditions
        return await this.prisma.$transaction(async (tx) => {
            // 1. Get Class Info
            const courseClass = await tx.courseClass.findUnique({
                where: { id: classId },
                include: { subject: true }
            });

            if (!courseClass) throw new NotFoundException('Course Class not found');

            // 2. Check Slot
            if (courseClass.currentSlots >= courseClass.maxSlots) {
                throw new BadRequestException('Class is full');
            }

            // 3. Check if already enrolled
            const existing = await tx.enrollment.findUnique({
                where: {
                    studentId_courseClassId: { studentId, courseClassId: classId }
                }
            });
            if (existing) throw new BadRequestException('Already enrolled in this class');

            // 4. Create Enrollment
            const enrollment = await tx.enrollment.create({
                data: {
                    studentId,
                    courseClassId: classId,
                    status: 'SUCCESS',
                    tuitionFee: courseClass.subject.credits * 500000
                }
            });

            // 5. Increment Slot
            await tx.courseClass.update({
                where: { id: classId },
                data: { currentSlots: { increment: 1 } }
            });

            return enrollment;

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
                    }
                }
            },
            orderBy: { registeredAt: 'desc' }
        });
    }
}
