const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listModels() {
  const models = Object.keys(prisma).filter(k => k[0] !== k[0].toUpperCase() && !k.startsWith('_') && !k.startsWith('$'));
  console.log('Available Models in Prisma Client:');
  console.log(models.join(', '));
}

listModels()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
