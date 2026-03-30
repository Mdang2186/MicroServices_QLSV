
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: 'STD_22101100025' },
        include: {
            courseClass: {
                include: { subject: true, semester: true }
            }
        }
    });

    const result = enrollments.map(e => ({
        semester: e.courseClass.semester.name,
        subject: e.courseClass.subject.name,
        fee: e.tuitionFee,
        status: e.status
    }));

    console.log(JSON.stringify(result, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
