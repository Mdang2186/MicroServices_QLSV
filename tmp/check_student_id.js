
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.student.findUnique({
        where: { studentCode: '22101100025' }
    });

    if (!student) {
        console.log('Student not found');
        return;
    }

    console.log('ID:', student.id);
    console.log('FullName:', student.fullName);
    console.log('StudentCode:', student.studentCode);

    const enrollments = await prisma.enrollment.findMany({
        where: { studentId: student.id },
        include: {
            courseClass: {
                include: {
                    semester: true
                }
            }
        }
    });

    console.log('Enrollments Count:', enrollments.length);
    enrollments.forEach(e => {
        console.log(`- ${e.courseClass.semester.name}: ${e.tuitionFee}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
