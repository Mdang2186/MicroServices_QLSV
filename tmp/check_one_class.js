const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classId = 'CCLASS_CS04_HK1_01_2627';
  const c = await prisma.courseClass.findUnique({
    where: { id: classId },
    include: { lecturer: true, subject: true, semester: true }
  });

  if (c) {
    console.log('Class found:', JSON.stringify(c, null, 2));
  } else {
    console.log('Class NOT found:', classId);
    
    // Check for similar classes
    const similar = await prisma.courseClass.findMany({
      where: { code: { contains: 'HK1_2627' } },
      include: { lecturer: true }
    });
    console.log(`Found ${similar.length} classes for HK1_2627:`);
    similar.forEach(s => console.log(`- ${s.code}: Lecturer = ${s.lecturer?.fullName || 'NONE'}`));
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
