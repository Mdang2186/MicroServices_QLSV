const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanDuplicates() {
  const duplicates = await prisma.$queryRaw`
    WITH CTE AS (
        SELECT id, 
               ROW_NUMBER() OVER (PARTITION BY studentId, subjectId, courseClassId ORDER BY id) as rn
        FROM Grade
    )
    SELECT id FROM CTE WHERE rn > 1;
  `;
  
  if (duplicates.length > 0) {
    console.log('Found duplicates:', duplicates.length);
    const ids = duplicates.map(d => d.id);
    await prisma.grade.deleteMany({
      where: {
        id: { in: ids }
      }
    });
    console.log('Deleted duplicates');
  } else {
    console.log('No duplicates found');
  }
}

cleanDuplicates().catch(console.error).finally(() => prisma.$disconnect());
