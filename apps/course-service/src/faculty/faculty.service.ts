import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FacultyService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.faculty.findMany({
      include: {
        _count: {
          select: { majors: true, lecturers: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.faculty.findUnique({
      where: { id },
      include: {
        majors: true,
        lecturers: true,
      },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.faculty.create({ data });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Khoa đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể tạo Khoa'));
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.faculty.update({ where: { id }, data });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Khoa đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể cập nhật Khoa'));
    }
  }

  async delete(id: string) {
    const faculty = await this.prisma.faculty.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            majors: true,
            departments: true,
            lecturers: true,
          },
        },
      },
    });

    if (!faculty) throw new NotFoundException('Khoa không tồn tại');

    if (
      faculty._count.majors > 0 ||
      faculty._count.departments > 0 ||
      faculty._count.lecturers > 0
    ) {
      throw new BadRequestException(
        'Không thể xóa Khoa vì vẫn còn dữ liệu liên quan (Ngành, Bộ môn hoặc Giảng viên). Vui lòng xóa các dữ liệu liên kết trước.',
      );
    }

    try {
      return await this.prisma.faculty.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new BadRequestException('Không thể xóa Khoa vì vẫn còn dữ liệu liên kết trong hệ thống.');
      }
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể xóa Khoa'));
    }
  }
}
