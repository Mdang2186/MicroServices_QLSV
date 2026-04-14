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
    take: 10
  });

  if (subjects.length === 0) {
    console.log("No subjects found for IT");
    return;
  }

  // Clear existing
  await prisma.curriculum.deleteMany({
    where: { majorId: major.id, cohort: "K18" }
  });

  // Seed Semester 6 for K18
  const items = subjects.map(sub => ({
    majorId: major.id,
    cohort: "K18",
    subjectId: sub.id,
    suggestedSemester: 6,
    isRequired: true
  }));

  await prisma.curriculum.createMany({
    data: items
  });

  console.log(`Seeded ${items.length} subjects to K18 - IT - Semester 6`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
