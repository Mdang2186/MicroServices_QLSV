const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function rawQuery() {
  console.log('Querying all tables in current database...');
  const tables = await prisma.$queryRaw`SELECT name FROM sys.tables`;
  console.log('Tables:', tables);

  console.log('\nQuerying all majors (raw)...');
  const majors = await prisma.$queryRaw`SELECT id, code, name FROM Major`;
  console.log('Majors:', majors);
}

rawQuery()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
