import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Đang tạo dữ liệu Khoa & Ngành học ---');
  
  const facultyIT = await prisma.faculty.upsert({
    where: { code: 'CNTT' },
    update: {},
    create: {
      code: 'CNTT',
      name: 'Khoa Công nghệ Thông tin',
      deanName: 'TS. Nguyễn Văn A',
    },
  });

  const facultyLang = await prisma.faculty.upsert({
    where: { code: 'NGOAI_NGU' },
    update: {},
    create: {
      code: 'NGOAI_NGU',
      name: 'Khoa Ngoại ngữ',
      deanName: 'TS. Lê Thị B',
    },
  });

  const majorIT = await prisma.major.upsert({
    where: { code: 'CNTT' },
    update: {},
    create: {
      code: 'CNTT',
      name: 'Công nghệ Thông tin',
      facultyId: facultyIT.id,
      totalCreditsRequired: 145,
    },
  });

  const majorLang = await prisma.major.upsert({
    where: { code: 'NNA' },
    update: {},
    create: {
      code: 'NNA',
      name: 'Ngôn ngữ Anh',
      facultyId: facultyLang.id,
      totalCreditsRequired: 140,
    },
  });

  console.log('--- Đang tạo Khung chương trình chuẩn (IT & English) ---');

  const itCurriculum = [
    { code: 'THDC', name: 'Tin học đại cương', credits: 3, semester: 1 },
    { code: 'DSA', name: 'Cấu trúc dữ liệu & Giải thuật', credits: 4, semester: 3 },
    { code: 'OOP', name: 'Lập trình hướng đối tượng', credits: 3, semester: 3 },
    { code: 'DB_BASIC', name: 'Cơ sở dữ liệu', credits: 3, semester: 3 },
    { code: 'WEB_DEV', name: 'Phát triển ứng dụng Web', credits: 3, semester: 4 },
  ];

  const langCurriculum = [
    { code: 'TA_CB1', name: 'Tiếng Anh cơ bản 1', credits: 3, semester: 1 },
    { code: 'TA_CB2', name: 'Tiếng Anh cơ bản 2', credits: 3, semester: 2 },
    { code: 'NGU_PHAP_1', name: 'Ngữ pháp chuyên sâu 1', credits: 3, semester: 3 },
    { code: 'GIAO_TIEP_1', name: 'Giao tiếp tiếng Anh 1', credits: 2, semester: 3 },
    { code: 'PHIEN_DICH_1', name: 'Lý thuyết phiên dịch', credits: 3, semester: 5 },
  ];

  const cohorts = ['K18', 'K19', 'K20', 'K21', 'K22'];

  // Seed IT Curriculum for all cohorts
  for (const cohort of cohorts) {
    for (const item of itCurriculum) {
      const subject = await prisma.subject.upsert({
        where: { code: item.code },
        update: { majorId: majorIT.id },
        create: {
          code: item.code,
          name: item.name,
          credits: item.credits,
          majorId: majorIT.id,
          theoryHours: 30,
          practiceHours: 15,
        },
      });

      await prisma.curriculum.upsert({
        where: {
          majorId_cohort_subjectId: {
            majorId: majorIT.id,
            cohort: cohort,
            subjectId: subject.id,
          }
        },
        update: { suggestedSemester: item.semester },
        create: {
          majorId: majorIT.id,
          cohort: cohort,
          subjectId: subject.id,
          suggestedSemester: item.semester,
        },
      });
    }

    // Create AdminClass for IT
    const adminClassIT = await prisma.adminClass.upsert({
      where: { code: `CNTT_${cohort}_01` },
      update: { majorId: majorIT.id, cohort: cohort },
      create: {
        code: `CNTT_${cohort}_01`,
        name: `Lớp CNTT 01 - ${cohort}`,
        majorId: majorIT.id,
        cohort: cohort,
      },
    });

    // Seed 5 students for each IT admin class
    for (let i = 1; i <= 5; i++) {
        const studentId = `ST_IT_${cohort}_${i}`;
        await prisma.student.upsert({
            where: { id: studentId },
            update: { 
                adminClassId: adminClassIT.id,
                majorId: majorIT.id,
                fullName: `Sinh viên IT ${cohort} ${i}`,
            },
            create: {
                id: studentId,
                fullName: `Sinh viên IT ${cohort} ${i}`,
                studentCode: `SVIT${cohort}${i}`,
                majorId: majorIT.id,
                adminClassId: adminClassIT.id,
                dob: new Date(2005, 0, 1), // Required field
            }
        });
    }
  }

  // Seed English Curriculum for all cohorts
  for (const cohort of cohorts) {
    for (const item of langCurriculum) {
      const subject = await prisma.subject.upsert({
        where: { code: item.code },
        update: { majorId: majorLang.id },
        create: {
          code: item.code,
          name: item.name,
          credits: item.credits,
          majorId: majorLang.id,
          theoryHours: 45,
          practiceHours: 0,
        },
      });

      await prisma.curriculum.upsert({
        where: {
          majorId_cohort_subjectId: {
            majorId: majorLang.id,
            cohort: cohort,
            subjectId: subject.id,
          }
        },
        update: { suggestedSemester: item.semester },
        create: {
          majorId: majorLang.id,
          cohort: cohort,
          subjectId: subject.id,
          suggestedSemester: item.semester,
        },
      });
    }

    // Create AdminClass for English
    const adminClassLang = await prisma.adminClass.upsert({
      where: { code: `NNA_${cohort}_01` },
      update: { majorId: majorLang.id, cohort: cohort },
      create: {
        code: `NNA_${cohort}_01`,
        name: `Lớp Ngôn ngữ Anh 01 - ${cohort}`,
        majorId: majorLang.id,
        cohort: cohort,
      },
    });

    // Seed 5 students for each English admin class
    for (let i = 1; i <= 5; i++) {
        const studentId = `ST_NNA_${cohort}_${i}`;
        await prisma.student.upsert({
            where: { id: studentId },
            update: { 
                adminClassId: adminClassLang.id,
                majorId: majorLang.id,
                fullName: `Sinh viên NNA ${cohort} ${i}`,
            },
            create: {
                id: studentId,
                fullName: `Sinh viên NNA ${cohort} ${i}`,
                studentCode: `SVNNA${cohort}${i}`,
                majorId: majorLang.id,
                adminClassId: adminClassLang.id,
                dob: new Date(2005, 0, 1), // Required field
            }
        });
    }
  }

  console.log('--- Seeding hoàn tất cho 2 ngành và 5 khóa học! ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
