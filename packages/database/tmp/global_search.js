const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function globalSearch() {
    const term = 'CNTT_K18';
    console.log(`Searching for "${term}" in all tables...`);
    
    // We can't easily iterate all tables/columns with Prisma, so we'll use raw SQL
    const results = await prisma.$queryRaw`
        DECLARE @SearchStr nvarchar(100) = 'CNTT_K18'
        SELECT 
            T.name AS TableName, 
            C.name AS ColumnName
        FROM 
            sys.columns C
            JOIN sys.tables T ON C.object_id = T.object_id
        WHERE 
            C.system_type_id IN (167, 175, 231, 239) -- char, varchar, nchar, nvarchar
    `;
    
    // This SQL only gives us candidate columns. We'd have to query each.
    // Let's just check the Major table first, but maybe there's another Major table?
    
    const tables = await prisma.$queryRaw`SELECT name FROM sys.tables WHERE name LIKE '%Major%' OR name LIKE '%Ngành%'`;
    console.log('Relevant tables found:', tables);
}

globalSearch()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
