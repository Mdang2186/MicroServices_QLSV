import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const REAL_NAMES = [
  "Nguyễn Hoàng Hải", "Trần Thị Thu Thủy", "Lê Anh Đức", "Phạm Minh Tuấn", 
  "Dương Thu Hương", "Vũ Quang Huy", "Hoàng Kim Liên", "Đặng Quốc Anh", 
  "Bùi Thị Ngọc Anh", "Phan Thanh Tùng", "Đỗ Hồng Quan", "Lý Thu Thảo", 
  "Ngô Gia Bảo", "Trương Mỹ Linh", "Võ Văn Thưởng", "Nguyễn Bích Ngọc"
];

async function upgradeDataExcellence() {
  console.log('--- Phase 2: Data Excellence Upgrade ---');

  // 1. Update Lecturers
  console.log('1. Updating Lecturers with Real Names...');
  const currentLecturers = await prisma.lecturer.findMany({
      include: { user: true }
  });

  for (let i = 0; i < currentLecturers.length; i++) {
    const lect = currentLecturers[i];
    const realName = REAL_NAMES[i % REAL_NAMES.length];
    
    console.log(`   Updating: ${lect.fullName} -> ${realName}`);
    
    await prisma.lecturer.update({
        where: { id: lect.id },
        data: { fullName: realName }
    });
  }

  // 2. Standardize Course Codes with DASHES
  console.log('2. Standardizing Course Codes (Dash Format)...');
  const courseClasses = await prisma.courseClass.findMany({
      include: { subject: true, semester: true }
  });

  for (const cc of courseClasses) {
    const major = cc.subject.majorId || 'GEN';
    const year = cc.semester.year || 2026;
    const semIndex = (cc.semester.name.match(/HK\d/)?.[0] || 'HK1').toUpperCase();
    const cohort = cc.cohort || 'K15';
    
    // Clean major and cohort
    const mPrefix = major.replace('MAJ_', '').substring(0, 5);
    
    // Final structure: [MAJOR]-[COHORT]-[SEM]-[ID_SUFFIX]
    // Use last 2 digits of original code if possible, or increment
    const suffix = cc.code.match(/\d+$/)?.[0].padStart(2, '0') || '01';
    const newCode = `${mPrefix}-${cohort}-${semIndex}-${suffix}`.toUpperCase();

    try {
        if (cc.code !== newCode) {
            console.log(`   Renaming: ${cc.code} -> ${newCode}`);
            await prisma.courseClass.update({
                where: { id: cc.id },
                data: { code: newCode }
            });
        }
    } catch (err) {
        // If conflict (e.g. same suffix), use index based on subject name char
        const charIdx = cc.subject.name.charCodeAt(0) % 100;
        const altSuffix = charIdx.toString().padStart(2, '0');
        const altCode = `${mPrefix}-${cohort}-${semIndex}-${altSuffix}-${suffix}`;
        await prisma.courseClass.update({
            where: { id: cc.id },
            data: { code: altCode.toUpperCase() }
        });
    }
  }

  console.log('--- Phase 2 Finished ---');
}

upgradeDataExcellence()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
