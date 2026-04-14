import { PrismaClient } from '@prisma/client';

async function mapAll() {
    const prisma = new PrismaClient();
    console.log("Starting Universal Specialization Mapping for 11,762 students...");

    try {
        const specs = await prisma.specialization.findMany({
            select: { id: true, majorId: true }
        });
        
        const specMap = specs.reduce((acc, curr) => {
            if (!acc[curr.majorId]) acc[curr.majorId] = [];
            acc[curr.majorId].push(curr.id);
            return acc;
        }, {} as Record<string, string[]>);

        const students = await prisma.student.findMany({
            select: { id: true, majorId: true }
        });

        console.log(`Mapping ${students.length} students. Ensuring 100% coverage...`);

        const chunks = [];
        for (let i = 0; i < students.length; i += 500) {
            chunks.push(students.slice(i, i + 500));
        }

        let updatedCount = 0;
        for (const chunk of chunks) {
            await Promise.all(chunk.map(s => {
                const possibleSpecs = specMap[s.majorId] || [];
                if (possibleSpecs.length === 0) {
                    console.warn(`WARNING: Major ${s.majorId} still has no specs! Unexpected.`);
                    return Promise.resolve();
                }
                const specializationId = possibleSpecs[0]; // Take the first one (General)

                return prisma.student.update({
                    where: { id: s.id },
                    data: { specializationId: specializationId }
                });
            }));
            updatedCount += chunk.length;
            console.log(`Mapped ${updatedCount}/${students.length} students...`);
        }

        const nullCheck = await prisma.student.count({ where: { specializationId: null } });
        console.log(`Mapping Complete! NULL count: ${nullCheck}`);

    } catch (err) {
        console.error("Mapping failed:", err);
    } finally {
        await prisma.$disconnect();
    }
}

mapAll();
