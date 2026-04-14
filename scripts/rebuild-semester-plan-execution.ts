import 'reflect-metadata';
import { PrismaService } from '../apps/course-service/src/prisma/prisma.service';
import { SemesterPlanService } from '../apps/course-service/src/semester-plan/semester-plan-v2.service';

async function main() {
  const executionId = process.argv[2];

  if (!executionId) {
    throw new Error('Thiếu executionId. Cú pháp: ts-node scripts/rebuild-semester-plan-execution.ts <executionId>');
  }

  const prisma = new PrismaService();
  await prisma.$connect();

  try {
    const service = new SemesterPlanService(prisma);
    const result = await service.rebuildSchedule(executionId);
    console.log(
      JSON.stringify(
        {
          summary: result.summary,
          executionId: result.execution?.id,
          status: result.execution?.status,
          semester: result.execution?.semester?.code,
          cohort: result.execution?.cohort,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
