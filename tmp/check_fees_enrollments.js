
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findUnique({
    where: { studentCode: '22101100025' }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  const fees = await prisma.studentFee.findMany({
    where: { studentId: student.id },
    include: { semester: true }
  });

  console.log('Fixed Fees:', JSON.stringify(fees, null, 2));

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: { courseClass: { include: { semester: true } } }
  });

  console.log('Enrollments Count:', enrollments.length);
}

main().finally(() => prisma.$disconnect());
