import { PrismaClient } from '@prisma/client';

async function research() {
    const prisma = new PrismaClient();
    const faculties = await prisma.faculty.findMany({
        where: {
            OR: [
                { code: 'CNTT' },
                { code: 'F_CNTT' }
            ]
        },
        include: {
            majors: {
                select: { id: true, name: true }
            }
        }
    });

    console.log("Found Faculties:", JSON.stringify(faculties, null, 2));
    await prisma.$disconnect();
}
research();
