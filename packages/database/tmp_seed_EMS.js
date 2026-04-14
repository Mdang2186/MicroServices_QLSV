const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const COHORTS = ["K17", "K18", "K19", "K20", "K21", "K22"];
const COHORT_START_YEARS = {
  K17: 2023, K18: 2024, K19: 2025, K20: 2026, K21: 2027, K22: 2028,
};

async function main() {
  try {
    console.log("Starting Semester Foundation Build...");

    // 1. Create Semesters for all years covered by cohorts
    const allYears = new Set();
    Object.values(COHORT_START_YEARS).forEach(y => {
        for(let i=0; i<5; i++) allYears.add(y + i);
    });

    const sortedYears = Array.from(allYears).sort();

    for (const year of sortedYears) {
        const nextYear = year + 1;
        
        // Semester 1
        await prisma.semester.upsert({
            where: { code: `HK1_${year}${nextYear}` },
            update: {},
            create: {
                id: `SEM_HK1_${year}${nextYear}`,
                code: `HK1_${year}${nextYear}`,
                name: `Học kỳ 1 năm học ${year}-${nextYear}`,
                year: year,
                startDate: new Date(`${year}-09-01`),
                endDate: new Date(`${nextYear}-02-15`),
                semesterNumber: 1
            }
        });

        // Semester 2
        await prisma.semester.upsert({
            where: { code: `HK2_${year}${nextYear}` },
            update: {},
            create: {
                id: `SEM_HK2_${year}${nextYear}`,
                code: `HK2_${year}${nextYear}`,
                name: `Học kỳ 2 năm học ${year}-${nextYear}`,
                year: nextYear, // Semester 2 spans into the next calendar year
                startDate: new Date(`${nextYear}-02-16`),
                endDate: new Date(`${nextYear}-08-31`),
                semesterNumber: 2
            }
        });
    }

    console.log("Semester Foundation built.");

    // 2. Data Enrichment for CNTT K19
    const cntt = await prisma.major.findFirst({ where: { name: { contains: 'Thông tin' } } });
    if (cntt) {
        const subjects = await prisma.subject.findMany({ where: { majorId: cntt.id }, take: 20 });
        const hk1_2526 = await prisma.semester.findUnique({ where: { code: 'HK1_20252026' } });
        
        if (hk1_2526) {
            for (const sub of subjects) {
                const code = `${sub.code}_K19_C1`;
                await prisma.courseClass.upsert({
                    where: { code },
                    update: { sessionsPerWeek: 1, periodsPerSession: 3 },
                    create: {
                        code,
                        name: `${sub.name} (K19.1)`,
                        subjectId: sub.id,
                        semesterId: hk1_2526.id,
                        cohort: 'K19',
                        maxSlots: 60,
                        totalPeriods: 45,
                        sessionsPerWeek: 1,
                        periodsPerSession: 3
                    }
                });
            }
            console.log("Sample classes enriched for K19.");
        }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
