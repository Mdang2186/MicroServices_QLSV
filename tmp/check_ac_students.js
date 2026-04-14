const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const acs = await prisma.adminClass.findMany({
    include: { _count: { select: { students: true } } }
  });
  console.log('--- ADMIN CLASSES ---');
  acs.forEach(ac => {
    console.log(`[${ac.id}] Code: ${ac.code}, Major: ${ac.majorId}, Cohort: ${ac.cohort}, Students: ${ac._count.students}`);
  });

  const majors = await prisma.major.findMany();
  console.log('--- MAJORS ---');
  majors.forEach(m => console.log(`[${m.id}] ${m.code} - ${m.name}`));

  const students = await prisma.student.findMany({ select: { id: true, majorId: true, adminClassId: true }});
  console.log(`Total students: ${students.length}`);
}

check();
