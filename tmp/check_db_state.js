const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database State Check ---');
  
  try {
    const users = await prisma.user.findMany({
      include: {
        student: true,
        lecturer: true,
      }
    });
    console.log('Users found:', users.length);
    users.forEach(u => {
      console.log(`User: ${u.username} (${u.role}) - Profile: ${u.student ? 'Student' : u.lecturer ? 'Lecturer' : 'None'}`);
      if (u.student) console.log(`  Student ID: ${u.student.studentCode}, Name: ${u.student.fullName}`);
      if (u.lecturer) console.log(`  Lecturer ID: ${u.lecturer.lectureCode}, Name: ${u.lecturer.fullName}`);
    });

    const semesters = await prisma.semester.findMany();
    console.log('\nSemesters:', semesters.length);
    semesters.forEach(s => console.log(`  ID: ${s.id}, Code: ${s.code}, Name: ${s.name}, Current: ${s.isCurrent}`));

    const classes = await prisma.courseClass.findMany({
      include: {
        lecturer: true,
        semester: true,
        subject: true
      }
    });
    console.log('\nCourse Classes:', classes.length);
    classes.forEach(c => {
      console.log(`  Class: ${c.code} - ${c.name}`);
      console.log(`    Semester: ${c.semester.name}`);
      console.log(`    Lecturer: ${c.lecturer ? c.lecturer.fullName : 'None'}`);
    });

  } catch (err) {
    console.error('Check failed:', err);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
