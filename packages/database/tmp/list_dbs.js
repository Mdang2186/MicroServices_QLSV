const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listDatabases() {
  console.log('Listing all databases...');
  const dbs = await prisma.$queryRaw`SELECT name FROM sys.databases`;
  console.log(JSON.stringify(dbs, null, 2));

  console.log('\nChecking current database name...');
  const currentDb = await prisma.$queryRaw`SELECT DB_NAME() AS current_db`;
  console.log(JSON.stringify(currentDb, null, 2));
}

listDatabases()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
