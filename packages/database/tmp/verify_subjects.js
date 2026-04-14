const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const count = await prisma.subject.count();
  console.log(`Total Subjects: ${count}`);
  
  const subjects = await prisma.subject.findMany();
  const nameMap = {};
  let duplicates = 0;
  
  subjects.forEach(s => {
    const name = s.name.trim().toLowerCase();
    if (nameMap[name]) {
        duplicates++;
    }
    nameMap[name] = true;
  });
  
  console.log(`Remaining Duplicate Groups count (approx): ${duplicates}`);
}

verify()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
