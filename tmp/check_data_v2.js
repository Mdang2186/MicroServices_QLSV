const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Current Data Check ---');
  
  const semesters = await prisma.semester.findMany({
    orderBy: { startDate: 'desc' },
    take: 3
  });
  console.log('\nRecent Semesters:');
  semesters.forEach(s => console.log(`- ${s.name} (${s.id}) - Current: ${s.isCurrent}`));

  const currentSemester = semesters.find(s => s.isCurrent) || semesters[0];
  if (!currentSemester) {
    console.log('No semesters found!');
    return;
  }

  const defaultLecturer = await prisma.lecturer.findFirst({
        where: { fullName: { contains: 'Lê Thu Châu' } }
  });
  console.log(`\nLecturer: ${defaultLecturer?.fullName} (${defaultLecturer?.id})`);

  if (defaultLecturer) {
    const classCount = await prisma.courseClass.count({
      where: { 
        lecturerId: defaultLecturer.id,
        semesterId: currentSemester.id
      }
    });
    console.log(`Classes for this lecturer in ${currentSemester.name}: ${classCount}`);
    
    // Check if there are ANY classes at all
    const totalClasses = await prisma.courseClass.count({
        where: { semesterId: currentSemester.id }
    });
    console.log(`Total classes in ${currentSemester.name}: ${totalClasses}`);
  }

  // Check if there are sessions
  const sessionCount = await prisma.classSession.count({
    where: { semesterId: currentSemester.id }
  });
  console.log(`\nTotal Class Sessions in ${currentSemester.name}: ${sessionCount}`);
  
  await prisma.$disconnect();
}

main();
