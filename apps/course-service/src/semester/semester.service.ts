import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_10MIN = 10 * 60 * 1000;

@Injectable()
export class SemesterService {
    constructor(private prisma: PrismaService, private cache: CacheService) { }

    async findAll() {
        return this.cache.getOrSet('semesters:all', TTL_10MIN, () =>
            this.prisma.semester.findMany({ orderBy: { year: 'desc' } })
        );
    }
}
