const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const majorCode = 'CNTT';
  const cohort = 'K18';
  
  const major = await prisma.major.findUnique({ where: { code: majorCode } });
  const curriculum = await prisma.curriculum.findMany({
    where: { majorId: major.id, cohort },
    include: { subject: true },
    orderBy: { suggestedSemester: 'asc' }
  });

  const stats = {};
  curriculum.forEach(c => {
    const sem = c.suggestedSemester || 1;
    if (!stats[sem]) stats[sem] = { credits: 0, count: 0 };
    stats[sem].credits += c.subject.credits;
    stats[sem].count += 1;
  });

  console.log(`Curriculum Verification for ${majorCode} - ${cohort}:`);
  for (let i = 1; i <= 8; i++) {
    const s = stats[i] || { credits: 0, count: 0 };
    console.log(`Semester ${i}: ${s.count} subjects, ${s.credits} TC`);
  }
  
  const totalCredits = curriculum.reduce((sum, c) => sum + c.subject.credits, 0);
  console.log(`\nTotal Credits: ${totalCredits} TC`);
}

verify()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
