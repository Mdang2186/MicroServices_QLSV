import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
  Headers,
} from '@nestjs/common';
import { CourseClassService } from '../course-class.service';

@Controller('courses')
export class CourseClassController {
  constructor(private readonly courseClassService: CourseClassService) {}

  private toPortalDayOfWeek(date: Date | string) {
    const jsDay = new Date(date).getDay();
    return jsDay === 0 ? 8 : jsDay + 1;
  }

  private mapSessionsToSchedules(sessions: any[] = []) {
    const scheduleMap = new Map<string, any>();

    for (const session of sessions) {
      const dayOfWeek = this.toPortalDayOfWeek(session.date);
      const key = [
        dayOfWeek,
        session.startShift,
        session.endShift,
        session.roomId || '',
        session.type || 'THEORY',
      ].join('::');

      if (!scheduleMap.has(key)) {
        scheduleMap.set(key, {
          dayOfWeek,
          startShift: session.startShift,
          endShift: session.endShift,
          roomId: session.roomId || null,
          room: session.room || null,
          type: session.type || 'THEORY',
        });
      }
    }

    return [...scheduleMap.values()].sort((left, right) => {
      if (left.dayOfWeek !== right.dayOfWeek) {
        return left.dayOfWeek - right.dayOfWeek;
      }
      if (left.startShift !== right.startShift) {
        return left.startShift - right.startShift;
      }
      return left.endShift - right.endShift;
    });
  }

  private normalizeCourseClass(courseClass: any) {
    const schedules = this.mapSessionsToSchedules(courseClass?.sessions || []);
    return {
      ...courseClass,
      schedules,
    };
  }

  @Get('my-exam-schedule')
  async getMyExamSchedule(@Headers('x-user-id') studentId: string) {
    if (!studentId) return [];
    return this.courseClassService.getMyExamSchedule(studentId);
  }

  @Get('my-classes')
  async findMyClasses(
    @Headers('x-user-id') lecturerId: string,
    @Query('semesterId') semesterId?: string,
  ) {
    if (!lecturerId) return [];
    const classes = await this.courseClassService.findByLecturerId(
      lecturerId,
      semesterId,
    );
    return (classes as any[]).map((c) => ({
      id: c.id,
      title: c.subject.name,
      code: c.code,
      name: c.name,
      instructor: c.lecturer?.fullName || 'TBD',
      currentSlots: c._count.enrollments,
      maxSlots: c.maxSlots,
      sessions: c.sessions,
      schedules: this.mapSessionsToSchedules(c.sessions),
      semester: c.semester,
      subject: c.subject,
      adminClasses: c.adminClasses,
      lecturer: c.lecturer,
      status: c._count.enrollments >= c.maxSlots ? 'LOCKED' : c.status,
    }));
  }

  @Get('lecturer/:id')
  async findByLecturer(
    @Param('id') id: string,
    @Query('semesterId') semesterId?: string,
  ) {
    const classes = await this.courseClassService.findByLecturerId(
      id,
      semesterId,
    );
    return (classes as any[]).map((c) => ({
      id: c.id,
      title: c.subject.name,
      code: c.code,
      name: c.name,
      instructor: c.lecturer?.fullName || 'TBD',
      currentSlots: c._count.enrollments,
      maxSlots: c.maxSlots,
      sessions: c.sessions,
      schedules: this.mapSessionsToSchedules(c.sessions),
      semester: c.semester,
      subject: c.subject,
      adminClasses: c.adminClasses,
      lecturer: c.lecturer,
      status: c._count.enrollments >= c.maxSlots ? 'LOCKED' : c.status,
    }));
  }

