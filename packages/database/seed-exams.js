const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedExams() {
  console.log("Seeding dummy exam schedules...");
  const classes = await prisma.courseClass.findMany({
    where: { status: 'OPEN' },
    include: { subject: true, enrollments: true },
    take: 3
  });

  if (classes.length === 0) {
    console.log("No open classes found");
    return;
  }

  const room = await prisma.room.findFirst({ where: { type: 'THEORY' } });
  if (!room) {
    console.log("No theory rooms found");
    return;
  }

  let baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + 2); // 2 days from now

  for (let c of classes) {
    console.log(`Scheduling exam for ${c.code} (${c.subject.name})`);
    
    // Set all grades to eligible
    await prisma.grade.updateMany({
        where: { courseClassId: c.id },
        data: { isEligibleForExam: true }
    });

    const grades = await prisma.grade.findMany({
      where: { courseClassId: c.id, isEligibleForExam: true },
      orderBy: { studentId: 'asc' }
    });

    if (grades.length === 0) continue;

    const existingSession = await prisma.classSession.findFirst({
        where: { courseClassId: c.id, type: 'EXAM' }
    });
    if (existingSession) continue;

    const session = await prisma.classSession.create({
      data: {
        courseClassId: c.id,
        semesterId: c.semesterId,
        roomId: room.id,
        date: new Date(baseDate),
        startShift: 1,
        endShift: 3,
        type: 'EXAM',
        note: 'Thi cuối kỳ (Dummy data)'
      }
    });

    for (let i = 0; i < grades.length; i++) {
       await prisma.grade.update({
         where: { id: grades[i].id },
         data: {
           examSessionId: session.id,
           examSbd: String(i + 1).padStart(6, '0')
         }
       });
    }

    baseDate.setDate(baseDate.getDate() + 1); // increment day
  }
  
  console.log("Seed exams complete!");
}

seedExams().catch(console.error).finally(() => prisma.$disconnect());
