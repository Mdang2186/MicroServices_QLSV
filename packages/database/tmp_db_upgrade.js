const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking DB columns...");
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE CourseClass ADD sessionsPerWeek INT DEFAULT 1');
        await prisma.$executeRawUnsafe('ALTER TABLE CourseClass ADD periodsPerSession INT DEFAULT 3');
        console.log("Columns added.");
    } catch (e) {
        console.log("Columns likely exist or error:", e.message);
    }

    console.log("Enriching data for better visual display...");
    
    // Ensure we have a default semester if needed
    const sem2526 = await prisma.semester.findFirst({ where: { code: { contains: '2526' } } });
    if (!sem2526) {
        console.log("No 2526 semester found, skipping enrichment.");
        return;
    }

    const cntt = await prisma.major.findFirst({ where: { name: { contains: 'Thông tin' } } });
    if (!cntt) return;

    const subjects = await prisma.subject.findMany({ where: { majorId: cntt.id }, take: 10 });
    
    for (const sub of subjects) {
        const code = `${sub.code}_K19_TEST`;
        await prisma.courseClass.upsert({
            where: { code },
            update: {
                sessionsPerWeek: 1,
                periodsPerSession: 3,
                totalPeriods: 45
            },
            create: {
                code,
                name: `${sub.name} (K19 - Test)`,
                subjectId: sub.id,
                semesterId: sem2526.id,
                cohort: 'K19',
                maxSlots: 60,
                totalPeriods: 45,
                sessionsPerWeek: 1,
                periodsPerSession: 3
            }
        });
    }
    console.log("Data enriched for K19.");

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
