import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { MajorService } from './major.service';

@Controller('majors')
export class MajorController {
  constructor(private readonly majorService: MajorService) {}

  @Get()
  findAll() {
    return this.majorService.findAll();
  }

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Công nghệ thông tin' },
        code: { type: 'string', example: 'IT101' },
      },
    },
  })
  create(@Body() data: any) {
    return this.majorService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.majorService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.majorService.delete(id);
  }
}
