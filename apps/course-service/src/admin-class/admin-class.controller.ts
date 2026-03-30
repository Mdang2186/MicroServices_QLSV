
import { Controller, Get } from '@nestjs/common';
import { AdminClassService } from './admin-class.service';

@Controller('admin-classes')
export class AdminClassController {
    constructor(private readonly adminClassService: AdminClassService) { }

    @Get()
    async findAll() {
        return this.adminClassService.findAll();
    }
}
