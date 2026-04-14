import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { EmsService } from './ems.service';

@Controller('courses')
export class EmsController {
  constructor(private readonly emsService: EmsService) {}

  /**
   * THE ZAP MECHANISM (GĐ 3)
   * Thực thi Transaction nguyên tử để mở lớp, gán SV và xếp lịch.
   */
  @Post('zap')
  //@UseGuards(JwtAuthGuard)
  async zap(@Body() zapDto: any) {
    return this.emsService.executeZap(zapDto.classes);
  }

  /**
   * Lấy dữ liệu Curriculum Blueprint (GĐ 1)
   */
  @Get('curriculum-blueprint')
  async getBlueprint(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.emsService.getCurriculumBlueprint(majorId, cohort);
  }

  /**
   * Lấy dữ liệu phục vụ Trạm điều phối (GĐ 2)
   */
  @Get('coordination-data')
  async getCoordinationData(
    @Query('majorId') majorId: string,
    @Query('cohort') cohort: string,
  ) {
    return this.emsService.getCoordinationData(majorId, cohort);
  }
}
