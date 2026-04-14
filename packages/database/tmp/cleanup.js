const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Merging Faculty F01 into FAC_CNTT (including Departments and Majors)...');
  try {
    // 1. Move Majors
    const majorsCount = await prisma.major.updateMany({
      where: { facultyId: 'F01' },
      data: { facultyId: 'FAC_CNTT' }
    });
    console.log(`Updated ${majorsCount.count} majors.`);

    // 2. Move Departments
    const deptsCount = await prisma.department.updateMany({
      where: { facultyId: 'F01' },
      data: { facultyId: 'FAC_CNTT' }
    });
    console.log(`Updated ${deptsCount.count} departments.`);

    // 3. Move Lecturers (just in case)
    const lectsCount = await prisma.lecturer.updateMany({
      where: { facultyId: 'F01' },
      data: { facultyId: 'FAC_CNTT' }
    });
    console.log(`Updated ${lectsCount.count} lecturers.`);

    // 4. Delete redundant faculty
    const del = await prisma.faculty.deleteMany({
      where: { id: 'F01' }
    });
    console.log(`Deleted ${del.count} faculty records (F01).`);
    
    console.log('Merge complete!');
  } catch (e) {
    console.error('Error during merge:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
