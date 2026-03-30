import { PrismaClient } from "@prisma/client";

async function main() {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL
            }
        }
    });
    try {
        const count = await prisma.student.count();
        console.log(`Student count: ${count}`);
    } catch (e) {
        console.error("Error connecting to database:", e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
