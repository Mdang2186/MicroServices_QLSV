
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const fees = await prisma.studentFee.findMany({
        where: { studentId: 'STD_22101100025' },
        include: { semester: true }
    });

    console.log('Fees Count:', fees.length);
    fees.forEach(f => {
        console.log(`- ${f.name} | ${f.semester.name} | ${f.totalAmount} | ${f.paidAmount}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
