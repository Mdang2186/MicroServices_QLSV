const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Data Restoration Start ---');
  
  const currentSemester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!currentSemester) {
    console.error('No current semester found!');
    return;
  }
  console.log(`Current Semester: ${currentSemester.name} (${currentSemester.id})`);

  // 1. Find Lecturer and Assign Classes
  const lecturer = await prisma.lecturer.findFirst({
    where: { fullName: { contains: 'Lê Thu Châu' } }
  });

  if (lecturer) {
    const classesToAssign = await prisma.courseClass.findMany({
      where: { 
        semesterId: currentSemester.id,
        lecturerId: null
      },
      take: 5
    });

    for (const cls of classesToAssign) {
      await prisma.courseClass.update({
        where: { id: cls.id },
        data: { lecturerId: lecturer.id }
      });
    }
    console.log(`Assigned ${classesToAssign.length} classes to ${lecturer.fullName}`);
  } else {
    console.warn('Lecturer Lê Thu Châu not found.');
  }

  // 2. Automate Scheduling (Generate Sessions)
  // We'll generate sessions for a subset of classes to avoid long execution, or use a simplified logic
  const classesWithoutSessions = await prisma.courseClass.findMany({
    where: { 
      semesterId: currentSemester.id,
      sessions: { none: {} }
    },
    include: { subject: true },
    take: 20 // Just do 20 for now to verify
  });

  console.log(`Generating sessions for ${classesWithoutSessions.length} classes...`);
  
  const rooms = await prisma.room.findMany();
  if (rooms.length === 0) {
      console.error('No rooms found! Cannot generate sessions.');
      return;
  }

  for (const cls of classesWithoutSessions) {
    const periodsPerSession = 3;
    const sessionCount = Math.floor(cls.totalPeriods / periodsPerSession);
    
    let currentDate = new Date(currentSemester.startDate);
    // Add some randomness to days
    currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 6));

    for (let i = 0; i < sessionCount; i++) {
        const room = rooms[i % rooms.length];
        await prisma.classSession.create({
            data: {
                courseClassId: cls.id,
                semesterId: currentSemester.id,
                roomId: room.id,
                date: new Date(currentDate),
                startShift: 1,
                endShift: 3,
                type: 'LECTURE'
            }
        });
        currentDate.setDate(currentDate.getDate() + 7);
        if (currentDate > currentSemester.endDate) break;
    }
  }
  console.log('Sessions generated successfully.');

  await prisma.$disconnect();
  console.log('--- Data Restoration Complete ---');
}

main();
