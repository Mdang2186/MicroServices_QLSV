const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listTables() {
  const result = await prisma.$queryRaw`SELECT name FROM sys.tables`;
  console.log('Tables in database:');
  console.log(JSON.stringify(result, null, 2));
}

listTables()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
