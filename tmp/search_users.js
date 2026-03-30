const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { username: { contains: "300000000" } },
        select: { id: true, username: true, role: true }
    });
    console.log("Users matching '300000000':", JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());
