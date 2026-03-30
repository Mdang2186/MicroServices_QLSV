import { Controller, Get, Param, Query } from "@nestjs/common";
import { TuitionService } from "./tuition.service";

@Controller("student-fees")
export class StudentFeeController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Get("student/:studentId")
  async getStudentFees(@Param("studentId") studentId: string) {
    return this.tuitionService.getStudentFees(studentId);
  }

  @Get("student/:studentId/transactions")
  async getFeeTransactions(@Param("studentId") studentId: string) {
    // For now, this can return mock or empty, as we focus on synchronizing enrollment status
    return [];
  }
}
