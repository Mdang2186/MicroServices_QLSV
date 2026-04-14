const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      _count: true
    }
  });

  console.log(JSON.stringify(majors, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
