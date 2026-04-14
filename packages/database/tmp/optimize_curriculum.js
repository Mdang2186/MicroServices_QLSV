const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function optimizeCurriculum() {
  const majorCode = 'CNTT';
  const cohort = 'K18';
  
  const major = await prisma.major.findUnique({ where: { code: majorCode } });
  if (!major) throw new Error('Major CNTT not found');

  const plan = [
    // Sem 1
    { code: 'DC_TRIET', sem: 1 }, { code: 'DC_TOAN1', sem: 1 }, { code: 'DC_ENG1', sem: 1 },
    { code: 'THDC', sem: 1 }, { code: 'DC_TD_1', sem: 1 }, { code: 'DC_QP_1', sem: 1 },
    // Sem 2
    { code: 'DC_KTCT', sem: 2 }, { code: 'DC_TOAN2', sem: 2 }, { code: 'DTS', sem: 2 },
    { code: 'DC_ENG2', sem: 2 }, { code: 'DC_VLY', sem: 2 }, { code: 'KTLT', sem: 2 },
    // Sem 3
    { code: 'DC_CNXHKH', sem: 3 }, { code: '001102', sem: 3 }, { code: 'CTDLGT', sem: 3 },
    { code: 'IT_NET1', sem: 3 }, { code: 'OS', sem: 3 }, { code: 'DC_LOGIC', sem: 3 },
    // Sem 4
    { code: 'DC_TT_HCM', sem: 4 }, { code: 'DC_LS_DANG', sem: 4 }, { code: 'IT_DB', sem: 4 },
    { code: 'IT_OOP', sem: 4 }, { code: 'SOFT_ENG', sem: 4 }, { code: '001215', sem: 4 },
    // Sem 5
    { code: 'DC_ENG3', sem: 5 }, { code: 'IT_WEB', sem: 5 }, { code: 'IT_DOTNET', sem: 5 },
    { code: 'PROJECT_1', sem: 5 }, { code: '001276', sem: 5 },
    // Sem 6
    { code: 'AI', sem: 6 }, { code: 'SECURITY', sem: 6 }, { code: 'IOT', sem: 6 },
    { code: 'QT_DA', sem: 6 }, { code: '001292', sem: 6 },
    // Sem 7
    { code: 'IT_MICRO', sem: 7 }, { code: 'IT_CONT', sem: 7 }, { code: 'INTERN_1', sem: 7 },
    { code: 'IT_PROJ2', sem: 7 },
    // Sem 8
    { code: 'KLTN', sem: 8 }
  ];

  console.log(`Starting optimization for ${majorCode} - ${cohort}`);
  
  // 1. Delete all current curriculum for this major/cohort
  const deleted = await prisma.curriculum.deleteMany({
    where: { majorId: major.id, cohort }
  });
  console.log(`Cleared ${deleted.count} old curriculum entries.`);

  // 2. Insert new plan
  let inserted = 0;
  for (const item of plan) {
    const subject = await prisma.subject.findUnique({ where: { code: item.code } });
    if (!subject) {
      console.warn(`Subject ${item.code} not found in database, skipping...`);
      continue;
    }

    try {
      await prisma.curriculum.create({
        data: {
          id: require('crypto').randomUUID(),
          majorId: major.id,
          subjectId: subject.id,
          cohort: cohort,
          suggestedSemester: item.sem,
          isRequired: true
        }
      });
      inserted++;
    } catch (e) {
      console.error(`Failed to insert ${item.code}: ${e.message}`);
    }
  }

  console.log(`Successfully optimized curriculum: ${inserted} subjects inserted.`);
}

optimizeCurriculum()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
