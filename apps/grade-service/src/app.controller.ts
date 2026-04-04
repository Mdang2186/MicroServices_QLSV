import { Controller, Get, Post, Body, Param, Put, Delete, Headers } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';
import { GpaService } from './gpa.service';

@Controller('grades')
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly gpaService: GpaService,
  ) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('student/:studentId')
  getStudentGrades(@Param('studentId') studentId: string) {
    return this.appService.getStudentGrades(studentId);
  }

  @Get('class/:classId')
  async getClassGrades(@Param('classId') classId: string) {
    try {
      return await this.appService.getClassGrades(classId);
    } catch (err) {
      console.error('getClassGrades Error:', err);
      throw err;
    }
  }

  @Post('initialize')
  initializeGrades(@Body() body: { classId: string, subjectId: string, studentIds: string[] }) {
    return this.appService.initializeGrades(body.classId, body.subjectId, body.studentIds);
  }

  @Post('bulk')
  bulkUpdateGrades(@Body() body: { grades: any[] }, @Headers('x-user-role') userRole?: string) {
    return this.appService.bulkUpdateGrades(body.grades, userRole);
  }

  @Post('submit/:classId')
  async submit(@Param('classId') classId: string) {
    return this.appService.submitGrades(classId);
  }

  @Post('approve/:classId')
  async approve(@Param('classId') classId: string) {
    return this.appService.approveGrades(classId);
  }

  @Post('lock/:classId')
  lockClassGrades(@Param('classId') classId: string) {
    return this.appService.lockClassGrades(classId);
  }

  @Post('unlock/:classId')
  unlockClassGrades(@Param('classId') classId: string) {
    return this.appService.unlockClassGrades(classId);
  }

  @Post('class/:classId/sync-attendance')
  syncAttendanceScores(@Param('classId') classId: string) {
    return this.appService.syncAttendanceScores(classId);
  }

  @Get('student/:studentId/gpa/:semesterId')
  getSemesterGPA(@Param('studentId') studentId: string, @Param('semesterId') semesterId: string) {
    return this.gpaService.calculateSemesterGPA(studentId, semesterId);
  }

  @Get('student/:studentId/academic-summary/:semesterId')
  getAcademicSummary(@Param('studentId') studentId: string, @Param('semesterId') semesterId: string) {
    return this.gpaService.getAcademicSummary(studentId, semesterId);
  }

  @Post('student/:studentId/sync-performance')
  syncPerformance(@Param('studentId') studentId: string) {
    return this.appService.syncStudentPerformance(studentId);
  }
}
