
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkDuplicates() {
    console.log("--- Checking for Similar/Duplicate Emails ---");
    const users = await prisma.user.findMany();

    const emailCounts = new Map<string, number>();

    users.forEach(u => {
        const lower = u.email.toLowerCase();
        emailCounts.set(lower, (emailCounts.get(lower) || 0) + 1);
    });

    console.log("Duplicate emails (case-insensitive):");
    let found = false;
    for (const [email, count] of emailCounts.entries()) {
        if (count > 1) {
            console.log(`- ${email}: ${count} occurrences`);
            const similar = users.filter(u => u.email.toLowerCase() === email);
            similar.forEach(u => {
                console.log(`  > [${u.id}] Email: "${u.email}", Username: "${u.username}", Role: "${u.role}"`);
            });
            found = true;
        }
    }

    if (!found) {
        console.log("No duplicate emails found.");
    }

    console.log("\n--- Specific check for 'admin01@uni.edu.vn' ---");
    const admin01s = users.filter(u => u.email.toLowerCase().includes('admin01'));
    admin01s.forEach(u => {
        console.log(`- Email: "${u.email}" (Length: ${u.email.length}), Role: "${u.role}"`);
    });

    console.log("\n--- Diagnosis Finished ---");
}

checkDuplicates()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
