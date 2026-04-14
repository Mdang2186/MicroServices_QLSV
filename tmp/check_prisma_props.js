const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- PRISMA CLIENT PROPERTIES ---');
  const props = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log(props.join(', '));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
