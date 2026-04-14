import { Injectable, BadRequestException } from '@nestjs/common';
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
    return this.prisma.department.create({
      data,
      include: { faculty: true },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.department.update({
      where: { id },
      data,
      include: { faculty: true },
    });
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

    if (!department) throw new BadRequestException('Bộ môn không tồn tại');

    if (department._count.subjects > 0) {
      throw new BadRequestException(
        'Không thể xóa Bộ môn vì vẫn còn các môn học thuộc bộ môn này. Vui lòng chuyển hoặc xóa các môn học trước.',
      );
    }

    return this.prisma.department.delete({ where: { id } });
  }
}
