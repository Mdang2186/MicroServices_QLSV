const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.major.findMany({ 
  where: { name: { contains: 'Thông tin' } } 
}).then(ms => {
  console.log(JSON.stringify(ms, null, 2));
}).finally(() => prisma.$disconnect());
