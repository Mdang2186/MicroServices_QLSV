const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeCNTTK18() {
  const cohort = 'K18';
  const majorCode = 'CNTT';
  
  console.log(`Analyzing curriculum for ${majorCode} - Cohort ${cohort}`);
  
  const major = await prisma.major.findUnique({ where: { code: majorCode } });
  if (!major) {
    console.log(`Major ${majorCode} not found.`);
    return;
  }

  const curriculum = await prisma.curriculum.findMany({
    where: { majorId: major.id, cohort },
    include: { subject: true },
    orderBy: { suggestedSemester: 'asc' }
  });

  console.log(`Total entries: ${curriculum.length}`);
  
  const semesterStats = {};
  for (let i = 1; i <= 8; i++) semesterStats[i] = { credits: 0, count: 0, subjects: [] };

  curriculum.forEach(c => {
    const sem = c.suggestedSemester || 1;
    if (semesterStats[sem]) {
        semesterStats[sem].credits += c.subject.credits;
        semesterStats[sem].count += 1;
        semesterStats[sem].subjects.push({ code: c.subject.code, name: c.subject.name, credits: c.subject.credits });
    }
  });

  console.log('\n--- Semester Statistics ---');
  for (let i = 1; i <= 8; i++) {
    console.log(`Semester ${i}: ${semesterStats[i].count} subjects, ${semesterStats[i].credits} credits`);
  }

  console.log('\n--- Detailed Semester 1 Subjects ---');
  semesterStats[1].subjects.forEach(s => {
    console.log(`- [${s.code}] ${s.name}: ${s.credits} TC`);
  });
}

analyzeCNTTK18()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
