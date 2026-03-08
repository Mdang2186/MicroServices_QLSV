import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollments')
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) { }

    @Post()
    register(@Body() body: { studentId: string; classId: string }) {
        return this.enrollmentService.registerCourse(body.studentId, body.classId);
    }

    @Get('classes')
    getClasses() {
        return this.enrollmentService.getOpenClasses();
    }

    @Get('student/:studentId')
    getStudentEnrollments(@Param('studentId') studentId: string) {
        return this.enrollmentService.getStudentEnrollments(studentId);
    }

    @Get('registration-status/:studentId')
    getRegistrationStatus(@Param('studentId') studentId: string) {
        return this.enrollmentService.getRegistrationStatus(studentId);
    }

    @Get('subject/:subjectId/classes')
    getClassesBySubject(@Param('subjectId') subjectId: string) {
        return this.enrollmentService.getClassesBySubject(subjectId);
    }

    // ===== ADMIN ENDPOINTS =====
    @Get('admin/classes/schedule')
    getAllClassesSchedule() {
        return this.enrollmentService.getAllClassesSchedule();
    }

    @Get('admin/classes/:classId/enrollments')
    getClassEnrollments(@Param('classId') classId: string) {
        return this.enrollmentService.getClassEnrollments(classId);
    }

    @Post('attendance/bulk')
    bulkMarkAttendance(@Body() body: {
        date: string;
        attendances: { enrollmentId: string; status: string; note?: string }[]
    }) {
        return this.enrollmentService.bulkMarkAttendance(body.date, body.attendances);
    }
}
