const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const curricula = await prisma.curriculum.findMany({
      where: { cohort: 'K18' },
      include: { 
        major: { select: { name: true } },
        subject: { select: { name: true, code: true } }
      }
    });
    
    console.log(`Found ${curricula.length} curriculum records for K18`);
    curricula.forEach(c => {
      console.log(`- Major: ${c.major.name} | Subject: ${c.subject.name} (${c.subject.code}) | Sem: ${c.suggestedSemester}`);
    });

    const courses = await prisma.courseClass.findMany({
      where: { cohort: 'K18' },
      include: {
        subject: { select: { name: true } }
      }
    });
    console.log(`Found ${courses.length} course classes for K18`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
