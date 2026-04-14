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
}
