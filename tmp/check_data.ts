import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const enrollments = await prisma.enrollment.findMany({
      take: 5,
      include: {
        courseClass: {
          include: {
            schedules: {
              include: { room: true }
            }
          }
        }
      }
    });
    console.log(JSON.stringify(enrollments, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
