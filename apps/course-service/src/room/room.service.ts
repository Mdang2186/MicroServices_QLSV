import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../cache/cache.service';

const TTL_30MIN = 30 * 60 * 1000;

@Injectable()
export class RoomService {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async findAll() {
    return this.cache.getOrSet('rooms:all', TTL_30MIN, () =>
      this.prisma.room.findMany({ orderBy: { name: 'asc' } }),
    );
  }
}
