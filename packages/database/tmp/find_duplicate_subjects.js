const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findDuplicateSubjects() {
  console.log('Finding subjects with duplicate names...');
  const subjects = await prisma.subject.findMany({
    include: {
      _count: {
        select: {
          classes: true,
          curriculums: true,
          grades: true
        }
      }
    }
  });

  const nameMap = {};
  subjects.forEach(s => {
    const name = s.name.trim().toLowerCase();
    if (!nameMap[name]) nameMap[name] = [];
    nameMap[name].push(s);
  });

  console.log('\nDuplicate Subject Groups:');
  for (const name in nameMap) {
    if (nameMap[name].length > 1) {
      console.log(`--- Name: "${nameMap[name][0].name}" ---`);
      nameMap[name].forEach(s => {
        console.log(`- Code: ${s.code}, ID: ${s.id}, TC: ${s.credits}, Classes: ${s._count.classes}, Curriculums: ${s._count.curriculums}, Grades: ${s._count.grades}`);
      });
    }
  }
}

findDuplicateSubjects()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
