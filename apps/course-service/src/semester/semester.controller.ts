import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
} from '@nestjs/common';
import { SemesterService } from './semester.service';

@Controller('semesters')
export class SemesterController {
  constructor(private readonly semesterService: SemesterService) {}

  @Get()
  async findAll() {
    return this.semesterService.findAll();
  }

  @Post()
  async create(@Body() data: any) {
    return this.semesterService.create(data);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.semesterService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.semesterService.delete(id);
  }
}
