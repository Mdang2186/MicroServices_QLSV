const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    const lecturerId = "LEC_30000000001";
    const classes = await prisma.courseClass.findMany({
        where: { lecturerId },
        include: { subject: true, schedules: true }
    });
    console.log(`Classes for ${lecturerId}:`, classes.length);
    console.log(JSON.stringify(classes, null, 2));

    const allSchedules = await prisma.classSchedule.count();
    console.log("Total schedules in DB:", allSchedules);
}

main().finally(() => prisma.$disconnect());
