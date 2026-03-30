
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getValidIds() {
  const subject = await prisma.subject.findFirst();
  const semester = await prisma.semester.findFirst();
  console.log('Valid IDs:', { subjectId: subject?.id, semesterId: semester?.id });
  await prisma.$disconnect();
}

getValidIds();
