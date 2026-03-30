const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("=== ALL USERS (First 20) ===");
    const users = await prisma.user.findMany({
        take: 20,
        select: { id: true, username: true, role: true }
    });
    console.log(JSON.stringify(users, null, 2));

    console.log("=== ALL LECTURERS (First 5) ===");
    const lecturers = await prisma.lecturer.findMany({
        take: 5,
        select: { id: true, userId: true, lectureCode: true, fullName: true }
    });
    console.log(JSON.stringify(lecturers, null, 2));
}

main().finally(() => prisma.$disconnect());
