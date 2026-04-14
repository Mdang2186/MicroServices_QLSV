
const { PrismaClient } = require('@prisma/client');

async function backup() {
  const url = `sqlserver://127.0.0.1:1433;database=student_db;user=sa;password=Mdang2186;trustServerCertificate=true`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });

  try {
    console.log("Backing up Grade table...");
    // We use a raw query because the current Prisma Client might not match the schema
    const grades = await prisma.$queryRaw`SELECT * FROM dbo.Grade`;
    const fs = require('fs');
    fs.writeFileSync('grade_backup.json', JSON.stringify(grades, null, 2));
    console.log(`Successfully backed up ${grades.length} grades to grade_backup.json`);
  } catch (e) {
    console.error("Backup failed:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

backup();
