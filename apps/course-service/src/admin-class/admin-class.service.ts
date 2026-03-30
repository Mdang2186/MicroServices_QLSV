import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_10MIN = 10 * 60 * 1000;

@Injectable()
export class AdminClassService {
    constructor(private prisma: PrismaService, private cache: CacheService) { }

    async findAll() {
        return this.cache.getOrSet('adminClasses:all', TTL_10MIN, () =>
            this.prisma.adminClass.findMany({
                include: {
                    major: true,
                    advisor: true,
                    _count: { select: { students: true } }
                },
                orderBy: { code: 'asc' }
            })
        );
    }
}
