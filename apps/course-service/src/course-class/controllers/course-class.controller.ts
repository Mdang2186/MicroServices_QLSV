import { Controller, Get, Param, Post, Put, Delete, Body, Query } from '@nestjs/common';
import { CourseClassService } from '../course-class.service';

@Controller('courses')
export class CourseClassController {
    constructor(private readonly courseClassService: CourseClassService) { }

    @Get()
    async findAll(@Query('subjectId') subjectId?: string, @Query('semesterId') semesterId?: string) {
        const classes = await this.courseClassService.findAll(subjectId, semesterId);
        return (classes as any[]).map(c => ({
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
        }));
    }

    @Get('lecturer/:id')
    async findByLecturer(@Param('id') id: string) {
        const classes = await this.courseClassService.findByLecturerId(id);
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

    @Post()
    async create(@Body() body: any) {
        return this.courseClassService.create(body);
    }

    @Post('bulk')
    async createBulk(@Body() body: { items: any[] }) {
        return this.courseClassService.createBulk(body.items);
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
}
