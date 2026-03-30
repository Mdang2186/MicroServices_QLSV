
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const s = await prisma.semester.findFirst({
        where: { isCurrent: true }
    });
    if (s) {
        console.log(`Current Semester: ${s.name} (${s.id})`);
    } else {
        console.log('No current semester found');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
