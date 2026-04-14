import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function populateLecturers() {
  console.log('--- Populating Lecturer Pool ---');
  
  const deptMappings = [
    { deptId: 'D01', facultyId: 'FAC_CNTT', prefix: 'CNTT', name: 'Công nghệ phần mềm' },
    { deptId: 'D02', facultyId: 'FAC_KT', prefix: 'KT', name: 'Kế toán' },
    { deptId: 'D03', facultyId: 'FAC_KT', prefix: 'QTKD', name: 'Quản trị kinh doanh' },
    { deptId: 'DEPT_AUTO_FCNTT', facultyId: 'FAC_CNTT', prefix: 'CNTT_GEN', name: 'Bộ môn Tổng hợp CNTT' },
    { deptId: 'DEPT_NNA', facultyId: 'FAC_NN', prefix: 'NNA', name: 'Ngôn ngữ Anh' },
  ];

  // More departments seen in sqlcmd
  // D01, D02, D03, DEPT_QTKD, DEPT_NNA, DEPT_AUTO_FCNTT
  
  let lecturerCount = 0;

  for (const dept of deptMappings) {
    console.log(`Processing Department: ${dept.name}`);
    for (let i = 1; i <= 3; i++) {
        const lectureCode = `GV${dept.prefix}${i.toString().padStart(2, '0')}`;
        const username = lectureCode.toLowerCase();
        const fullName = `Giảng Viên ${dept.prefix} - ${i}`;
        const email = `${username}@uneti.edu.vn`;

        console.log(`  Creating Lecturer: ${lectureCode}`);

        // Create User
        const user = await prisma.user.upsert({
            where: { username },
            update: {},
            create: {
                id: `USR_GV_${dept.prefix}_${i}`,
                username,
                email,
                passwordHash: 'password123',
                role: 'LECTURER',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            }
        });

        // Create Lecturer
        await prisma.lecturer.upsert({
            where: { lectureCode },
            update: {},
            create: {
                id: `GV_${dept.prefix}_${i}`,
                userId: user.id,
                facultyId: dept.facultyId,
                departmentId: dept.deptId,
                lectureCode,
                fullName,
                degree: 'Master',
            }
        });
        lecturerCount++;
    }
  }
  
  console.log(`--- Population Finished: ${lecturerCount} lecturers created ---`);
}

populateLecturers()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
