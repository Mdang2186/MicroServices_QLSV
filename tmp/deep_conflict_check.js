const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepSearch() {
  console.log("Deep Searching for overlaps...");

  // Get all sessions
  const sessions = await prisma.classSession.findMany({
    include: { courseClass: true, room: true }
  });

  const lecturerConflicts = [];
  const roomConflicts = [];

  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const s1 = sessions[i];
      const s2 = sessions[j];

      // Same date?
      if (s1.date.getTime() !== s2.date.getTime()) continue;

      // Overlapping time?
      const overlaps = Math.max(s1.startShift, s2.startShift) <= Math.min(s1.endShift, s2.endShift);
      if (!overlaps) continue;

      // Lecturer conflict?
      if (s1.courseClass.lecturerId && s1.courseClass.lecturerId === s2.courseClass.lecturerId) {
        lecturerConflicts.push({ s1: s1.id, s2: s2.id, class1: s1.courseClass.name, class2: s2.courseClass.name, date: s1.date });
      }

      // Room conflict?
      if (s1.roomId && s1.roomId === s2.roomId) {
        roomConflicts.push({ s1: s1.id, s2: s2.id, class1: s1.courseClass.name, class2: s2.courseClass.name, date: s1.date });
      }
    }
  }

  console.log("\n--- Lecturer Conflicts Found ---");
  console.table(lecturerConflicts.slice(0, 20));
  if (lecturerConflicts.length > 20) console.log(`... and ${lecturerConflicts.length - 20} more.`);

  console.log("\n--- Room Conflicts Found ---");
  console.table(roomConflicts.slice(0, 20));
  if (roomConflicts.length > 20) console.log(`... and ${roomConflicts.length - 20} more.`);

  await prisma.$disconnect();
}

deepSearch().catch(console.error);
