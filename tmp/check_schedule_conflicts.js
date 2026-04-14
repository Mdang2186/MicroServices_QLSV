const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConflicts() {
  console.log("Checking for schedule conflicts...");

  // 1. Identify overlapping ClassSessions (same Lecturer, same Date, same Shift)
  const lecturerOverlaps = await prisma.$queryRaw`
    SELECT 
      cc.lecturerId,
      s.date,
      s.startShift,
      s.endShift,
      COUNT(s.id) as overlapCount
    FROM ClassSession s
    JOIN CourseClass cc ON s.courseClassId = cc.id
    WHERE cc.lecturerId IS NOT NULL
    GROUP BY cc.lecturerId, s.date, s.startShift, s.endShift
    HAVING COUNT(s.id) > 1
    ORDER BY s.date, s.startShift;
  `;

  console.log("\n--- Lecturer Overlaps (Same Lecturer, Same Time) ---");
  console.table(lecturerOverlaps);

  // 2. Identify overlapping ClassSessions (same Room, same Date, same Shift)
  const roomOverlaps = await prisma.$queryRaw`
    SELECT 
      roomId,
      date,
      startShift,
      endShift,
      COUNT(id) as overlapCount
    FROM ClassSession
    WHERE roomId IS NOT NULL
    GROUP BY roomId, date, startShift, endShift
    HAVING COUNT(id) > 1
    ORDER BY date, startShift;
  `;

  console.log("\n--- Room Overlaps (Same Room, Same Time) ---");
  console.table(roomOverlaps);

  // 3. Identify redundant sessions for the SAME class (same Class, same Date, same Shift)
  const redundantSessions = await prisma.$queryRaw`
    SELECT 
      courseClassId,
      date,
      startShift,
      COUNT(id) as sessionCount
    FROM ClassSession
    GROUP BY courseClassId, date, startShift
    HAVING COUNT(id) > 1;
  `;

  console.log("\n--- Redundant Sessions (Same Class, Same Time - Duplicates) ---");
  console.table(redundantSessions);

  await prisma.$disconnect();
}

checkConflicts().catch(err => {
  console.error(err);
  process.exit(1);
});
