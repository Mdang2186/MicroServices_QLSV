import {
  Controller,
  Get,
  Param,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Query,
} from '@nestjs/common';
import { SubjectService } from './subject.service';

@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Get()
  async findAll(
    @Query('majorId') majorId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('facultyId') facultyId?: string,
  ) {
    return this.subjectService.findAll(majorId, departmentId, facultyId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @Post()
  async create(@Body() data: any) {
    return this.subjectService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.subjectService.update(id, data);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() data: any) {
    return this.subjectService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.subjectService.delete(id);
  }
}
