
import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { SemesterService } from './semester.service';

@Controller('semesters')
export class SemesterController {
    constructor(private readonly semesterService: SemesterService) { }

    @Get()
    async findAll() {
        return this.semesterService.findAll();
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any) {
        return this.semesterService.update(id, data);
    }
}
