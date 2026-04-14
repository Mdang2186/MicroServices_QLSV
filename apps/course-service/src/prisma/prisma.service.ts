import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@repo/database';

function normalizeSqlServerUrl(url?: string | null) {
  const raw = `${url || ''}`.trim();
  if (!raw || !/^sqlserver:/i.test(raw)) {
    return raw;
  }

  let normalized = raw;
  const ensureTrailingSemicolon = () => {
    if (!normalized.endsWith(';')) {
      normalized += ';';
    }
  };

  if (/;\s*encrypt\s*=/i.test(normalized)) {
    normalized = normalized.replace(
      /;\s*encrypt\s*=\s*[^;]*/i,
      ';encrypt=DANGER_PLAINTEXT',
    );
  } else {
    ensureTrailingSemicolon();
    normalized += 'encrypt=DANGER_PLAINTEXT;';
  }

  if (!/;\s*trustServerCertificate\s*=/i.test(normalized)) {
    ensureTrailingSemicolon();
    normalized += 'trustServerCertificate=true;';
  }

  return normalized;
}

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
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
