const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const curricula = await prisma.$queryRaw`SELECT count(*) as count FROM Curriculum WHERE cohort = 'K18'`;
    console.log('Curriculum count for K18:', curricula[0].count);

    const classes = await prisma.$queryRaw`SELECT count(*) as count FROM CourseClass WHERE cohort = 'K18'`;
    console.log('CourseClass count for K18:', classes[0].count);

    const firstClass = await prisma.$queryRaw`SELECT TOP 1 * FROM CourseClass WHERE cohort = 'K18'`;
    console.log('Sample Class for K18:', firstClass);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
