import { Controller, Get, Param } from '@nestjs/common';
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
}
