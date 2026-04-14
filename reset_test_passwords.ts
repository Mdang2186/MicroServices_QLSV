import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const password = "Password123";
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log("Updating test users...");
    
    const users = ["22103100001", "SV001", "admin"];
    
    for (const username of users) {
        const user = await prisma.user.findUnique({ where: { username } });
        if (user) {
            await prisma.user.update({
                where: { username },
                data: { passwordHash: hashedPassword }
            });
            console.log(`Updated password for: ${username}`);
        } else {
            console.log(`User not found: ${username}`);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
