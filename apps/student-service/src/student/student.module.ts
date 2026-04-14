import { Module } from "@nestjs/common";
import { StudentService } from "./student.service";
import { StudentController } from "./student.controller";
import { PrismaService } from "../prisma/prisma.service";
import { TrainingResultController } from "./training-result.controller";
import { TrainingResultService } from "./training-result.service";

@Module({
  controllers: [StudentController, TrainingResultController],
  providers: [StudentService, TrainingResultService, PrismaService],
})
export class StudentModule {}
