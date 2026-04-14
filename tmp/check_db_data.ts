import { PrismaClient } from '@prisma/client';

async function checkData() {
  const prisma = new PrismaClient();
  try {
    console.log('--- CURRICULUM ---');
    const curriculum = await prisma.curriculum.findMany({
      include: { subject: true }
    });
    console.log(`Total Curriculum items: ${curriculum.length}`);
    curriculum.slice(0, 5).forEach(c => {
      console.log(`- Major: ${c.majorId}, Cohort: ${c.cohort}, Sub: ${c.subject.name}, Sem: ${c.suggestedSemester}`);
    });

    console.log('\n--- ADMIN CLASSES ---');
    const adminClasses = await prisma.adminClass.findMany({
      include: { _count: { select: { students: true } } }
    });
    console.log(`Total AdminClasses: ${adminClasses.length}`);
    adminClasses.forEach(ac => {
      console.log(`- ID: ${ac.id}, Major: ${ac.majorId}, Cohort: ${ac.cohort}, Students: ${ac._count.students}`);
    });

    console.log('\n--- SEMESTERS ---');
    const semesters = await prisma.semester.findMany();
    semesters.forEach(s => {
      console.log(`- ID: ${s.id}, Name: ${s.name}, Code: ${s.code}, Year: ${s.year}`);
    });

  } catch (err) {
    console.error('Error checking data:', err);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
