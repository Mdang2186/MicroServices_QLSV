import { Controller, Get, Post, Query, Patch, Body, Param, Delete } from "@nestjs/common";
import { TuitionService } from "./tuition.service";

@Controller("students/tuition")
export class TuitionController {
  constructor(private readonly tuitionService: TuitionService) {}

  @Get("faculties")
  getFaculties() {
    return this.tuitionService.getFaculties();
  }

  @Get("majors")
  getMajors(@Query("facultyId") facultyId?: string) {
    return this.tuitionService.getMajors(facultyId);
  }

  @Get("classes")
  getAdminClasses(@Query("majorId") majorId?: string) {
    return this.tuitionService.getAdminClasses(majorId);
  }

  @Get("intakes")
  getIntakes() {
    return this.tuitionService.getIntakes();
  }

  @Get("list")
  getStudentTuitionList(
    @Query("semesterId") semesterId?: string,
    @Query("date") date?: string,
    @Query("facultyId") facultyId?: string,
    @Query("majorId") majorId?: string,
    @Query("classId") classId?: string,
    @Query("intake") intake?: string,
    @Query("query") query?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.tuitionService.getStudentTuitionList({
      semesterId,
      date,
      facultyId,
      majorId,
      classId,
      intake,
      query,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Patch("confirm-payment")
  confirmPayment(
    @Body() body: { enrollmentIds: string[]; status: "PAID" | "REGISTERED" },
  ) {
    return this.tuitionService.updateEnrollmentPayment(
      body.enrollmentIds,
      body.status,
    );
  }

  @Patch("update-fee")
  updateFee(
    @Body() body: { enrollmentId: string; customFee: number },
  ) {
    return this.tuitionService.updateEnrollmentTuitionFee(
      body.enrollmentId,
      body.customFee,
    );
  }

  @Patch("toggle-exam-eligibility")
  toggleExamEligibility(
    @Query("studentId") studentId: string,
    @Query("semesterId") semesterId: string,
    @Query("isEligible") isEligible: string,
  ) {
    return this.tuitionService.toggleExamEligibility(
      studentId,
      semesterId,
      isEligible === "true",
    );
  }

  @Post("generate-fixed-fees/:semesterId")
  generateFixedFees(@Param("semesterId") semesterId: string) {
    return this.tuitionService.generateFixedFeesForSemester(semesterId);
  }

  @Get("fixed-fee-configs")
  getConfigs(@Query("academicYear") year?: string) {
    return this.tuitionService.getFixedFeeConfigs(year ? Number(year) : undefined);
  }

  @Post("fixed-fee-configs")
  upsertConfig(@Body() data: any) {
    return this.tuitionService.upsertFixedFeeConfig(data);
  }

  @Delete("fixed-fee-configs/:id")
  deleteConfig(@Param("id") id: string) {
    return this.tuitionService.deleteFixedFeeConfig(id);
  }

  @Post("individual-fee")
  createIndividualFee(@Body() data: any) {
    return this.tuitionService.createIndividualFee(data);
  }

  @Delete("student-fee/:id")
  deleteStudentFee(@Param("id") id: string) {
    return this.tuitionService.deleteStudentFee(id);
  }

  @Post("bulk-assign")
  bulkAssign(
    @Body() body: { semesterId: string; configId: string; studentCodes: string[] },
  ) {
    return this.tuitionService.bulkAssignFixedFee(
      body.semesterId,
      body.configId,
      body.studentCodes,
    );
  }
}
