import { Controller, Get, Query } from '@nestjs/common';
import { AdminClassService } from './admin-class.service';

@Controller('admin-classes')
export class AdminClassController {
  constructor(private readonly adminClassService: AdminClassService) {}

  @Get()
  async findAll(
    @Query('majorId') majorId?: string,
    @Query('cohort') cohort?: string,
  ) {
    return this.adminClassService.findAll(majorId, cohort);
  }
}
