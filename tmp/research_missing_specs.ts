import { PrismaClient } from '@prisma/client';

async function research() {
    const prisma = new PrismaClient();
    const majors = await prisma.major.findMany({
        include: {
            _count: {
                select: { specializations: true }
            }
        }
    });
    
    const majorsWithoutSpecs = majors.filter(m => m._count.specializations === 0);
    console.log("Majors needing specializations:", JSON.stringify(majorsWithoutSpecs.map(m => ({ id: m.id, name: m.name })), null, 2));
    await prisma.$disconnect();
}
research();
