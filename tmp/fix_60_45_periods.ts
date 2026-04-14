import { PrismaClient } from '@prisma/client';

async function fixPeriods() {
    const prisma = new PrismaClient();
    console.log("Starting Data Repair: Fixing mismatched periods...");

    try {
        // Find all SemesterPlanItems that are not yet executed
        const items = await prisma.semesterPlanItem.findMany({
            include: { subject: true }
        });

        console.log(`Found ${items.length} items to check.`);
        let fixedCount = 0;

        for (const item of items) {
            const required = item.subject.credits * 15;
            const sessionsPerWeek = (item.theorySessionsPerWeek || 0) + (item.practiceSessionsPerWeek || 0) || 1;
            const planned = sessionsPerWeek * (item.periodsPerSession || 3) * 15;

            if (planned !== required) {
                // Calculation: required = sessions * newPeriods * 15
                // newPeriods = required / (sessions * 15)
                const newPeriodsPerSession = required / (sessionsPerWeek * 15);

                if (Number.isInteger(newPeriodsPerSession)) {
                    await prisma.semesterPlanItem.update({
                        where: { id: item.id },
                        data: {
                            periodsPerSession: newPeriodsPerSession
                        }
                    });
                    fixedCount++;
                    console.log(`Fixed ${item.subject.name}: ${planned}/${required} -> ${newPeriodsPerSession} periods/session`);
                }
            }
        }

        console.log(`Repair Complete! Fixed ${fixedCount} items.`);
    } catch (err) {
        console.error("Repair failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

fixPeriods();
