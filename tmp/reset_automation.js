const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset() {
  console.log('--- RESETTING GLOBAL AUTOMATION DATA ---');
  
  // 1. Delete all sessions created by automation (contains "Auto" in note)
  const sessions = await prisma.classSession.deleteMany({
    where: {
      note: { contains: 'Auto' }
    }
  });
  console.log(`Deleted ${sessions.count} automated sessions.`);

  // 2. Note: Course Classes and Semester Plans remain, but their "Lớp đã sinh" indicator 
  // needs to be reset for them to be picked up properly by the next run.
  const resetItems = await prisma.semesterPlanItem.updateMany({
    data: {
      generatedCourseClassId: null,
      status: 'READY'
    }
  });
  console.log(`Reset ${resetItems.count} items to READY status.`);

  // 3. Clear the "Course Classes" that were created by automation
  // Since we don't have a reliable flag, we look for those with no sessions now
  const emptyClasses = await prisma.courseClass.deleteMany({
    where: {
      sessions: { none: {} },
      enrollments: { none: {} } // Be careful not to delete classes with students
    }
  });
  console.log(`Deleted ${emptyClasses.count} orphaned Course classes.`);

  await prisma.$disconnect();
}

reset().catch(console.error);
