
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.student.findUnique({
        where: { studentCode: '22101100025' },
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

    if (!student) {
        console.log('Student not found with code 22101100025');
        return;
    }

    const result = {
        fullName: student.fullName,
        studentCode: student.studentCode,
        enrollments: student.enrollments.map(e => ({
            subject: e.courseClass.subject.name,
            semester: e.courseClass.semester.name,
            fee: e.tuitionFee,
            status: e.status
        }))
    };

    console.log(JSON.stringify(result, null, 2));

    const studentFees = await prisma.studentFee.findMany({
        where: { studentId: student.id },
        include: { semester: true }
    });
    console.log('StudentFees:', studentFees.length);
    studentFees.forEach(f => {
        console.log(`- Fee: ${f.name}, Semester: ${f.semester.name}, Total: ${f.totalAmount}, Paid: ${f.paidAmount}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
