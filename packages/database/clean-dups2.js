const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  const grades = await prisma.grade.findMany({
    select: { id: true, studentId: true, subjectId: true, courseClassId: true }
  });
  
  const seen = new Set();
  const toDelete = [];
  
  for (const grade of grades) {
    const key = `${grade.studentId}-${grade.subjectId}-${grade.courseClassId}`;
    if (seen.has(key)) {
      toDelete.push(grade.id);
    } else {
      seen.add(key);
    }
  }
  
  if (toDelete.length > 0) {
    console.log('Found duplicates:', toDelete.length);
    await prisma.grade.deleteMany({
      where: {
        id: { in: toDelete }
      }
    });
    console.log('Deleted duplicates');
  } else {
    console.log('No duplicates found');
  }
}

cleanDuplicates().catch(console.error).finally(() => prisma.$disconnect());
