import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AppService {
  constructor(private prisma: PrismaService) { }

  getHello(): string {
    return 'Hello World!';
  }

  async getStudentGrades(studentId: string) {
    return this.prisma.grade.findMany({
      where: { studentId },
      include: {
        subject: true,
        courseClass: true,
      },
    });
  }

  async getClassGrades(classId: string) {
    return this.prisma.grade.findMany({
      where: { courseClassId: classId },
      include: {
        student: {
          include: { user: true, adminClass: true }
        }
      }
    });
  }

  async bulkUpdateGrades(grades: any[]) {
    return await this.prisma.$transaction(
      grades.map(g => {
        // Calculate Total Score (default 10%, 30%, 60%)
        const attendance = g.attendanceScore || 0;
        const midterm = g.midtermScore || 0;
        const final = g.finalScore || 0;
        const total10 = Math.round((attendance * 0.1 + midterm * 0.3 + final * 0.6) * 10) / 10;

        // Map to 4.0 scale and Letter Grade
        let total4 = 0;
        let letter = 'F';
        if (total10 >= 8.5) { total4 = 4.0; letter = 'A'; }
        else if (total10 >= 8.0) { total4 = 3.5; letter = 'B+'; }
        else if (total10 >= 7.0) { total4 = 3.0; letter = 'B'; }
        else if (total10 >= 6.5) { total4 = 2.5; letter = 'C+'; }
        else if (total10 >= 5.5) { total4 = 2.0; letter = 'C'; }
        else if (total10 >= 5.0) { total4 = 1.5; letter = 'D+'; }
        else if (total10 >= 4.0) { total4 = 1.0; letter = 'D'; }
        else { total4 = 0; letter = 'F'; }

        return this.prisma.grade.update({
          where: { id: g.id },
          data: {
            attendanceScore: attendance,
            midtermScore: midterm,
            finalScore: final,
            totalScore10: total10,
            totalScore4: total4,
            letterGrade: letter,
            isPassed: total10 >= 4.0
          }
        });
      })
    );
  }
}
