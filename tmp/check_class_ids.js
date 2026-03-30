
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: 'STD_22103100030' }
    });

    console.log('Class IDs:');
    enrollments.forEach(e => console.log(e.courseClassId));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
