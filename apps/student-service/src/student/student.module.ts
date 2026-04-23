import { Module } from "@nestjs/common";
import { StudentService } from "./student.service";
import { StudentController } from "./student.controller";
import { TrainingResultController } from "./training-result.controller";
import { TrainingResultService } from "./training-result.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  controllers: [StudentController, TrainingResultController],
  providers: [StudentService, TrainingResultService],
})
export class StudentModule {}
