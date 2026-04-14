const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function mergeAndClean() {
  console.log("Starting deep cleaning with attendance merging...");

  const sessMap = new Map(); // key: lecturerId-date-shift
  const sessions = await prisma.classSession.findMany({
    include: { courseClass: true }
  });

  console.log(`Analyzing ${sessions.length} sessions...`);

  const toDelete = new Set();
  const pairs = [];

  for (const s of sessions) {
    const lecturerId = s.courseClass.lecturerId;
    if (!lecturerId) continue;

    const dateStr = s.date.toISOString().split('T')[0];
    for (let shift = s.startShift; shift <= s.endShift; shift++) {
      const key = `${lecturerId}-${dateStr}-${shift}`;
      if (sessMap.has(key)) {
        const mainId = sessMap.get(key);
        if (mainId !== s.id) {
          pairs.push({ mainId, shadowId: s.id });
        }
      } else {
        sessMap.set(key, s.id);
      }
    }
  }

  console.log(`Found ${pairs.length} potential conflict overlaps to merge.`);

  let mergedAttendances = 0;
  let deletedSessions = 0;

  for (const { mainId, shadowId } of pairs) {
    if (toDelete.has(shadowId)) continue; 

    // Move attendances
    const shadowAttendances = await prisma.attendance.findMany({
      where: { sessionId: shadowId }
    });

    for (const att of shadowAttendances) {
      // Check if student already has attendance in main session
      const existing = await prisma.attendance.findFirst({
         where: { enrollmentId: att.enrollmentId, sessionId: mainId }
      });

      if (!existing) {
        await prisma.attendance.update({
          where: { id: att.id },
          data: { sessionId: mainId }
        });
        mergedAttendances++;
      } else {
        // Just delete the duplicate attendance
        await prisma.attendance.delete({ where: { id: att.id } });
      }
    }

    // Now delete shadow session
    try {
        await prisma.classSession.delete({ where: { id: shadowId } });
        deletedSessions++;
        toDelete.add(shadowId);
    } catch (e) {
        console.error(`Failed to delete session ${shadowId}: ${e.message}`);
    }
  }

  console.log(`Merged ${mergedAttendances} attendances and deleted ${deletedSessions} sessions.`);
  await prisma.$disconnect();
}

mergeAndClean().catch(console.error);
