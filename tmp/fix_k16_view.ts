import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixK16View() {
  console.log('--- Fixing K16 View ---');

  const targetSemester = await prisma.semester.findFirst({
    where: { name: { contains: 'HK1 - Năm 1 (2022-2023)' } }
  });

  if (!targetSemester) {
    console.error('Target semester not found');
    return;
  }

  // 1. Move K16 classes to this semester
  console.log(`Moving K16 classes to ${targetSemester.name}...`);
  await prisma.courseClass.updateMany({
    where: { cohort: 'K16' },
    data: { semesterId: targetSemester.id }
  });

  // 2. Assign any available lecturer to them
  const k16Classes = await prisma.courseClass.findMany({
    where: { cohort: 'K16' },
    include: { subject: true }
  });

  for (const cc of k16Classes) {
    const lecturer = await prisma.lecturer.findFirst({
      where: { departmentId: cc.subject.departmentId }
    }) || await prisma.lecturer.findFirst();

    if (lecturer) {
        console.log(`Assigning ${lecturer.fullName} to ${cc.code}`);
        await prisma.courseClass.update({
            where: { id: cc.id },
            data: { lecturerId: lecturer.id }
        });
    }

    // 3. Re-generate sessions if needed
    // Delete existing sessions first for clean view
    await prisma.classSession.deleteMany({
        where: { courseClassId: cc.id }
    });

    const rooms = await prisma.room.findMany({ take: 10 });
    const room = rooms[k16Classes.indexOf(cc) % rooms.length];
    
    if (!room) {
        console.error('No rooms found in database');
        return;
    }

    console.log(`Generating sessions for ${cc.code} in room ${room.name}...`);
    for (let i = 0; i < 15; i++) {
        const date = new Date(targetSemester.startDate || '2022-09-05');
        date.setDate(date.getDate() + (i * 7) + 2 + k16Classes.indexOf(cc)); // Different days for different classes
        
        await prisma.classSession.create({
            data: {
                courseClassId: cc.id,
                semesterId: targetSemester.id,
                roomId: room.id,
                date,
                startShift: 4,
                endShift: 6,
                type: 'THEORY'
            }
        });
    }
  }

  console.log('--- View Fixed ---');
}

fixK16View()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
