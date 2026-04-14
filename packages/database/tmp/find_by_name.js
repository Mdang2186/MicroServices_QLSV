const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findByPartialName() {
  console.log('Searching for majors with name starting with "Công nghệ thông tin"...');
  const majors = await prisma.major.findMany({
    where: {
      name: {
        contains: 'Công nghệ thông tin'
      }
    }
  });

  console.log(`Found ${majors.length} matches.`);
  majors.forEach(m => {
    console.log(`- Code: "${m.code}", Name: "${m.name}", ID: "${m.id}"`);
  });
}

findByPartialName()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
