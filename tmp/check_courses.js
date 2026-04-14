const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lId = 'LEC_30000000003';
  const cCount = await prisma.courseClass.count({ where: { lecturerId: lId } });
  console.log('CourseClass count for LEC_30000000003:', cCount);
  
  if (cCount > 0) {
    const c = await prisma.courseClass.findFirst({ where: { lecturerId: lId }, select: { id: true, semesterId: true, code: true } });
    console.log('First CourseClass for lecturer:', JSON.stringify(c));
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
