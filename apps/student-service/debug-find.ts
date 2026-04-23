import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugStudentFind(idOrUserId: string) {
    console.log(`\n=== DEBUGGING STUDENT FIND FOR: ${idOrUserId} ===`);
    
    const portalStudentInclude = {
        user: true,
        major: true,
        specialization: true,
        enrollments: {
            include: {
                courseClass: {
                    include: {
                        subject: true,
                        sessions: {
                            include: { room: true },
                        },
                        adminClasses: true,
                        lecturer: true,
                        semester: true,
                    },
                },
                attendances: true,
            },
        },
        adminClass: true,
        grades: {
            include: {
                subject: true,
                courseClass: true,
            },
        },
    } as const;

    try {
        console.log("Attempting findUnique by ID...");
        const studentById = await prisma.student.findUnique({
            where: { id: idOrUserId },
            include: portalStudentInclude
        });
        if (studentById) {
            console.log("Success: Student found by ID");
            return studentById;
        }

        console.log("Attempting findUnique by UserId...");
        const studentByUserId = await prisma.student.findUnique({
            where: { userId: idOrUserId },
            include: portalStudentInclude
        });
        if (studentByUserId) {
            console.log("Success: Student found by UserId");
            return studentByUserId;
        }

        console.log("Attempting findFirst by StudentCode...");
        const studentByCode = await prisma.student.findFirst({
            where: { studentCode: idOrUserId },
            include: portalStudentInclude
        });
        if (studentByCode) {
            console.log("Success: Student found by Code");
            return studentByCode;
        }

        console.log("Student NOT found in any field.");
    } catch (err) {
        console.error("CRASH detected in Prisma include logic:");
        console.error(err);
    }
}

async function main() {
    await debugStudentFind('SEED_ST_18A1CNTT_01');
    await debugStudentFind('USR_18A1CNTT_01');
    await prisma.$disconnect();
}

main();
