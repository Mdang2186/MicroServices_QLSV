
const { PrismaClient } = require('@prisma/client');

async function checkDb(dbName) {
  const url = `sqlserver://127.0.0.1:1433;database=${dbName};user=sa;password=Mdang2186;trustServerCertificate=true`;
  
  console.log(`--- Checking Database: ${dbName} ---`);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url
      }
    }
  });

  try {
    const studentCount = await prisma.student.count();
    console.log(`${dbName} Students:`, studentCount);
    
    if (studentCount > 0) {
        const classCount = await prisma.courseClass.count();
        console.log(`${dbName} Classes:`, classCount);
    }
  } catch (e) {
    console.log(`Error connecting to ${dbName}: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  await checkDb('UNETI_EMS_CONTEXT');
  await checkDb('student_db');
}

main();
