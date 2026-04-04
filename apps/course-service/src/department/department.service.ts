import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class DepartmentService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.department.findMany({
            include: {
                faculty: { select: { id: true, name: true, code: true } },
                _count: { select: { subjects: true } }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.department.findUnique({
            where: { id },
            include: { faculty: true, subjects: true }
        });
    }

    async create(data: any) {
        return this.prisma.department.create({
            data,
            include: { faculty: true }
        });
    }

    async update(id: string, data: any) {
        return this.prisma.department.update({
            where: { id },
            data,
            include: { faculty: true }
        });
    }

    async delete(id: string) {
        return this.prisma.department.delete({ where: { id } });
    }
}
