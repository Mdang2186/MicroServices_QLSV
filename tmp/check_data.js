const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Majors ---');
  const majors = await prisma.major.findMany({ select: { id: true, name: true, code: true } });
  console.table(majors);

  console.log('\n--- Semesters ---');
  const semesters = await prisma.semester.findMany({ select: { id: true, code: true, semesterNumber: true } });
  console.table(semesters);

  console.log('\n--- Curriculum (Sample) ---');
  const curriculum = await prisma.curriculum.findMany({ 
    take: 5,
    select: { majorId: true, cohort: true, suggestedSemester: true }
  });
  console.table(curriculum);

  console.log('\n--- Unique Cohorts in Curriculum ---');
  const cohorts = await prisma.curriculum.findMany({
    select: { cohort: true },
    distinct: ['cohort']
  });
  console.log(cohorts.map(c => c.cohort));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
