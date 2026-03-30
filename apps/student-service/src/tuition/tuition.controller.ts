import { Controller, Get, Query, Patch, Body, Param } from "@nestjs/common";
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

  @Get("list")
  getStudentTuitionList(
    @Query("semesterId") semesterId?: string,
    @Query("facultyId") facultyId?: string,
    @Query("majorId") majorId?: string,
    @Query("classId") classId?: string,
    @Query("query") query?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.tuitionService.getStudentTuitionList({
      semesterId,
      facultyId,
      majorId,
      classId,
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
}
