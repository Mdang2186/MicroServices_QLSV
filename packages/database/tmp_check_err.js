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

  try {
    const res = await prisma.curriculum.findMany({
      where: { majorId: major.id }
    });
    console.log("Success findMany", res.length);
  } catch (e) {
    console.dir(e, { depth: null });
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
