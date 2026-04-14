const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const major = await prisma.major.findFirst({ where: { name: { contains: 'Công nghệ' } } });
    if (!major) {
      console.log('Major not found');
      return;
    }
    const cohort = 'K18';
    const studentsCount = await prisma.student.count({
      where: { majorId: major.id, cohort }
    });
    console.log(`Major: ${major.name} (${major.id})`);
    console.log(`Students Count for ${cohort}: ${studentsCount}`);

    const adminClasses = await prisma.adminClass.findMany({
      where: { majorId: major.id, cohort },
      include: { _count: { select: { students: true } } }
    });
    console.log('Admin Classes:', JSON.stringify(adminClasses, null, 2));
    
    const sampleEnrollment = await prisma.enrollment.findFirst();
    console.log('Sample Enrollment:', sampleEnrollment);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
