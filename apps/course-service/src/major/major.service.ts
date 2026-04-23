import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MajorService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.major.findMany({
      include: { specializations: true, faculty: true },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.major.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Ngành đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể tạo Ngành'));
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.major.update({ where: { id }, data });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Ngành đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể cập nhật Ngành'));
    }
  }

  async delete(id: string) {
    const major = await this.prisma.major.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            specializations: true,
            students: true,
            subjects: true,
            curriculums: true,
          },
        },
      },
    });

    if (!major) throw new NotFoundException('Ngành không tồn tại');

    if (
      major._count.specializations > 0 ||
      major._count.students > 0 ||
      major._count.subjects > 0 ||
      major._count.curriculums > 0
    ) {
      throw new BadRequestException(
        'Không thể xóa Ngành vì vẫn còn dữ liệu liên quan (Chuyên ngành, Sinh viên, Môn học hoặc Kế hoạch). Vui lòng xóa các dữ liệu liên kết trước.',
      );
    }

    try {
      return await this.prisma.major.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new BadRequestException('Không thể xóa Ngành vì vẫn còn dữ liệu liên kết trong hệ thống.');
      }
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể xóa Ngành'));
    }
  }
}
