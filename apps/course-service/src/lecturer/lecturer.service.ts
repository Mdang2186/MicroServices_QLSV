
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LecturerService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.lecturer.findMany({
            include: {
                faculty: true
            }
        });
    }
}
