const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLecturer() {
  const lecturer = await prisma.lecturer.findFirst({
    where: { fullName: { contains: 'Lê Thu Châu' } }
  });

  if (!lecturer) {
    console.log("Lecturer not found");
    return;
  }

  console.log("Lecturer found:", lecturer.fullName, lecturer.id);

  const sessions = await prisma.classSession.findMany({
    where: {
      courseClass: { lecturerId: lecturer.id },
      date: new Date('2026-04-06') 
    },
    include: {
        courseClass: true,
        room: true
    }
  });

  console.log("\nSessions for 2026-04-06:");
  console.table(sessions.map(s => ({
    class: s.courseClass.name,
    code: s.courseClass.code,
    shifts: `${s.startShift}-${s.endShift}`,
    room: s.room?.name,
    id: s.id
  })));

  await prisma.$disconnect();
}

checkLecturer().catch(err => {
  console.error(err);
  process.exit(1);
});
