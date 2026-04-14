
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const studentCount = await prisma.student.count();
    const classCount = await prisma.courseClass.count();
    const gradeCount = await prisma.grade.count();
    console.log('--- DATABASE STATUS ---');
    console.log('Students:', studentCount);
    console.log('Classes:', classCount);
    console.log('Grades:', gradeCount);
    
    // Try to fetch one grade to see structure
    const grade = await prisma.grade.findFirst();
    console.log('First Grade sample:', grade);
  } catch (e) {
    console.error('Error connecting to DB or querying:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
