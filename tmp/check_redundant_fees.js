
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

  console.log('\n--- FIXED FEES LIST ---');
  fees.forEach(f => {
    console.log(`ID: ${f.id} | Name: ${f.name} | Amount: ${f.totalAmount} | Semester: ${f.semester.name}`);
  });
}

main().finally(() => prisma.$disconnect());
