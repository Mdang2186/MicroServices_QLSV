import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FacultyService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.faculty.findMany({
            include: {
                _count: {
                    select: { majors: true, lecturers: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        return this.prisma.faculty.findUnique({
            where: { id },
            include: {
                majors: true,
                lecturers: true
            }
        });
    }

    async create(data: any) {
        return this.prisma.faculty.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.faculty.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.faculty.delete({
            where: { id }
        });
    }
}
