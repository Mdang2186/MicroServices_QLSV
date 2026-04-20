import { Controller, Get, Param, Query } from "@nestjs/common";
import { TuitionService } from "./tuition.service";
import { ApiTags } from "@nestjs/swagger";

@ApiTags("Student Fees")
@Controller("student-fees")
export class StudentFeeController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Get("student/:studentId/semester/:semesterId")
  getSemesterFees(
    @Param("studentId") studentId: string,
    @Param("semesterId") semesterId: string,
  ) {
    return this.tuitionService.getStudentSemesterFees(studentId, semesterId);
  }

  @Get("student/:studentId/transactions")
  getTransactions(@Param("studentId") studentId: string) {
    return this.tuitionService.getStudentFeeTransactions(studentId);
  }

  @Get("student/:studentId/all")
  getAllFees(@Param("studentId") studentId: string) {
    return this.tuitionService.getStudentFees(studentId);
  }

  @Get("student/:studentId")
  getFeeOverview(@Param("studentId") studentId: string) {
    return this.tuitionService.getStudentFees(studentId);
  }
}
