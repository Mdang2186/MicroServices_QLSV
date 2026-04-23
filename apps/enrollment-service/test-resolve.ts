import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testResolve(idOrCode: string) {
    console.log(`Testing resolution for: ${idOrCode}`);
    
    let student = await prisma.student.findUnique({
        where: { id: idOrCode },
        include: { major: true, adminClass: true }
    });
    if (student) console.log("Found by ID!");

    if (!student) {
        student = await prisma.student.findUnique({
            where: { userId: idOrCode },
            include: { major: true, adminClass: true }
        });
        if (student) console.log("Found by UserID!");
    }

    if (!student) {
        student = await prisma.student.findFirst({
            where: { studentCode: idOrCode },
            include: { major: true, adminClass: true }
        });
        if (student) console.log("Found by StudentCode!");
    }

    if (!student) {
        console.log("NOT FOUND!");
    } else {
        console.log(`Student Match: ${student.fullName} (${student.id})`);
    }
}

testResolve('SV18A1CNTT01').then(() => prisma.$disconnect());
