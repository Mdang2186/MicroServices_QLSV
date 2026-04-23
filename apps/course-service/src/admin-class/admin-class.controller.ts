import { Controller, Get, Query, Post, Put, Delete, Body, Param, HttpException, HttpStatus } from '@nestjs/common';
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

  @Post()
  async create(@Body() body: any) {
    try {
      return await this.adminClassService.create(body);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    try {
      return await this.adminClassService.update(id, body);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.adminClassService.remove(id);
    } catch (e: any) {
      throw new HttpException(e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
