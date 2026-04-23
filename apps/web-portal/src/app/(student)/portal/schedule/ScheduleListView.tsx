"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, Info, MapPin, Printer, UserSquare2 } from "lucide-react";
import { StudentService } from "@/services/student.service";
import { resolveCurrentStudentContext } from "@/lib/current-student";

type SemesterOption = {
  id: string;
  selectionKey: string;
  code?: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  sessionDates: Date[];
};

type StudentCohortMeta = {
  code: string;
  startYear: number;
  endYear: number;
};

type CurriculumProgressPayload = {
  semesters?: Array<{
    semester?: number;
    items?: any[];
  }>;
};

const DAYS = [
  { name: "Thứ Hai", value: 2 },
  { name: "Thứ Ba", value: 3 },
  { name: "Thứ Tư", value: 4 },
  { name: "Thứ Năm", value: 5 },
  { name: "Thứ Sáu", value: 6 },
  { name: "Thứ Bảy", value: 7 },
  { name: "Chủ nhật", value: 8 },
];

const FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "study", label: "Lịch học" },
  { id: "exam", label: "Lịch thi" },
];

const SESSION_BUCKETS = [
  { value: "morning", label: "Sáng", time: "07:00 - 12:15" },
  { value: "afternoon", label: "Chiều", time: "13:00 - 18:15" },
  { value: "evening", label: "Tối", time: "18:30 - 21:00" },
];

const LEGEND = [
  { label: "Lý thuyết", className: "bg-white border-slate-300" },
  { label: "Thực hành", className: "bg-emerald-50 border-emerald-200" },
  { label: "Lịch thi", className: "bg-yellow-50 border-yellow-200" },
];

