const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const DEFAULT_PRICE_PER_CREDIT = 500000;

async function auditCounts() {
  const [
    userCount,
    studentCount,
    familyMemberCount,
    prerequisiteCount,
    tuitionConfigCount,
    trainingPlanTemplateCount,
    semesterPlanCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.student.count(),
    prisma.familyMember.count(),
    prisma.prerequisite.count(),
    prisma.tuitionConfig.count(),
    prisma.trainingPlanTemplate.count(),
    prisma.semesterPlan.count(),
  ]);

  return {
    userCount,
    studentCount,
    familyMemberCount,
    prerequisiteCount,
    tuitionConfigCount,
    trainingPlanTemplateCount,
    semesterPlanCount,
  };
}

async function ensureTuitionConfigs() {
  const [majors, semesters, existingConfigs] = await Promise.all([
    prisma.major.findMany({
      select: { id: true },
      orderBy: { code: "asc" },
    }),
    prisma.semester.findMany({
      select: {
        year: true,
        startDate: true,
        endDate: true,
      },
      orderBy: [{ year: "asc" }, { startDate: "asc" }],
    }),
    prisma.tuitionConfig.findMany({
      select: {
        majorId: true,
        academicYear: true,
        cohort: true,
        educationType: true,
        isActive: true,
      },
    }),
  ]);

  const semesterByYear = new Map();
  for (const semester of semesters) {
    if (!semester.year) continue;
    const current = semesterByYear.get(semester.year) || {
      effectiveFrom: null,
      effectiveTo: null,
    };

    const startDate = semester.startDate ? new Date(semester.startDate) : null;
    const endDate = semester.endDate ? new Date(semester.endDate) : null;

    if (!current.effectiveFrom || (startDate && startDate < current.effectiveFrom)) {
      current.effectiveFrom = startDate;
    }
    if (!current.effectiveTo || (endDate && endDate > current.effectiveTo)) {
      current.effectiveTo = endDate;
    }

    semesterByYear.set(semester.year, current);
  }

  const activeGenericKeys = new Set(
    existingConfigs
      .filter((config) => config.isActive && !config.cohort && !config.educationType)
      .map((config) => `${config.majorId}::${config.academicYear}`),
  );

  const missingConfigs = [];
  for (const major of majors) {
    for (const [academicYear, range] of semesterByYear.entries()) {
      const key = `${major.id}::${academicYear}`;
      if (activeGenericKeys.has(key)) {
        continue;
      }

      missingConfigs.push({
        majorId: major.id,
        academicYear,
        pricePerCredit: DEFAULT_PRICE_PER_CREDIT,
        effectiveFrom: range.effectiveFrom,
        effectiveTo: range.effectiveTo,
        isActive: true,
      });
    }
  }

  if (APPLY && missingConfigs.length > 0) {
    await prisma.tuitionConfig.createMany({
      data: missingConfigs,
    });
  }

  return {
    missingConfigs: missingConfigs.length,
  };
}

async function familyMemberCoverage() {
  const totalStudents = await prisma.student.count();
  const studentsWithFamily = await prisma.student.count({
    where: {
      familyMembers: {
        some: {},
      },
    },
  });

  return {
    totalStudents,
    studentsWithFamily,
    studentsWithoutFamily: Math.max(totalStudents - studentsWithFamily, 0),
  };
}

async function ensureFamilyMembers(targetStudentsWithFamily = 300) {
  const coverage = await familyMemberCoverage();
  const missingStudentCount = Math.max(
    targetStudentsWithFamily - coverage.studentsWithFamily,
    0,
  );

  if (missingStudentCount <= 0) {
    return {
      createdFamilyMembers: 0,
      targetStudentsWithFamily,
    };
  }

  const students = await prisma.student.findMany({
    where: {
      familyMembers: {
        none: {},
      },
      status: {
        in: ["STUDYING", "ACTIVE"],
      },
    },
    select: {
      id: true,
      fullName: true,
      studentCode: true,
      permanentAddress: true,
      address: true,
      nationality: true,
      ethnicity: true,
      religion: true,
    },
    orderBy: {
      studentCode: "asc",
    },
    take: missingStudentCount,
  });

  const records = students.map((student, index) => {
    const suffix = `${student.studentCode || index}`.replace(/\D/g, "").slice(-8);
    return {
      studentId: student.id,
      relationship: "Người giám hộ",
      fullName: `Người giám hộ của ${student.fullName}`,
      birthYear: 1975 + (index % 10),
      job: "Kinh doanh tự do",
      phone: `09${suffix.padStart(8, "0")}`,
      ethnicity: student.ethnicity || "Kinh",
      religion: student.religion || "Không",
      nationality: student.nationality || "Việt Nam",
      workplace: "Chưa cập nhật",
      position: "Người giám hộ",
      address:
        student.permanentAddress || student.address || "Chưa cập nhật địa chỉ",
    };
  });

  if (APPLY && records.length > 0) {
    await prisma.familyMember.createMany({
      data: records,
    });
  }

  return {
    createdFamilyMembers: records.length,
    targetStudentsWithFamily,
  };
}

async function legacyTableStatus() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT [name]
    FROM sys.tables
    WHERE [name] IN ('SubjectPrerequisite', 'TeachingPlan', 'ClassSchedule')
  `);

  const existingTables = rows.map((row) => row.name);

  return {
    existingTables,
    recommendation:
      existingTables.length === 0
        ? "Các bảng legacy đã được gỡ khỏi schema hiện tại."
        : `Còn bảng legacy cần xử lý: ${existingTables.join(", ")}`,
  };
}

async function main() {
  const before = await auditCounts();
  const tuitionSync = await ensureTuitionConfigs();
  const familySeed = await ensureFamilyMembers();
  const familyCoverage = await familyMemberCoverage();
  const legacyTables = await legacyTableStatus();
  const after = await auditCounts();

  console.log(
    JSON.stringify(
      {
        mode: APPLY ? "apply" : "audit",
        before,
        tuitionSync,
        familySeed,
        familyCoverage,
        legacyTables,
        after,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
