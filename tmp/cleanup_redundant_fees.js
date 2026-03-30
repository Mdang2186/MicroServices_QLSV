
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING REDUNDANT FEE CLEANUP ---');
  
  const deleted = await prisma.studentFee.deleteMany({
    where: {
      name: {
        contains: 'Học phí'
      }
    }
  });
  
  console.log(`Successfully deleted ${deleted.count} redundant summary records from StudentFee table.`);
  console.log('--- CLEANUP FINISHED ---');
}

main()
  .catch(e => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
