const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function extremeSearch() {
    console.log('Searching for "CNTT_K18" at the row level...');
    const rows = await prisma.$queryRaw`SELECT * FROM Major`;
    let found = false;
    rows.forEach(row => {
        const rowStr = JSON.stringify(row);
        if (rowStr.includes('CNTT_K18') || rowStr.includes('M_CNTT')) {
            console.log('Found match in row:', row);
            found = true;
        }
    });
    if (!found) {
        console.log('No matches found in any row of Major table.');
    }
}

extremeSearch()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
