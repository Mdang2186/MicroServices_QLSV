const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateSubjects() {
  console.log('--- SUBJECT CLEANUP PROCESS (V3) ---');
  
  const subjects = await prisma.subject.findMany({
    include: {
      _count: {
        select: {
          classes: true,
          curriculums: true,
          grades: true
        }
      }
    }
  });

  const nameMap = {};
  subjects.forEach(s => {
    const name = s.name.trim().toLowerCase();
    if (!nameMap[name]) nameMap[name] = [];
    nameMap[name].push(s);
  });

  for (const name in nameMap) {
    const group = nameMap[name];
    if (group.length <= 1) continue;

    console.log(`\nProcessing: "${group[0].name}"`);
    
    group.sort((a, b) => {
        const aScore = (a.code.startsWith('DC_') ? 100 : 0) + (a.code.startsWith('IT_') ? 50 : 0) + (a._count.grades + a._count.classes + a._count.curriculums);
        const bScore = (b.code.startsWith('DC_') ? 100 : 0) + (b.code.startsWith('IT_') ? 50 : 0) + (b._count.grades + b._count.classes + b._count.curriculums);
        return bScore - aScore;
    });

    const canonical = group[0];
    const redundants = group.slice(1);

    for (const redundant of redundants) {
        try {
            // 1. Handle Curriculums
            const redundantCurs = await prisma.curriculum.findMany({ where: { subjectId: redundant.id } });
            for (const cur of redundantCurs) {
                const exists = await prisma.curriculum.findFirst({
                    where: { majorId: cur.majorId, cohort: cur.cohort, subjectId: canonical.id }
                });
                if (exists) {
                    await prisma.curriculum.delete({ where: { id: cur.id } });
                } else {
                    await prisma.curriculum.update({
                        where: { id: cur.id },
                        data: { subjectId: canonical.id }
                    });
                }
            }

            // 2. Handle Grades
            await prisma.grade.updateMany({
                where: { subjectId: redundant.id },
                data: { subjectId: canonical.id }
            });

            // 3. Handle CourseClasses
            await prisma.courseClass.updateMany({
                where: { subjectId: redundant.id },
                data: { subjectId: canonical.id }
            });

            // 4. Handle Prerequisites (Model 1: Prerequisite)
            await prisma.prerequisite.deleteMany({
                where: { OR: [ { subjectId: redundant.id }, { prerequisiteId: redundant.id } ] }
            });

            // 5. Handle SubjectPrerequisite (Model 2)
            await prisma.subjectPrerequisite.deleteMany({
                where: { OR: [ { subjectId: redundant.id }, { prerequisiteSubjectId: redundant.id } ] }
            });

            // 6. Delete Subject
            await prisma.subject.delete({ where: { id: redundant.id } });
            console.log(`  [OK] Deleted ${redundant.code}`);

        } catch (e) {
            console.error(`  [FAIL] ${redundant.code}: ${e.message}`);
        }
    }
  }

  console.log('\n--- CLEANUP V3 COMPLETED ---');
}

cleanupDuplicateSubjects()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
