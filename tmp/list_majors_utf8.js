const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  const majors = await prisma.major.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      _count: true
    }
  });

  fs.writeFileSync('d:/KHOA_LUAN_TOT_NGHIEP/MicroServices_QLSV/tmp/majors_output_utf8.json', JSON.stringify(majors, null, 2), 'utf8');
  console.log('Written to majors_output_utf8.json');
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
