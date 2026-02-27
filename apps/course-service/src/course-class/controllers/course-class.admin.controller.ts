
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CourseClassService } from '../course-class.service';

@Controller('admin/courses')
export class CourseClassAdminController {
    constructor(private readonly courseClassService: CourseClassService) { }

    @Post()
    async create(@Body() body: any) {
        return this.courseClassService.create(body);
    }
}
