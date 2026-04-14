const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const major = await prisma.major.findFirst({
    where: { name: { contains: "Công nghệ thông tin" } }
  });
  
  if (!major) {
    console.log("No IT major found");
    return;
  }

  const subjects = await prisma.subject.findMany({
    where: { majorId: major.id },
    take: 6
  });

  if (subjects.length === 0) {
    console.log("No subjects found for IT");
    return;
  }

  // Clear existing for K18, Sem 6
  await prisma.curriculum.deleteMany({
    where: { majorId: major.id, cohort: "K18", suggestedSemester: 6 }
  });

  const subjectIds = subjects.map(s => s.id);
  
  // Also clear duplicates if any
  await prisma.curriculum.deleteMany({
    where: { majorId: major.id, cohort: "K18", subjectId: { in: subjectIds } }
  });

  const items = subjects.map(sub => ({
    majorId: major.id,
    cohort: "K18",
    subjectId: sub.id,
    suggestedSemester: 6,
    isRequired: true
  }));

  const res = await prisma.curriculum.createMany({
    data: items
  });

  console.log(`Seeded ${items.length} subjects to K18 - IT - Semester 6`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
