import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAutomation() {
  console.log('--- Starting System Automation ---');

  // 1. Assign Lecturers to classes missing them
  console.log('1. Assigning Lecturers...');
  const classesWithoutLecturer = await prisma.courseClass.findMany({
    where: { lecturerId: null },
    include: { subject: true },
  });

  console.log(`   Found ${classesWithoutLecturer.length} classes without lecturer.`);

  for (const cc of classesWithoutLecturer) {
    // Find lecturers in the same department
    const candidate = await prisma.lecturer.findFirst({
      where: { departmentId: cc.subject.departmentId },
    });

    if (candidate) {
      await prisma.courseClass.update({
        where: { id: cc.id },
        data: { lecturerId: candidate.id },
      });
    } else {
        // Fallback to any lecturer in the same faculty
        const facultyCandidate = await prisma.lecturer.findFirst({
          where: { facultyId: cc.subject.facultyId },
        });
        if (facultyCandidate) {
            await prisma.courseClass.update({
                where: { id: cc.id },
                data: { lecturerId: facultyCandidate.id },
            });
        }
    }
  }

  // 2. Generate Sessions for classes with no sessions
  console.log('2. Generating Sessions...');
  const classesToSchedule = await prisma.courseClass.findMany({
    include: {
      _count: { select: { sessions: true } },
      semester: true,
    },
  });

  const missingSessions = classesToSchedule.filter(c => c._count.sessions === 0);
  console.log(`   Found ${missingSessions.length} classes with 0 sessions.`);

  // For speed, we'll only process the first 500 or those relevant to K16 if there are too many
  // But let's try to process all for K16 specifically
  const k16Classes = await prisma.courseClass.findMany({
      where: { cohort: 'K16' },
      include: {
          _count: { select: { sessions: true } },
          semester: true,
          subject: true,
      }
  });
  
  console.log(`   Found ${k16Classes.length} K16 classes.`);

  let sessionsCreated = 0;
  for (const cc of k16Classes) {
      if (cc._count.sessions > 0) continue;

      // Generate 10 sample weekly sessions
      const startDate = new Date(cc.semester.startDate || '2025-01-06');
      
      for (let week = 0; week < 10; week++) {
          const sessionDate = new Date(startDate);
          sessionDate.setDate(startDate.getDate() + (week * 7) + (cc.code.charCodeAt(cc.code.length-1) % 5)); // Random-ish day
          
          await prisma.classSession.create({
              data: {
                  courseClassId: cc.id,
                  semesterId: cc.semesterId,
                  roomId: 'ROOM_01', // Standard room or pick one
                  date: sessionDate,
                  startShift: 1,
                  endShift: 3,
                  type: 'THEORY',
              }
          });
          sessionsCreated++;
      }
  }

  console.log(`--- Automation Finished: Created ${sessionsCreated} sessions ---`);
}

runAutomation()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
