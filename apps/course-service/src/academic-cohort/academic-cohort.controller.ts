import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AcademicCohortService } from './academic-cohort.service';

@Controller('cohorts')
export class AcademicCohortController {
  constructor(private readonly academicCohortService: AcademicCohortService) {}

  @Get()
  async findAll() {
    return this.academicCohortService.findAll();
  }

  @Post()
  async create(@Body() data: any) {
    return this.academicCohortService.create(data);
  }

  @Patch(':code')
  async update(@Param('code') code: string, @Body() data: any) {
    return this.academicCohortService.update(code, data);
  }

  @Delete(':code')
  async delete(@Param('code') code: string) {
    return this.academicCohortService.delete(code);
  }
}
