
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const data = await prisma.courseClass.findFirst({
      include: {
        adminClasses: true
      }
    });
    console.log('Success:', !!data);
  } catch (err) {
    console.error('Prisma Error:', err.message);
  }
  await prisma.$disconnect();
}

check();
