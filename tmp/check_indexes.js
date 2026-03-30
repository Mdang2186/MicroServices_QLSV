
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Check if we can reach the DB and the structure
    try {
        const indexCheck = await prisma.$queryRaw`
            SELECT name, is_unique 
            FROM sys.indexes 
            WHERE object_id = OBJECT_ID('Enrollment')
        `;
        console.log('Indexes on Enrollment:', JSON.stringify(indexCheck, null, 2));
    } catch (e) {
        console.error('Error checking indexes:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
