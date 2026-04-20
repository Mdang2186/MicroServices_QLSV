import { Controller, Get, Post, Put, Delete, Body, Param, Query, Logger } from '@nestjs/common';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(private readonly roomService: RoomService) {}

  @Get('ping')
  async ping() {
    this.logger.log('PING received');
    return { status: 'ok', service: 'course-service', controller: 'RoomController' };
  }

  @Get()
  async findAll() {
    this.logger.log('GET /rooms');
    return this.roomService.findAll();
  }

  // Handle schedule explicitly before general ID
  @Get(':id/schedule')
  async getRoomSchedule(
    @Param('id') id: string,
    @Query('semesterId') semesterId?: string,
  ) {
    const decodedId = decodeURIComponent(id);
    this.logger.log(`GET /rooms/${decodedId}/schedule (original: ${id})`);
    try {
      return await this.roomService.getRoomSchedule(decodedId, semesterId);
    } catch (error) {
      this.logger.error(`Error fetching schedule for room ${decodedId}:`, error);
      throw error;
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const decodedId = decodeURIComponent(id);
    this.logger.log(`GET /rooms/${decodedId} (original: ${id})`);
    return this.roomService.findOne(decodedId);
  }

  @Post()
  async create(@Body() data: any) {
    this.logger.log('POST /rooms');
    return this.roomService.create(data);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    const decodedId = decodeURIComponent(id);
    this.logger.log(`PUT /rooms/${decodedId} (original: ${id})`);
    return this.roomService.update(decodedId, data);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    const decodedId = decodeURIComponent(id);
    this.logger.log(`DELETE /rooms/${decodedId} (original: ${id})`);
    return this.roomService.delete(decodedId);
  }
}
