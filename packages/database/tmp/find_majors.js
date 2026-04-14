const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findMajors() {
  const majors = await prisma.major.findMany({
    where: {
      OR: [
        { code: { contains: 'CNTT_K18' } },
        { code: { contains: 'M_CNTT' } },
        { name: { contains: 'Công nghệ thông tin' } }
      ]
    }
  });
  console.log(JSON.stringify(majors, null, 2));
}

findMajors()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
