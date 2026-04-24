import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, normalizeSqlServerUrl } from '@repo/database';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const url = normalizeSqlServerUrl(process.env.DATABASE_URL);
    if (url) {
      process.env.DATABASE_URL = url;
    }
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    // Avoid blocking service startup when SQL Server is slow; Prisma connects lazily on first query.
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
