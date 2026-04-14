const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkFaculties() {
  const faculties = await prisma.faculty.findMany();
  console.log(JSON.stringify(faculties, null, 2));
}

checkFaculties()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