  @Get('schedule/lecturer/:id')
  async getLecturerSchedule(
    @Param('id') lecturerId: string,
    @Query('semesterId') semesterId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const schedule = await this.courseClassService.getLecturerSchedule(
      lecturerId,
      semesterId,
      excludeId,
    );
    return (schedule as any[]).map((s) => {
      const dateObj = new Date(s.date);
      const d = dateObj.getDay() === 0 ? 8 : dateObj.getDay() + 1;
      return {
        ...s,
        courseClass: this.normalizeCourseClass(s.courseClass),
        dayOfWeek: d,
        type: s.type || 'THEORY',
      };
    });
  }

  @Get('sessions/lecturer/:id')
  async getLecturerSessions(
    @Param('id') lecturerId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.courseClassService.getLecturerSessions(
      lecturerId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  @Get('schedule/admin-classes')
  async getAdminClassesSchedule(
    @Query('ids') ids: string | string[],
    @Query('semesterId') semesterId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const adminClassIds = Array.isArray(ids) ? ids : [ids];
    const schedule = await this.courseClassService.getAdminClassesSchedule(
      adminClassIds,
      semesterId,
      excludeId,
    );
    return (schedule as any[]).map((s) => {
      const dateObj = new Date(s.date);
      const d = dateObj.getDay() === 0 ? 8 : dateObj.getDay() + 1;
      return {
        ...s,
        courseClass: this.normalizeCourseClass(s.courseClass),
        dayOfWeek: d,
        type: s.type || 'THEORY',
      };
    });
  }

  @Get('faculties')
  async getFaculties() {
    return this.courseClassService.getFaculties();
  }

  @Get('cohorts')
  async getCohorts() {
    return this.courseClassService.getCohorts();
  }

  @Get('majors')
  async getMajors(@Query('facultyId') facultyId?: string) {
    return this.courseClassService.getMajors(facultyId);
  }

  @Get('subjects/by-faculty')
  async getSubjects(
    @Query('facultyId') facultyId?: string,
    @Query('majorId') majorId?: string,
    @Query('semesterId') semesterId?: string,
  ) {
    return this.courseClassService.getSubjectsByFaculty(
      facultyId,
      majorId,
      semesterId,
    );
  }

  @Get('admin-classes/by-major')
  async getAdminClasses(@Query('majorId') majorId: string) {
    return this.courseClassService.getAdminClassesByMajor(majorId);
  }

  @Get('lecturers/by-faculty')
  async getLecturersByFaculty(@Query('facultyId') facultyId?: string) {
    return this.courseClassService.getLecturersByFaculty(facultyId);
  }

  @Get()
  async findAll(
    @Query('subjectId') subjectId?: string,
    @Query('semesterId') semesterId?: string,
    @Query('status') status?: string,
    @Query('facultyId') facultyId?: string,
    @Query('majorId') majorId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('cohort') cohort?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.courseClassService.findAll({
      subjectId,
      semesterId,
      status,
      facultyId,
      majorId,
      departmentId,
      cohort,
      search,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('exam-planning/groups')
  async getExamPlanningGroups(
    @Query('semesterId') semesterId: string,
    @Query('search') search?: string,
    @Query('facultyId') facultyId?: string,
    @Query('cohort') cohort?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.courseClassService.getExamPlanningGroups({
      semesterId,
      search,
      facultyId,
      cohort,
      subjectId,
    });
  }

  @Get('exam-planning/detail')
  async getExamPlanningDetail(
    @Query('semesterId') semesterId: string,
    @Query('subjectId') subjectId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.courseClassService.getExamPlanningDetail(
      semesterId,
      subjectId,
      cohort,
    );
  }

  @Get('exam-planning/plans')
  async getScheduledExamPlans(@Query('semesterId') semesterId?: string) {
    return this.courseClassService.getScheduledExamPlans(semesterId);
  }

  @Get('exam-planning/availability')
  async getExamPlanningAvailability(
    @Query('semesterId') semesterId: string,
    @Query('subjectId') subjectId: string,
    @Query('cohort') cohort: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo?: string,
    @Query('studentsPerRoom') studentsPerRoom?: string,
    @Query('limit') limit?: string,
    @Query('selectedDate') selectedDate?: string,
    @Query('selectedStartShift') selectedStartShift?: string,
  ) {
    return this.courseClassService.getExamPlanningAvailability({
      semesterId,
      subjectId,
      cohort,
      dateFrom,
      dateTo,
      studentsPerRoom: studentsPerRoom ? Number(studentsPerRoom) : undefined,
      limit: limit ? Number(limit) : undefined,
      selectedDate,
      selectedStartShift: selectedStartShift
        ? Number(selectedStartShift)
        : undefined,
    } as any);
  }

  @Post('exam-planning/schedule')
  async scheduleExamPlan(@Body() body: any) {
    return this.courseClassService.scheduleExamPlan(body);
  }

  @Post()
  async create(@Body() body: any) {
    return this.courseClassService.create(body);
  }

  @Post('bulk')
  async createBulk(@Body() body: { items: any[] }) {
    return this.courseClassService.createBulk(body.items);
  }

  @Post('bulk-import')
  async bulkImport(@Body() body: { items: any[]; semesterId: string }) {
    return this.courseClassService.bulkImportByCode(body);
  }

  @Get('classes/:id')
  async findOne(@Param('id') id: string) {
    const c = await this.courseClassService.findOne(id);
    if (!c) return null;
    return {
      id: c.id,
      title: c.subject.name,
      code: c.code,
      name: c.name,
      instructor: c.lecturer?.fullName || 'TBD',
      enrolled: c._count.enrollments,
      capacity: c.maxSlots,
      semesterId: c.semesterId,
      subjectId: c.subjectId,
      lecturerId: c.lecturerId,
      semester: c.semester,
      subject: c.subject,
      adminClasses: c.adminClasses,
      lecturer: c.lecturer,
      sessions: c.sessions,
      schedules: this.mapSessionsToSchedules(c.sessions),
      status: c._count.enrollments >= c.maxSlots ? 'LOCKED' : c.status,
    };
  }

  @Patch('sessions/:sessionId/reschedule')
  async rescheduleSession(
    @Param('sessionId') sessionId: string,
    @Body() body: any,
  ) {
    return this.courseClassService.rescheduleSession(sessionId, body);
  }

  @Post(':id/sessions')
  async createSession(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.addManualSession(id, body);
  }

  @Delete('sessions/:sessionId')
  async deleteSession(@Param('sessionId') sessionId: string) {
    return this.courseClassService.deleteSession(sessionId);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.update(id, body);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.courseClassService.remove(id);
  }

  @Post(':id/push-students')
  async pushStudents(@Param('id') id: string) {
    return this.courseClassService.pushStudentsFromAdminClasses(id);
  }

  @Post(':id/manual-session')
  async addManualSession(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.addManualSession(id, body);
  }

  @Get(':id/conflicts')
  async getConflictReport(@Param('id') id: string) {
    return this.courseClassService.getConflictReport(id);
  }

  @Post(':id/cleanup-conflicts')
  async cleanupConflicts(@Param('id') id: string) {
    return this.courseClassService.cleanupConflictingSessions(id);
  }

  @Get(':id/sessions')
  async getSessions(@Param('id') id: string) {
    return this.courseClassService.getSessions(id);
  }

  @Post(':id/generate-sessions')
  async generateSessions(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.generateSessionsInRange(id, body);
  }

  @Post(':id/replan-schedule')
  async replanSchedule(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.replanSchedule(id, body);
  }

  @Get(':id/eligible-students')
  async getEligibleStudents(@Param('id') id: string) {
    return this.courseClassService.getEligibleStudents(id);
  }

  @Post(':id/schedule-exam')
  async scheduleExam(@Param('id') id: string, @Body() body: any) {
    return this.courseClassService.scheduleExam(id, body);
  }

  @Get(':id/exam-schedule')
  async getExamSchedule(@Param('id') id: string) {
    return this.courseClassService.getExamSchedule(id);
  }
}
