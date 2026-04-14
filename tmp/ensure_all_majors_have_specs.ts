import { PrismaClient } from '@prisma/client';

async function generate() {
    const prisma = new PrismaClient();
    console.log("Generating missing baseline Specializations...");

    try {
        const majors = await prisma.major.findMany({
            include: { specializations: true }
        });

        for (const major of majors) {
            if (major.specializations.length === 0) {
                const specId = `SPEC_${major.code || major.id.substring(0, 8)}`.toUpperCase();
                console.log(`Creating Specialization for ${major.name} (${major.id})...`);
                await prisma.specialization.upsert({
                    where: { id: specId },
                    update: {},
                    create: {
                        id: specId,
                        majorId: major.id,
                        name: `Chuyên ngành ${major.name}`,
                        code: `${major.code || 'GEN'}-SPEC`
                    }
                });
            }
        }
        console.log("All majors now have at least one Specialization!");
    } catch (err) {
        console.error("Standardization failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

generate();
