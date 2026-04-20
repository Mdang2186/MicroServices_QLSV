import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaService } from '../src/prisma/prisma.service';
import { SemesterPlanService } from '../src/semester-plan/semester-plan-v2.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({
  path: path.resolve(process.cwd(), 'packages/database/.env'),
  override: false,
});

function parseSemesterId() {
  const arg = process.argv
    .slice(2)
    .find((value) => value.startsWith('--semesterId='));
  if (!arg) {
    return undefined;
  }
  return arg.slice('--semesterId='.length).trim() || undefined;
}

async function main() {
  const semesterId = parseSemesterId();
  const prisma = new PrismaService();
  await prisma.onModuleInit();

  try {
    const semesterPlanService = new SemesterPlanService(prisma);
    const result = await semesterPlanService.resetStudySchedules(semesterId);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.onModuleDestroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
