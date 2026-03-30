
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const duplicates = await prisma.$queryRaw`
        SELECT studentId, courseClassId, COUNT(*) as count
        FROM Enrollment
        GROUP BY studentId, courseClassId
        HAVING COUNT(*) > 1
    `;

    console.log('Duplicate Enrollments found:', duplicates.length);
    for (const d of duplicates) {
        const s = await prisma.student.findUnique({ where: { id: d.studentId } });
        console.log(`Student: ${s.fullName} (${s.studentCode}) | Class: ${d.courseClassId} | Count: ${d.count}`);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
