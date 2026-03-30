const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const u1 = await prisma.user.findFirst({ where: { username: "3000000001" }, include: { lecturer: true } });
    const u2 = await prisma.user.findFirst({ where: { username: "30000000001" }, include: { lecturer: true } });
    
    console.log("User '3000000001':", u1 ? "FOUND" : "NOT FOUND");
    if (u1) console.log(JSON.stringify(u1, null, 2));

    console.log("User '30000000001':", u2 ? "FOUND" : "NOT FOUND");
    if (u2) console.log(JSON.stringify(u2, null, 2));

    const totalUsers = await prisma.user.count();
    console.log("Total Users in DB:", totalUsers);
}

main().finally(() => prisma.$disconnect());
