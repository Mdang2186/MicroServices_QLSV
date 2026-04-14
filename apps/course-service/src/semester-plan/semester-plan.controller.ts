import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Param,
  Patch,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SemesterPlanService } from './semester-plan-v2.service';

@ApiTags('Semester Plan')
@Controller('semester-plan')
export class SemesterPlanController {
  constructor(private readonly semesterPlanService: SemesterPlanService) {}

  @Get('templates')
  @ApiOperation({
    summary: 'Danh sách template kế hoạch đào tạo theo ngành và khóa',
  })
  async listTemplates(
    @Query('majorId') majorId?: string,
    @Query('cohort') cohort?: string,
  ) {
    return this.semesterPlanService.listTemplates(majorId, cohort);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Lưu draft template kế hoạch đào tạo' })
  async saveTemplate(@Body() body: any) {
    return this.semesterPlanService.saveTemplate(body);
  }

  @Post('templates/:id/publish')
  @ApiOperation({
    summary: 'Publish template và đồng bộ Curriculum read-model',
  })
  async publishTemplate(@Param('id') id: string) {
    return this.semesterPlanService.publishTemplate(id);
  }

  @Post('templates/:id/copy')
  @ApiOperation({ summary: 'Sao chép template sang các khóa khác' })
  async copyTemplate(
    @Param('id') id: string,
    @Body() body: { targetCohorts: string[] },
  ) {
    return this.semesterPlanService.copyTemplate(id, body.targetCohorts || []);
  }

  @Post('executions/generate')
  @ApiOperation({
    summary: 'Sinh semester plan preview từ template đã publish',
  })
  async generateExecution(
    @Body() body: { semesterId: string; majorId: string; cohort: string },
  ) {
    return this.semesterPlanService.generateExecution(
      body.semesterId,
      body.majorId,
      body.cohort,
    );
  }

  @Get('executions/current')
  @ApiOperation({
    summary: 'Lấy semester plan thực thi hiện có theo ngành, khóa và học kỳ',
  })
  async findExecutionByScope(
    @Query('semesterId') semesterId: string,
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.semesterPlanService.findExecutionByScope(
      semesterId,
      majorId,
      cohort,
    );
  }

  @Get('executions/:id')
  @ApiOperation({ summary: 'Chi tiết semester plan thực thi' })
  async getExecution(@Param('id') id: string) {
    return this.semesterPlanService.getExecution(id);
  }

  @Patch('execution-items/:id')
  @ApiOperation({ summary: 'Cập nhật semester plan item ở bước preview' })
  async updateExecutionItem(@Param('id') id: string, @Body() body: any) {
    return this.semesterPlanService.updateExecutionItem(id, body);
  }

  @Post('executions/:id/execute')
  @ApiOperation({
    summary: 'Thực hiện kế hoạch đào tạo: tạo lớp, đẩy SV, xếp lịch',
  })
  async executeExecution(@Param('id') id: string) {
    return this.semesterPlanService.executeExecution(id);
  }

  @Post('executions/:id/zap')
  @ApiOperation({
    summary:
      'ZAP: chốt kế hoạch, mở lớp học phần, đẩy sinh viên, xếp lịch và khởi tạo bảng điểm',
  })
  async zapExecution(@Param('id') id: string) {
    return this.semesterPlanService.zapExecution(id);
  }

  @Post('executions/:id/rebuild-schedule')
  @ApiOperation({ summary: 'Xếp lại lịch cho semester plan đã sinh lớp' })
  async rebuildSchedule(@Param('id') id: string) {
    return this.semesterPlanService.rebuildSchedule(id);
  }

  @Post('executions/auto-run-up-to-current')
  @ApiOperation({
    summary:
      'Tạo và thực hiện tự động tất cả học kỳ từ đầu khóa đến học kỳ hiện tại',
  })
  async autoRunUpToCurrent(
    @Body()
    body: {
      majorId: string;
      cohort: string;
      semesterIds: string[];
    },
  ) {
    return this.semesterPlanService.autoRunUpToCurrent(
      body.majorId,
      body.cohort,
      body.semesterIds || [],
    );
  }

  @Get('classes')
  @ApiOperation({ summary: 'Lấy danh sách lớp học phần theo học kỳ' })
  async findClasses(@Query('semesterId') semesterId: string) {
    return this.semesterPlanService.findClasses(semesterId);
  }

  @Post('generate-full')
  @ApiOperation({ summary: 'Lập kế hoạch toàn khóa: Tạo lớp cho 8 học kỳ' })
  async generateFull(@Body() body: { majorId: string; cohort: string }) {
    return this.semesterPlanService.generateFullCohortPlan(
      body.majorId,
      body.cohort,
    );
  }

  @Get('curriculum')
  @ApiOperation({ summary: 'Lấy khung chương trình để chọn môn sao chép' })
  async getCurriculum(
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

  @Get('expected-students')
  @ApiOperation({
    summary: 'Lấy số lượng sinh viên dự kiến theo khóa và ngành',
  })
  async getExpectedStudents(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.semesterPlanService.getExpectedStudents(majorId, cohort);
  }

  @Post('copy-curriculum')
  @ApiOperation({
    summary: 'Sao chép môn học từ khung chương trình vào học kỳ',
  })
  async copyCurriculum(
    @Body()
    body: {
      semesterId: string;
      majorId: string;
      cohort: string;
      subjectIds: string[];
    },
  ) {
    return this.semesterPlanService.copyCurriculumToSemester(
      body.semesterId,
      body.majorId,
      body.cohort,
      body.subjectIds,
    );
  }

  @Post('schedule/:semesterId')
  @ApiOperation({
    summary: 'Xếp lịch học tự động: Áp dụng quy tắc Remainder+1',
  })
  async schedule(
    @Param('semesterId') semesterId: string,
    @Body() config: { periodsPerSession: number; sessionsPerWeek: number },
  ) {
    return this.semesterPlanService.automateScheduling(semesterId, config);
  }

  @Post('exam-schedule/:semesterId')
  @ApiOperation({ summary: 'Tạo lịch thi tự động: Sau kỳ học' })
  async generateExams(@Param('semesterId') semesterId: string) {
    return this.semesterPlanService.generateExamSchedules(semesterId);
  }

  @Post('blueprint')
  @ApiOperation({ summary: 'Lưu bộ khung chương trình (Master Blueprint)' })
  async saveBlueprint(
    @Body()
    body: {
      majorId: string;
      cohort: string;
      items: { subjectId: string; suggestedSemester: number }[];
    },
  ) {
    return this.semesterPlanService.saveBlueprint(
      body.majorId,
      body.cohort,
      body.items,
    );
  }

  @Post('blueprint/duplicate')
  @ApiOperation({ summary: 'Sao chép kế hoạch khung sang các khóa khác' })
  async duplicateBlueprint(
    @Body()
    body: {
      majorId: string;
      sourceCohort: string;
      targetCohorts: string[];
    },
  ) {
    return this.semesterPlanService.duplicateBlueprint(
      body.majorId,
      body.sourceCohort,
      body.targetCohorts,
    );
  }

  @Get('blueprint')
  @ApiOperation({ summary: 'Lấy bộ khung chương trình theo ngành và khóa' })
  async getBlueprint(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.semesterPlanService.getCurriculumByMajor(majorId, cohort);
  }

  @Post('apply')
  @ApiOperation({
    summary: 'Áp dụng Blueprint vào học kỳ thực tế (tạo lớp + gán GV tự động)',
  })
  async applyBlueprint(
    @Body()
    body: {
      semesterId: string;
      majorId: string;
      cohort: string;
      subjectIds: string[];
    },
  ) {
    return this.semesterPlanService.applyBlueprintToSemester(
      body.semesterId,
      body.majorId,
      body.cohort,
      body.subjectIds,
    );
  }

  @Post('bulk-create')
  @ApiOperation({
    summary: 'Compat: sinh lớp, enroll và xếp lịch ngay từ blueprint cũ',
  })
  async bulkCreatePlan(
    @Body()
    body: {
      semesterId: string;
      majorId: string;
      cohort: string;
      subjectIds: string[];
    },
  ) {
    return this.semesterPlanService.bulkCreatePlan(
      body.semesterId,
      body.majorId,
      body.cohort,
      body.subjectIds,
    );
  }

  @Get('classes-by-cohort')
  @ApiOperation({
    summary: 'Lấy danh sách lớp học theo Khóa và Ngành (Tree View)',
  })
  async findClassesByCohort(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.semesterPlanService.findClassesByCohort(majorId, cohort);
  }

  @Post('commit')
  @ApiOperation({
    summary: 'Chốt dữ liệu: Chuyển PLANNING -> OPEN và PENDING -> REGISTERED',
  })
  async commitSubPlan(
    @Body() body: { semesterId: string; majorId: string; cohort: string },
  ) {
    return this.semesterPlanService.commitSubPlan(
      body.semesterId,
      body.majorId,
      body.cohort,
    );
  }

  @Post('global-automate')
  @ApiOperation({
    summary:
      'Tự động hóa toàn hệ thống: Lập kế hoạch và xếp lịch cho mọi ngành, khóa, học kỳ',
  })
  async globalAutomate() {
    return this.semesterPlanService.executeGlobalAutomation();
  }

  @Post('update-class-factors')
  @ApiOperation({
    summary: 'Cập nhật yếu tố xếp lịch (số buổi/tiết) cho lớp học phần',
  })
  async updateClassFactors(
    @Body()
    body: {
      classId: string;
      sessionsPerWeek: number;
      periodsPerSession: number;
    },
  ) {
    return this.semesterPlanService.updateClassFactors(
      body.classId,
      body.sessionsPerWeek,
      body.periodsPerSession,
    );
  }
}
