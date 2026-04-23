const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanUpInvalidSessions() {
  console.log('Finding all course classes that are thesis/projects...');
  
  const subjects = await prisma.subject.findMany({
    where: {
      OR: [
        { name: { contains: 'Khóa luận' } },
        { name: { contains: 'Khoá luận' } },
        { name: { contains: 'Đồ án' } },
        { name: { contains: 'Thực tập' } },
        { name: { contains: 'KLTN' } },
        { examType: 'BAO_VE' }
      ]
    }
  });

  const subjectIds = subjects.map(s => s.id);
  console.log(`Found ${subjectIds.length} subjects matching criteria.`);

  const courseClasses = await prisma.courseClass.findMany({
    where: {
      subjectId: { in: subjectIds }
    },
    select: { id: true }
  });

  const classIds = courseClasses.map(c => c.id);
  console.log(`Found ${classIds.length} course classes for these subjects.`);

  if (classIds.length > 0) {
    console.log('Finding linked sessions...');
    const sessionIds = [];
    
    // Chunk classIds queries to avoid limits
    for (let i = 0; i < classIds.length; i += 1000) {
      const chunk = classIds.slice(i, i + 1000);
      const sessions = await prisma.classSession.findMany({
        where: { courseClassId: { in: chunk } },
        select: { id: true }
      });
      sessionIds.push(...sessions.map(s => s.id));
    }

    console.log(`Found ${sessionIds.length} sessions to delete.`);

    if (sessionIds.length > 0) {
      console.log('Deleting attendances linked to these sessions to avoid FK errors...');
      let totalAttDeleted = 0;
      for (let i = 0; i < sessionIds.length; i += 1500) {
        const chunk = sessionIds.slice(i, i + 1500);
        const res = await prisma.attendance.deleteMany({
          where: { sessionId: { in: chunk } }
        });
        totalAttDeleted += res.count;
      }
      console.log(`Deleted ${totalAttDeleted} attendances.`);

      console.log('Deleting class sessions...');
      let totalSessDeleted = 0;
      for (let i = 0; i < sessionIds.length; i += 1500) {
        const chunk = sessionIds.slice(i, i + 1500);
        const res = await prisma.classSession.deleteMany({
          where: { id: { in: chunk } }
        });
        totalSessDeleted += res.count;
      }
      console.log(`Deleted ${totalSessDeleted} class sessions.`);
    } else {
      console.log('No sessions found to delete.');
    }
  }

  console.log('Done!');
}

cleanUpInvalidSessions()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
