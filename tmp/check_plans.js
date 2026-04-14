const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const semesterId = 'SEM_HK1_2627';
  const plans = await prisma.semesterPlan.count({ where: { semesterId } });
  console.log(`SemesterPlan count for ${semesterId}:`, plans);

  const classes = await prisma.courseClass.count({ where: { semesterId } });
  console.log(`CourseClass count for ${semesterId}:`, classes);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
