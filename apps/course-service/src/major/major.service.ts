import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MajorService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.major.findMany({
            include: { specializations: true }
        });
    }

    async create(data: any) {
        return this.prisma.major.create({ data });
    }

    async update(id: string, data: any) {
        return this.prisma.major.update({
            where: { id },
            data
        });
    }

    async delete(id: string) {
        return this.prisma.major.delete({
            where: { id }
        });
    }
}
