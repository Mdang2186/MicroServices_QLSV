import { PrismaClient } from '@repo/database';

const prisma = new PrismaClient();

async function check() {
    try {
        console.log("--- SECTIONS CHECK ---");
        const registerSem = await prisma.semester.findFirst({ where: { isRegistering: true } });
        console.log("Register Semester:", JSON.stringify(registerSem, null, 2));

        const subjects = await prisma.subject.findMany({
            where: { name: { contains: 'Trí tuệ nhân tạo' } }
        });
        console.log("Subjects Found:", JSON.stringify(subjects, null, 2));

        if (subjects.length > 0 && registerSem) {
            const classes = await prisma.courseClass.findMany({
                where: { 
                    subjectId: subjects[0].id,
                    semesterId: registerSem.id
                },
                include: { adminClasses: true }
            });
            console.log("Classes for Subject in Req. Sem:", JSON.stringify(classes, null, 2));
        }

        const allCurrentClasses = await prisma.courseClass.count();
        console.log("Total CourseClasses in DB:", allCurrentClasses);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

check();
