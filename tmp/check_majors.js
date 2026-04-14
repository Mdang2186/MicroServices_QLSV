const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany({
    include: {
      _count: {
        select: {
          adminClasses: true,
          curriculums: true,
          specializations: true,
          students: true,
          subjects: true,
          semesterPlans: true,
        }
      }
    }
  });

  console.log('--- ALL MAJORS ---');
  majors.forEach(m => {
    console.log(`ID: ${m.id} | Code: ${m.code} | Name: ${m.name}`);
    console.log(`  Counts: AdminClasses: ${m._count.adminClasses}, Curriculums: ${m._count.curriculums}, Students: ${m._count.students}, Subjects: ${m._count.subjects}, SemesterPlans: ${m._count.semesterPlans}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
