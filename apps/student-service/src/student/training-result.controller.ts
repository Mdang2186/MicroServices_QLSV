import { Controller, Get, Param } from "@nestjs/common";
import { TrainingResultService } from "./training-result.service";

@Controller("training-results")
export class TrainingResultController {
  constructor(private readonly trainingResultService: TrainingResultService) {}

  @Get("student/:studentId")
  getStudentTrainingResults(@Param("studentId") studentId: string) {
    return this.trainingResultService.getStudentTrainingResults(studentId);
  }
}
