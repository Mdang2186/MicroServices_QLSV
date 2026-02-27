
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function createSuperAdmin() {
    console.log("--- Creating Super Admin ---");

    const email = "superadmin@edu.com";
    const username = "superadmin";
    const password = "password123";
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);

    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: {
                passwordHash: hash,
                role: "SUPER_ADMIN",
                isActive: true
            },
            create: {
                email,
                username,
                passwordHash: hash,
                role: "SUPER_ADMIN",
                isActive: true
            }
        });

        console.log(`Successfully created/updated superadmin: ${user.email}`);
        console.log(`Role: ${user.role}`);
        console.log(`Password: ${password}`);
    } catch (error: any) {
        console.error("Error creating superadmin:", error.message);
    }

    console.log("--- Finished ---");
}

createSuperAdmin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
