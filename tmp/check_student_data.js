
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentCode = '22101100025';
  console.log(`Checking student: ${studentCode}`);
  
  const student = await prisma.student.findUnique({
    where: { studentCode },
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

  console.log(`Student ID: ${student.id}`);
  console.log(`Total Enrollments: ${student.enrollments.length}`);
  
  const semesterMap = {};
  student.enrollments.forEach(e => {
    const semName = e.courseClass.semester.name;
    const subName = e.courseClass.subject.name;
    const subCode = e.courseClass.subject.code;
    const status = e.status;
    
    if (!semesterMap[semName]) semesterMap[semName] = [];
    semesterMap[semName].push({ id: e.id, subName, subCode, status });
  });

  console.log('\nEnrollment Details:');
  Object.entries(semesterMap).forEach(([semName, items]) => {
    console.log(`\nSemester: ${semName}`);
    items.forEach(item => {
      console.log(`- ${item.id}: [${item.subCode}] ${item.subName} (${item.status})`);
    });
  });
}

main().finally(() => prisma.$disconnect());
