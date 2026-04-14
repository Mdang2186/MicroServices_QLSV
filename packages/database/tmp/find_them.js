const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findThem() {
  const majors = await prisma.major.findMany();
  console.log('--- ALL MAJORS ---');
  majors.forEach(m => {
    console.log(`CODE: [${m.code}] | NAME: [${m.name}] | ID: [${m.id}]`);
  });
  
  console.log('\n--- SEARCHING FOR DUPLICATES ---');
  const duplicates = majors.filter(m => m.name.toLowerCase().includes('công nghệ thông tin'));
  console.log(`Found ${duplicates.length} majors with "Công nghệ thông tin" in name.`);
  duplicates.forEach(m => {
    console.log(`- [${m.code}]: ${m.name}`);
  });
}

findThem()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
