import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    console.log("=== USERS ===");
    const users = await prisma.user.findMany({
        where: { role: 'LECTURER' },
        select: { id: true, username: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log("=== LECTURERS ===");
    const lecturers = await prisma.lecturer.findMany({
        select: { id: true, userId: true, lectureCode: true, fullName: true }
    });
    console.log(JSON.stringify(lecturers, null, 2));

    console.log("=== COURSE CLASSES ===");
    const courses = await prisma.courseClass.findMany({
        select: { id: true, lecturerId: true, code: true, name: true }
    });
    console.log(JSON.stringify(courses, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
