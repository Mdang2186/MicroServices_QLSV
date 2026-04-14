const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addColumn() {
  try {
    console.log("Checking if 'cohort' column exists in 'CourseClass'...");
    const tableInfo = await prisma.$queryRaw`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'CourseClass' AND COLUMN_NAME = 'cohort'
    `;

    if (tableInfo.length === 0) {
      console.log("Column 'cohort' missing. Adding now...");
      await prisma.$executeRawUnsafe(`
        ALTER TABLE CourseClass ADD cohort VarChar(50) NULL;
      `);
      console.log("Column 'cohort' added successfully.");
    } else {
      console.log("Column 'cohort' already exists.");
    }

  } catch (e) {
    console.error("Error adding column:", e);
  } finally {
    await prisma.$disconnect();
  }
}

addColumn();
