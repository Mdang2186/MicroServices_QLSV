const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  console.log("Starting schedule cleanup...");

  // 1. Remove absolute duplicates for the same class
  // Same class, same date, same startShift
  const duplicates = await prisma.$queryRaw`
    SELECT 
      courseClassId, date, startShift, COUNT(id) as cnt
    FROM ClassSession
    GROUP BY courseClassId, date, startShift
    HAVING COUNT(id) > 1
  `;

  console.log(`Found ${duplicates.length} sets of duplicate sessions for the same class.`);

  let deletedCount = 0;
  for (const dup of duplicates) {
    const sessions = await prisma.classSession.findMany({
      where: {
        courseClassId: dup.courseClassId,
        date: dup.date,
        startShift: dup.startShift
      },
      orderBy: { id: 'asc' }
    });

    // Keep the first one, delete others
    const idsToDelete = sessions.slice(1).map(s => s.id);
    await prisma.classSession.deleteMany({
      where: { id: { in: idsToDelete } }
    });
    deletedCount += idsToDelete.length;
  }

  console.log(`Deleted ${deletedCount} redundant sessions.`);

  // 2. Identify remaining conflicts (Cross-class)
  const lecturerConflicts = await prisma.$queryRaw`
    SELECT 
      cc.lecturerId, s.date, s.startShift, COUNT(s.id) as cnt
    FROM ClassSession s
    JOIN CourseClass cc ON s.courseClassId = cc.id
    WHERE cc.lecturerId IS NOT NULL
    GROUP BY cc.lecturerId, s.date, s.startShift
    HAVING COUNT(s.id) > 1
  `;

  console.log(`Remaining lecturer conflicts: ${lecturerConflicts.length}`);
  
  const roomConflicts = await prisma.$queryRaw`
    SELECT 
      roomId, date, startShift, COUNT(id) as cnt
    FROM ClassSession
    WHERE roomId IS NOT NULL
    GROUP BY roomId, date, startShift
    HAVING COUNT(id) > 1
  `;
  console.log(`Remaining room conflicts: ${roomConflicts.length}`);

  await prisma.$disconnect();
}

cleanup().catch(console.error);
