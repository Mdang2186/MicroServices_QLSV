
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // RAW QUERY to avoid Prisma schema mismatch
    const [{count: studentCount}] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM dbo.Student');
    const [{count: classCount}] = await prisma.$queryRawUnsafe('SELECT COUNT(*) as count FROM dbo.CourseClass');
    console.log('--- DATABASE RESTORE VERIFICATION (RAW) ---');
    console.log('Students:', studentCount);
    console.log('Classes:', classCount);
  } catch (e) {
    console.error('Raw query failed:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
