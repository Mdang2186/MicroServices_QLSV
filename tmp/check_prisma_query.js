const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const classId = 'CCLASS_CS04_HK1_01_2627';
  console.log('Querying grades for class:', classId);
  try {
    const grades = await prisma.grade.findMany({
      where: { courseClassId: classId },
      include: {
        student: {
          include: { user: true, adminClass: true }
        }
      }
    });
    console.log('Success! Count:', grades.length);
    if (grades.length > 0) {
      console.log('Sample student:', grades[0].student?.fullName);
      console.log('Sample admin class:', grades[0].student?.adminClass?.name);
    }
  } catch (err) {
    console.error('FAILED Query:');
    console.error(err);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
