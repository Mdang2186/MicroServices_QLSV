import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) { }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('student/:studentId')
  getStudentGrades(@Param('studentId') studentId: string) {
    return this.appService.getStudentGrades(studentId);
  }

  @Get('class/:classId')
  getClassGrades(@Param('classId') classId: string) {
    return this.appService.getClassGrades(classId);
  }

  @Post('bulk')
  @ApiBody({
    schema: {
        type: 'object',
        properties: {
            grades: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        enrollmentId: { type: 'string', example: 'ENR123' },
                        subjectCode: { type: 'string', example: 'MATH101' },
                        score: { type: 'number', example: 8.5 }
                    }
                }
            }
        }
    }
  })
  bulkUpdateGrades(@Body() body: { grades: any[] }) {
    return this.appService.bulkUpdateGrades(body.grades);
  }
}
