const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log('--- CLEANING UP SUNDAY SESSIONS ---');
  
  // We fetch all sessions and filter in JS to be 100% sure about the getDay() === 0 check
  const allSessions = await prisma.classSession.findMany({
      select: { id: true, date: true, note: true }
  });

  const sundayIds = allSessions
    .filter(s => s.date.getDay() === 0)
    .map(s => s.id);

  console.log(`Identified ${sundayIds.length} sessions on Sundays.`);

  if (sundayIds.length > 0) {
    const deleted = await prisma.classSession.deleteMany({
      where: {
        id: { in: sundayIds }
      }
    });
    console.log(`Successfully deleted ${deleted.count} Sunday sessions.`);
  } else {
    console.log('No Sunday sessions found to delete.');
  }

  await prisma.$disconnect();
}

cleanup().catch(e => {
  console.error(e);
  process.exit(1);
});
