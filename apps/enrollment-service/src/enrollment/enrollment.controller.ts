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

    // ===== ADMIN ENDPOINTS =====
    @Get('admin/classes/schedule')
    getAllClassesSchedule() {
        return this.enrollmentService.getAllClassesSchedule();
    }

    @Get('admin/classes/:classId/enrollments')
    getClassEnrollments(@Param('classId') classId: string) {
        return this.enrollmentService.getClassEnrollments(classId);
    }
}
