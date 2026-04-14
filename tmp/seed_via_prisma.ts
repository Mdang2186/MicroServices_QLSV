import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Semester
  const sem20242 = await prisma.semester.upsert({
    where: { code: '20242' },
    update: {},
    create: {
      id: 'SEM20242',
      code: '20242',
      name: 'Học kỳ 2 - 2024-2025',
      year: 2024,
      startDate: new Date('2025-02-15'),
      endDate: new Date('2025-06-15'),
      isCurrent: true,
      isRegistering: true,
      semesterNumber: 2
    }
  });
  console.log('Semester seeded');

  // 2. Faculty & Major
  const faculty = await prisma.faculty.upsert({
    where: { id: 'CNTT' },
    update: {},
    create: { id: 'CNTT', name: 'Khoa Công nghệ thông tin' }
  });

  const major = await prisma.major.upsert({
    where: { id: 'CNTT' },
    update: {},
    create: { 
      id: 'CNTT', 
      name: 'Công nghệ thông tin', 
      facultyId: 'CNTT' 
    }
  });
  console.log('Faculty & Major seeded');

  // 3. Department
  const department = await prisma.department.upsert({
    where: { id: 'BM_CNTT' },
    update: {},
    create: {
      id: 'BM_CNTT',
      name: 'Bộ môn Công nghệ thông tin',
      facultyId: 'CNTT'
    }
  });

  // 4. Subjects
  const subjectsData = [
    { id: 'THDC', code: 'THDC', name: 'Tin học đại cương', credits: 3 },
    { id: 'TRR', code: 'TRR', name: 'Toán rời rạc', credits: 3 },
    { id: 'LTCB', code: 'LTCB', name: 'Lập trình cơ bản', credits: 4 },
    { id: 'CSDL', code: 'CSDL', name: 'Cơ sở dữ liệu', credits: 3 },
  ];

  for (const s of subjectsData) {
    await prisma.subject.upsert({
      where: { code: s.code },
      update: {},
      create: {
        id: s.id,
        code: s.code,
        name: s.name,
        credits: s.credits,
        majorId: 'CNTT',
        departmentId: 'BM_CNTT'
      }
    });
  }
  console.log('Subjects seeded');

  // 5. Curriculum
  for (const s of subjectsData) {
    await prisma.curriculum.upsert({
      where: { 
        majorId_cohort_subjectId: {
          majorId: 'CNTT',
          cohort: 'K19',
          subjectId: s.id
        }
      },
      update: {},
      create: {
        majorId: 'CNTT',
        subjectId: s.id,
        cohort: 'K19',
        suggestedSemester: 2
      }
    });
  }
  console.log('Curriculum seeded');

  // 6. Lecturer
  await prisma.lecturer.upsert({
    where: { lectureCode: 'GV001' },
    update: {},
    create: {
      id: 'GV01',
      lectureCode: 'GV001',
      fullName: 'Nguyễn Văn A',
      facultyId: 'CNTT'
    }
  });

  // 7. AdminClass
  await prisma.adminClass.upsert({
    where: { id: 'K19CNTT01' },
    update: {},
    create: {
      id: 'K19CNTT01',
      name: 'K19CNTT01',
      majorId: 'CNTT',
      cohort: 'K19'
    }
  });

  // 8. Students
  await prisma.student.upsert({
    where: { studentCode: 'SV001' },
    update: {},
    create: {
      id: 'SV01',
      studentCode: 'SV001',
      fullName: 'Phạm Văn M',
      dob: new Date('2005-01-01'),
      majorId: 'CNTT',
      adminClassId: 'K19CNTT01',
      status: 'STUDYING'
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
