import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiBody } from '@nestjs/swagger';
import { FacultyService } from './faculty.service';

@Controller('faculties')
export class FacultyController {
  constructor(private readonly facultyService: FacultyService) {}

  @Get()
  findAll() {
    return this.facultyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.facultyService.findOne(id);
  }

  @Post()
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Khoa Công nghệ Thông tin' },
        code: { type: 'string', example: 'FIT' },
        deanName: { type: 'string', example: 'Nguyễn Văn A' },
      },
    },
  })
  create(@Body() data: any) {
    return this.facultyService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.facultyService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.facultyService.delete(id);
  }
}
