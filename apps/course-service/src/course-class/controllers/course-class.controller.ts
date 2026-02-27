import { Controller, Get } from '@nestjs/common';
import { CourseClassService } from '../course-class.service';

@Controller('courses')
export class CourseClassController {
    constructor(private readonly courseClassService: CourseClassService) { }

    @Get()
    async findAll() {
        const classes = await this.courseClassService.findAll();
        // Transform to match frontend props
        return (classes as any[]).map(c => ({
            id: c.id,
            title: c.subject.name,
            code: c.code,
            instructor: c.lecturer?.fullName || 'TBD',
            enrolled: c._count.enrollments,
            capacity: c.maxSlots,
            // @ts-ignore
            schedule: c.schedules && c.schedules.length > 0
                // @ts-ignore
                ? c.schedules.map(s => `Day ${s.dayOfWeek}(${s.startShift}-${s.endShift}) at ${s.room}`).join(', ')
                : 'TBD',
            // @ts-ignore
            rawSchedules: c.schedules,
            duration: '15 weeks', // Hardcoded or calculated from semester
            status: c.status === 'OPEN' ? 'Active' : c.status
        }));
    }
}
