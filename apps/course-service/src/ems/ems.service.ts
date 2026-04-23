import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CORE ZAP LOGIC
   * Executes an atomic transaction to:
   * 1. Create CourseClasses
   * 2. Map AdminClasses to CourseClasses
   * 3. Bulk enroll Students
   * 4. Basic Auto-Scheduling
   */
  async executeZap(classesToZap: any[]) {
    return await this.prisma.$transaction(async (tx) => {
      let totalEnrolled = 0;

      for (const item of classesToZap) {
        // 1. Create the CourseClass
        const courseClass = await tx.courseClass.create({
          data: {
            subjectId: item.subjectId,
            semesterId: item.semesterId || 'current-semester-id', // Simplified
            lecturerId: item.lecturerId || null,
            status: 'OPEN',
            code: `${item.subjectCode}-${Date.now()}`, // Unique code
            name: item.subjectName,
            sessionsPerWeek: item.sessionsPerWeek,
            periodsPerSession: item.periodsPerSession,
            adminClasses: {
              connect: item.adminClassIds.map((id) => ({ id })),
            },
          },
        });

        // 2. Fetch Students from the mapped AdminClasses
        const students = await tx.student.findMany({
          where: {
            adminClassId: { in: item.adminClassIds },
            status: 'STUDYING',
          },
        });

        // 3. Bulk Insert Enrollments (GĐ 3 Rule)
        if (students.length > 0) {
          await tx.enrollment.createMany({
            data: students.map((student) => ({
              studentId: student.id,
              courseClassId: courseClass.id,
              status: 'REGISTERED',
            })),
          });
          totalEnrolled += students.length;
        }

        // 4. Placeholder for Auto-Schedule logic
        // In a real scenario, this would call a scheduling algorithm
        // to generate ClassSession rows based on room availability.
      }

      return {
        success: true,
        count: classesToZap.length,
        totalEnrolled,
      };
    });
  }

  async getCurriculumBlueprint(majorId: string, cohort: string) {
    return this.prisma.curriculum.findMany({
      where: { majorId, cohort },
      include: { subject: true },
    });
  }

  async getCoordinationData(majorId: string, cohort: string) {
    // Fetches AdminClasses and other metadata needed for GĐ 2
    return this.prisma.adminClass.findMany({
      where: { majorId, cohort },
      include: { students: true },
    });
  }
}
