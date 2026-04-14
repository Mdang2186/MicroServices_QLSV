import { Injectable, BadRequestException } from '@nestjs/common';
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
    return this.prisma.faculty.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.faculty.update({
      where: { id },
      data,
    });
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

    if (!faculty) throw new BadRequestException('Khoa không tồn tại');

    if (
      faculty._count.majors > 0 ||
      faculty._count.departments > 0 ||
      faculty._count.lecturers > 0
    ) {
      throw new BadRequestException(
        'Không thể xóa Khoa vì vẫn còn dữ liệu liên quan (Ngành, Bộ môn hoặc Giảng viên). Vui lòng xóa các dữ liệu liên kết trước.',
      );
    }

    return this.prisma.faculty.delete({
      where: { id },
    });
  }
}
