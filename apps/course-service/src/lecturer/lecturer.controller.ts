
import { Controller, Get } from '@nestjs/common';
import { LecturerService } from './lecturer.service';

@Controller('lecturers')
export class LecturerController {
    constructor(private readonly lecturerService: LecturerService) { }

    @Get()
    async findAll() {
        return this.lecturerService.findAll();
    }
}
