import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugClassEnrollments(classId: string) {
    console.log(`\n=== DEBUGGING CLASS ENROLLMENTS FOR: ${classId} ===`);
    
    try {
        console.log("Attempting findMany with complex includes...");
        const enrollments = await prisma.enrollment.findMany({
            where: { courseClassId: classId },
            include: {
                student: {
                    include: { user: true, adminClass: true }
                },
                attendances: {
                    include: {
                        session: {
                            include: {
                                room: true,
                            },
                        },
                    },
                    orderBy: { date: 'desc' },
                }
            },
            orderBy: { student: { studentCode: 'asc' } }
        });

        console.log(`Success: Found ${enrollments.length} enrollments.`);
        if (enrollments.length > 0) {
            console.log("First enrollment sample student:", enrollments[0].student?.fullName);
        }
    } catch (err) {
        console.error("CRASH detected in Prisma include logic:");
        console.error(err);
    }
}

async function main() {
    // I need a valid classId. Let's find one first.
    const firstClass = await prisma.courseClass.findFirst({ select: { id: true } });
    if (firstClass) {
        await debugClassEnrollments(firstClass.id);
    } else {
        console.log("No course classes found in DB.");
    }
    await prisma.$disconnect();
}

main();
