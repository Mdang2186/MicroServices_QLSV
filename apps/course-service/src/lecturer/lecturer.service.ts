import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LecturerService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.lecturer.findMany({
      include: {
        faculty: true,
        department: true,
      },
      orderBy: { fullName: 'asc' },
    });
  }

  async create(data: any) {
    try {
      return await this.prisma.lecturer.create({
        data: {
          lectureCode: data.lectureCode,
          fullName: data.fullName,
          degree: data.degree || null,
          phone: data.phone || null,
          facultyId: data.facultyId || null,
          departmentId: data.departmentId || null,
          userId: data.userId || null,
        },
        include: {
          faculty: true,
          department: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Mã giảng viên đã tồn tại trong hệ thống.',
        );
      }
      throw new BadRequestException(
        'Không thể lưu giảng viên: ' + (error?.message || 'Lỗi hệ thống'),
      );
    }
  }

  async update(id: string, data: any) {
    try {
      return await this.prisma.lecturer.update({
        where: { id },
        data: {
          lectureCode: data.lectureCode,
          fullName: data.fullName,
          degree: data.degree || null,
          phone: data.phone || null,
          facultyId: data.facultyId || null,
          departmentId: data.departmentId || null,
          userId: data.userId === '' ? null : data.userId || undefined,
        },
        include: {
          faculty: true,
          department: true,
        },
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          'Mã giảng viên đã tồn tại trong hệ thống.',
        );
      }
      throw new BadRequestException(
        'Không thể cập nhật giảng viên: ' + (error?.message || 'Lỗi hệ thống'),
      );
    }
  }

  async delete(id: string) {
    try {
      return await this.prisma.lecturer.delete({
        where: { id },
      });
    } catch (error: any) {
      throw new BadRequestException(
        'Không thể xóa giảng viên: ' +
          (error?.message ||
            'Giảng viên đang được sử dụng ở lớp học phần hoặc kế hoạch đào tạo.'),
      );
    }
  }

  private async resolveLecturer(idOrCode: string) {
    if (!idOrCode) return null;

    // 1. Try find by UUID
    let lecturer = await this.prisma.lecturer.findUnique({
      where: { id: idOrCode },
      include: { faculty: true, department: true, user: true },
    });

    // 2. Try find by userId
    if (!lecturer) {
      lecturer = await this.prisma.lecturer.findFirst({
        where: { userId: idOrCode },
        include: { faculty: true, department: true, user: true },
      });
    }

    // 3. Try find by lectureCode
    if (!lecturer) {
      lecturer = await this.prisma.lecturer.findFirst({
        where: { lectureCode: idOrCode },
        include: { faculty: true, department: true, user: true },
      });
    }

    return lecturer;
  }

  async findOne(idOrCode: string) {
    return this.resolveLecturer(idOrCode);
  }

  async findByUserId(userId: string) {
    return this.prisma.lecturer.findFirst({
      where: { userId },
      include: { faculty: true, department: true, user: true },
    });
  }
}
