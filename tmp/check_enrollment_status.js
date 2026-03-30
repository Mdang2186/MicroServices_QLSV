
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.student.findUnique({
        where: { id: 'STD_22101100025' },
        include: {
            enrollments: {
                include: {
                    courseClass: {
                        include: { subject: true, semester: true }
                    }
                }
            }
        }
    });

    if (!student) {
        console.log('Student not found');
        return;
    }

    console.log(`Student: ${student.fullName}`);
    student.enrollments.forEach(e => {
        console.log(`${e.courseClass.semester.name} | ${e.courseClass.subject.name} | ${e.tuitionFee} | ${e.status}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
