import { Controller, Get, Param, Query, Post } from "@nestjs/common";
import { TuitionService } from "./tuition.service";

@Controller("student-fees")
export class StudentFeeController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Post("sync/:studentId/:semesterId")
  async syncTuition(
    @Param("studentId") studentId: string,
    @Param("semesterId") semesterId: string
  ) {
    return this.tuitionService.syncStudentTuition(studentId, semesterId);
  }

  @Get("student/:studentId")
  async getStudentFees(@Param("studentId") studentId: string) {
    return this.tuitionService.getStudentFees(studentId);
  }

  @Get("list")
  async getTuitionList(
    @Query("semesterId") semesterId?: string,
    @Query("facultyId") facultyId?: string,
    @Query("majorId") majorId?: string,
    @Query("classId") classId?: string,
    @Query("status") status?: string,
    @Query("query") query?: string,
    @Query("page") page?: number,
    @Query("limit") limit?: number
  ) {
    return this.tuitionService.getStudentTuitionList({
      semesterId,
      facultyId,
      majorId,
      classId,
      status,
      query,
      page,
      limit
    });
  }

  @Post("toggle-exam-eligibility")
  async toggleExamEligibility(
    @Query("studentId") studentId: string,
    @Query("semesterId") semesterId: string,
    @Query("isEligible") isEligible: string
  ) {
    return this.tuitionService.toggleExamEligibility(studentId, semesterId, isEligible === 'true');
  }

  @Get("student/:studentId/transactions")
  async getFeeTransactions(@Param("studentId") studentId: string) {
    return [];
  }
}
