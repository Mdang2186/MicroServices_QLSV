const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany();

  console.log('--- ALL MAJORS ---');
  majors.forEach(m => {
    console.log(`ID: ${m.id} | Code: ${m.code} | Name: ${m.name}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
