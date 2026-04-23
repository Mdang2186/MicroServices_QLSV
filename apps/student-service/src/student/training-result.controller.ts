import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import { TrainingResultService } from "./training-result.service";

@Controller("training-results")
export class TrainingResultController {
  constructor(private readonly trainingResultService: TrainingResultService) {}

  @Get("student/:studentId")
  getStudentTrainingResults(@Param("studentId") studentId: string) {
    return this.trainingResultService.getStudentTrainingResults(studentId);
  }

  @Get("admin-class/:adminClassId")
  getAdminClassTrainingResults(
    @Param("adminClassId") adminClassId: string,
    @Query("semesterId") semesterId?: string,
  ) {
    return this.trainingResultService.getAdminClassTrainingResults(
      adminClassId,
      semesterId,
    );
  }

  @Post("batch-save")
  batchSaveTrainingResults(@Body() data: { studentId: string; semesterId: string; score: number; classification: string }[]) {
    return this.trainingResultService.batchSaveTrainingResults(data);
  }
}
