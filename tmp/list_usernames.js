const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { username: true }
    });
    console.log("Usernames in DB:");
    users.forEach(u => console.log(`'${u.username}'`));
}

main().finally(() => prisma.$disconnect());
