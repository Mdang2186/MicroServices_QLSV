
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: 'STD_22103100030' },
        include: {
            courseClass: {
                include: { subject: true, semester: true }
            }
        }
    });

    console.log(`Total Enrollments: ${enrollments.length}`);
    for (const e of enrollments) {
        console.log(`ID: ${e.id} | ClassID: ${e.courseClassId} | Semester: ${e.courseClass.semester.name} | Subject: ${e.courseClass.subject.name}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
