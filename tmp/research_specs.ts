import { PrismaClient } from '@prisma/client';

async function research() {
    const prisma = new PrismaClient();
    const specs = await prisma.specialization.findMany({
        select: { id: true, majorId: true, name: true }
    });
    console.log(JSON.stringify(specs, null, 2));
    await prisma.$disconnect();
}
research();
