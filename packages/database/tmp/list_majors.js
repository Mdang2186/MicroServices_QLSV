const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listMajors() {
  const majors = await prisma.major.findMany();
  console.log('Majors in DB:');
  majors.forEach(m => {
    console.log(`- Code: "${m.code}", Name: "${m.name}", ID: ${m.id}`);
  });
}

listMajors()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
