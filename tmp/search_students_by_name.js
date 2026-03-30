
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.student.findMany({
        where: { fullName: { contains: 'Huỳnh Kim Tươi' } }
    });

    console.log(`Found ${students.length} students`);
    students.forEach(s => {
        console.log(`- ${s.fullName} (${s.studentCode}) | ID: ${s.id} | UserID: ${s.userId}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
