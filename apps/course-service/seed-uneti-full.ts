import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const facultyCode = 'CNTT';
  const majorCode = 'CNTT_K18';
  const cohort = 'K18';

  console.log('Seeding using Raw SQL to bypass Prisma Client generation issues...');

  // 1. Ensure Faculty and Major exist (Basic Prisma calls still work for existing fields)
  let faculty = await prisma.faculty.findUnique({ where: { code: facultyCode } });
  if (!faculty) {
    await prisma.$executeRaw`INSERT INTO Faculty (id, code, name) VALUES (${Buffer.from(crypto.randomUUID()).toString('hex')}, ${facultyCode}, N'Khoa Công nghệ thông tin')`;
    faculty = await prisma.faculty.findUnique({ where: { code: facultyCode } });
  }

  let major = await prisma.major.findUnique({ where: { code: majorCode } });
  if (!major) {
    await prisma.$executeRaw`INSERT INTO Major (id, facultyId, code, name, totalCreditsRequired) VALUES (${Buffer.from(crypto.randomUUID()).toString('hex')}, ${faculty!.id}, ${majorCode}, N'Công nghệ thông tin', 135)`;
    major = await prisma.major.findUnique({ where: { code: majorCode } });
  }

  // 2. Curriculum Data (8 Semesters)
  const curriculum = [
    { sem: 1, code: 'THDC', name: 'Tin học đại cương', credits: 3, theory: 30, practice: 15, examType: 'TRAC_NGHIEM', examForm: 'Máy tính' },
    { sem: 1, code: 'GT1', name: 'Giải tích 1', credits: 3, theory: 45, practice: 0, examType: 'TU_LUAN', examForm: 'Giấy' },
    { sem: 1, code: 'XSTK', name: 'Xác suất thống kê', credits: 2, theory: 30, practice: 0, examType: 'TU_LUAN', examForm: 'Giấy' },
    { sem: 2, code: 'KTLT', name: 'Kỹ thuật lập trình', credits: 4, theory: 45, practice: 30, examType: 'THUC_HANH', examForm: 'Máy tính' },
    { sem: 2, code: 'VLDD', name: 'Vật lý đại cương', credits: 3, theory: 45, practice: 0, examType: 'TRAC_NGHIEM', examForm: 'Máy tính' },
    { sem: 3, code: 'CTDLGT', name: 'Cấu trúc dữ liệu và Giải thuật', credits: 4, theory: 45, practice: 30, examType: 'THUC_HANH', examForm: 'Máy tính' },
    { sem: 4, code: 'OOP', name: 'Lập trình hướng đối tượng', credits: 4, theory: 45, practice: 30, examType: 'THUC_HANH', examForm: 'Máy tính' },
    { sem: 5, code: 'WEB1', name: 'Lập trình Web 1', credits: 3, theory: 30, practice: 30, examType: 'THUC_HANH', examForm: 'Máy tính' },
    { sem: 6, code: 'AI', name: 'Trí tuệ nhân tạo', credits: 3, theory: 45, practice: 0, examType: 'TU_LUAN', examForm: 'Giấy' },
    { sem: 7, code: 'IOT', name: 'Internet of Things', credits: 3, theory: 30, practice: 30, examType: 'THUC_HANH', examForm: 'Máy tính' },
    { sem: 8, code: 'KLTN', name: 'Khóa luận tốt nghiệp', credits: 10, theory: 0, practice: 150, examType: 'BAO_VE', examForm: 'Hội đồng' }
  ];

  console.log(`Inserting ${curriculum.length} subjects...`);

  for (const item of curriculum) {
    // We use Raw SQL because the Prisma client might not have the new fields yet
    await prisma.$executeRaw`
      IF EXISTS (SELECT 1 FROM Subject WHERE code = ${item.code})
      BEGIN
        UPDATE Subject SET 
          name = ${item.name}, 
          credits = ${item.credits}, 
          theoryHours = ${item.theory}, 
          practiceHours = ${item.practice}, 
          examType = ${item.examType}, 
          examForm = ${item.examForm}
        WHERE code = ${item.code}
      END
      ELSE
      BEGIN
        INSERT INTO Subject (id, majorId, code, name, credits, theoryHours, practiceHours, selfStudyHours, examType, examForm, examDuration)
        VALUES (NEWID(), ${major!.id}, ${item.code}, ${item.name}, ${item.credits}, ${item.theory}, ${item.practice}, 0, ${item.examType}, ${item.examForm}, 90)
      END
    `;

    // Link to curriculum (Prisma might work here if fields exist)
    const subj = await prisma.subject.findUnique({ where: { code: item.code } });
    if (subj) {
      await prisma.$executeRaw`
        IF NOT EXISTS (SELECT 1 FROM Curriculum WHERE majorId = ${major!.id} AND cohort = ${cohort} AND subjectId = ${subj.id})
        BEGIN
          INSERT INTO Curriculum (id, majorId, cohort, subjectId, suggestedSemester, isMandatory)
          VALUES (NEWID(), ${major!.id}, ${cohort}, ${subj.id}, ${item.sem}, 1)
        END
        ELSE
        BEGIN
          UPDATE Curriculum SET suggestedSemester = ${item.sem}
          WHERE majorId = ${major!.id} AND cohort = ${cohort} AND subjectId = ${subj.id}
        END
      `;
    }
  }

  console.log('Successfully seeded full IT curriculum using Raw SQL.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
