const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const majors = await prisma.major.findMany({
    where: { name: { contains: 'Công nghệ thông tin' } },
    orderBy: { createdAt: 'asc' }
  });

  if (majors.length > 2) {
    // There are 3 CNTT majors based on user's message "xóa 2 ngành ... chỉ để lại cái đầu tiên"
    const toDelete = majors.slice(1);
    for (const m of toDelete) {
        try {
            await prisma.major.delete({ where: { id: m.id } });
            console.log('Deleted major:', m.id);
        } catch (e) {
            console.error('Failed to delete', m.id, e.message);
        }
    }
  } else {
    console.log('No duplicates found or already cleanedup. Found:', majors.length);
  }
}

main().finally(() => prisma.$disconnect());
