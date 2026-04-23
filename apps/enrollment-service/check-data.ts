import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== SEMESTERS ===");
    const sems = await prisma.semester.findMany();
    sems.forEach(s => console.log(`ID: ${s.id}, Name: ${s.name}, Registering: ${s.isRegistering}, Current: ${s.isCurrent}`));

    const student = await prisma.student.findFirst({
        where: { studentCode: 'SV18A1CNTT01' },
        include: { adminClass: true }
    });

    if (!student) {
        console.log("Student SV18A1CNTT01 not found!");
        return;
    }

    console.log(`\n=== STUDENT: ${student.fullName} (${student.id}) ===`);
    console.log(`MajorID: ${student.majorId}, Cohort: ${student.intake || student.adminClass?.cohort}`);

    const targetSem = sems.find(s => s.isRegistering) || sems.find(s => s.isCurrent) || sems[sems.length - 1];
    if (targetSem) {
        console.log(`\n=== TARGET SEMESTER: ${targetSem.name} (${targetSem.id}) ===`);
        
        const openClasses = await prisma.courseClass.findMany({
            where: { semesterId: targetSem.id, status: 'OPEN' },
            include: { subject: true }
        });
        console.log(`Open classes count: ${openClasses.length}`);
        if (openClasses.length > 0) {
            console.log("Samples: " + openClasses.slice(0, 3).map(c => c.subject.name).join(", "));
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { studentId: student.id, courseClass: { semesterId: targetSem.id } },
            include: { courseClass: { include: { subject: true } } }
        });
        console.log(`Enrollments count: ${enrollments.length}`);

        const plans = await prisma.semesterPlan.findMany({
            where: { 
                majorId: student.majorId,
                semesterId: targetSem.id
            }
        });
        console.log(`Semester plans count for this specific semester: ${plans.length}`);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
