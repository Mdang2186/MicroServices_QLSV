const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classes = await prisma.courseClass.findMany({
    include: {
      lecturer: true,
      subject: true,
      semester: true
    }
  });

  console.log(`Found ${classes.length} total classes:`);
  classes.forEach(c => {
    console.log(`- ${c.code}: ${c.subject.name}`);
    console.log(`  Lecturer: ${c.lecturer ? c.lecturer.fullName + ' (' + c.lecturer.id + ')' : 'NONE'}`);
    console.log(`  Semester: ${c.semester.name} (${c.semester.id})`);
  });

  const lecturer = await prisma.lecturer.findFirst({
    where: { fullName: { contains: 'Phạm Công Dũng' } }
  });
  console.log('\nPhạm Công Dũng ID:', lecturer?.id);
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
