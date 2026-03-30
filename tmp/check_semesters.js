
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const cc = await prisma.courseClass.findUnique({
        where: { id: 'CCLASS_CS02_HKH_01_2526' },
        include: { semester: true }
    });
    const cc2 = await prisma.courseClass.findUnique({
        where: { id: 'CCLASS_CS01_HK1_01_2627' },
        include: { semester: true }
    });

    console.log('Class 1:', cc.id, cc.semester.name);
    console.log('Class 2:', cc2.id, cc2.semester.name);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
