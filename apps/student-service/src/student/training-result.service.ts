import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TrainingResultService {
  constructor(private prisma: PrismaService) {}

  async getStudentTrainingResults(studentId: string) {
    const items = await this.prisma.trainingScore.findMany({
      where: { studentId },
      include: { semester: true },
    });

    return items
      .sort((left, right) => {
        const leftTime = left.semester?.startDate
          ? new Date(left.semester.startDate).getTime()
          : 0;
        const rightTime = right.semester?.startDate
          ? new Date(right.semester.startDate).getTime()
          : 0;
        return rightTime - leftTime;
      })
      .map((item) => ({
        id: item.id,
        semesterId: item.semesterId,
        semester: item.semester?.name || item.semesterId,
        score: item.score,
        rating: item.classification,
      }));
  }
}
