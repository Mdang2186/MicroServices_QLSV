import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testFindAll() {
  try {
    console.log('Testing CourseClass.findMany...');
    const result = await prisma.courseClass.findMany({
      where: {},
      include: {
        lecturer: true,
        subject: {
          include: {
            major: true,
            department: true,
          },
        },
        semester: true,
        adminClasses: {
          include: {
            major: true,
            _count: { select: { students: true } },
          },
        },
        sessions: { include: { room: true } },
        _count: {
          select: { enrollments: true },
        },
      },
    });
    console.log(`Success! Found ${result.length} classes.`);
  } catch (error) {
    console.error('FAILED with error:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testFindAll();
