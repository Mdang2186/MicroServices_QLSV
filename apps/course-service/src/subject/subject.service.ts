import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubjectService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.subject.create({ data });
  }

  async update(id: string, data: any) {
    return this.prisma.subject.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return this.prisma.subject.delete({
      where: { id },
    });
  }
}
