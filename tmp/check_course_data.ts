import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const totalCount = await prisma.courseClass.count();
    console.log(`Total CourseClasses in DB: ${totalCount}`);

    if (totalCount > 0) {
      const firstFive = await prisma.courseClass.findMany({
        take: 5,
        include: { semester: true, subject: true }
      });
      console.log('Sample data:');
      firstFive.forEach(c => {
        console.log(`- ID: ${c.id}, Code: ${c.code}, Semester: ${c.semester?.name}, Year: ${c.semester?.year}`);
      });
    }

    const currentSem = await prisma.semester.findFirst({ where: { isCurrent: true } });
    console.log(`Current Semester labeled in DB: ${currentSem?.name || 'NONE'}`);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
