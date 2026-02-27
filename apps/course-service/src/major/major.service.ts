import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MajorService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.major.findMany();
    }

    async create(data: any) {
        return this.prisma.major.create({ data });
    }
}
