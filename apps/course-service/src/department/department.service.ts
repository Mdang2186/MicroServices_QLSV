import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DepartmentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      include: {
        faculty: { select: { id: true, name: true, code: true } },
        _count: { select: { subjects: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      include: { faculty: true, subjects: true },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.department.create({ data, include: { faculty: true } });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Bộ môn đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể tạo Bộ môn'));
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.department.update({ where: { id }, data, include: { faculty: true } });
    } catch (error: any) {
      if (error.code === 'P2002') throw new BadRequestException('Mã Bộ môn đã tồn tại.');
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể cập nhật Bộ môn'));
    }
  }

  async delete(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            subjects: true,
          },
        },
      },
    });

    if (!department) throw new NotFoundException('Bộ môn không tồn tại');

    if (department._count.subjects > 0) {
      throw new BadRequestException(
        'Không thể xóa Bộ môn vì vẫn còn các môn học thuộc bộ môn này. Vui lòng chuyển hoặc xóa các môn học trước.',
      );
    }

    try {
      return await this.prisma.department.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2003' || error.code === 'P2014') {
        throw new BadRequestException('Không thể xóa Bộ môn vì vẫn còn dữ liệu liên kết trong hệ thống.');
      }
      throw new BadRequestException('Lỗi hệ thống: ' + (error.message || 'Không thể xóa Bộ môn'));
    }
  }
}
