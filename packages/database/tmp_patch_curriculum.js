const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function patch() {
  try {
    const majors = await prisma.major.findMany();
    const curriculumMajors = await prisma.curriculum.groupBy({
      by: ['majorId'],
      where: { cohort: 'K18' }
    });

    console.log("Analyzing K18 Curriculum Major IDs...");
    
    for (const cm of curriculumMajors) {
      const dummyId = cm.majorId;
      // Try to find a matching major by name or code if dummyId is not a UUID
      let targetMajor = null;
      
      if (dummyId === 'KETOAN') targetMajor = majors.find(m => m.name.includes("Kế toán"));
      else if (dummyId === 'DETMAY') targetMajor = majors.find(m => m.name.includes("Dệt may"));
      else if (dummyId === 'OTO') targetMajor = majors.find(m => m.name.includes("ô tô"));
      else if (dummyId === 'CNTT' || dummyId.length < 5) targetMajor = majors.find(m => m.name.includes("Thông tin"));

      if (targetMajor && dummyId !== targetMajor.id) {
        console.log(`Mapping K18 Curriculum ${dummyId} -> ${targetMajor.id} (${targetMajor.name})`);
        const result = await prisma.curriculum.updateMany({
          where: { majorId: dummyId, cohort: 'K18' },
          data: { majorId: targetMajor.id }
        });
        console.log(`Updated ${result.count} records.`);
      } else {
        console.log(`Major ID ${dummyId} is already correct or not mapped.`);
      }
    }

    // Final check for the specific CNTT major in screenshot
    const cntt = majors.find(m => m.name.includes("Thông tin"));
    if (cntt) {
        const count = await prisma.curriculum.count({ where: { majorId: cntt.id, cohort: 'K18' } });
        console.log(`Final Roadmap count for CNTT (K18): ${count} records.`);
    }

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

patch();
