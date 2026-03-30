
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const semesters = await prisma.semester.findMany();
  console.log('Semesters:', semesters.map(s => ({ id: s.id, name: s.name, year: s.year, isCurrent: s.isCurrent })));

  const classCount = await prisma.courseClass.count();
  console.log('Total CourseClasses:', classCount);

  const classesBySemester = await prisma.courseClass.groupBy({
    by: ['semesterId'],
    _count: true
  });
  console.log('Classes by Semester:', classesBySemester);
  
  const subjects = await prisma.subject.findMany({
    take: 5,
    include: {
      _count: {
        select: { classes: true }
      }
    }
  });
  console.log('Sample Subjects with Class Count:', subjects.map(s => ({ id: s.id, name: s.name, count: s._count.classes })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
