import * as dotenv from 'dotenv';
import * as path from 'path';
import { PrismaClient, normalizeSqlServerUrl } from '@repo/database';

async function testConnection() {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });

  const url = normalizeSqlServerUrl(process.env.DATABASE_URL);
  if (url) {
    process.env.DATABASE_URL = url;
  }

  const prisma = new PrismaClient(url ? { datasources: { db: { url } } } : undefined);
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Successfully connected to database.');
    const count = await prisma.courseClass.count();
    console.log(`Course classes count: ${count}`);
  } catch (error) {
    console.error('Database connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
