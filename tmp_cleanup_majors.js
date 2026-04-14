const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany({
    where: { name: { contains: 'Công nghệ thông tin' } },
    orderBy: { createdAt: 'asc' }
  });

  console.log('Found majors:', majors.length);
  if (majors.length > 1) {
    const toDelete = majors.slice(1);
    console.log('Deleting:', toDelete.map(m => m.id));
    
    for (const m of toDelete) {
        try {
            // First update any relations if necessary, or just delete if it's safe
            // In a real system we might need to migrate subjects, but here we just delete as requested
            await prisma.major.delete({ where: { id: m.id } });
            console.log('Deleted:', m.id);
        } catch (e) {
            console.error('Failed to delete', m.id, e.message);
        }
    }
  }
}

main().finally(() => prisma.$disconnect());
