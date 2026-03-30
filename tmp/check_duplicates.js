
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const student = await prisma.student.findUnique({
    where: { studentCode: '22101100025' },
    include: {
      enrollments: {
        include: {
          courseClass: {
            include: { subject: true, semester: true }
          }
        }
      }
    }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  console.log(`Student: ${student.fullName} (${student.studentCode})`);
  const grouped = {};
  student.enrollments.forEach(e => {
    const semName = e.courseClass.semester.name;
    const subCode = e.courseClass.subject.code;
    const key = `${semName}_${subCode}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  Object.entries(grouped).forEach(([key, list]) => {
    console.log(`\nKey: ${key} (Count: ${list.length})`);
    list.forEach(e => {
      console.log(`- Enrollment ID: ${e.id}, Status: ${e.status}, Fee: ${e.tuitionFee}, Class: ${e.courseClass.code}`);
    });
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
