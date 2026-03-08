import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);

    const testStudent = await prisma.user.findUnique({
        where: { username: "22103100001" },
        select: {
            username: true,
            email: true,
            role: true,
            passwordHash: true
        }
    });
    console.log("Test student:", JSON.stringify(testStudent, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
