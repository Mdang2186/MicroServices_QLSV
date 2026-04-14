import { Controller, Post, Body, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SemesterPlanService } from './semester-plan-v2.service';

@ApiTags('EMS - Educational Management System')
@Controller('ems')
export class EMSController {
  constructor(private readonly semesterPlanService: SemesterPlanService) {}

  @Get('blueprint')
  @ApiOperation({
    summary: 'Giai đoạn 1: Lấy bộ khung chương trình (Blueprint)',
  })
  async getBlueprint(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
    @Query('semesterNumber') semesterNumber?: string,
  ) {
    return this.semesterPlanService.getCurriculumByMajor(
      majorId,
      cohort,
      semesterNumber ? parseInt(semesterNumber) : undefined,
    );
  }

  @Post('apply-coordination')
  @ApiOperation({
    summary: 'Giai đoạn 2: Trạm điều phối - Phê duyệt gộp lớp & Gán GV',
  })
  async applyCoordination(
    @Body()
    body: {
      semesterId: string;
      majorId: string;
      cohort: string;
      items: any[]; // List of subjectId + config
    },
  ) {
    // This will create the CourseClass in PLANNING status with multiple AdminClasses mapped
    return this.semesterPlanService.applyBlueprintToSemester(
      body.semesterId,
      body.majorId,
      body.cohort,
      body.items.map((i) => i.subjectId),
    );
  }

  @Post('zap')
  @ApiOperation({
    summary: 'Giai đoạn 3: ZAP Mechanism - Kích hoạt học tập hàng loạt',
  })
  async zap(
    @Body()
    body: {
      semesterId: string;
      majorId: string;
      cohort: string;
      subjectIds: string[];
    },
  ) {
    // Atomic transaction: PLANNING -> OPEN, PENDING -> REGISTERED, Auto-Schedule
    return this.semesterPlanService.bulkCreatePlan(
      body.semesterId,
      body.majorId,
      body.cohort,
      body.subjectIds,
    );
  }

  @Get('operation/courses')
  @ApiOperation({ summary: 'Giai đoạn 4: Danh sách lớp vận hành' })
  async getOperationCourses(
    @Query('semesterId') semesterId: string,
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.semesterPlanService.findClassesByCohort(majorId, cohort);
  }
}
