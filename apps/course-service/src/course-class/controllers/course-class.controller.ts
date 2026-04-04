import { Controller, Get, Param, Post, Put, Patch, Delete, Body, Query, Headers } from '@nestjs/common';
import { CourseClassService } from '../course-class.service';

@Controller('courses')
export class CourseClassController {
    constructor(private readonly courseClassService: CourseClassService) { }

    @Get('my-classes')
    async findMyClasses(@Headers('x-user-id') lecturerId: string, @Query('semesterId') semesterId?: string) {
        if (!lecturerId) return [];
        const classes = await this.courseClassService.findByLecturerId(lecturerId, semesterId);
        return (classes as any[]).map(c => ({
            id: c.id,
            title: c.subject.name,
            code: c.code,
            name: c.name,
            instructor: c.lecturer?.fullName || 'TBD',
            currentSlots: c._count.enrollments,
            maxSlots: c.maxSlots,
            schedules: c.schedules,
            semester: c.semester,
            subject: c.subject,
            status: (c._count.enrollments >= c.maxSlots) ? 'LOCKED' : c.status
        }));
    }

    @Get('lecturer/:id')
    async findByLecturer(@Param('id') id: string, @Query('semesterId') semesterId?: string) {
        const classes = await this.courseClassService.findByLecturerId(id, semesterId);
        return (classes as any[]).map(c => ({
            id: c.id,
            title: c.subject.name,
            code: c.code,
            name: c.name,
            instructor: c.lecturer?.fullName || 'TBD',
            currentSlots: c._count.enrollments,
            maxSlots: c.maxSlots,
            schedules: c.schedules,
            semester: c.semester,
            subject: c.subject,
            status: (c._count.enrollments >= c.maxSlots) ? 'LOCKED' : c.status
        }));
    }

    @Get('schedule/lecturer/:id')
    async getLecturerSchedule(
        @Param('id') lecturerId: string, 
        @Query('semesterId') semesterId: string,
        @Query('excludeId') excludeId?: string
    ) {
        return this.courseClassService.getLecturerSchedule(lecturerId, semesterId, excludeId);
    }

    @Get('sessions/lecturer/:id')
    async getLecturerSessions(
        @Param('id') lecturerId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.courseClassService.getLecturerSessions(
            lecturerId, 
            new Date(startDate), 
            new Date(endDate)
        );
    }

    @Get('schedule/admin-classes')
    async getAdminClassesSchedule(
        @Query('ids') ids: string | string[], 
        @Query('semesterId') semesterId: string,
        @Query('excludeId') excludeId?: string
    ) {
        const adminClassIds = Array.isArray(ids) ? ids : [ids];
        return this.courseClassService.getAdminClassesSchedule(adminClassIds, semesterId, excludeId);
    }

    @Get('faculties')
    async getFaculties() {
        return this.courseClassService.getFaculties();
    }

    @Get('majors')
    async getMajors(@Query('facultyId') facultyId?: string) {
        return this.courseClassService.getMajors(facultyId);
    }

    @Get('subjects/by-faculty')
    async getSubjects(
        @Query('facultyId') facultyId?: string,
        @Query('majorId') majorId?: string,
        @Query('semesterId') semesterId?: string
    ) {
        return this.courseClassService.getSubjectsByFaculty(facultyId, majorId, semesterId);
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
    async findAll(@Query('subjectId') subjectId?: string, @Query('semesterId') semesterId?: string) {
        return this.courseClassService.findAll(subjectId, semesterId);
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
    async bulkImport(@Body() body: { items: any[], semesterId: string }) {
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
            schedules: c.schedules,
            status: (c._count.enrollments >= c.maxSlots) ? 'LOCKED' : c.status
        };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() body: any) {
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

    @Get(':id/sessions')
    async getSessions(@Param('id') id: string) {
        return this.courseClassService.getSessions(id);
    }

    @Patch('sessions/:sessionId/reschedule')
    async rescheduleSession(@Param('sessionId') sessionId: string, @Body() body: any) {
        return this.courseClassService.rescheduleSession(sessionId, body);
    }

    @Post(':id/manual-session')
    async addManualSession(@Param('id') id: string, @Body() body: any) {
        return this.courseClassService.addManualSession(id, body);
    }

    @Delete('sessions/:sessionId')
    async deleteSession(@Param('sessionId') sessionId: string) {
        return this.courseClassService.deleteSession(sessionId);
    }

    @Post(':id/generate-sessions')
    async generateSessions(@Param('id') id: string, @Body() body: any) {
        return this.courseClassService.generateSessionsInRange(id, body);
    }
}
