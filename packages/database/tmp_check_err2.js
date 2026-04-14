const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const major = await prisma.major.findFirst({
    where: { name: { contains: "Công nghệ thông tin" } }
  });
  
  if (!major) return;

  const subjects = await prisma.subject.findMany({
    where: { majorId: major.id },
    take: 6
  });

  const items = subjects.map(sub => ({
    majorId: major.id,
    cohort: "K18",
    subjectId: sub.id,
    suggestedSemester: 6,
    isRequired: true
  }));

  try {
    const res = await prisma.curriculum.createMany({
      data: items
    });
    console.log("Success createMany");
  } catch (e) {
    console.dir(e, { depth: null });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
