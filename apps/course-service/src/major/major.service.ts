import { Injectable, BadRequestException } from '@nestjs/common';
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
    return this.prisma.major.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.major.update({
      where: { id },
      data,
    });
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

    if (!major) throw new BadRequestException('Ngành không tồn tại');

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

    return this.prisma.major.delete({
      where: { id },
    });
  }
}
