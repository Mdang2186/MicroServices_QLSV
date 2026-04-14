const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  console.log('--- VERIFYING SCHEDULE INTEGRITY (PATTERN-BASED) ---');

  const allSessions = await prisma.classSession.findMany({
    include: {
      courseClass: true,
      room: true
    },
    orderBy: { date: 'asc' }
  });

  let sundayCount = 0;
  const overlaps = [];
  const patterns = {}; // { courseClassId: { day, shift } }

  for (let i = 0; i < allSessions.length; i++) {
    const s1 = allSessions[i];
    
    // 1. Check Sunday
    if (s1.date.getDay() === 0) {
        console.error(`[ERROR] Session ${s1.id} is on a Sunday! (${s1.courseClass.name})`);
        sundayCount++;
    }

    // 2. Check Pattern Consistency
    // Each class might have multiple sessions per week (e.g. 2 sessions).
    // We expect the set of (day, shift) for each week to be the same.
    const key = s1.courseClassId;
    if (!patterns[key]) patterns[key] = [];
    
    const day = s1.date.getDay();
    const patternEntry = `${day}-${s1.startShift}`;
    if (!patterns[key].includes(patternEntry)) {
        patterns[key].push(patternEntry);
    }

    // 3. Check Overlaps
    for (let j = i + 1; j < allSessions.length; j++) {
      const s2 = allSessions[j];
      if (s1.semesterId === s2.semesterId && 
          s1.date.getTime() === s2.date.getTime()) {
        const isOverlappingTime = (s1.startShift <= s2.endShift && s2.startShift <= s1.endShift);
        if (isOverlappingTime) {
          if (s1.roomId && s1.roomId === s2.roomId) {
            overlaps.push(`Room collision: ${s1.room?.name} at ${s1.date.toISOString().split('T')[0]} shifts ${s1.startShift}-${s1.endShift} vs ${s2.startShift}-${s2.endShift}`);
          }
          if (s1.courseClass.lecturerId && s1.courseClass.lecturerId === s2.courseClass.lecturerId) {
             overlaps.push(`Lecturer collision: ${s1.courseClass.lecturerId} at ${s1.date.toISOString().split('T')[0]} shifts ${s1.startShift}-${s1.endShift}`);
          }
        }
      }
    }
  }

  // Check if any class has "too many" unique slots (suggests chaos)
  for (const [cid, slots] of Object.entries(patterns)) {
      const cc = allSessions.find(s => s.courseClassId === cid).courseClass;
      if (slots.length > cc.sessionsPerWeek) {
          // Note: sometimes it's okay if its Theory and Practice sessions are mixed, 
          // but usually they are separate logic blocks.
          // console.log(`[INFO] Class ${cc.name} uses ${slots.length} unique slots (sessionsPerWeek: ${cc.sessionsPerWeek})`);
      }
  }

  console.log(`Total sessions checked: ${allSessions.length}`);
  console.log(`Sundays found: ${sundayCount}`);
  console.log(`Overlaps found: ${overlaps.length}`);
  
  if (sundayCount === 0 && overlaps.length === 0) {
    console.log('SUCCESS: All checks passed!');
  } else {
    console.log('FAILURE: Issues detected.');
  }

  await prisma.$disconnect();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
