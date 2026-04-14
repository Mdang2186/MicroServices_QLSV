const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSundays() {
  console.log('--- CHECKING SUNDAY SESSIONS ---');
  const sessions = await prisma.classSession.findMany({
    where: {
      date: {
        // This is tricky with Prisma/SQL Server. 
        // We'll fetch all and filter in JS for accuracy.
      }
    },
    include: {
      courseClass: true,
      room: true
    }
  });

  const sundays = sessions.filter(s => s.date.getDay() === 0);
  
  console.log(`Found ${sundays.length} Sunday sessions.`);
  for (const s of sundays.slice(0, 10)) {
    console.log(`- [${s.date.toISOString().split('T')[0]}] ${s.courseClass.name} Shift ${s.startShift}-${s.endShift}. Room: ${s.room?.name}. Note: ${s.note}`);
  }

  await prisma.$disconnect();
}

checkSundays();
