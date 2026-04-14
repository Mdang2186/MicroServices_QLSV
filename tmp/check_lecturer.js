const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const lecturer = await prisma.lecturer.findFirst({
    where: { fullName: { contains: 'Phạm Công Dũng' } }
  });

  if (!lecturer) {
    console.log('Lecturer not found');
    return;
  }

  console.log('Lecturer info:', JSON.stringify(lecturer, null, 2));

  const courses = await prisma.courseClass.findMany({
    where: { lecturerId: lecturer.id },
    include: {
      semester: true,
      subject: true
    }
  });

  console.log(`Found ${courses.length} courses for lecturer ${lecturer.fullName}`);
  courses.forEach(c => {
    console.log(`- [${c.semester.name}] ${c.code}: ${c.subject.name}`);
  });

  const allSemesters = await prisma.semester.findMany({
    orderBy: { startDate: 'desc' }
  });
  console.log('\nAll semesters:');
  allSemesters.forEach(s => {
    console.log(`- ${s.id}: ${s.name} (isCurrent: ${s.isCurrent})`);
  });
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
