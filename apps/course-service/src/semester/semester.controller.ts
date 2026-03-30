
import { Controller, Get } from '@nestjs/common';
import { SemesterService } from './semester.service';

@Controller('semesters')
export class SemesterController {
    constructor(private readonly semesterService: SemesterService) { }

    @Get()
    async findAll() {
        return this.semesterService.findAll();
    }
}
