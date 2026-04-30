const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TARGET_STUDENT_CODE = 'SV18A1CNTT01';
const MIRROR_STUDENT_CODE = 'SVK18CNTT10101';
const HK1_CODE = '2024_HK1';
const HK4_CODE = '2026_HK4';
const HK1_SUBJECT_CODES = ['DTS', 'QT_NS'];

const gradeCopyFields = [
  'attendanceScore',
  'isEligibleForExam',
  'isAbsentFromExam',
  'totalScore10',
  'totalScore4',
  'letterGrade',
  'isPassed',
  'isLocked',
  'status',
  'coef1Scores',
  'coef2Scores',
  'examScore1',
  'examScore2',
  'finalScore1',
  'finalScore2',
  'notes',
  'practiceScores',
  'regularScores',
  'tbThuongKy',
  'examSbd',
  'examSessionId',
];

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

function toDateOnly(input) {
  const d = new Date(input);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(input, days) {
  const d = new Date(input);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateOnly(d);
}

function portalDayOfWeek(date) {
  const day = new Date(date).getUTCDay();
  return day === 0 ? 8 : day + 1;
}

function nextDateForPortalDay(startDate, dayOfWeek) {
  let d = toDateOnly(startDate);
  while (portalDayOfWeek(d) !== dayOfWeek) {
    d = addDays(d, 1);
  }
  return d;
}

function buildWeeklyDates(semester, dayOfWeek, count = 15) {
  const dates = [];
  let current = nextDateForPortalDay(semester.startDate, dayOfWeek);
  const end = toDateOnly(semester.endDate);
  while (dates.length < count && current <= end) {
    dates.push(current);
    current = addDays(current, 7);
  }
  return dates;
}

function hasScore(grade) {
  if (!grade) return false;
  return gradeCopyFields.some((field) => {
    if (['isEligibleForExam', 'isAbsentFromExam', 'isPassed', 'isLocked', 'status'].includes(field)) {
      return false;
    }
    return grade[field] !== null && grade[field] !== undefined;
  });
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

async function hasAdminClassConflict(adminClassId, semesterId, date, startShift, endShift, excludeCourseClassId) {
  const conflict = await prisma.classSession.findFirst({
    where: {
      semesterId,
      date,
      courseClassId: excludeCourseClassId ? { not: excludeCourseClassId } : undefined,
      courseClass: {
        adminClasses: { some: { id: adminClassId } },
      },
      OR: [
        { startShift: { lte: startShift }, endShift: { gte: startShift } },
        { startShift: { lte: endShift }, endShift: { gte: endShift } },
        { startShift: { gte: startShift }, endShift: { lte: endShift } },
      ],
    },
  });
  return Boolean(conflict);
}

async function hasLecturerConflict(lecturerId, semesterId, date, startShift, endShift, excludeCourseClassId) {
  if (!lecturerId) return false;
  const conflict = await prisma.classSession.findFirst({
    where: {
      semesterId,
      date,
      courseClassId: excludeCourseClassId ? { not: excludeCourseClassId } : undefined,
      courseClass: { lecturerId },
      OR: [
        { startShift: { lte: startShift }, endShift: { gte: startShift } },
        { startShift: { lte: endShift }, endShift: { gte: endShift } },
        { startShift: { gte: startShift }, endShift: { lte: endShift } },
      ],
    },
  });
  return Boolean(conflict);
}

async function findRoomForDates(dates, semesterId, startShift, endShift, requiredCapacity) {
  const rooms = await prisma.room.findMany({
    where: { type: 'THEORY', capacity: { gte: Math.max(requiredCapacity, 1) } },
    orderBy: [{ capacity: 'asc' }, { name: 'asc' }],
  });

  for (const room of rooms) {
    const conflict = await prisma.classSession.findFirst({
      where: {
        semesterId,
        roomId: room.id,
        date: { in: dates },
        OR: [
          { startShift: { lte: startShift }, endShift: { gte: startShift } },
          { startShift: { lte: endShift }, endShift: { gte: endShift } },
          { startShift: { gte: startShift }, endShift: { lte: endShift } },
        ],
      },
    });
    if (!conflict) return room;
  }

  return null;
}

async function createSessionsIfMissing(courseClass, semester, adminClassId, lecturerId, studentCount) {
  const existing = await prisma.classSession.count({
    where: { courseClassId: courseClass.id, type: { not: 'EXAM' } },
  });
  if (existing > 0) return { created: 0, reason: 'already-scheduled' };

  const days = [2, 3, 4, 5, 6, 7];
  const shifts = [1, 4, 7, 10, 13];

  for (const day of days) {
    for (const startShift of shifts) {
      const endShift = startShift + 2;
      if (endShift > 15) continue;
      const dates = buildWeeklyDates(semester, day, 15);
      if (dates.length < 12) continue;

      let conflicted = false;
      for (const date of dates) {
        if (
          (await hasAdminClassConflict(adminClassId, semester.id, date, startShift, endShift, courseClass.id)) ||
          (await hasLecturerConflict(lecturerId, semester.id, date, startShift, endShift, courseClass.id))
        ) {
          conflicted = true;
          break;
        }
      }
      if (conflicted) continue;

      const room = await findRoomForDates(dates, semester.id, startShift, endShift, studentCount);
      if (!room) continue;

      await prisma.classSession.createMany({
        data: dates.map((date, index) => ({
          courseClassId: courseClass.id,
          semesterId: semester.id,
          roomId: room.id,
          date,
          startShift,
          endShift,
          type: 'THEORY',
          note: `Bổ sung từ khung K18 - Buổi ${index + 1}/${dates.length}`,
        })),
      });

      return { created: dates.length, room: room.name, startShift, endShift, dayOfWeek: day };
    }
  }

  return { created: 0, reason: 'no-slot' };
}

async function ensureClassForSubject({ subject, semester, adminClass, students, majorId, plan }) {
  const code = classCode(semester.code, subject.code, adminClass.code);
  const lecturerId = await pickLecturer(subject, semester.id, majorId);
  const totalPeriods =
    Number(subject.theoryPeriods || 0) +
      Number(subject.practicePeriods || 0) ||
    Number(subject.theoryHours || 0) +
      Number(subject.practiceHours || 0) ||
    Number(subject.credits || 0) * 15 ||
    45;

  let courseClass = await prisma.courseClass.findFirst({
    where: {
      semesterId: semester.id,
      subjectId: subject.id,
      adminClasses: { some: { id: adminClass.id } },
    },
    include: { adminClasses: true },
  });

  if (!courseClass) {
    courseClass = await prisma.courseClass.findUnique({
      where: { code },
      include: { adminClasses: true },
    });
  }

  if (courseClass) {
    courseClass = await prisma.courseClass.update({
      where: { id: courseClass.id },
      data: {
        code,
        name: `${subject.name} - ${adminClass.code}`,
        semesterId: semester.id,
        subjectId: subject.id,
        lecturerId: courseClass.lecturerId || lecturerId,
        cohort: 'K18',
        maxSlots: Math.max(students.length + 5, 25),
        totalPeriods,
        sessionsPerWeek: 1,
        periodsPerSession: 3,
        status: 'OPEN',
        adminClasses: { set: [{ id: adminClass.id }] },
      },
    });
  } else {
    courseClass = await prisma.courseClass.create({
      data: {
        code,
        name: `${subject.name} - ${adminClass.code}`,
        subjectId: subject.id,
        semesterId: semester.id,
        lecturerId,
        cohort: 'K18',
        maxSlots: Math.max(students.length + 5, 25),
        totalPeriods,
        sessionsPerWeek: 1,
        periodsPerSession: 3,
        status: 'OPEN',
        adminClasses: { connect: [{ id: adminClass.id }] },
      },
    });
  }

  const studentIds = students.map((student) => student.id);
  const existingEnrollments = await prisma.enrollment.findMany({
    where: { courseClassId: courseClass.id, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const existingStudentIds = new Set(existingEnrollments.map((item) => item.studentId));
  const missingStudentIds = studentIds.filter((studentId) => !existingStudentIds.has(studentId));

  if (missingStudentIds.length > 0) {
    await prisma.enrollment.createMany({
      data: missingStudentIds.map((studentId) => ({
        courseClassId: courseClass.id,
        studentId,
        status: 'REGISTERED',
      })),
    });
  }

  const existingGrades = await prisma.grade.findMany({
    where: { courseClassId: courseClass.id, studentId: { in: studentIds } },
    select: { studentId: true },
  });
  const gradedStudentIds = new Set(existingGrades.map((item) => item.studentId));
  const missingGradeStudentIds = studentIds.filter((studentId) => !gradedStudentIds.has(studentId));

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

  if (plan) {
    const existingItem = await prisma.semesterPlanItem.findFirst({
      where: {
        semesterPlanId: plan.id,
        subjectId: subject.id,
        adminClassId: adminClass.id,
      },
    });
    const itemData = {
      lecturerId,
      expectedStudentCount: students.length,
      generatedCourseClassId: courseClass.id,
      theoryPeriods: subject.theoryPeriods || subject.theoryHours || totalPeriods,
      practicePeriods: subject.practicePeriods || subject.practiceHours || 0,
      theorySessionsPerWeek: subject.theorySessionsPerWeek || 1,
      practiceSessionsPerWeek: subject.practiceSessionsPerWeek || 0,
      periodsPerSession: 3,
      status: 'EXECUTED',
    };
    if (existingItem) {
      await prisma.semesterPlanItem.update({
        where: { id: existingItem.id },
        data: itemData,
      });
    } else {
      await prisma.semesterPlanItem.create({
        data: {
          semesterPlanId: plan.id,
          subjectId: subject.id,
          adminClassId: adminClass.id,
          ...itemData,
        },
      });
    }
  }

  const schedule = await createSessionsIfMissing(
    courseClass,
    semester,
    adminClass.id,
    lecturerId,
    students.length,
  );

  return {
    code,
    classId: courseClass.id,
    enrolled: currentSlots,
    addedEnrollments: missingStudentIds.length,
    addedGrades: missingGradeStudentIds.length,
    schedule,
  };
}

async function migrateAttendance(sourceEnrollmentId, targetEnrollmentId) {
  const attendances = await prisma.attendance.findMany({
    where: { enrollmentId: sourceEnrollmentId },
    orderBy: { date: 'asc' },
  });

  let moved = 0;
  let removed = 0;
  for (const attendance of attendances) {
    const existing = await prisma.attendance.findFirst({
      where: {
        enrollmentId: targetEnrollmentId,
        date: attendance.date,
      },
    });

    if (existing) {
      await prisma.attendance.delete({ where: { id: attendance.id } });
      removed += 1;
      continue;
    }

    await prisma.attendance.update({
      where: { id: attendance.id },
      data: { enrollmentId: targetEnrollmentId },
    });
    moved += 1;
  }

  return { moved, removed };
}

async function moveGradeAndEnrollment({ sourceStudentId, targetStudentId, sourceClassCode, targetClassCode }) {
  const [sourceClass, targetClass] = await Promise.all([
    prisma.courseClass.findUnique({ where: { code: sourceClassCode } }),
    prisma.courseClass.findUnique({ where: { code: targetClassCode } }),
  ]);
  if (!sourceClass || !targetClass) {
    return {
      sourceClassCode,
      targetClassCode,
      skipped: true,
      reason: 'missing-class',
    };
  }

  const [sourceEnrollment, targetEnrollment] = await Promise.all([
    prisma.enrollment.findFirst({
      where: { studentId: sourceStudentId, courseClassId: sourceClass.id },
    }),
    prisma.enrollment.findFirst({
      where: { studentId: targetStudentId, courseClassId: targetClass.id },
    }),
  ]);

  if (!sourceEnrollment) {
    return {
      sourceClassCode,
      targetClassCode,
      skipped: true,
      reason: 'missing-source-enrollment',
    };
  }
  if (!targetEnrollment) {
    return {
      sourceClassCode,
      targetClassCode,
      skipped: true,
      reason: 'missing-target-enrollment',
    };
  }

  const [sourceGrade, targetGrade] = await Promise.all([
    prisma.grade.findFirst({
      where: { studentId: sourceStudentId, courseClassId: sourceClass.id },
    }),
    prisma.grade.findFirst({
      where: { studentId: targetStudentId, courseClassId: targetClass.id },
    }),
  ]);

  let copiedGrade = false;
  if (sourceGrade && (!targetGrade || hasScore(sourceGrade))) {
    const gradeData = {};
    for (const field of gradeCopyFields) {
      gradeData[field] = sourceGrade[field];
    }

    if (targetGrade) {
      await prisma.grade.update({
        where: { id: targetGrade.id },
        data: gradeData,
      });
    } else {
      await prisma.grade.create({
        data: {
          studentId: targetStudentId,
          courseClassId: targetClass.id,
          subjectId: targetClass.subjectId,
          ...gradeData,
        },
      });
    }
    copiedGrade = true;
  }

  const attendance = await migrateAttendance(sourceEnrollment.id, targetEnrollment.id);

  const sourceGradeIds = (
    await prisma.grade.findMany({
      where: { studentId: sourceStudentId, courseClassId: sourceClass.id },
      select: { id: true },
    })
  ).map((grade) => grade.id);

  if (sourceGradeIds.length > 0) {
    await prisma.examStudentAssignment.deleteMany({
      where: { gradeId: { in: sourceGradeIds } },
    });
    await prisma.grade.deleteMany({
      where: { id: { in: sourceGradeIds } },
    });
  }

  await prisma.enrollment.delete({ where: { id: sourceEnrollment.id } });

  const [sourceSlots, targetSlots] = await Promise.all([
    prisma.enrollment.count({ where: { courseClassId: sourceClass.id } }),
    prisma.enrollment.count({ where: { courseClassId: targetClass.id } }),
  ]);
  await Promise.all([
    prisma.courseClass.update({
      where: { id: sourceClass.id },
      data: { currentSlots: sourceSlots },
    }),
    prisma.courseClass.update({
      where: { id: targetClass.id },
      data: { currentSlots: targetSlots },
    }),
  ]);

  return {
    sourceClassCode,
    targetClassCode,
    copiedGrade,
    attendance,
    sourceSlots,
    targetSlots,
  };
}

async function main() {
  const [legacyStudent, mirrorStudent, hk1, hk4] = await Promise.all([
    prisma.student.findFirst({ where: { studentCode: TARGET_STUDENT_CODE }, include: { adminClass: true } }),
    prisma.student.findFirst({ where: { studentCode: MIRROR_STUDENT_CODE }, include: { adminClass: true } }),
    prisma.semester.findFirst({ where: { code: HK1_CODE } }),
    prisma.semester.findFirst({ where: { code: HK4_CODE } }),
  ]);

  if (!legacyStudent || !mirrorStudent || !hk1 || !hk4) {
    throw new Error('Không tìm thấy sinh viên mirror hoặc học kỳ cần sửa.');
  }

  const students = await prisma.student.findMany({
    where: { adminClassId: mirrorStudent.adminClassId, status: 'STUDYING' },
    select: { id: true, studentCode: true },
    orderBy: { studentCode: 'asc' },
  });

  const subjects = await prisma.subject.findMany({
    where: { code: { in: HK1_SUBJECT_CODES } },
  });

  const plan = await prisma.semesterPlan.findFirst({
    where: {
      semesterId: hk1.id,
      majorId: mirrorStudent.majorId,
      cohort: 'K18',
    },
  });

  const hk1Results = [];
  for (const code of HK1_SUBJECT_CODES) {
    const subject = subjects.find((item) => item.code === code);
    if (!subject) {
      hk1Results.push({ code, skipped: true, reason: 'missing-subject' });
      continue;
    }

    hk1Results.push(
      await ensureClassForSubject({
        subject,
        semester: hk1,
        adminClass: mirrorStudent.adminClass,
        students,
        majorId: mirrorStudent.majorId,
        plan,
      }),
    );
  }

  const hk4Results = [];
  hk4Results.push(
    await moveGradeAndEnrollment({
      sourceStudentId: legacyStudent.id,
      targetStudentId: mirrorStudent.id,
      sourceClassCode: 'CCLASS_2026_HK4_KTLT_K18_CNTT1_03',
      targetClassCode: 'CCLASS_2026_HK4_KTLT_K18_CNTT1_01',
    }),
  );
  hk4Results.push(
    await moveGradeAndEnrollment({
      sourceStudentId: legacyStudent.id,
      targetStudentId: mirrorStudent.id,
      sourceClassCode: 'CCLASS_2026_HK4_MOBILE_DEV_K18_CNTT1_04',
      targetClassCode: 'CCLASS_2026_HK4_MOBILE_DEV_K18_CNTT1_01',
    }),
  );

  console.log(
    JSON.stringify(
      {
        student: TARGET_STUDENT_CODE,
        mirrorStudent: MIRROR_STUDENT_CODE,
        hk1Results,
        hk4Results,
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
