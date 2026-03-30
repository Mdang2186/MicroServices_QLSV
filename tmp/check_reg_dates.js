
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: 'STD_22103100030' },
        select: { id: true, registeredAt: true, courseClassId: true }
    });

    enrollments.forEach(e => {
        console.log(`ID: ${e.id} | Class: ${e.courseClassId} | Date: ${e.registeredAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