const EMPTY_GRID_STYLE = {
  backgroundColor: "#fafcff",
  backgroundImage:
    "linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

const toDate = (value: any) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getSemesterSelectionKey = (semester?: { id?: string | null; code?: string | null }) =>
  `${semester?.code || semester?.id || ""}`.trim();

const normalize = (value?: string) =>
  `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

const sameDate = (left?: string | Date | null, right?: string | Date | null) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const sameDateValue = (left?: string | Date | null, right?: string | Date | null) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return a.getTime() === b.getTime();
};

const isDateInRange = (
  value?: string | Date | null,
  start?: string | Date | null,
  end?: string | Date | null,
) => {
  if (!value || !start || !end) return false;
  const date = new Date(value);
  const rangeStart = new Date(start);
  const rangeEnd = new Date(end);

  if (
    Number.isNaN(date.getTime()) ||
    Number.isNaN(rangeStart.getTime()) ||
    Number.isNaN(rangeEnd.getTime())
  ) {
    return false;
  }

  date.setHours(0, 0, 0, 0);
  rangeStart.setHours(0, 0, 0, 0);
  rangeEnd.setHours(0, 0, 0, 0);
  return date >= rangeStart && date <= rangeEnd;
};

const getWeekStart = (value: Date) => {
  const date = new Date(value);
  const day = date.getDay();
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
  date.setHours(0, 0, 0, 0);
  return date;
};

const addDays = (value: Date, days: number) => {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
};

const formatSemesterOptionLabel = (semester: Partial<SemesterOption>, studentIntakeYear?: number) => {
  const code = `${semester.code || ""}`.trim();
  const name = `${semester.name || ""}`.trim();
  const startDate = semester.startDate ? new Date(semester.startDate) : null;

  const academicSemNumber = studentIntakeYear ? calculateAcademicSemester(studentIntakeYear, startDate) : null;
  const yearRange = startDate ? `${startDate.getFullYear()}-${startDate.getFullYear() + 1}` : "";

  if (academicSemNumber) {
    const yearLabel = Math.ceil(academicSemNumber / 2);
    return `Học kỳ ${academicSemNumber} - Năm ${yearLabel} (${yearRange})`;
  }

  const codeTail = code.split("_").pop() || code;
  if (!code) return name || "Học kỳ";
  if (!name) return code;
  if (normalize(name).includes(normalize(code)) || normalize(name).includes(normalize(codeTail))) {
    return name;
  }
  return `${name} (${code})`;
};

const getSemesterSortTime = (semester: SemesterOption) => {
  const lastSession = semester.sessionDates[semester.sessionDates.length - 1];
  return (lastSession || semester.endDate || semester.startDate || new Date(0)).getTime();
};

const isCurrentSemester = (semester: Partial<SemesterOption>) => {
  if (!semester.startDate || !semester.endDate) return false;
  const today = new Date();
  const startDate = new Date(semester.startDate);
  const endDate = new Date(semester.endDate);
  today.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return today >= startDate && today <= endDate;
};

const calculateAcademicSemester = (intakeYear: number, startDate: Date | null) => {
  if (!startDate || !intakeYear) return null;
  const startYear = startDate.getFullYear();
  const startMonth = startDate.getMonth() + 1;
  // Sep - Jan (Semester 1, 3, 5, 7) starts in month >= 8 usually
  // Feb - Jun (Semester 2, 4, 6, 8) starts in month < 8
  const isSecondHalfOfYear = startMonth >= 7;
  const academicSem = (startYear - intakeYear) * 2 + (isSecondHalfOfYear ? 1 : 0);
  return academicSem >= 1 && academicSem <= 10 ? academicSem : null;
};

const parseConceptualSemester = (semester: Partial<SemesterOption>) => {
  const source = `${semester.code || ""} ${semester.name || ""}`;
  const match =
    source.match(/HK\s*([1-8])/i) ||
    source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
    source.match(/SEMESTER\s*([1-8])/i);
  return match ? Number(match[1]) : null;
};

const inferCohortMeta = (cohortCode?: string | null): StudentCohortMeta | null => {
  const normalized = `${cohortCode || ""}`.trim().toUpperCase();
  const match = normalized.match(/^K(\d{2,})$/i);
  if (!match) return null;

  const cohortNumber = Number(match[1]);
  if (!Number.isFinite(cohortNumber)) return null;

  const startYear = 2006 + cohortNumber;
  return {
    code: normalized,
    startYear,
    endYear: startYear + 4,
  };
};

const expectedYearForSemester = (startYear: number, conceptualSemester: number) =>
  startYear + Math.floor(conceptualSemester / 2);

const getSemesterStartYear = (semester: Partial<SemesterOption> & { year?: number }) => {
  const startDate = semester.startDate ? new Date(semester.startDate) : null;
  if (startDate && !Number.isNaN(startDate.getTime())) {
    return startDate.getFullYear();
  }

  const codeMatch = `${semester.code || ""}`.match(/(20\d{2})/);
  if (codeMatch) {
    return Number(codeMatch[1]);
  }

  const nameMatch = `${semester.name || ""}`.match(/(20\d{2})\s*-\s*20\d{2}/);
  if (nameMatch) {
    return Number(nameMatch[1]);
  }

  return Number(semester.year || 0);
};

const getSemesterFingerprint = (
  semester?: Partial<SemesterOption> & { year?: number },
) => {
  if (!semester) return "";
  const conceptualSemester = parseConceptualSemester(semester);
  const startYear = getSemesterStartYear(semester);
  if (!conceptualSemester || !startYear) return "";
  return `HK${conceptualSemester}::${startYear}`;
};

const getSemesterMatchTokens = (
  semester?: Partial<SemesterOption> & { year?: number },
  explicitSemesterId?: string | null,
  aliasKeys: string[] = [],
) =>
  new Set(
    [
      explicitSemesterId,
      semester?.id,
      semester?.code,
      semester?.name,
      getSemesterSelectionKey(semester),
      getSemesterFingerprint(semester),
      ...aliasKeys,
    ]
      .map((value) => `${value || ""}`.trim())
      .filter(Boolean),
  );

const getSemesterHalfMatch = (
  semester: Partial<SemesterOption> & { year?: number },
  conceptualSemester: number,
) => {
  const startDate = semester.startDate ? new Date(semester.startDate) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) {
    return 0;
  }

  const startMonth = startDate.getMonth() + 1;
  if (conceptualSemester % 2 === 1) {
    return startMonth >= 7 ? 1 : 0;
  }

  return startMonth >= 1 && startMonth <= 6 ? 1 : 0;
};

const getVisibleSemestersForCohort = (
  semesters: (SemesterOption & { year?: number })[],
  cohortMeta: StudentCohortMeta | null,
) => {
  if (!cohortMeta) return semesters;

  const selected = Array.from({ length: 8 }, (_, index) => index + 1)
    .map((conceptualSemester) => {
      const expectedYear = expectedYearForSemester(cohortMeta.startYear, conceptualSemester);

      return semesters
        .filter((semester) => parseConceptualSemester(semester) === conceptualSemester)
        .sort((left, right) => {
          const leftYearDiff = Math.abs(getSemesterStartYear(left) - expectedYear);
          const rightYearDiff = Math.abs(getSemesterStartYear(right) - expectedYear);
          if (leftYearDiff !== rightYearDiff) {
            return leftYearDiff - rightYearDiff;
          }

          const halfMatchDiff =
            getSemesterHalfMatch(right, conceptualSemester) -
            getSemesterHalfMatch(left, conceptualSemester);
          if (halfMatchDiff !== 0) {
            return halfMatchDiff;
          }

          const sessionDiff = right.sessionDates.length - left.sessionDates.length;
          if (sessionDiff !== 0) {
            return sessionDiff;
          }

          return new Date(left.startDate || 0).getTime() - new Date(right.startDate || 0).getTime();
        })[0];
    })
    .filter((semester): semester is SemesterOption & { year?: number } => Boolean(semester));

  if (selected.length > 0) {
    return selected;
  }

  return semesters
    .filter((semester) => {
      const conceptualSemester = parseConceptualSemester(semester);
      return conceptualSemester !== null && conceptualSemester >= 1 && conceptualSemester <= 8;
    })
    .sort((left, right) => {
      const leftSemester = parseConceptualSemester(left) || 99;
      const rightSemester = parseConceptualSemester(right) || 99;
      if (leftSemester !== rightSemester) {
        return leftSemester - rightSemester;
      }
      return new Date(left.startDate || 0).getTime() - new Date(right.startDate || 0).getTime();
    });
};

const getCurrentOrLatestStartedSemester = <T extends SemesterOption>(semesters: T[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 1. Strictly find the semester that contains today
  const exactCurrent = semesters.find((semester) => isCurrentSemester(semester));
  if (exactCurrent) return exactCurrent;

  // 2. Otherwise, find the one that ended most recently OR starts soonest
  const sorted = [...semesters].sort(
    (left, right) => getSemesterSortTime(right) - getSemesterSortTime(left),
  );

  return (
    sorted.find((semester) => {
      const startDate = semester.startDate ? new Date(semester.startDate) : null;
      if (startDate) {
        startDate.setHours(0, 0, 0, 0);
        return startDate <= today;
      }
      return false;
    }) ||
    sorted[0] ||
    null
  );
};

const limitToPastAndCurrentSemesters = <T extends SemesterOption>(semesters: T[]) => {
  const boundarySemester = getCurrentOrLatestStartedSemester(semesters);
  if (!boundarySemester) {
    return semesters;
  }

  const boundaryTime = getSemesterSortTime(boundarySemester);
  const boundaryStart = boundarySemester.startDate ? new Date(boundarySemester.startDate) : null;
  if (boundaryStart) {
    boundaryStart.setHours(0, 0, 0, 0);
  }

  return semesters.filter((semester) => {
    if (semester.startDate && boundaryStart) {
      const startDate = new Date(semester.startDate);
      startDate.setHours(0, 0, 0, 0);
      return startDate <= boundaryStart;
    }

    return getSemesterSortTime(semester) <= boundaryTime;
  });
};

const pickSemesterAnchorDate = (semester: SemesterOption) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = semester.startDate ? new Date(semester.startDate) : null;
  const endDate = semester.endDate ? new Date(semester.endDate) : null;
  const sessionDates = [...semester.sessionDates].sort((left, right) => left.getTime() - right.getTime());

  if (startDate) startDate.setHours(0, 0, 0, 0);
  if (endDate) endDate.setHours(0, 0, 0, 0);

  if (startDate && endDate && today >= startDate && today <= endDate) {
    const currentWeekStart = getWeekStart(today).getTime();
    const currentWeekEnd = addDays(getWeekStart(today), 6).getTime();
    const hasSessionInCurrentWeek = sessionDates.some((date) => {
      const time = new Date(date).getTime();
      return time >= currentWeekStart && time <= currentWeekEnd;
    });

    if (hasSessionInCurrentWeek) {
      return today;
    }

    const nextSession = sessionDates.find((date) => date >= today);
    if (nextSession) {
      return nextSession;
    }

    const previousSession = [...sessionDates].reverse().find((date) => date <= today);
    if (previousSession) {
      return previousSession;
    }

    return startDate;
  }

  return (
    sessionDates.find((date) => date >= today) ||
    sessionDates[0] ||
    startDate ||
    today
  );
};

const pickAnchorDateFromSessionDates = (
  semester: SemesterOption | null,
  sessionDates: Date[],
) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sortedDates = [...sessionDates].sort((left, right) => left.getTime() - right.getTime());

  // PRIORITY 1: If today is within semester, show Today (current week)
  if (semester?.startDate && semester?.endDate) {
    const startDate = new Date(semester.startDate);
    const endDate = new Date(semester.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (today >= startDate && today <= endDate) {
      return today;
    }
  }

  // PRIORITY 2: Show the closest future session
  if (sortedDates.length > 0) {
    const futureSession = sortedDates.find((date) => date >= today);
    if (futureSession) return futureSession;
    // Or the latest past session if all sessions are in the past
    return sortedDates[sortedDates.length - 1];
  }

  return semester?.startDate ? new Date(semester.startDate) : today;
};

const isDateWithinSemester = (date: Date, semester: SemesterOption | null) => {
  if (!semester?.startDate || !semester?.endDate) return true;
  const target = new Date(date);
  const startDate = new Date(semester.startDate);
  const endDate = new Date(semester.endDate);
  target.setHours(0, 0, 0, 0);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return target >= startDate && target <= endDate;
};

const getBucket = (startShift: number) => (startShift <= 6 ? "Sáng" : startShift <= 12 ? "Chiều" : "Tối");

const getTone = (type?: string, roomName?: string) => {
  if (type === "EXAM") return "border-yellow-200 bg-yellow-50 text-yellow-800";
  if (type === "PRACTICE" || `${roomName || ""}`.toLowerCase().includes("lab")) {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }
  return "border-slate-200 bg-white text-slate-800";
};

const getRoomLabel = (room?: any, roomId?: string) => {
  const name = room?.name || roomId || "Chưa xếp phòng";
  return room?.building ? `${name} - ${room.building}` : name;
};

const getBucketValue = (startShift: number) =>
  startShift <= 6 ? "morning" : startShift <= 12 ? "afternoon" : "evening";

const getCourseClassSessions = (courseClass: any) => {
  const mergedSchedules = [
    ...(Array.isArray(courseClass?.schedules) ? courseClass.schedules : []),
    ...(Array.isArray(courseClass?.sessions) ? courseClass.sessions : []),
  ];

  if (mergedSchedules.length === 0) {
    return [];
  }

  const uniqueSchedules = new Map<string, any>();

  mergedSchedules.forEach((session: any, index: number) => {
    const key = [
      session?.id || `session-${index}`,
      session?.date || "",
      session?.startShift || "",
      session?.endShift || "",
      session?.type || "",
      session?.roomId || session?.room?.id || "",
    ].join("::");

    if (!uniqueSchedules.has(key)) {
      uniqueSchedules.set(key, session);
    }
  });

  return [...uniqueSchedules.values()].sort((left: any, right: any) => {
    const leftDate = new Date(left?.date || 0).getTime();
    const rightDate = new Date(right?.date || 0).getTime();
    if (leftDate !== rightDate) {
      return leftDate - rightDate;
    }
    return Number(left?.startShift || 0) - Number(right?.startShift || 0);
  });
};

const getEnrollmentSemesterSelectionKey = (enrollment: any) =>
  getSemesterSelectionKey({
    id: enrollment?.courseClass?.semesterId || enrollment?.courseClass?.semester?.id,
    code: enrollment?.courseClass?.semester?.code,
  });

const getEnrollmentSubjectSelectionKey = (enrollment: any) =>
  `${enrollment?.courseClass?.subject?.code || enrollment?.courseClass?.subjectId || enrollment?.courseClass?.code || enrollment?.courseClassId || ""}`.trim();

const getEnrollmentPriority = (enrollment: any) => {
  const courseClass = enrollment?.courseClass || {};
  const code = `${courseClass.code || ""}`.toUpperCase();
  const sessions = getCourseClassSessions(courseClass).length;
  let score = sessions * 2;
  if (code.startsWith("CCLASS_")) score += 40;
  if (code.startsWith("PCC_")) score += 10;
  if (courseClass.lecturer?.fullName) score += 3;
  if (courseClass.adminClasses?.length) score += 2;
  return score;
};

const dedupeEnrollments = (enrollments: any[]) => {
  const deduped = new Map<string, any>();

  for (const enrollment of enrollments || []) {
    const semesterKey = getEnrollmentSemesterSelectionKey(enrollment);
    const subjectKey = getEnrollmentSubjectSelectionKey(enrollment);
    // Include Class ID to allow multiple classes for the same subject (e.g. Theory & Practice)
    const classId = enrollment?.courseClassId || enrollment?.courseClass?.id || enrollment?.id;
    const key = semesterKey && subjectKey ? `${semesterKey}::${subjectKey}::${classId}` : `${classId}`;

    const existing = deduped.get(key);
    if (!existing || getEnrollmentPriority(enrollment) > getEnrollmentPriority(existing)) {
      deduped.set(key, enrollment);
    }
  }

  return [...deduped.values()];
};

const getEnrollmentSubjectTokens = (enrollment: any) =>
  new Set(
    [
      enrollment?.courseClass?.subjectId,
      enrollment?.courseClass?.subject?.id,
      enrollment?.courseClass?.subject?.code,
      enrollment?.subjectId,
    ]
      .map((value) => `${value || ""}`.trim())
      .filter(Boolean),
  );

const getCurriculumSubjectTokens = (item: any) =>
  new Set(
    [item?.subjectId, item?.id, item?.code]
      .map((value) => `${value || ""}`.trim())
      .filter(Boolean),
  );

const dedupeSemesterEnrollments = (enrollments: any[]) => {
  const deduped = new Map<string, any>();

  for (const enrollment of enrollments || []) {
    const subjectKey =
      `${enrollment?.courseClass?.subjectId || enrollment?.courseClass?.subject?.id || enrollment?.courseClass?.subject?.code || ""}`.trim() ||
      `${enrollment?.courseClassId || enrollment?.courseClass?.id || enrollment?.id}`.trim();

    const existing = deduped.get(subjectKey);
    if (!existing || getEnrollmentPriority(enrollment) > getEnrollmentPriority(existing)) {
      deduped.set(subjectKey, enrollment);
    }
  }

  return [...deduped.values()];
};

const enrollmentMatchesSemester = (
  enrollment: any,
  selectedSemester: SemesterOption | null,
  selectedSemesterKeys: Set<string>,
) => {
  if (!selectedSemester) return true;

  const semester = enrollment?.courseClass?.semester;
  const explicitSemesterKeys = getSemesterMatchTokens(
    {
      id: semester?.id,
      code: semester?.code,
      name: semester?.name,
      startDate: semester?.startDate,
      endDate: semester?.endDate,
    },
    enrollment?.courseClass?.semesterId,
    [getEnrollmentSemesterSelectionKey(enrollment)],
  );

  // If the class already has semester metadata, it must match that semester exactly.
  if (explicitSemesterKeys.size > 0) {
    return [...explicitSemesterKeys].some((value) => selectedSemesterKeys.has(value));
  }

  // Records missing ID/code can still match by the semester date window itself.
  if (
    semester?.startDate &&
    semester?.endDate &&
    sameDateValue(semester?.startDate, selectedSemester.startDate) &&
    sameDateValue(semester?.endDate, selectedSemester.endDate)
  ) {
    return true;
  }

  // Only legacy records without semester metadata fall back to session dates.
  const sessions = getCourseClassSessions(enrollment?.courseClass);
  if (sessions.length > 0 && selectedSemester.startDate && selectedSemester.endDate) {
    return sessions.some((session: any) =>
      isDateInRange(session.date, selectedSemester.startDate, selectedSemester.endDate)
    );
  }

  return false;
};

export default function ScheduleListView() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [studentCohortCode, setStudentCohortCode] = useState<string>("");
  const [curriculumProgress, setCurriculumProgress] = useState<CurriculumProgressPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [filter, setFilter] = useState("all");

  const normalizedEnrollments = useMemo(
    () => dedupeEnrollments(enrollments),
    [enrollments],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const context = await resolveCurrentStudentContext();
        if (!context.studentId) return;

        const profile =
          context.profile ||
          (await StudentService.getProfileByStudentId(context.studentId).catch(() => null));
        const [semesterData, curriculumData] = await Promise.all([
          StudentService.getSemesters().catch(() => []),
          StudentService.getCurriculumProgress(context.studentId).catch(() => null),
        ]);

        const enrichedEnrollments = Array.isArray(profile?.enrollments)
          ? profile.enrollments
          : [];

        setAllSemesters(Array.isArray(semesterData) ? semesterData : []);
        setCurriculumProgress(curriculumData);
        setStudentCohortCode(
          `${profile?.adminClass?.cohort || profile?.intake || ""}`.trim(),
        );

        if (enrichedEnrollments.length > 0) {
          setEnrollments(enrichedEnrollments);
        } else {
          setEnrollments((await StudentService.getEnrollments(context.studentId)) || []);
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cohortMeta = useMemo(
    () => inferCohortMeta(studentCohortCode),
    [studentCohortCode],
  );

  const semesterOptions = useMemo(() => {
    const map = new Map<string, SemesterOption>();

    for (const semester of allSemesters || []) {
      const selectionKey = getSemesterSelectionKey(semester);
      const id = `${semester?.id || selectionKey}`.trim();
      if (!id) continue;

      map.set(id, {
        id,
        selectionKey: selectionKey || id,
        code: semester?.code || "",
        name: semester?.name || id,
        startDate: toDate(semester?.startDate),
        endDate: toDate(semester?.endDate),
        sessionDates: [],
      });
    }

    for (const enrollment of normalizedEnrollments) {
      const semester = enrollment?.courseClass?.semester;
      const selectionKey = getSemesterSelectionKey(semester);
      const id =
        `${enrollment?.courseClass?.semesterId || semester?.id || selectionKey}`.trim();
      if (!id) continue;

      const existing = map.get(id);
      const sessionDates = getCourseClassSessions(enrollment?.courseClass)
        .map((session: any) => toDate(session?.date))
        .filter(Boolean) as Date[];

      if (existing) {
        const dedupedDates = new Map(
          existing.sessionDates.map((date) => [date.toISOString(), date]),
        );
        sessionDates.forEach((date) => {
          dedupedDates.set(date.toISOString(), date);
        });
        existing.sessionDates = [...dedupedDates.values()].sort(
          (left, right) => left.getTime() - right.getTime(),
        );
        if (!existing.startDate && semester?.startDate) {
          existing.startDate = toDate(semester.startDate);
        }
        if (!existing.endDate && semester?.endDate) {
          existing.endDate = toDate(semester.endDate);
        }
        if (!existing.code && semester?.code) {
          existing.code = semester.code;
        }
        if (!existing.name && semester?.name) {
          existing.name = semester.name;
        }
        continue;
      }

      map.set(id, {
        id,
        selectionKey: selectionKey || id,
        code: semester?.code || "",
        name: semester?.name || id,
        startDate: toDate(semester?.startDate),
        endDate: toDate(semester?.endDate),
        sessionDates: [...new Map(
          sessionDates.map((date) => [date.toISOString(), date]),
        ).values()].sort((left, right) => left.getTime() - right.getTime()),
      });
    }

    const merged = [...map.values()].sort(
      (left, right) => getSemesterSortTime(right) - getSemesterSortTime(left),
    );
    const scoped = cohortMeta
      ? getVisibleSemestersForCohort(merged, cohortMeta)
      : merged;
    const limited = limitToPastAndCurrentSemesters(scoped);
    return limited.length > 0 ? limited : merged;
  }, [allSemesters, cohortMeta, normalizedEnrollments]);

  const selectedSemester = useMemo(
    () =>
      semesterOptions.find(
        (semester) =>
          semester.id === selectedSemesterId ||
          semester.selectionKey === selectedSemesterId,
      ) || null,
    [selectedSemesterId, semesterOptions],
  );

  const selectedSemesterKeys = useMemo(() => {
    if (!selectedSemester) {
      return new Set<string>();
    }

    const fingerprint = getSemesterFingerprint(selectedSemester);
    const aliasKeys = fingerprint
      ? semesterOptions
        .filter((semester) => getSemesterFingerprint(semester) === fingerprint)
        .flatMap((semester) => [
          semester.id,
          semester.selectionKey,
          semester.code,
          semester.name,
          getSemesterFingerprint(semester),
        ])
      : [];

    return getSemesterMatchTokens(selectedSemester, selectedSemesterId, aliasKeys);
  }, [selectedSemester, selectedSemesterId, semesterOptions]);

  const selectedConceptualSemester = useMemo(
    () => (selectedSemester ? parseConceptualSemester(selectedSemester) : null),
    [selectedSemester],
  );

  const selectedCurriculumItems = useMemo(() => {
    if (!selectedConceptualSemester) {
      return [];
    }

    const semester = (curriculumProgress?.semesters || []).find(
      (item) => Number(item?.semester || 0) === selectedConceptualSemester,
    );

    return Array.isArray(semester?.items) ? semester.items : [];
  }, [curriculumProgress, selectedConceptualSemester]);

  const selectedCurriculumSubjectKeys = useMemo(
    () =>
      new Set(
        selectedCurriculumItems.flatMap((item) => [...getCurriculumSubjectTokens(item)]),
      ),
    [selectedCurriculumItems],
  );

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  // Auto-resolve semester based on selectedDate
  useEffect(() => {
    if (!semesterOptions.length) {
      setSelectedSemesterId("");
      return;
    }

    // Find semester that contains the selectedDate
    const matchingSemester = semesterOptions.find((s) => isDateWithinSemester(selectedDate, s)) || 
                             getCurrentOrLatestStartedSemester(semesterOptions);

    if (matchingSemester && matchingSemester.id !== selectedSemesterId) {
      setSelectedSemesterId(matchingSemester.id);
    }
  }, [selectedDate, semesterOptions, selectedSemesterId]);

  const visibleEnrollments = useMemo(() => {
    return normalizedEnrollments.filter((enrollment) => {
      // 1. MUST belong to the selected semester
      const belongsToSemester = selectedSemester
        ? enrollmentMatchesSemester(enrollment, selectedSemester, selectedSemesterKeys)
        : true;
      if (!belongsToSemester) return false;

      // 2. If curriculum data is available for this semester, ONLY show subjects in the plan
      if (selectedCurriculumSubjectKeys.size > 0) {
        const enrollmentTokens = getEnrollmentSubjectTokens(enrollment);
        const isInCurriculum = [...enrollmentTokens].some((token) =>
          selectedCurriculumSubjectKeys.has(token)
        );
        if (!isInCurriculum) return false;
      }

      return true;
    });
  }, [
    normalizedEnrollments,
    selectedSemester,
    selectedSemesterKeys,
    selectedCurriculumSubjectKeys,
  ]);


  const scheduledSubjectSummaries = useMemo(
    () =>
      visibleEnrollments
        .filter((enrollment) => getCourseClassSessions(enrollment.courseClass).length > 0)
        .map((enrollment) => ({
          key:
            enrollment?.courseClassId ||
            enrollment?.courseClass?.id ||
            enrollment?.courseClass?.subjectId ||
            enrollment?.id,
          name: enrollment?.courseClass?.subject?.name || enrollment?.courseClass?.name,
        })),
    [visibleEnrollments],
  );

  const missingCurriculumItems = useMemo(() => {
    if (selectedCurriculumItems.length === 0) {
      return [];
    }

    return selectedCurriculumItems.filter((item) => {
      const tokens = getCurriculumSubjectTokens(item);
      return !visibleEnrollments.some((enrollment) =>
        [...getEnrollmentSubjectTokens(enrollment)].some((token) => tokens.has(token)),
      );
    });
  }, [selectedCurriculumItems, visibleEnrollments]);

  const visibleSessionDates = useMemo(
    () =>
      visibleEnrollments
        .flatMap((enrollment) => getCourseClassSessions(enrollment.courseClass))
        .map((session: any) => toDate(session.date))
        .filter(Boolean) as Date[],
    [visibleEnrollments],
  );

  // Remove effect that forces date back to semester start on semester change
  // as we now want the date to be the primary driver.
  /*
  useEffect(() => {
    if (visibleSessionDates.length > 0) {
      setSelectedDate(
        pickAnchorDateFromSessionDates(selectedSemester, visibleSessionDates),
      );
      return;
    }

    if (selectedSemester) {
      setSelectedDate(pickSemesterAnchorDate(selectedSemester));
    }
  }, [selectedSemester, visibleSessionDates]);
  */

  /* Moved weekDays up */

  const timetableRows = useMemo(
    () =>
      SESSION_BUCKETS.map((bucket) => ({
        ...bucket,
        cells: DAYS.map((day, index) => {
          const date = weekDays[index];
          const items = visibleEnrollments
            .flatMap((enrollment) =>
              getCourseClassSessions(enrollment.courseClass)
                .filter((session: any) => {
                  if (!sameDate(session.date, date)) return false;
                  if (filter === "study" && session.type === "EXAM") return false;
                  if (filter === "exam" && session.type !== "EXAM") return false;
                  return getBucketValue(Number(session.startShift)) === bucket.value;
                })
                .map((session: any) => ({
                  id: `${enrollment.id}-${session.id}`,
                  subjectName: enrollment.courseClass?.subject?.name || enrollment.courseClass?.name,
                  classCode: enrollment.courseClass?.code,
                  lecturerName: enrollment.courseClass?.lecturer?.fullName || "Chưa gán",
                  roomLabel: getRoomLabel(session.room, session.roomId),
                  startShift: Number(session.startShift),
                  endShift: Number(session.endShift),
                  type: session.type || "THEORY",
                  note: session.note || null,
                })),
            )
            .sort((left, right) => left.startShift - right.startShift);

          return {
            day,
            date,
            items,
          };
        }),
      })),
    [filter, visibleEnrollments, weekDays],
  );

  const hasSessions = useMemo(
    () =>
      visibleEnrollments.some(
        (enrollment) => getCourseClassSessions(enrollment.courseClass).length > 0,
      ),
    [visibleEnrollments],
  );

  const changeWeek = (offset: number) => {
    setSelectedDate((current) => addDays(current, offset));
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
      </div>
    );
  }

  const formatDateForInput = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4 pb-12">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[12px] font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            {FILTERS.map((item) => (
              <button
                key={item.id}
                onClick={() => setFilter(item.id)}
                className={`rounded-md px-2 py-1 transition-colors ${filter === item.id ? "bg-white text-blue-700 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

      {/* Right: Today + date picker + week nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDate(new Date())}
            className="inline-flex items-center gap-1.5 h-9 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[12px] font-bold text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Hôm nay
          </button>
          <input
            type="date"
            value={formatDateForInput(selectedDate)}
            onChange={(e) => {
              const d = new Date(e.target.value);
              if (!Number.isNaN(d.getTime())) setSelectedDate(d);
            }}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-blue-400 transition-colors cursor-pointer"
          />
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            <button
              onClick={() => changeWeek(-7)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600 transition-all font-bold"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-2 text-center select-none">
              <div className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – {weekDays[6].toLocaleDateString("vi-VN", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>
            <button
              onClick={() => changeWeek(7)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600 transition-all font-bold"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {selectedSemester ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-[12px] font-semibold text-slate-600">
          Đang xem lịch của{" "}
          <span className="font-black text-blue-700">
            {formatSemesterOptionLabel(selectedSemester, cohortMeta?.startYear)}
          </span>
          {selectedSemester.startDate && selectedSemester.endDate ? (
            <span className="ml-2 text-slate-500">
              ({selectedSemester.startDate.toLocaleDateString("vi-VN")} -{" "}
              {selectedSemester.endDate.toLocaleDateString("vi-VN")})
            </span>
          ) : null}
        </div>
      ) : null}

      {selectedSemester ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-slate-600">
            <span>
              Học kỳ này có{" "}
              <span className="font-black text-blue-700">
                {scheduledSubjectSummaries.length}
              </span>{" "}
              học phần đã được xếp lịch theo đúng kế hoạch đào tạo.
            </span>

          </div>
          {scheduledSubjectSummaries.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {scheduledSubjectSummaries.map((item) => (
                <span
                  key={item.key}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  {item.name}
                </span>
              ))}
            </div>
          ) : null}
          {missingCurriculumItems.length > 0 ? (
            <div className="mt-3 text-[12px] font-semibold text-rose-700">
              Chưa thấy lớp hoặc lịch học cho:{" "}
              {missingCurriculumItems
                .map((item) => item?.name || item?.code)
                .filter(Boolean)
                .join(", ")}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Warnings (compact) */}
      {/* Removed "Tuần nằm ngoài học kỳ" warning as date is now the anchor */}


      {visibleEnrollments.length > 0 && !hasSessions && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-700">
          Bạn đã có học phần nhưng chưa có buổi học hoặc lịch thi nào được xếp.
        </div>
      )}

      {/* Schedule Grid */}

      {/* Schedule Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1240px] w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-3 text-center text-[11px] font-black uppercase tracking-widest text-blue-600">
                  Ca
                </th>
                {DAYS.map((day, index) => {
                  const isToday = new Date().toDateString() === weekDays[index].toDateString();
                  return (
                    <th
                      key={day.value}
                      className={`min-w-[132px] border-b border-r border-slate-200 px-2 py-2.5 text-center ${isToday ? "bg-blue-50/60" : "bg-slate-50"}`}
                    >
                      <div className={`text-[11px] font-black uppercase tracking-wider ${isToday ? "text-blue-600" : "text-slate-600"}`}>{day.name}</div>
                      <div className={`text-[11px] font-semibold tabular-nums ${isToday ? "text-blue-500" : "text-slate-400"}`}>
                        {weekDays[index].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {timetableRows.map((row) => (
                <tr key={row.value}>
                  <td className="border-b border-r border-slate-200 bg-slate-50/60 p-0 align-middle">
                    <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-4 min-h-[150px]">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-600 [writing-mode:vertical-lr] rotate-180">
                        {row.label}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500">
                        {SESSION_BUCKETS.find((b) => b.value === row.value)?.time}
                      </span>
                    </div>
                  </td>
                  {row.cells.map((cell) => {
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    return (
                      <td
                        key={`${row.value}-${cell.day.value}`}
                        className={`border-b border-r border-slate-200 p-2 align-top min-h-[150px] ${isToday ? "bg-blue-50/30" : ""}`}
                      >
                        {cell.items.length === 0 ? (
                          <div className="min-h-[150px]" />
                        ) : (
                          <div className="space-y-1.5">
                            {cell.items.map((item) => (
                              <div
                                key={item.id}
                                className={`rounded-lg border px-3 py-2.5 text-xs shadow-sm ${getTone(item.type, item.roomLabel)}`}
                              >
                                <h4
                                  className={`font-black leading-tight line-clamp-2 ${item.type === "EXAM" ? "text-yellow-800" : "text-blue-700"
                                    }`}
                                >
                                  {item.subjectName}
                                </h4>
                                <p className="text-[10px] font-bold text-slate-500 mt-1">{item.classCode}</p>
                                <div className="mt-2 border-t border-black/5 pt-2 space-y-1 text-[10px] font-bold text-slate-600">
                                  <div className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-slate-400" />Tiết {item.startShift}–{item.endShift}</div>
                                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{item.roomLabel}</div>
                                  {item.type === "EXAM" ? (
                                    <div className="flex items-start gap-1.5 text-yellow-800">
                                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-700" />
                                      <span className="line-clamp-2 italic">
                                        {item.note || "Đã xếp lịch thi"}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5 truncate">
                                      <UserSquare2 className="h-3.5 w-3.5 text-slate-400" />
                                      {item.lecturerName}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend footer inside table card */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] font-bold text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-6 rounded-sm border ${item.className}`} />
                {item.label}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5"><Info className="h-3.5 w-3.5 text-blue-400" />Lịch từ hệ thống UNETI</span>
        </div>
      </div>
    </div>
  );
}
