import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugRegistration(studentIdOrUserId: string) {
    console.log(`\n=== DEBUGGING REGISTRATION FOR: ${studentIdOrUserId} ===`);
    
    // 1. Resolve student
    let student = await prisma.student.findUnique({
        where: { id: studentIdOrUserId },
        include: { major: true, adminClass: true }
    });
    if (!student) {
        student = await prisma.student.findUnique({
            where: { userId: studentIdOrUserId },
            include: { major: true, adminClass: true }
        });
    }
    if (!student) {
        student = await prisma.student.findFirst({
            where: { studentCode: studentIdOrUserId },
            include: { major: true, adminClass: true }
        });
    }

    if (!student) {
        console.log("CRITICAL: Student still not found!");
        return;
    }
    console.log(`Found Student: ${student.fullName}, Major: ${student.major?.name}, Cohort: ${student.intake || student.adminClass?.cohort}`);

    // 2. Resolve Target Semester (SAME LOGIC AS SERVICE)
    let targetSemester = await prisma.semester.findFirst({ where: { isRegistering: true } });
    if (!targetSemester) {
        const current = await prisma.semester.findFirst({ where: { isCurrent: true } });
        if (current) {
            targetSemester = await prisma.semester.findFirst({
                where: { startDate: { gt: current.startDate } },
                orderBy: { startDate: 'asc' }
            });
        }
    }
    if (!targetSemester) {
        const current = await prisma.semester.findFirst({ where: { isCurrent: true } });
        targetSemester = current;
    }

    if (!targetSemester) {
        console.log("CRITICAL: No target semester found!");
        return;
    }
    console.log(`Target Semester: ${targetSemester.name} (${targetSemester.id})`);

    // 3. Check Open Classes
    const openClasses = await prisma.courseClass.findMany({
        where: {
            semesterId: targetSemester.id,
            status: 'OPEN',
            subject: {
                OR: [
                    { majorId: student.majorId },
                    { major: { code: 'KCB' } }
                ]
            }
        },
        include: { subject: true }
    });
    console.log(`Open Classes Count: ${openClasses.length}`);
    if (openClasses.length > 0) {
        console.log("Sample Open Subjects: " + openClasses.slice(0, 5).map(c => c.subject.name).join(", "));
    } else {
        console.log("WARNING: No OPEN classes found for this student's major/KCB in this semester.");
        // Let's check ALL open classes in this semester regardless of major
        const allOpen = await prisma.courseClass.count({ where: { semesterId: targetSemester.id, status: 'OPEN' } });
        console.log(`Total OPEN classes in this semester (any major): ${allOpen}`);
    }

    // 4. Check Curriculum / training template
    const plans = await prisma.semesterPlan.findMany({
        where: {
            majorId: student.majorId,
            semesterId: targetSemester.id
        }
    });
    console.log(`Semester Plans for this student in this sem: ${plans.length}`);

    // 5. Final Output Simulation
    const openSubjectIds = new Set(openClasses.map(c => c.subjectId));
    console.log(`Open Subject IDs: ${openSubjectIds.size}`);
}

debugRegistration('SV18A1CNTT01').then(() => prisma.$disconnect());
