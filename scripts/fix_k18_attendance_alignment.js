const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_STUDENT_CODE = 'SV18A1CNTT01';
const MIRROR_STUDENT_CODE = 'SVK18CNTT10101';
const ADMIN_CLASS_CODE = 'K18-CNTT1-01';
const HK4_CODE = '2026_HK4';
const WRONG_HK6_CODE = '2026_HK6';
const HK4_SUBJECT_CODES = ['DC_KTCT', 'DC_LOGIC', 'DC_LS_DANG', 'KTLT', 'MOBILE_DEV'];

function hasProtectedGrade(grade) {
  if (!grade) return false;
  const status = `${grade.status || ''}`.trim().toUpperCase();
  return (
    grade.isLocked === true ||
    status === 'APPROVED' ||
    status === 'PUBLISHED' ||
    grade.totalScore10 !== null ||
    grade.totalScore4 !== null ||
    grade.letterGrade !== null ||
    grade.examScore1 !== null ||
    grade.examScore2 !== null ||
    grade.finalScore1 !== null ||
    grade.finalScore2 !== null ||
    grade.attendanceScore !== null ||
    grade.tbThuongKy !== null
  );
}

async function removeEnrollment(enrollment) {
  const grades = await prisma.grade.findMany({
    where: {
      studentId: enrollment.studentId,
      courseClassId: enrollment.courseClassId,
    },
  });
  const protectedGrades = grades.filter(hasProtectedGrade);
  if (protectedGrades.length > 0) {
    throw new Error(
      `Refusing to remove enrollment ${enrollment.id}: protected grade exists.`,
    );
  }

  const gradeIds = grades.map((grade) => grade.id);
  if (gradeIds.length > 0) {
    await prisma.examStudentAssignment.deleteMany({
      where: { gradeId: { in: gradeIds } },
    });
    await prisma.grade.deleteMany({ where: { id: { in: gradeIds } } });
  }

  await prisma.attendance.deleteMany({
    where: { enrollmentId: enrollment.id },
  });
  await prisma.enrollment.delete({ where: { id: enrollment.id } });

  const currentSlots = await prisma.enrollment.count({
    where: { courseClassId: enrollment.courseClassId },
  });
  await prisma.courseClass.update({
    where: { id: enrollment.courseClassId },
    data: { currentSlots },
  });

  return {
    enrollmentId: enrollment.id,
    courseClassCode: enrollment.courseClass.code,
    removedGrades: gradeIds.length,
    currentSlots,
  };
}

async function deleteCourseClass(courseClass) {
  const grades = await prisma.grade.findMany({
    where: { courseClassId: courseClass.id },
  });
  const protectedGrades = grades.filter(hasProtectedGrade);
  if (protectedGrades.length > 0) {
    return {
      code: courseClass.code,
      skipped: true,
      reason: `${protectedGrades.length} protected grades found`,
    };
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { courseClassId: courseClass.id },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((enrollment) => enrollment.id);
  const gradeIds = grades.map((grade) => grade.id);

  await prisma.semesterPlanItem.updateMany({
    where: { generatedCourseClassId: courseClass.id },
    data: { generatedCourseClassId: null, status: 'READY' },
  });

  if (gradeIds.length > 0) {
    await prisma.examStudentAssignment.deleteMany({
      where: { gradeId: { in: gradeIds } },
    });
    await prisma.grade.deleteMany({ where: { id: { in: gradeIds } } });
  }

  if (enrollmentIds.length > 0) {
    await prisma.attendance.deleteMany({
      where: { enrollmentId: { in: enrollmentIds } },
    });
    await prisma.enrollment.deleteMany({
      where: { id: { in: enrollmentIds } },
    });
  }

  await prisma.classSession.deleteMany({
    where: { courseClassId: courseClass.id },
  });
  await prisma.courseClass.delete({ where: { id: courseClass.id } });

  return {
    code: courseClass.code,
    deletedEnrollments: enrollmentIds.length,
    deletedGrades: gradeIds.length,
  };
}

async function main() {
  const [legacyStudent, mirrorStudent, hk4, wrongHk6, adminClass] = await Promise.all([
    prisma.student.findFirst({ where: { studentCode: TARGET_STUDENT_CODE } }),
    prisma.student.findFirst({ where: { studentCode: MIRROR_STUDENT_CODE } }),
    prisma.semester.findUnique({ where: { code: HK4_CODE } }),
    prisma.semester.findUnique({ where: { code: WRONG_HK6_CODE } }),
    prisma.adminClass.findUnique({ where: { code: ADMIN_CLASS_CODE } }),
  ]);

  if (!legacyStudent || !mirrorStudent || !hk4 || !wrongHk6 || !adminClass) {
    throw new Error('Missing K18 student, semester, or admin class data.');
  }

  const duplicateLegacyEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: legacyStudent.id,
      courseClass: {
        semesterId: hk4.id,
        subject: { code: { in: HK4_SUBJECT_CODES } },
        enrollments: {
          some: { studentId: mirrorStudent.id },
        },
      },
    },
    include: {
      courseClass: { include: { subject: true } },
    },
    orderBy: { courseClass: { code: 'asc' } },
  });

  const removedDuplicateLegacyEnrollments = [];
  for (const enrollment of duplicateLegacyEnrollments) {
    removedDuplicateLegacyEnrollments.push(await removeEnrollment(enrollment));
  }

  const wrongHk6Classes = await prisma.courseClass.findMany({
    where: {
      semesterId: wrongHk6.id,
      subject: { code: { in: HK4_SUBJECT_CODES } },
      adminClasses: {
        some: {
          cohort: 'K18',
          major: { code: 'CNTT' },
        },
      },
    },
    include: { subject: true, adminClasses: true },
    orderBy: { code: 'asc' },
  });

  const deletedWrongHk6Classes = [];
  for (const courseClass of wrongHk6Classes) {
    deletedWrongHk6Classes.push(await deleteCourseClass(courseClass));
  }

  console.log(
    JSON.stringify(
      {
        target: TARGET_STUDENT_CODE,
        mirror: MIRROR_STUDENT_CODE,
        removedDuplicateLegacyEnrollments,
        deletedWrongHk6Classes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
