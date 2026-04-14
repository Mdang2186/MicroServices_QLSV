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
          adminClasses: true,
          specializations: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  console.log('--- Majors List ---');
  majors.forEach(m => {
    console.log(`ID: ${m.id} | Code: ${m.code} | Name: ${m.name} | Faculty: ${m.facultyId}`);
    console.log(`  Count -> Students: ${m._count.students}, Subjects: ${m._count.subjects}, Curriculums: ${m._count.curriculums}, AdminClasses: ${m._count.adminClasses}, Specializations: ${m._count.specializations}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
