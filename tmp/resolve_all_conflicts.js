const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanConflicts() {
  console.log("Starting deep cleaning of teaching schedule...");

  // Identifies conflicts: (Lecturer OR Room) + Date + StartShift Overlap
  const sessions = await prisma.classSession.findMany({
    include: { courseClass: true, room: true }
  });

  const toDelete = new Set();
  const keepMap = new Map(); // key: lecturerId-date-startTime, value: sessionId

  for (const s1 of sessions) {
    if (toDelete.has(s1.id)) continue;
    const lecturerId = s1.courseClass.lecturerId;
    if (!lecturerId) continue;

    const dateStr = s1.date.toISOString().split('T')[0];
    // Simple key: lecturer-date-at-startShift
    // We check all shifts in range
    for (let shift = s1.startShift; shift <= s1.endShift; shift++) {
      const key = `${lecturerId}-${dateStr}-${shift}`;
      if (keepMap.has(key)) {
        const otherId = keepMap.get(key);
        if (otherId !== s1.id) {
          console.log(`Conflict detected for lecturer ${lecturerId} on ${dateStr} at shift ${shift}. Deleting session ${s1.id}.`);
          toDelete.add(s1.id);
          break; // Already flagged for deletion
        }
      } else {
        keepMap.set(key, s1.id);
      }
    }
  }

  // Same for Room
  const roomKeepMap = new Map();
  for (const s1 of sessions) {
    if (toDelete.has(s1.id)) continue;
    const roomId = s1.roomId;
    if (!roomId) continue;

    const dateStr = s1.date.toISOString().split('T')[0];
    for (let shift = s1.startShift; shift <= s1.endShift; shift++) {
      const key = `${roomId}-${dateStr}-${shift}`;
      if (roomKeepMap.has(key)) {
        const otherId = roomKeepMap.get(key);
        if (otherId !== s1.id) {
          console.log(`Conflict detected for room ${roomId} on ${dateStr} at shift ${shift}. Deleting session ${s1.id}.`);
          toDelete.add(s1.id);
          break;
        }
      } else {
        roomKeepMap.set(key, s1.id);
      }
    }
  }

  const deleteIds = Array.from(toDelete);
  console.log(`\nDeleting ${deleteIds.length} conflicting sessions...`);

  if (deleteIds.length > 0) {
    await prisma.classSession.deleteMany({
      where: { id: { in: deleteIds } }
    });
  }

  console.log("Cleanup complete.");
  await prisma.$disconnect();
}

cleanConflicts().catch(console.error);
