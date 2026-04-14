const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDuplicateSubjects() {
  console.log('--- SUBJECT CLEANUP PROCESS ---');
  
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

    console.log(`\nProcessing group: "${group[0].name}"`);
    
    // 1. Identify Canonical
    group.sort((a, b) => {
        // Priority: DC_ > IT_ > More Relations > Shortest Code
        const aScore = (a.code.startsWith('DC_') ? 100 : 0) + (a.code.startsWith('IT_') ? 50 : 0) + (a._count.grades + a._count.classes + a._count.curriculums);
        const bScore = (b.code.startsWith('DC_') ? 100 : 0) + (b.code.startsWith('IT_') ? 50 : 0) + (b._count.grades + b._count.classes + b._count.curriculums);
        return bScore - aScore;
    });

    const canonical = group[0];
    const redundants = group.slice(1);
    console.log(`- KEEP: ${canonical.code}`);
    console.log(`- REMOVE: ${redundants.map(r => r.code).join(', ')}`);

    for (const redundant of redundants) {
        // 2. Handle Curriculums
        const redundantCurs = await prisma.curriculum.findMany({ where: { subjectId: redundant.id } });
        for (const cur of redundantCurs) {
            const exists = await prisma.curriculum.findFirst({
                where: { majorId: cur.majorId, cohort: cur.cohort, subjectId: canonical.id }
            });
            if (exists) {
                // If canonical already in this curriculum, just delete redundant link
                await prisma.curriculum.delete({ where: { id: cur.id } });
            } else {
                // Otherwise move it to canonical
                await prisma.curriculum.update({
                    where: { id: cur.id },
                    data: { subjectId: canonical.id }
                });
            }
        }

        // 3. Handle Grades
        await prisma.grade.updateMany({
            where: { subjectId: redundant.id },
            data: { subjectId: canonical.id }
        });

        // 4. Handle CourseClasses
        await prisma.courseClass.updateMany({
            where: { subjectId: redundant.id },
            data: { subjectId: canonical.id }
        });

        // 4b. Handle ClassSlots
        await prisma.classSlot.updateMany({
            where: { subjectId: redundant.id },
            data: { subjectId: canonical.id }
        });

        // 5. Handle Prerequisite rules (if any)
        await prisma.subjectPrerequisite.deleteMany({ where: { subjectId: redundant.id } });
        await prisma.subjectPrerequisite.deleteMany({ where: { prerequisiteId: redundant.id } });

        // 6. Delete Subject
        try {
            await prisma.subject.delete({ where: { id: redundant.id } });
            console.log(`  Successfully deleted ${redundant.code}`);
        } catch (e) {
            console.error(`  Failed to delete ${redundant.code}: ${e.message}`);
        }
    }
  }

  console.log('\n--- CLEANUP COMPLETED ---');
}

cleanupDuplicateSubjects()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
