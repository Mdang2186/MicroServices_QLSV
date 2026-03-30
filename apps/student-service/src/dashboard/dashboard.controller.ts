import { Controller, Get, Query, Patch, Param, Body } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("students/dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("stats")
  getStats(
    @Query("semesterId") semesterId?: string,
    @Query("facultyId") facultyId?: string,
  ) {
    return this.dashboardService.getStats(semesterId, facultyId);
  }

  @Get("semesters")
  getSemesters() {
    return this.dashboardService.getSemesters();
  }

  @Get("faculties")
  getFaculties() {
    return this.dashboardService.getFaculties();
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
