const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const curricula = await prisma.curriculum.findMany({
      where: { cohort: 'K18' },
      select: { majorId: true },
      distinct: ['majorId']
    });
    console.log("Distinct Major IDs in K18 Curriculum:");
    curricula.forEach(c => console.log(`'${c.majorId}'`));

    const cntt = await prisma.major.findFirst({ where: { name: { contains: 'Thông tin' } } });
    console.log(`CNTT Major UUID: '${cntt.id}'`);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
