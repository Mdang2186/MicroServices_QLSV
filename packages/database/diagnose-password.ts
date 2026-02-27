
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function diagnose() {
    console.log("--- Detailed Password Diagnosis ---");

    const password = "123456";

    console.log("Fetching all users...");
    const users = await prisma.user.findMany();

    if (users.length === 0) {
        console.log("No users found in database.");
        return;
    }

    console.log(`Found ${users.length} users. Checking roles and hashes...`);

    for (const user of users) {
        const isMatch = await bcrypt.compare(password, user.passwordHash).catch(() => false);
        const status = isMatch ? "MATCH" : "MISMATCH";

        console.log(`- ${user.email} | Role: [${user.role}] | Status: ${status}`);

        if (user.email.toLowerCase().includes('admin') || user.role.toUpperCase().includes('ADMIN')) {
            console.log(`  > Full Role String: "${user.role}" (Length: ${user.role.length})`);
            if (!isMatch) {
                console.log(`  > Hash: ${user.passwordHash}`);
            }
        }
    }

    console.log("\n--- Diagnosis Finished ---");
}

diagnose()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
