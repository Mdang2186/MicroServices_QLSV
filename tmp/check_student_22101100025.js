
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
        // Search by name Huynh Kim Tuoi (case insensitive)
        const students = await prisma.student.findMany({
            where: { fullName: { contains: 'Huynh Kim Tươi' } }
        });
        console.log('Students with similar name:', students.length);
        students.forEach(s => console.log(`- ${s.fullName} (${s.studentCode})` ));
        return;
    }

    console.log('Student:', student.fullName, 'Code:', student.studentCode);
    console.log('Enrollments:', student.enrollments.length);
    student.enrollments.forEach(e => {
        console.log(`- Subject: ${e.courseClass.subject.name}, Semester: ${e.courseClass.semester.name}, Fee: ${e.tuitionFee}, Status: ${e.status}`);
    });

    const studentFees = await prisma.studentFee.findMany({
        where: { studentId: student.id },
        include: { semester: true }
    });
    console.log('StudentFees:', studentFees.length);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
