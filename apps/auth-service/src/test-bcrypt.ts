
import * as bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function test() {
    const email = "admin01@uni.edu.vn";
    const password = "123456";

    console.log(`--- Auth Service Bcrypt Test ---`);
    console.log(`Testing with email: ${email}`);

    const user = await prisma.user.findFirst({
        where: { OR: [{ email }, { username: email }] }
    });

    if (!user) {
        console.log("User not found!");
        return;
    }

    console.log(`User found. Stored Hash: ${user.passwordHash}`);

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    console.log(`Comparison result for "${password}": ${isMatch}`);

    if (!isMatch) {
        console.log("Mismatch detected. Generating new hash with current bcrypt...");
        const newHash = await bcrypt.hash(password, 10);
        console.log(`New Hash: ${newHash}`);
        const isMatchNew = await bcrypt.compare(password, newHash);
        console.log(`Verification of new hash: ${isMatchNew}`);
    }
}

test()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
