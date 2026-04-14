const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('Listing all tables in all schemas...');
  const tables = await prisma.$queryRaw`SELECT SCHEMA_NAME(schema_id) AS schema_name, name FROM sys.tables`;
  console.log(JSON.stringify(tables, null, 2));

  console.log('\nChecking Major table content (raw)...');
  const rows = await prisma.$queryRaw`SELECT * FROM Major`;
  console.log(JSON.stringify(rows, null, 2));
}

check()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
