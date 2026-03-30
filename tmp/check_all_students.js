
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const students = await prisma.student.findMany({
        include: {
            enrollments: {
                include: {
                    courseClass: {
                        include: {
                            subject: true,
                            semester: true
                        }
                    }
                }
            }
        }
    });

    console.log(`Found ${students.length} students`);
    students.forEach(s => {
        console.log(`Student: ${s.fullName} (${s.studentCode}), Enrollments: ${s.enrollments.length}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
