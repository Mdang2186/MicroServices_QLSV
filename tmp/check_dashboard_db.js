
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const currentSemester = await prisma.semester.findFirst({
    where: { isCurrent: true }
  });
  console.log('Current Semester:', currentSemester);

  const semesterCount = await prisma.semester.count();
  console.log('Total Semesters:', semesterCount);

  if (currentSemester) {
    const classesCount = await prisma.courseClass.count({
      where: { semesterId: currentSemester.id }
    });
    console.log('Classes in Current Semester:', classesCount);
  }

  const allClassCount = await prisma.courseClass.count();
  console.log('Total CourseClasses:', allClassCount);

  const studentCount = await prisma.student.count();
  console.log('Total Students:', studentCount);

  const gradeCount = await prisma.grade.count();
  console.log('Total Grades:', gradeCount);

  const enrollmentCount = await prisma.enrollment.count();
  console.log('Total Enrollments:', enrollmentCount);
}

check().catch(console.error).finally(() => prisma.$disconnect());
