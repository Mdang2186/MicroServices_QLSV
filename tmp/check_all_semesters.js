
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const s = await prisma.semester.findMany();
    s.forEach(x => console.log(`${x.id} | ${x.name} | ${x.isCurrent}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
