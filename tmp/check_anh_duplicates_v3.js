
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: 'STD_22103100030' },
        select: { id: true, studentId: true, courseClassId: true }
    });

    console.log('Enrollments for Bùi Trọng Anh:');
    const counts = {};
    enrollments.forEach(e => {
        const key = `${e.studentId}|${e.courseClassId}`;
        counts[key] = (counts[key] || 0) + 1;
        console.log(`ID: ${e.id} | ClassID: ${e.courseClassId}`);
    });

    console.log('Counts:', JSON.stringify(counts, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
