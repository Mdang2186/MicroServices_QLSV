
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CourseClassService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.courseClass.findMany({
            include: {
                lecturer: true,
                subject: true,
                semester: true,
                schedules: true,
                _count: {
                    select: { enrollments: true }
                }
            }
        });
    }

    async create(data: any) {
        return this.prisma.courseClass.create({
            data
        });
    }
}
