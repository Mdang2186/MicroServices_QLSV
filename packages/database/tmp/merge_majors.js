const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const MERGE_MAP = {
  // Primary ID: [Backup IDs]
  'M_CNTT': ['CNTT_OLD', 'CNTT_NEW', '18edde59-8af5-4bb9-9524-7e5de7efc5d1'], // Including previous ID found in research
  'M_KT': ['KT'],
  'QTKD': ['M_QTKD', 'MAJ_QTKD']
};

async function mergeMajor(primaryId, backupIds) {
  console.log(`Merging ${backupIds} into ${primaryId}...`);
  for (const backupId of backupIds) {
    try {
      // Move Students
      await prisma.student.updateMany({ where: { majorId: backupId }, data: { majorId: primaryId } });
      // Move Subjects
      await prisma.subject.updateMany({ where: { majorId: backupId }, data: { majorId: primaryId } });
      // Move Curriculums
      await prisma.curriculum.updateMany({ where: { majorId: backupId }, data: { majorId: primaryId } });
      // Move AdminClasses
      await prisma.adminClass.updateMany({ where: { majorId: backupId }, data: { majorId: primaryId } });
      // Move Specializations
      await prisma.specialization.updateMany({ where: { majorId: backupId }, data: { majorId: primaryId } });
      // Move Tuition (if applicable)
      // Any other tables with majorId?
      
      // Delete backup major
      await prisma.major.delete({ where: { id: backupId } });
      console.log(`  Success: Deleted ${backupId}`);
    } catch (e) {
      console.warn(`  Warning: Could not fully merge ${backupId}. It may have duplicate unique constraints or already be empty.`, e.message);
      // If delete fails, try deleting the major only if child records are gone
      try {
        await prisma.major.delete({ where: { id: backupId } });
        console.log(`  Cleaned up ${backupId} (it was empty or relations were moved)`);
      } catch (inner) {
        console.error(`  Error: Permanent failure for ${backupId}:`, inner.message);
      }
    }
  }
}

async function main() {
  for (const primaryId in MERGE_MAP) {
    await mergeMajor(primaryId, MERGE_MAP[primaryId]);
  }
  console.log('--- Merge Complete ---');
}

main().finally(() => prisma.$disconnect());
