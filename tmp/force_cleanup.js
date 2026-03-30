
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const studentCode = '22101100025';
  console.log(`--- FORCE CLEANUP FOR STUDENT: ${studentCode} ---`);
  
  const student = await prisma.student.findUnique({
    where: { studentCode },
    include: {
      enrollments: {
        include: {
          courseClass: {
            include: { subject: true, semester: true }
          }
        }
      }
    }
  });

  if (!student) {
    console.log('Student not found');
    return;
  }

  // 1. Group by Subject Code and Semester Name (human-readable keys)
  const groups = {};
  student.enrollments.forEach(e => {
    const key = `${e.courseClass.subject.code}_${e.courseClass.semester.name}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  for (const [key, list] of Object.entries(groups)) {
    if (list.length > 1) {
      console.log(`\nDuplicate Group: ${key} (Count: ${list.length})`);
      
      // Find the best record (preferring PAID)
      const rep = list.find(e => e.status === 'PAID') || list[0];
      const others = list.filter(e => e.id !== rep.id);
      
      // Update representative if needed
      if (list.some(e => e.status === 'PAID') && rep.status !== 'PAID') {
        console.log(`- Updating representative ${rep.id} to PAID because a duplicate was PAID.`);
        await prisma.enrollment.update({ where: { id: rep.id }, data: { status: 'PAID' } });
      }

      for (const other of others) {
        console.log(`- Removing redundant enrollment: ${other.id} (${other.status})`);
        // Migrate relations first if any (Grades, Attendance)
        await prisma.grade.updateMany({ where: { enrollmentId: other.id }, data: { enrollmentId: rep.id } }).catch(() => {});
        await prisma.attendance.updateMany({ where: { enrollmentId: other.id }, data: { enrollmentId: rep.id } }).catch(() => {});
        
        // Delete
        await prisma.enrollment.delete({ where: { id: other.id } });
      }
    }
  }
  
  console.log('\n--- CLEANUP FINISHED ---');
}

main().finally(() => prisma.$disconnect());
