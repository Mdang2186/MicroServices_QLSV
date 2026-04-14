import { Controller, Get, Query, Patch, Param, Body } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("students/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  getStats(
    @Query("semesterId") semesterId?: string,
    @Query("facultyId") facultyId?: string,
    @Query("majorId") majorId?: string,
    @Query("intake") intake?: string,
  ) {
    return this.dashboardService.getStats(
      semesterId,
      facultyId,
      majorId,
      intake,
    );
  }

  @Get("semesters")
  getSemesters() {
    return this.dashboardService.getSemesters();
  }

  @Get("faculties")
  getFaculties() {
    return this.dashboardService.getFaculties();
  }

  @Get("majors")
  getMajors(@Query("facultyId") facultyId?: string) {
    return this.dashboardService.getMajors(facultyId);
  }

  @Get("intakes")
  getIntakes() {
    return this.dashboardService.getIntakes();
  }

  @Get("tuition")
  getTuitionList(
    @Query("semesterId") semesterId?: string,
    @Query("query") query?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
  ) {
    return this.dashboardService.getTuitionList(
      semesterId,
      query,
      Number(page),
      Number(limit),
    );
  }

  @Patch("tuition/:id")
  updateTuitionStatus(
    @Param("id") id: string,
    @Body() data: { isPaid?: boolean; deduction?: number },
  ) {
    return this.dashboardService.updateTuitionStatus(id, data);
  }
}
