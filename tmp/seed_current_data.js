const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Data for Current Semester ---');

  // 1. Get Current Semester
  let currentSemester = await prisma.semester.findFirst({
    where: { isCurrent: true }
  });

  if (!currentSemester) {
    console.log('Creating current semester...');
    currentSemester = await prisma.semester.upsert({
      where: { code: 'SEM_HK1_2627' },
      update: { isCurrent: true },
      create: {
        code: 'SEM_HK1_2627',
        name: 'Học kỳ 1 năm học 2026-2027',
        year: 2026,
        startDate: new Date('2026-09-01'),
        endDate: new Date('2027-01-15'),
        isCurrent: true
      }
    });
  }

  console.log(`Using Semester: ${currentSemester.name} (${currentSemester.id})`);

  // 2. Get Lecturer & Student by name (more robust)
  const lecturer = await prisma.lecturer.findFirst({
    where: { fullName: { contains: 'Phạm Công Dũng' } }
  });

  if (!lecturer) {
    console.error('Lecturer Phạm Công Dũng not found!');
  } else {
    console.log(`Found Lecturer: ${lecturer.fullName} (ID: ${lecturer.id})`);
  }

  const student = await prisma.student.findFirst({
    where: { fullName: { contains: 'Huỳnh Kim Tươi' } }
  });

  if (!student) {
    console.error('Student Huỳnh Kim Tươi not found!');
  } else {
    console.log(`Found Student: ${student.fullName} (ID: ${student.id})`);
  }

  if (!lecturer || !student) return;

  // 3. Get or Create Subjects
  let subjects = await prisma.subject.findMany({ take: 3 });
  if (subjects.length === 0) {
    console.log('Creating demo subjects...');
    const major = await prisma.major.findFirst();
    if (!major) return;
    await prisma.subject.createMany({
        data: [
            { code: 'SUBJ001', name: 'Toán cao cấp', credits: 3, majorId: major.id },
            { code: 'SUBJ002', name: 'Lập trình hướng đối tượng', credits: 4, majorId: major.id },
            { code: 'SUBJ003', name: 'Cấu trúc dữ liệu và giải thuật', credits: 4, majorId: major.id },
        ]
    });
    subjects = await prisma.subject.findMany({ take: 3 });
  }

  // 4. Create Classes and Enrollments
  for (let i = 0; i < subjects.length; i++) {
    const sub = subjects[i];
    const classCode = `CLASS_${sub.code}_${i+1}`;
    
    const courseClass = await prisma.courseClass.upsert({
      where: { code: classCode },
      update: {
        lecturerId: lecturer.id,
        semesterId: currentSemester.id,
      },
      create: {
        code: classCode,
        name: `${sub.name} - Nhóm ${i+1}`,
        subjectId: sub.id,
        semesterId: currentSemester.id,
        lecturerId: lecturer.id,
        maxSlots: 50,
        status: 'OPEN'
      }
    });

    console.log(`Created Class: ${courseClass.code}`);

    await prisma.enrollment.upsert({
      where: {
        studentId_courseClassId: {
          studentId: student.id,
          courseClassId: courseClass.id
        }
      },
      update: {},
      create: {
        studentId: student.id,
        courseClassId: courseClass.id,
        status: 'REGISTERED'
      }
    });
    console.log(`Enrolled Student in ${courseClass.code}`);
  }

  console.log('Seeding completed successfully!');
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
