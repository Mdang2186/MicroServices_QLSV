
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const student = await prisma.student.findUnique({
        where: { studentCode: '22101100025' }
    });

    if (!student) {
        console.log('Student not found');
        return;
    }

    const user = await prisma.user.findFirst({
        where: { id: student.userId }
    });

    console.log('Student ID:', student.id);
    console.log('User ID:', student.userId);
    console.log('Username:', user?.username);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
