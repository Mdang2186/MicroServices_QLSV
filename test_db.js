const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const semesters = await prisma.semester.findMany();
    console.log('Semesters found:', semesters.length);
  } catch (e) {
    console.error('Error connecting to DB:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
