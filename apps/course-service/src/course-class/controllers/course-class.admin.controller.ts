import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { CourseClassService } from '../course-class.service';

@Controller('admin/courses')
export class CourseClassAdminController {
    constructor(private readonly courseClassService: CourseClassService) { }

    @Post()
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                subjectId: { type: 'string', example: 'SUBJ123' },
                courseId: { type: 'string', example: 'CRS456' },
                lecturerId: { type: 'string', example: 'LEC789' },
                shifts: { type: 'string', example: '1,2,3' },
                room: { type: 'string', example: 'A1-102' },
                capacity: { type: 'number', example: 50 },
                startDate: { type: 'string', example: '2024-01-01T00:00:00Z' },
                endDate: { type: 'string', example: '2024-05-30T00:00:00Z' }
            }
        }
    })
    async create(@Body() body: any) {
        return this.courseClassService.create(body);
    }
}
