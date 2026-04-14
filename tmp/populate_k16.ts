import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateK16() {
  console.log('--- Populating K16 Data ---');
  
  const majors = [
    { id: 'MAJ_NNA', code: 'NNA', name: 'Ngôn ngữ Anh' },
    { id: 'MAJ_KTPM', code: 'KTPM', name: 'Kỹ thuật phần mềm' },
    { id: 'MAJ_KHMT', code: 'KHMT', name: 'Khoa học máy tính' },
    { id: 'MAJ_KETOAN', code: 'KETOAN', name: 'Kế toán' },
  ];

  for (const major of majors) {
    console.log(`Processing major: ${major.name}`);
    
    // 1. Create 2 AdminClasses for each major in K16
    for (let i = 1; i <= 2; i++) {
        const classCode = `16A${major.code}${i.toString().padStart(2, '0')}`;
        const className = `Lớp ${major.name} Khóa 16 - ${i}`;
        
        console.log(`  Creating AdminClass: ${classCode}`);
        const adminClass = await prisma.adminClass.upsert({
            where: { code: classCode },
            update: {},
            create: {
                id: `CLASS_16A${major.code}_${i}`,
                code: classCode,
                name: className,
                cohort: 'K16',
                majorId: major.id,
                isActive: true,
            }
        });

        // 2. Create 5 sample students for each class
        for (let j = 1; j <= 5; j++) {
            const studentCode = `16${major.code}${i}${j.toString().padStart(2, '0')}`;
            const username = studentCode;
            const fullName = `Sinh Viên K16 ${major.code} ${i}-${j}`;
            
            console.log(`    Creating Student: ${studentCode}`);
            
            // Create User first
            const user = await prisma.user.upsert({
                where: { username },
                update: {},
                create: {
                    id: `USR_K16_${major.code}_${i}_${j}`,
                    username,
                    password: 'password123', // Standard hash or plain for seed
                    fullName,
                    role: 'STUDENT',
                }
            });

            // Create Student
            await prisma.student.upsert({
                where: { studentCode },
                update: { adminClassId: adminClass.id },
                create: {
                    id: `ST_K16_${major.code}_${i}_${j}`,
                    studentCode,
                    fullName,
                    userId: user.id,
                    majorId: major.id,
                    adminClassId: adminClass.id,
                    status: 'STUDYING',
                }
            });
        }
    }
  }
  
  console.log('--- Population Finished ---');
}

populateK16()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
