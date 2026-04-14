import { Controller, Post, Body, Get, Param, Query, Delete } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { EnrollmentService } from './enrollment.service';

@Controller('enrollments')
export class EnrollmentController {
    constructor(private readonly enrollmentService: EnrollmentService) { }

    @Post()
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                studentId: { type: 'string' },
                classId: { type: 'string' }
            }
        }
    })
    register(@Body() body: { studentId: string; classId: string }) {
        return this.enrollmentService.registerCourse(body.studentId, body.classId);
    }

    @Post('drop')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                studentId: { type: 'string' },
                classId: { type: 'string' }
            }
        }
    })
    drop(@Body() body: { studentId: string; classId: string }) {
        return this.enrollmentService.dropCourse(body.studentId, body.classId);
    }

    @Delete(':id')
    dropById(@Param('id') id: string) {
        return this.enrollmentService.dropEnrollmentById(id);
    }

    @Post('switch')
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                studentId: { type: 'string', example: 'STU12345' },
                oldClassId: { type: 'string', example: 'CLS1' },
                newClassId: { type: 'string', example: 'CLS2' }
            }
        }
    })
    switch(@Body() body: { studentId: string; oldClassId: string; newClassId: string }) {
        return this.enrollmentService.switchClass(body.studentId, body.oldClassId, body.newClassId);
    }

    @Get('semesters')
    getSemesters() {
        return this.enrollmentService.getSemesters();
    }

    @Get('semesters/student/:studentId')
    getSemestersByStudent(@Param('studentId') studentId: string) {
        return this.enrollmentService.getSemestersByStudent(studentId);
    }

    @Get('classes')
    getClasses() {
        return this.enrollmentService.getOpenClasses();
    }

    @Get('student/:studentId')
    getStudentEnrollments(
        @Param('studentId') studentId: string,
        @Query('semesterId') semesterId?: string
    ) {
        return this.enrollmentService.getStudentEnrollments(studentId, semesterId);
    }

    @Get('registration-status/:studentId')
    getRegistrationStatus(
        @Param('studentId') studentId: string,
        @Query('semesterId') semesterId?: string
    ) {
        return this.enrollmentService.getRegistrationStatus(studentId, semesterId);
    }

    @Get('subject/:subjectId/classes')
    getClassesBySubject(
        @Param('subjectId') subjectId: string,
        @Query('semesterId') semesterId?: string
    ) {
        return this.enrollmentService.getClassesBySubject(subjectId, semesterId);
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
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                date: { type: 'string', example: '2023-11-20T00:00:00Z' },
                attendances: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            enrollmentId: { type: 'string', example: 'ENR9999' },
                            status: { type: 'string', example: 'PRESENT' },
                            note: { type: 'string', example: 'Đi trễ 15p' }
                        }
                    }
                }
            }
        }
    })
    bulkMarkAttendance(@Body() body: {
        date: string;
        attendances: { enrollmentId: string; status: string; note?: string }[]
    }) {
        return this.enrollmentService.bulkMarkAttendance(body.date, body.attendances);
    }
}
