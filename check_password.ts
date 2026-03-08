import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function test() {
    const studentCode = "22103100001";
    const password = "123456";

    console.log(`--- Password Verification Test ---`);
    const user = await prisma.user.findUnique({
        where: { username: studentCode }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log(`User found: ${user.username} (${user.role})`);
    console.log(`Stored Hash: ${user.passwordHash}`);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`Comparison result for "${password}": ${isMatch}`);
}

test()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
