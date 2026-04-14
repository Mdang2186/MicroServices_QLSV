const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany({
    include: {
      _count: {
        select: {
          students: true,
          subjects: true,
          curriculums: true,
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('ID,Name,Code,Students,Subjects,Curriculums');
  majors.forEach(m => {
    console.log(`${m.id},"${m.name}",${m.code},${m._count.students},${m._count.subjects},${m._count.curriculums}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
