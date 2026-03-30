
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DUPLICATE ENROLLMENT CLEANUP (Prisma Version) ---');

    // 1. Find duplicates using Prisma groupBy
    const groups = await prisma.enrollment.groupBy({
        by: ['studentId', 'courseClassId'],
        _count: {
            id: true
        },
        having: {
            id: {
                _count: {
                    gt: 1
                }
            }
        }
    });

    console.log(`Found ${groups.length} groups of duplicates.`);

    for (const group of groups) {
        const { studentId, courseClassId } = group;
        
        const enrollments = await prisma.enrollment.findMany({
            where: { studentId, courseClassId },
            orderBy: { registeredAt: 'desc' }
        });

        const toKeep = enrollments[0];
        const toDeleteIds = enrollments.slice(1).map(e => e.id);

        console.log(`Student: ${studentId} | Class: ${courseClassId} | Total: ${enrollments.length} | Keeping: ${toKeep.id} | Deleting: ${toDeleteIds.length}`);

        if (toDeleteIds.length > 0) {
            await prisma.enrollment.deleteMany({
                where: { id: { in: toDeleteIds } }
            });
        }
    }

    console.log('--- CLEANUP COMPLETE ---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
