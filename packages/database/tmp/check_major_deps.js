const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const codes = ['CNTT_K18', 'M_CNTT'];
  
  for (const code of codes) {
    console.log(`\n--- Checking dependencies for Major: ${code} ---`);
    const major = await prisma.major.findUnique({
      where: { code },
      include: {
        _count: {
          select: {
            adminClasses: true,
            curriculums: true,
            specializations: true,
            students: true,
            subjects: true,
          }
        }
      }
    });

    if (!major) {
      console.log(`Major with code ${code} not found.`);
      continue;
    }

    console.log(`Major ID: ${major.id}`);
    console.log(`Name: ${major.name}`);
    console.log(`Dependencies:`, major._count);
    
    // Check if there are subjects, students, etc.
    if (major._count.subjects > 0) {
        const subjects = await prisma.subject.findMany({
            where: { majorId: major.id },
            include: {
                _count: {
                    select: {
                        classes: true,
                        curriculums: true,
                        grades: true,
                    }
                }
            }
        });
        console.log(`Subjects found: ${subjects.length}`);
        subjects.forEach(s => {
            console.log(`  - Subject ${s.code}: classes=${s._count.classes}, curriculums=${s._count.curriculums}, grades=${s._count.grades}`);
        });
    }
  }
}

check()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
