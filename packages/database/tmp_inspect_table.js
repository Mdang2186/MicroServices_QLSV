const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTable() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CourseClass'
    `;
    console.log("Columns in CourseClass:");
    columns.forEach(c => console.log(`- ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
