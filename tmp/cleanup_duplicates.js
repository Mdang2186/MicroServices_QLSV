
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING ENROLLMENT CLEANUP ---');
  
  // 1. Find all students with duplicate enrollments
  const students = await prisma.student.findMany({
    select: { id: true, fullName: true, studentCode: true }
  });

  for (const student of students) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: { courseClass: true }
    });

    const groups = {};
    enrollments.forEach(e => {
      const key = `${e.courseClass.subjectId}_${e.courseClass.semesterId}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    for (const [key, list] of Object.entries(groups)) {
      if (list.length > 1) {
        console.log(`\nProcessing duplicates for Student: ${student.fullName} (${student.studentCode}), Subject/Sem: ${key}`);
        
        // Find best record: priority PAID, then the one with most relations (if we could check)
        // Simplification: pick the first PAID or just the first one.
        let rep = list.find(e => e.status === 'PAID') || list[0];
        const others = list.filter(e => e.id !== rep.id);
        
        // If any of the others was PAID, make the representative PAID
        if (list.some(e => e.status === 'PAID') && rep.status !== 'PAID') {
          console.log(`- Updating representative ${rep.id} to PAID because a duplicate was PAID.`);
          await prisma.enrollment.update({
            where: { id: rep.id },
            data: { status: 'PAID' }
          });
          rep.status = 'PAID';
        }

        for (const other of others) {
          console.log(`- Merging and Deleting duplicate: ${other.id}`);
          
          // Migrate Grades
          const grades = await prisma.grade.findMany({ where: { enrollmentId: other.id } });
          for (const g of grades) {
            console.log(`  * Migrating Grade ${g.id} to representative`);
            // Check if representative already has a grade (due to unique constraint)
            const repGrade = await prisma.grade.findUnique({ where: { enrollmentId: rep.id } });
            if (!repGrade) {
              await prisma.grade.update({ where: { id: g.id }, data: { enrollmentId: rep.id } });
            } else {
              console.log(`  ! Representative already has a grade. Deleting redundant grade ${g.id}`);
              await prisma.grade.delete({ where: { id: g.id } });
            }
          }

          // Migrate Attendance
          await prisma.attendance.updateMany({
            where: { enrollmentId: other.id },
            data: { enrollmentId: rep.id }
          });

          // Delete duplicate
          await prisma.enrollment.delete({ where: { id: other.id } });
        }
      }
    }
  }
  
  console.log('\n--- CLEANUP FINISHED ---');
}

main()
  .catch(e => {
    console.error('Cleanup failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
