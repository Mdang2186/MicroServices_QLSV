const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classId = 'CCLASS_CS04_HK1_01_2627';
  const enrollments = await prisma.enrollment.count({ where: { courseClassId: classId } });
  const grades = await prisma.grade.count({ where: { courseClassId: classId } });
  const courseClass = await prisma.courseClass.findUnique({ where: { id: classId } });
  
  console.log('Enrollments:', enrollments);
  console.log('Grades:', grades);
  console.log('CourseClass exists:', !!courseClass);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
