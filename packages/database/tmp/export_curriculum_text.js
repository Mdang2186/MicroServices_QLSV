const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exportCurriculum() {
  const cohort = 'K18';
  const majorCode = 'CNTT';
  
  const major = await prisma.major.findUnique({ where: { code: majorCode } });
  const curriculum = await prisma.curriculum.findMany({
    where: { majorId: major.id, cohort },
    include: { subject: true },
    orderBy: { subject: { code: 'asc' } }
  });

  const lines = curriculum.map(c => 
    `${c.subject.code}|${c.subject.name}|${c.subject.credits}|${c.suggestedSemester}`
  );

  require('fs').writeFileSync('tmp/cntt_k18_subjects.txt', lines.join('\n'));
  console.log(`Exported ${curriculum.length} subjects to tmp/cntt_k18_subjects.txt`);
}

exportCurriculum()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
