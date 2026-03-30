const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("Syncing currentSlots for all CourseClasses...");
    const classes = await prisma.courseClass.findMany({
        include: { _count: { select: { enrollments: true } } }
    });

    for (const c of classes) {
        const count = c._count.enrollments;
        if (c.currentSlots !== count) {
            await prisma.courseClass.update({
                where: { id: c.id },
                data: { currentSlots: count }
            });
            console.log(`Updated class ${c.code}: ${c.currentSlots} -> ${count}`);
        }
    }
    console.log("Sync complete.");
}

main().finally(() => prisma.$disconnect());
