import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_10MIN = 10 * 60 * 1000;

@Injectable()
export class SemesterService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll() {
    await this.syncSemesterStatuses();
    // No cache for now to ensure staff sees immediate changes during management
    return this.prisma.semester.findMany({
      orderBy: [{ year: 'desc' }, { name: 'desc' }],
    });
  }

  private async syncSemesterStatuses() {
    const today = new Date();
    const current = await this.prisma.semester.findFirst({
      where: {
        startDate: { lte: today },
        endDate: { gte: today },
      },
    });

    if (current) {
      // 1. Mark this one as current
      await this.prisma.semester.update({
        where: { id: current.id },
        data: { isCurrent: true },
      });

      // 2. Mark all others as not current
      await this.prisma.semester.updateMany({
        where: { id: { not: current.id } },
        data: { isCurrent: false },
      });
    }
  }

  async create(data: any) {
    const name = `${data?.name || ''}`.trim();
    const code =
      `${data?.code || ''}`.trim() ||
      `${data?.year}_HK${name.match(/\d+/)?.[0] || '1'}`;
    const year = Number(data?.year);
    const startDate = data?.startDate ? new Date(data.startDate) : null;
    const endDate = data?.endDate ? new Date(data.endDate) : null;

    if (!name) {
      throw new BadRequestException('Tên học kỳ không được để trống.');
    }
    if (!code) {
      throw new BadRequestException('Mã học kỳ không được để trống.');
    }
    if (!Number.isInteger(year) || year < 2000) {
      throw new BadRequestException('Năm học kỳ không hợp lệ.');
    }
    if (!startDate || Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Ngày bắt đầu học kỳ không hợp lệ.');
    }
    if (!endDate || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Ngày kết thúc học kỳ không hợp lệ.');
    }
    if (startDate > endDate) {
      throw new BadRequestException(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.',
      );
    }

    let semester;
    try {
      semester = await this.prisma.semester.create({
        data: {
          code,
          name,
          year,
          startDate,
          endDate,
          isCurrent: Boolean(data?.isCurrent),
          midtermGradeDeadline: data?.midtermGradeDeadline
            ? new Date(data.midtermGradeDeadline)
            : null,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Học kỳ ${code} đã tồn tại.`);
      }
      throw error;
    }

    if (data.isCurrent) {
      await this.prisma.semester.updateMany({
        where: { id: { not: semester.id } },
        data: { isCurrent: false },
      });
    }

    await this.cache.invalidate('semesters:all');
    return semester;
  }

  async update(id: string, data: any) {
    const existing = await this.prisma.semester.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Học kỳ không tồn tại.');
    }

    const nextName =
      data?.name !== undefined ? `${data.name}`.trim() : existing.name;
    const nextCode =
      data?.code !== undefined ? `${data.code}`.trim() : existing.code;
    const nextYear =
      data?.year !== undefined ? Number(data.year) : existing.year;
    const nextStartDate =
      data?.startDate !== undefined
        ? new Date(data.startDate)
        : existing.startDate;
    const nextEndDate =
      data?.endDate !== undefined ? new Date(data.endDate) : existing.endDate;

    if (!nextName) {
      throw new BadRequestException('Tên học kỳ không được để trống.');
    }
    if (!nextCode) {
      throw new BadRequestException('Mã học kỳ không được để trống.');
    }
    if (!Number.isInteger(nextYear) || nextYear < 2000) {
      throw new BadRequestException('Năm học kỳ không hợp lệ.');
    }
    if (Number.isNaN(nextStartDate.getTime())) {
      throw new BadRequestException('Ngày bắt đầu học kỳ không hợp lệ.');
    }
    if (Number.isNaN(nextEndDate.getTime())) {
      throw new BadRequestException('Ngày kết thúc học kỳ không hợp lệ.');
    }
    if (nextStartDate > nextEndDate) {
      throw new BadRequestException(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.',
      );
    }

    let semester;
    try {
      semester = await this.prisma.semester.update({
        where: { id },
        data: {
          code: nextCode,
          name: nextName,
          year: nextYear,
          startDate: nextStartDate,
          endDate: nextEndDate,
          isCurrent: data.isCurrent,
          midtermGradeDeadline: data.midtermGradeDeadline
            ? new Date(data.midtermGradeDeadline)
            : data.midtermGradeDeadline === null
              ? null
              : undefined,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(`Học kỳ ${nextCode} đã tồn tại.`);
      }
      throw error;
    }

    if (data.isCurrent) {
      await this.prisma.semester.updateMany({
        where: { id: { not: id } },
        data: { isCurrent: false },
      });
    }

    await this.cache.invalidate('semesters:all');
    return semester;
  }

  async delete(id: string) {
    let semester;
    try {
      semester = await this.prisma.semester.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error?.code === 'P2025') {
        throw new NotFoundException('Học kỳ không tồn tại.');
      }
      if (error?.code === 'P2003') {
        throw new BadRequestException(
          'Không thể xóa học kỳ này vì đã có dữ liệu đào tạo tham chiếu.',
        );
      }
      throw error;
    }
    await this.cache.invalidate('semesters:all');
    return semester;
  }
}
