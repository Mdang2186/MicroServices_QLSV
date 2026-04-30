const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_STUDENT_CODE = '221191002';
const TARGET_EMAIL = '221191002@sv.uneti.edu.vn';
const MIRROR_ADMIN_CLASS_CODE = 'K19-CNTT1-01';
const MIRROR_STUDENT_CODE = 'SVK19CNTT10102';
const SEMESTER_CODE = '2026_HK2';
const COHORT = 'K19';
const EXPECTED_HK2_SUBJECT_CODES = [
  'DC_TRIET',
  'DSA',
  'DT_KTS',
  'DT_LK',
  'INTERN_1',
  'QT_DA',
];
const REMOVE_HK2_SUBJECT_CODES = ['DT_GRAD', 'QT_GRAD'];

function sanitizeCodeSegment(value) {
  return `${value || ''}`
    .trim()
    .replace(/[^A-Za-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function classCode(semesterCode, subjectCode, adminClassCode) {
  return [
    'CCLASS',
    sanitizeCodeSegment(semesterCode),
    sanitizeCodeSegment(subjectCode),
    sanitizeCodeSegment(adminClassCode),
  ].join('_');
}

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

async function pickLecturer(subject, semesterId, majorId) {
  const where = subject.departmentId
    ? { departmentId: subject.departmentId }
    : { faculty: { majors: { some: { id: majorId } } } };

  const lecturers = await prisma.lecturer.findMany({
    where,
    select: {
      id: true,
      _count: { select: { classes: { where: { semesterId } } } },
    },
    orderBy: { fullName: 'asc' },
  });

  if (!lecturers.length) return null;
  return lecturers.sort((left, right) => left._count.classes - right._count.classes)[0].id;
}

async function deleteCourseClass(courseClass) {
  const grades = await prisma.grade.findMany({
    where: { courseClassId: courseClass.id },
    select: {
      id: true,
      isLocked: true,
      status: true,
      totalScore10: true,
      totalScore4: true,
      letterGrade: true,
      examScore1: true,
      examScore2: true,
      finalScore1: true,
      finalScore2: true,
      attendanceScore: true,
      tbThuongKy: true,
    },
  });

  const protectedGrades = grades.filter(hasProtectedGrade);
  if (protectedGrades.length > 0) {
    throw new Error(
      `Refusing to delete ${courseClass.code}: ${protectedGrades.length} protected grades found.`,
    );
  }

  const gradeIds = grades.map((grade) => grade.id);
  const enrollmentIds = (
    await prisma.enrollment.findMany({
      where: { courseClassId: courseClass.id },
      select: { id: true },
    })
  ).map((enrollment) => enrollment.id);

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
    deletedGrades: gradeIds.length,
    deletedEnrollments: enrollmentIds.length,
  };
}

async function ensureClassForSubject({ subject, templateItem, semester, adminClass, plan }) {
  const students = await prisma.student.findMany({
    where: { adminClassId: adminClass.id, status: 'STUDYING' },
    select: { id: true },
    orderBy: { studentCode: 'asc' },
  });
  const code = classCode(semester.code, subject.code, adminClass.code);
  const lecturerId = await pickLecturer(subject, semester.id, adminClass.majorId);
  const theoryPeriods =
    Number(templateItem?.theoryPeriods ?? subject.theoryPeriods ?? subject.theoryHours ?? 0) || 0;
  const practicePeriods =
    Number(templateItem?.practicePeriods ?? subject.practicePeriods ?? subject.practiceHours ?? 0) || 0;
  const totalPeriods = theoryPeriods + practicePeriods || Number(subject.credits || 0) * 15 || 45;
  const periodsPerSession = Number(templateItem?.periodsPerSession || 3);

  let courseClass = await prisma.courseClass.findUnique({
    where: { code },
    include: { adminClasses: true },
  });

  if (!courseClass) {
    courseClass = await prisma.courseClass.create({
      data: {
        code,
        name: `${subject.name} - ${adminClass.code}`,
        subjectId: subject.id,
        semesterId: semester.id,
        lecturerId,
        cohort: COHORT,
        maxSlots: Math.max(students.length + 5, 25),
        totalPeriods,
        sessionsPerWeek: 1,
        periodsPerSession,
        status: 'OPEN',
        adminClasses: { connect: [{ id: adminClass.id }] },
      },
      include: { adminClasses: true },
    });
  } else {
    courseClass = await prisma.courseClass.update({
      where: { id: courseClass.id },
      data: {
        name: `${subject.name} - ${adminClass.code}`,
        subjectId: subject.id,
        semesterId: semester.id,
        lecturerId: courseClass.lecturerId || lecturerId,
        cohort: COHORT,
        maxSlots: Math.max(students.length + 5, courseClass.maxSlots || 0, 25),
        totalPeriods,
        sessionsPerWeek: courseClass.sessionsPerWeek || 1,
        periodsPerSession,
        status: courseClass.status || 'OPEN',
        adminClasses: { set: [{ id: adminClass.id }] },
      },
      include: { adminClasses: true },
    });
  }

  const studentIds = students.map((student) => student.id);
  const existingEnrollments = await prisma.enrollment.findMany({
    where: { courseClassId: courseClass.id, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingEnrollmentIds = new Set(existingEnrollments.map((item) => item.studentId));
  const missingEnrollmentStudentIds = studentIds.filter(
    (studentId) => !existingEnrollmentIds.has(studentId),
  );

  if (missingEnrollmentStudentIds.length > 0) {
    await prisma.enrollment.createMany({
      data: missingEnrollmentStudentIds.map((studentId) => ({
        studentId,
        courseClassId: courseClass.id,
        status: 'REGISTERED',
      })),
    });
  }

  const existingGrades = await prisma.grade.findMany({
    where: { courseClassId: courseClass.id, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingGradeStudentIds = new Set(existingGrades.map((item) => item.studentId));
  const missingGradeStudentIds = studentIds.filter(
    (studentId) => !existingGradeStudentIds.has(studentId),
  );

  if (missingGradeStudentIds.length > 0) {
    await prisma.grade.createMany({
      data: missingGradeStudentIds.map((studentId) => ({
        studentId,
        courseClassId: courseClass.id,
        subjectId: subject.id,
        isEligibleForExam: true,
        isAbsentFromExam: false,
        isPassed: false,
        isLocked: false,
        status: 'DRAFT',
      })),
    });
  }

  const currentSlots = await prisma.enrollment.count({
    where: { courseClassId: courseClass.id },
  });
  await prisma.courseClass.update({
    where: { id: courseClass.id },
    data: { currentSlots },
  });

  await prisma.semesterPlanItem.upsert({
    where: {
      semesterPlanId_subjectId_adminClassId: {
        semesterPlanId: plan.id,
        subjectId: subject.id,
        adminClassId: adminClass.id,
      },
    },
    create: {
      semesterPlanId: plan.id,
      subjectId: subject.id,
      adminClassId: adminClass.id,
      lecturerId,
      expectedStudentCount: students.length,
      generatedCourseClassId: courseClass.id,
      theoryPeriods,
      practicePeriods,
      theorySessionsPerWeek: Number(
        templateItem?.theorySessionsPerWeek || subject.theorySessionsPerWeek || 1,
      ),
      practiceSessionsPerWeek: Number(
        templateItem?.practiceSessionsPerWeek || subject.practiceSessionsPerWeek || 0,
      ),
      periodsPerSession,
      status: 'EXECUTED',
    },
    update: {
      lecturerId,
      expectedStudentCount: students.length,
      generatedCourseClassId: courseClass.id,
      theoryPeriods,
      practicePeriods,
      theorySessionsPerWeek: Number(
        templateItem?.theorySessionsPerWeek || subject.theorySessionsPerWeek || 1,
      ),
      practiceSessionsPerWeek: Number(
        templateItem?.practiceSessionsPerWeek || subject.practiceSessionsPerWeek || 0,
      ),
      periodsPerSession,
      status: 'EXECUTED',
    },
  });

  return {
    code,
    students: students.length,
    addedEnrollments: missingEnrollmentStudentIds.length,
    addedGrades: missingGradeStudentIds.length,
    currentSlots,
  };
}

async function main() {
  const target = await prisma.student.findFirst({
    where: { studentCode: TARGET_STUDENT_CODE },
    include: { adminClass: true, user: true },
  });
  const mirror = await prisma.student.findFirst({
    where: {
      studentCode: MIRROR_STUDENT_CODE,
      adminClass: { code: MIRROR_ADMIN_CLASS_CODE },
    },
    include: { adminClass: true, user: true },
  });
  const semester = await prisma.semester.findUnique({
    where: { code: SEMESTER_CODE },
  });
  const publishedTemplate = target
    ? await prisma.trainingPlanTemplate.findFirst({
        where: {
          majorId: target.majorId,
          cohort: COHORT,
          status: { in: ['PUBLISHED', 'ACTIVE'] },
        },
        include: { items: { include: { subject: true } } },
        orderBy: { version: 'desc' },
      })
    : null;

  if (!target || !mirror || !semester || !publishedTemplate) {
    throw new Error('Missing target student, mirror student, semester, or published template.');
  }

  await prisma.student.update({
    where: { id: mirror.id },
    data: {
      fullName: target.fullName,
      emailPersonal: target.emailPersonal || TARGET_EMAIL,
      dob: target.dob,
      gender: target.gender,
      phone: target.phone,
      address: target.address,
      citizenId: target.citizenId,
      admissionDate: target.admissionDate,
      campus: target.campus,
      educationLevel: target.educationLevel,
      educationType: target.educationType,
      intake: target.intake || COHORT,
      majorId: target.majorId,
      status: target.status,
    },
  });

  const plan = await prisma.semesterPlan.findFirst({
    where: {
      semesterId: semester.id,
      majorId: target.majorId,
      cohort: COHORT,
      conceptualSemester: 2,
    },
    include: { items: { include: { adminClass: true, subject: true } } },
  });
  if (!plan) {
    throw new Error(`Missing semester plan for ${COHORT} ${SEMESTER_CODE}.`);
  }

  const templateItemsByCode = new Map(
    publishedTemplate.items
      .filter((item) => Number(item.conceptualSemester) === 2)
      .map((item) => [item.subject.code, item]),
  );
  const missingTemplateSubjects = EXPECTED_HK2_SUBJECT_CODES.filter(
    (code) => !templateItemsByCode.has(code),
  );
  if (missingTemplateSubjects.length > 0) {
    throw new Error(`Missing HK2 template subjects: ${missingTemplateSubjects.join(', ')}`);
  }

  const adminClassIds = [
    ...new Set(
      plan.items
        .map((item) => item.adminClassId)
        .filter(Boolean),
    ),
  ];
  const adminClasses = await prisma.adminClass.findMany({
    where: { id: { in: adminClassIds } },
    orderBy: { code: 'asc' },
  });

  const wrongClasses = await prisma.courseClass.findMany({
    where: {
      semesterId: semester.id,
      subject: { code: { in: REMOVE_HK2_SUBJECT_CODES } },
      adminClasses: { some: { id: { in: adminClassIds } } },
    },
    include: { subject: true },
    orderBy: { code: 'asc' },
  });
  const wrongClassIds = wrongClasses.map((courseClass) => courseClass.id);

  const protectedWrongGrades = await prisma.grade.findMany({
    where: { courseClassId: { in: wrongClassIds } },
    select: {
      id: true,
      courseClass: { select: { code: true } },
      isLocked: true,
      status: true,
      totalScore10: true,
      totalScore4: true,
      letterGrade: true,
      examScore1: true,
      examScore2: true,
      finalScore1: true,
      finalScore2: true,
      attendanceScore: true,
      tbThuongKy: true,
    },
  });
  const protectedCount = protectedWrongGrades.filter(hasProtectedGrade).length;
  if (protectedCount > 0) {
    throw new Error(`Refusing to remove wrong HK2 classes: ${protectedCount} protected grades found.`);
  }

  await prisma.semesterPlan.update({
    where: { id: plan.id },
    data: {
      templateId: publishedTemplate.id,
      templateVersion: publishedTemplate.version,
    },
  });

  await prisma.semesterPlanItem.deleteMany({
    where: {
      semesterPlanId: plan.id,
      subjectId: {
        in: plan.items
          .filter((item) => REMOVE_HK2_SUBJECT_CODES.includes(item.subject.code))
          .map((item) => item.subjectId),
      },
    },
  });

  const deletedWrongClasses = [];
  for (const courseClass of wrongClasses) {
    deletedWrongClasses.push(await deleteCourseClass(courseClass));
  }

  const ensuredClasses = [];
  for (const adminClass of adminClasses) {
    for (const code of EXPECTED_HK2_SUBJECT_CODES) {
      if (code !== 'INTERN_1') continue;
      const templateItem = templateItemsByCode.get(code);
      ensuredClasses.push(
        await ensureClassForSubject({
          subject: templateItem.subject,
          templateItem,
          semester,
          adminClass,
          plan,
        }),
      );
    }
  }

  const refreshedItemCount = await prisma.semesterPlanItem.count({
    where: { semesterPlanId: plan.id },
  });
  await prisma.semesterPlan.update({
    where: { id: plan.id },
    data: { status: 'EXECUTED' },
  });
  await prisma.student.updateMany({
    where: { id: { in: [target.id, mirror.id] } },
    data: {
      gpa: 0,
      cpa: 0,
      totalEarnedCredits: 0,
      warningLevel: 0,
      academicStatus: 'NORMAL',
    },
  });

  console.log(
    JSON.stringify(
      {
        target: {
          id: target.id,
          studentCode: target.studentCode,
          email: target.emailPersonal || target.user?.email,
        },
        mirror: {
          id: mirror.id,
          studentCode: mirror.studentCode,
          adminClass: mirror.adminClass?.code,
          syncedName: target.fullName,
        },
        semesterPlan: {
          id: plan.id,
          templateVersion: publishedTemplate.version,
          itemCount: refreshedItemCount,
        },
        removedWrongClasses: deletedWrongClasses,
        ensuredInternClasses: ensuredClasses,
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
