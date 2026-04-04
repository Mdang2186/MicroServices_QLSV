import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService, private cache: CacheService) {}

  async findAll() {
    return this.prisma.subject.findMany({
      include: {
        major: true,
      },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.subject.findUnique({
      where: { id },
      include: {
        major: true,
      },
    });
  }

  async create(data: any) {
    try {
      const created = await this.prisma.subject.create({ data });
      this.cache.invalidatePrefix('subjects:');
      return created;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã môn học đã tồn tại trong hệ thống.');
      }
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể lưu môn học'));
    }
  }

  async update(id: string, data: any) {
    try {
      const updated = await this.prisma.subject.update({
        where: { id },
        data,
      });
      this.cache.invalidatePrefix('subjects:');
      return updated;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new BadRequestException('Mã môn học đã tồn tại trong hệ thống.');
      }
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể cập nhật môn học'));
    }
  }

  async delete(id: string) {
    const deleted = await this.prisma.subject.delete({
      where: { id },
    });
    this.cache.invalidatePrefix('subjects:');
    return deleted;
  }
}

// forced-reload

// forced-reload
