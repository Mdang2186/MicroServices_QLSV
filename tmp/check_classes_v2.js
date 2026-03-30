
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const classes = await prisma.courseClass.findMany({
        where: { subject: { code: { in: ['CS01', 'CS02'] } } },
        include: { subject: true, semester: true }
    });

    console.log(`Found ${classes.length} classes`);
    classes.forEach(c => {
        console.log(`ClassID: ${c.id} | Subject: ${c.subject.name} | Semester: ${c.semester.name}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
