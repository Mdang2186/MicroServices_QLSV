const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanup() {
  const codes = ['CNTT_K18', 'M_CNTT'];
  console.log(`Searching for majors with codes: ${codes.join(', ')}`);

  // Find majors by code first
  let targetMajors = await prisma.major.findMany({
    where: {
      code: { in: codes }
    }
  });

  // If not found by code, try by name "Công nghệ thông tin" but exclude the main "CNTT" code
  if (targetMajors.length < codes.length) {
    console.log('Some majors not found by exact code. Searching by name...');
    const byName = await prisma.major.findMany({
      where: {
        name: { contains: 'Công nghệ thông tin' },
        NOT: { code: 'CNTT' }
      }
    });
    
    // Merge and deduplicate
    const existingIds = targetMajors.map(m => m.id);
    byName.forEach(m => {
        if (!existingIds.includes(m.id)) {
            targetMajors.push(m);
        }
    });
  }

  console.log(`Found ${targetMajors.length} target majors to delete.`);
  targetMajors.forEach(m => console.log(`- ID: ${m.id}, Code: ${m.code}, Name: ${m.name}`));

  if (targetMajors.length === 0) {
    console.log('No majors found to delete. Exiting.');
    return;
  }

  const majorIds = targetMajors.map(m => m.id);

  console.log('Starting deep cleanup...');

  // 1. Delete Grades
  const grades = await prisma.grade.deleteMany({
    where: { OR: [ { student: { majorId: { in: majorIds } } }, { subject: { majorId: { in: majorIds } } } ] }
  });
  console.log(`Deleted ${grades.count} grades.`);

  // 2. Delete Attendances
  const attendances = await prisma.attendance.deleteMany({
    where: { enrollment: { student: { majorId: { in: majorIds } } } }
  });
  console.log(`Deleted ${attendances.count} attendances.`);

  // 3. Delete Enrollments
  const enrollments = await prisma.enrollment.deleteMany({
    where: { student: { majorId: { in: majorIds } } }
  });
  console.log(`Deleted ${enrollments.count} enrollments.`);

  // 4. Delete ClassSessions (linked to CourseClasses)
  const sessions = await prisma.classSession.deleteMany({
    where: { courseClass: { subject: { majorId: { in: majorIds } } } }
  });
  console.log(`Deleted ${sessions.count} class sessions.`);

  // 5. Delete TeachingPlan (linked to CourseClasses)
  const plans = await prisma.teachingPlan.deleteMany({
      where: { CourseClass: { subject: { majorId: { in: majorIds } } } }
  });
  console.log(`Deleted ${plans.count} teaching plans.`);

  // 6. Delete CourseClass
  const classes = await prisma.courseClass.deleteMany({
    where: { subject: { majorId: { in: majorIds } } }
  });
  console.log(`Deleted ${classes.count} course classes.`);

  // 7. Delete SubjectPrerequisite
  const prereqs = await prisma.subjectPrerequisite.deleteMany({
      where: { OR: [ { subjectId: { in: (await prisma.subject.findMany({ where: { majorId: { in: majorIds } }, select: { id: true } })).map(s => s.id) } } ] }
  });
  console.log(`Deleted ${prereqs.count} subject prerequisites.`);

  // 8. Delete Curriculum
  const curriculums = await prisma.curriculum.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${curriculums.count} curriculum entries.`);

  // 9. Delete Subjects
  const subjects = await prisma.subject.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${subjects.count} subjects.`);

  // 10. Delete FamilyMembers of students
  const familyMembers = await prisma.familyMember.deleteMany({
    where: { student: { majorId: { in: majorIds } } }
  });
  console.log(`Deleted ${familyMembers.count} family members.`);

  // 11. Delete Students
  const students = await prisma.student.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${students.count} students.`);

  // 12. Delete AdminClasses
  const adminClasses = await prisma.adminClass.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${adminClasses.count} admin classes.`);

  // 13. Delete Specializations
  const specializations = await prisma.specialization.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${specializations.count} specializations.`);

  // 14. Delete TuitionConfigs
  const configs = await prisma.tuitionConfig.deleteMany({
    where: { majorId: { in: majorIds } }
  });
  console.log(`Deleted ${configs.count} tuition configs.`);

  // 15. Delete Majors
  const deletedMajors = await prisma.major.deleteMany({
    where: { id: { in: majorIds } }
  });
  console.log(`Deleted ${deletedMajors.count} major records.`);

  console.log('Cleanup completed successfully.');
}

cleanup()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
