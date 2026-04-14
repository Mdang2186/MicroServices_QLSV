const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurriculum() {
  const cohort = 'K18';
  console.log(`Checking curriculum for cohort: ${cohort}`);
  
  const curriculum = await prisma.curriculum.findMany({
    where: { cohort },
    include: {
      major: true,
      subject: true
    }
  });

  console.log(`Total curriculum entries for ${cohort}: ${curriculum.length}`);
  
  const stats = {};
  curriculum.forEach(c => {
    const key = `${c.major.code} (${c.major.name})`;
    if (!stats[key]) stats[key] = {};
    if (!stats[key][c.suggestedSemester]) stats[key][c.suggestedSemester] = { credits: 0, subjects: 0 };
    stats[key][c.suggestedSemester].credits += c.subject.credits;
    stats[key][c.suggestedSemester].subjects += 1;
  });

  console.log('\nCurriculum Statistics:');
  console.log(JSON.stringify(stats, null, 2));

  // If there's a specific major with 189 credits, list its subjects in Semester 1
  for (const major in stats) {
    if (stats[major][1] && stats[major][1].credits >= 100) {
        console.log(`\n--- Subjects in Semester 1 for ${major} ---`);
        const majorCode = major.split(' ')[0];
        const s1Subjects = curriculum.filter(c => c.major.code === majorCode && c.suggestedSemester === 1);
        s1Subjects.forEach(s => {
            console.log(`- [${s.subject.code}] ${s.subject.name}: ${s.subject.credits} TC`);
        });
    }
  }
}

checkCurriculum()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
