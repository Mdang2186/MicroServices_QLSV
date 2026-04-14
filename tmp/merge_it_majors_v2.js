const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

const LOG_FILE = 'd:/KHOA_LUAN_TOT_NGHIEP/MicroServices_QLSV/tmp/merge_log.txt';
function log(msg) {
  console.log(msg);
  fs.appendFileSync(LOG_FILE, msg + '\n', 'utf8');
}

const PRIMARY_ID = '18edde59-8af5-4bb9-915e-e3a38257118e';
const DUPLICATE_IDS = ['bcab3252-aab6-4e87-9359-7bec845a29cb', 'CNTT'];

if (fs.existsSync(LOG_FILE)) fs.unlinkSync(LOG_FILE);

async function mergeMajors() {
  log(`Starting merge into primary major: ${PRIMARY_ID}`);

  for (const dupId of DUPLICATE_IDS) {
    log(`--- Merging major: ${dupId} ---`);

    // 1. Reassign or merge Subjects
    log(`  Checking subjects...`);
    const dupSubjects = await prisma.subject.findMany({ where: { majorId: dupId } });
    for (const sub of dupSubjects) {
      const existing = await prisma.subject.findFirst({ 
        where: { code: sub.code, majorId: PRIMARY_ID } 
      });
      
      if (existing) {
        log(`    Colliding subject: ${sub.code}. Mapping relations to ${existing.id}`);
        await prisma.courseClass.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.curriculum.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.semesterPlan.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.grade.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.subject.delete({ where: { id: sub.id } });
      } else {
        log(`    Updating subject majorId: ${sub.code}`);
        await prisma.subject.update({ where: { id: sub.id }, data: { majorId: PRIMARY_ID } });
      }
    }

    // 2. Reassign AdminClasses
    log(`  Updating AdminClasses...`);
    const adminClasses = await prisma.adminClass.findMany({ where: { majorId: dupId } });
    for (const ac of adminClasses) {
        try {
            await prisma.adminClass.update({ where: { id: ac.id }, data: { majorId: PRIMARY_ID } });
        } catch (e) {
            log(`    Error updating AdminClass ${ac.code}: ${e.message}`);
        }
    }

    // 3. Reassign Specializations
    log(`  Updating Specializations...`);
    await prisma.specialization.updateMany({ where: { majorId: dupId }, data: { majorId: PRIMARY_ID } });

    // 4. Reassign Students
    log(`  Updating Students...`);
    await prisma.student.updateMany({ where: { majorId: dupId }, data: { majorId: PRIMARY_ID } });

    // 5. Reassign SemesterPlans
    log(`  Updating SemesterPlans...`);
    const dupPlans = await prisma.semesterPlan.findMany({ where: { majorId: dupId } });
    for (const plan of dupPlans) {
      try {
        await prisma.semesterPlan.update({ where: { id: plan.id }, data: { majorId: PRIMARY_ID } });
      } catch (err) {
        log(`    Duplicate semester plan for subject ${plan.subjectId} cohort ${plan.cohort}. Deleting duplicate.`);
        await prisma.semesterPlan.delete({ where: { id: plan.id } });
      }
    }

    // 6. Reassign Curriculums
    log(`  Updating Curriculums...`);
    const dupCurrs = await prisma.curriculum.findMany({ where: { majorId: dupId } });
    for (const curr of dupCurrs) {
      try {
        await prisma.curriculum.update({ where: { id: curr.id }, data: { majorId: PRIMARY_ID } });
      } catch (err) {
        log(`    Duplicate curriculum for subject ${curr.subjectId} cohort ${curr.cohort}. Deleting duplicate.`);
        await prisma.curriculum.delete({ where: { id: curr.id } });
      }
    }

    // 7. Finally, delete the duplicate major
    try {
        log(`  Deleting duplicate major record...`);
        await prisma.major.delete({ where: { id: dupId } });
    } catch (e) {
        log(`  Error deleting major ${dupId}: ${e.message}`);
    }
    log(`  Finished merging major: ${dupId}`);
  }

  log("Merge complete!");
}

mergeMajors()
  .catch(e => {
    log("FATAL ERROR: " + e.message + "\n" + e.stack);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
