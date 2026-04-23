import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_10MIN = 10 * 60 * 1000;

@Injectable()
export class AdminClassService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll(majorId?: string, cohort?: string) {
    const cacheKey = `adminClasses:${majorId || '*'}:${cohort || '*'}`;
    return this.cache.getOrSet(cacheKey, TTL_10MIN, () =>
      this.prisma.adminClass.findMany({
        where: {
          ...(majorId ? { majorId } : {}),
          ...(cohort ? { cohort } : {}),
        },
        include: {
          major: true,
          advisor: true,
          _count: { select: { students: true } },
        },
        orderBy: { code: 'asc' },
      }),
    );
  }
  async create(data: { code: string; name: string; majorId: string; cohort?: string; advisorId?: string }) {
    this.cache.delByPattern('adminClasses:*');
    return this.prisma.adminClass.create({
      data,
    });
  }

  async update(id: string, data: { name?: string; majorId?: string; cohort?: string; advisorId?: string; code?: string }) {
    this.cache.delByPattern('adminClasses:*');
    return this.prisma.adminClass.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const classHasStudents = await this.prisma.student.count({
      where: { adminClassId: id },
    });
    
    if (classHasStudents > 0) {
      throw new Error("Không thể xoá lớp danh nghĩa đã có sinh viên.");
    }
    
    this.cache.delByPattern('adminClasses:*');
    return this.prisma.adminClass.delete({
      where: { id },
    });
  }
}
