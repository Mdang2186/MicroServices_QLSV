const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const PRIMARY_ID = '18edde59-8af5-4bb9-915e-e3a38257118e';
const DUPLICATE_IDS = ['bcab3252-aab6-4e87-9359-7bec845a29cb', 'CNTT'];

async function mergeMajors() {
  console.log(`Starting merge into primary major: ${PRIMARY_ID}`);

  for (const dupId of DUPLICATE_IDS) {
    console.log(`--- Merging major: ${dupId} ---`);

    // 1. Reassign or merge Subjects
    const dupSubjects = await prisma.subject.findMany({ where: { majorId: dupId } });
    for (const sub of dupSubjects) {
      const existing = await prisma.subject.findUnique({ where: { code: sub.code } });
      if (existing && existing.id !== sub.id) {
        console.log(`  Colliding subject: ${sub.code}. Mapping to ${existing.id}`);
        // Reassign related records of the duplicate subject to the existing one
        await prisma.courseClass.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.curriculum.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.semesterPlan.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        await prisma.grade.updateMany({ where: { subjectId: sub.id }, data: { subjectId: existing.id } });
        // Delete the duplicate subject after reassigning its relations
        await prisma.subject.delete({ where: { id: sub.id } });
      } else {
        console.log(`  Updating subject majorId: ${sub.code}`);
        await prisma.subject.update({ where: { id: sub.id }, data: { majorId: PRIMARY_ID } });
      }
    }

    // 2. Reassign AdminClasses
    console.log(`  Updating AdminClasses...`);
    await prisma.adminClass.updateMany({ where: { majorId: dupId }, data: { majorId: PRIMARY_ID } });

    // 3. Reassign Specializations
    console.log(`  Updating Specializations...`);
    await prisma.specialization.updateMany({ where: { majorId: dupId }, data: { majorId: PRIMARY_ID } });

    // 4. Reassign Students
    console.log(`  Updating Students...`);
    await prisma.student.updateMany({ where: { majorId: dupId }, data: { majorId: PRIMARY_ID } });

    // 5. Reassign SemesterPlans
    console.log(`  Updating SemesterPlans...`);
    const dupPlans = await prisma.semesterPlan.findMany({ where: { majorId: dupId } });
    for (const plan of dupPlans) {
      try {
        await prisma.semesterPlan.update({ where: { id: plan.id }, data: { majorId: PRIMARY_ID } });
      } catch (err) {
        console.warn(`    Duplicate semester plan for ${plan.subjectId} in ${plan.semesterId}. Deleting duplicate.`);
        await prisma.semesterPlan.delete({ where: { id: plan.id } });
      }
    }

    // 6. Reassign Curriculums
    console.log(`  Updating Curriculums...`);
    const dupCurrs = await prisma.curriculum.findMany({ where: { majorId: dupId } });
    for (const curr of dupCurrs) {
      try {
        await prisma.curriculum.update({ where: { id: curr.id }, data: { majorId: PRIMARY_ID } });
      } catch (err) {
        console.warn(`    Duplicate curriculum for ${curr.subjectId} cohort ${curr.cohort}. Deleting duplicate.`);
        await prisma.curriculum.delete({ where: { id: curr.id } });
      }
    }

    // 7. Finally, delete the duplicate major
    console.log(`  Deleting duplicate major record...`);
    await prisma.major.delete({ where: { id: dupId } });
    console.log(`  Finished merging major: ${dupId}`);
  }

  console.log("Merge complete!");
}

mergeMajors()
  .catch(e => {
    console.error("FATAL ERROR:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
