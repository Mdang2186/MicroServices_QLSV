const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRows() {
  const tables = await prisma.$queryRaw`SELECT T.name AS TableName, CAST(P.rows AS INT) AS RowCounts
FROM sys.tables AS T
INNER JOIN sys.partitions AS P ON T.object_id = P.object_id
WHERE P.index_id IN (0,1)
ORDER BY T.name`;
  
  // Transform to plain object to avoid serialization issues
  const result = tables.map(t => ({ TableName: t.TableName, RowCounts: t.RowCounts }));
  console.log(JSON.stringify(result, null, 2));
}

checkRows()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
