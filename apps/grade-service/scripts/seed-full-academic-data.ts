import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { AppService } from '../src/app.service';
import { GpaService } from '../src/gpa.service';
import { PrismaService } from '../src/prisma.service';

function loadRootEnv() {
  const envPath = resolve(__dirname, '../../../.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

async function main() {
  loadRootEnv();
  const prisma = new PrismaService();
  await prisma.$connect();

  const service = new AppService(prisma, new GpaService(prisma));
  const result = await service.seedFullAcademicData({ overwrite: true });

  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
