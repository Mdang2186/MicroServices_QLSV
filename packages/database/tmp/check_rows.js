const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRows() {
  const tables = await prisma.$queryRaw`SELECT T.name AS TableName, P.rows AS RowCounts
FROM sys.tables AS T
INNER JOIN sys.partitions AS P ON T.object_id = P.object_id
WHERE P.index_id IN (0,1)
ORDER BY T.name`;
  console.log(JSON.stringify(tables, null, 2));
}

checkRows()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
