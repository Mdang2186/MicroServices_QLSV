const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding UNETI Curriculum (CNTT - 8 Semesters)...');

  // 1. Get/Create Major (CNTT)
  let major = await prisma.major.findUnique({ where: { code: 'CNTT' } });
  if (!major) {
    const faculty = await prisma.faculty.upsert({
      where: { code: 'F_CNTT' },
      update: {},
      create: { code: 'F_CNTT', name: 'Khoa Công nghệ thông tin' }
    });
    major = await prisma.major.create({
      data: {
        code: 'CNTT',
        name: 'Công nghệ thông tin',
        facultyId: faculty.id,
        totalCreditsRequired: 145
      }
    });
  }

  // 2. Define Curriculum Subjects
  const subjects = [
    { code: '001535', name: 'Triết học Mác-Lênin', credits: 3, semester: 1, type: 'THEORY' },
    { code: '001053', name: 'Đại số tuyến tính', credits: 2, semester: 1, type: 'THEORY' },
    { code: '001102', name: 'Xác suất thống kê', credits: 3, semester: 1, type: 'THEORY' },
    { code: '000197', name: 'Tin học cơ sở', credits: 4, semester: 1, type: 'THEORY' },
    { code: '001103', name: 'Toán giải tích', credits: 3, semester: 2, type: 'THEORY' },
    { code: '000591', name: 'Vật lý', credits: 4, semester: 2, type: 'THEORY' },
    { code: '001942', name: 'Tiếng Anh 1', credits: 4, semester: 2, type: 'THEORY' },
    { code: '001215', name: 'Kiến trúc máy tính', credits: 3, semester: 2, type: 'THEORY' },
    { code: '001408', name: 'Cấu trúc dữ liệu và giải thuật', credits: 3, semester: 4, type: 'THEORY' },
    { code: '000199', name: 'Toán rời rạc', credits: 3, semester: 4, type: 'THEORY' },
    { code: '000157', name: 'Cơ sở dữ liệu', credits: 4, semester: 4, type: 'THEORY' },
    { code: '001276', name: 'Thực hành lập trình hướng đối tượng', credits: 2, semester: 4, type: 'PRACTICE' },
    { code: '000170', name: 'Lập trình .Net', credits: 4, semester: 6, type: 'THEORY' },
    { code: '001292', name: 'Trí tuệ nhân tạo', credits: 3, semester: 6, type: 'THEORY' }
  ];

  for (const s of subjects) {
    const subject = await prisma.subject.upsert({
      where: { code: s.code },
      update: { name: s.name, credits: s.credits, examType: s.type === 'PRACTICE' ? 'THUC_HANH' : 'TU_LUAN' },
      create: { code: s.code, name: s.name, credits: s.credits, majorId: major.id, examType: s.type === 'PRACTICE' ? 'THUC_HANH' : 'TU_LUAN' }
    });

    await prisma.curriculum.upsert({
      where: {
        majorId_cohort_subjectId: {
          majorId: major.id,
          cohort: 'K18',
          subjectId: subject.id
        }
      },
      update: { suggestedSemester: s.semester },
      create: {
        majorId: major.id,
        cohort: 'K18',
        subjectId: subject.id,
        suggestedSemester: s.semester
      }
    });

    // Also seed for K19 (New cohort)
    await prisma.curriculum.upsert({
      where: {
        majorId_cohort_subjectId: {
          majorId: major.id,
          cohort: 'K19',
          subjectId: subject.id
        }
      },
      update: { suggestedSemester: s.semester },
      create: {
        majorId: major.id,
        cohort: 'K19',
        subjectId: subject.id,
        suggestedSemester: s.semester
      }
    });
  }

  // 3. Create Rooms
  const rooms = [
    { name: 'P.101', type: 'THEORY', building: 'Nhà A1' },
    { name: 'P.102', type: 'THEORY', building: 'Nhà A1' },
    { name: 'PM.201', type: 'PRACTICE', building: 'Nhà A1' },
    { name: 'PM.202', type: 'PRACTICE', building: 'Nhà A1' }
  ];
  for (const r of rooms) {
    await prisma.room.upsert({ where: { name: r.name }, update: {}, create: r });
  }

  // 4. Create Lecturers
  const lecturers = [
    { lectureCode: 'GV001', fullName: 'Ngô Văn Thắng', degree: 'Thạc sĩ' },
    { lectureCode: 'GV002', fullName: 'Lê Thị Bình', degree: 'Tiến sĩ' }
  ];
  for (const l of lecturers) {
    await prisma.lecturer.upsert({ where: { lectureCode: l.lectureCode }, update: {}, create: l });
  }

  console.log('Seeding completed successfully.');
}

seed().catch(e => console.error(e)).finally(() => prisma.$disconnect());
