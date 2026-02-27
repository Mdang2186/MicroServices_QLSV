
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function fixPasswords() {
    console.log("--- Resetting Passwords ---");

    const password = "123456";
    const saltRounds = 10;
    const newHash = await bcrypt.hash(password, saltRounds);

    console.log(`Generated hash for "123456": ${newHash}`);

    const users = await prisma.user.findMany();

    if (users.length === 0) {
        console.log("No users found in database.");
        return;
    }

    console.log(`Found ${users.length} users. Updating hashes...`);

    let updatedCount = 0;
    for (const user of users) {
        await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash }
        });
        console.log(`Updated user: ${user.email} (${user.username})`);
        updatedCount++;
    }

    console.log(`\nSuccessfully updated ${updatedCount} users.`);
    console.log("--- Reset Finished ---");
}

fixPasswords()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
