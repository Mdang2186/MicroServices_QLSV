const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function listMajors() {
  const majors = await prisma.major.findMany();
  fs.writeFileSync('tmp/majors_data.json', JSON.stringify(majors, null, 2));
  console.log(`Exported ${majors.length} majors to tmp/majors_data.json`);
}

listMajors()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
