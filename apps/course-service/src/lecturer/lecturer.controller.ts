import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { LecturerService } from './lecturer.service';

@Controller('lecturers')
export class LecturerController {
  constructor(private readonly lecturerService: LecturerService) {}

  @Get()
  async findAll() {
    return this.lecturerService.findAll();
  }

  @Post()
  async create(@Body() data: any) {
    return this.lecturerService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.lecturerService.update(id, data);
  }

  @Patch(':id')
  async patch(@Param('id') id: string, @Body() data: any) {
    return this.lecturerService.update(id, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.lecturerService.delete(id);
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    return this.lecturerService.findByUserId(userId);
  }

  @Get(':idOrCode')
  async findOne(@Param('idOrCode') idOrCode: string) {
    return this.lecturerService.findOne(idOrCode);
  }
}
