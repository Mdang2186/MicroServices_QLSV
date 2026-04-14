const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSemesters() {
  console.log('--- SEMESTER & SESSION STATUS ---');
  const semesters = await prisma.semester.findMany({
    orderBy: { startDate: 'asc' },
    include: {
      _count: {
        select: { sessions: true }
      }
    }
  });

  semesters.forEach(s => {
    console.log(`ID: ${s.id}`);
    console.log(`Code: ${s.code} | Name: ${s.name}`);
    console.log(`Dates: ${s.startDate.toISOString().split('T')[0]} to ${s.endDate.toISOString().split('T')[0]}`);
    console.log(`Sessions: ${s._count.sessions}`);
    console.log('---');
  });

  await prisma.$disconnect();
}

checkSemesters().catch(console.error);
