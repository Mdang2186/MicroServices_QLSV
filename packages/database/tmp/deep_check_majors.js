const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deepCheck() {
  const majors = await prisma.major.findMany();
  console.log(`Total Majors: ${majors.length}`);
  majors.forEach(m => {
    console.log(`---`);
    console.log(`ID: "${m.id}"`);
    console.log(`Code: "${m.code}"`);
    console.log(`Name: "${m.name}"`);
    console.log(`FacultyID: "${m.facultyId}"`);
  });
}

deepCheck()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
