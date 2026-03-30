
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findUsers() {
  const users = await prisma.user.findMany({
    take: 10,
    select: { username: true, role: true, email: true }
  });
  console.log('Users:', JSON.stringify(users, null, 2));
}

findUsers().catch(console.error).finally(() => prisma.$disconnect());
