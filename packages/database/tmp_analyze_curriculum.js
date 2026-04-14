const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const majors = await prisma.major.findMany();
    console.log("Existing Majors:");
    majors.forEach(m => console.log(`- ${m.id} | ${m.name}`));

    const curricula = await prisma.curriculum.groupBy({
        by: ['majorId'],
        _count: true,
        where: { cohort: 'K18' }
    });
    console.log("Curriculum distribution by Major for K18:");
    curricula.forEach(c => console.log(`- MajorID: ${c.majorId} | Count: ${c._count}`));

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
