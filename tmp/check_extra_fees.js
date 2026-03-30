
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentCode = '22101100025';
  console.log(`Checking student: ${studentCode}`);
  
  const student = await prisma.student.findUnique({
    where: { studentCode }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  const fees = await prisma.studentFee.findMany({
    where: { studentId: student.id },
    include: { semester: true }
  });

  console.log('\n--- FIXED FEES ---');
  fees.forEach(f => {
    console.log(`- ${f.name}: ${f.totalAmount} (Semester: ${f.semester.name})`);
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: { courseClass: { include: { semester: true, subject: true } } }
  });

  console.log('\n--- ENROLLMENT FEES ---');
  enrollments.forEach(e => {
    console.log(`- ${e.courseClass.subject.name}: ${e.tuitionFee} (Semester: ${e.courseClass.semester.name})`);
  });
}

main().finally(() => prisma.$disconnect());
