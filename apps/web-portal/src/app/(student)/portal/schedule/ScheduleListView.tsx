"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock3, Filter, Info, MapPin, Printer, UserSquare2 } from "lucide-react";
import { StudentService } from "@/services/student.service";
import { getStudentUserId, readStudentSessionUser } from "@/lib/student-session";

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
  { label: "Lịch thi", className: "bg-amber-50 border-amber-200" },
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
  if (type === "EXAM") return "border-amber-200 bg-amber-50 text-amber-800";
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

const getCourseClassSessions = (courseClass: any) =>
  Array.isArray(courseClass?.sessions) && courseClass.sessions.length > 0
    ? courseClass.sessions
    : Array.isArray(courseClass?.schedules)
      ? courseClass.schedules
      : [];

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

const enrollmentMatchesSemester = (
  enrollment: any,
  selectedSemester: SemesterOption | null,
  selectedSemesterId: string,
) => {
  if (!selectedSemester) return true;

  const semester = enrollment?.courseClass?.semester;
  const semesterKey = getEnrollmentSemesterSelectionKey(enrollment);
  const selectedKeys = new Set(
    [
      selectedSemesterId,
      selectedSemester.selectionKey,
      selectedSemester.id,
      selectedSemester.code,
    ].filter(Boolean),
  );

  // Match by explicit ID/Code
  if (semesterKey && selectedKeys.has(semesterKey)) {
    return true;
  }

  // FALLBACK: Match by date overlap
  // If the class has ANY session that falls within the selected semester's range, show it.
  const sessions = getCourseClassSessions(enrollment?.courseClass);
  if (sessions.length > 0 && selectedSemester.startDate && selectedSemester.endDate) {
      return sessions.some((session: any) => 
          isDateInRange(session.date, selectedSemester.startDate, selectedSemester.endDate)
      );
  }

  // FALLBACK 2: Match by Semester Object date equality
  if (
    sameDateValue(semester?.startDate, selectedSemester.startDate) &&
    sameDateValue(semester?.endDate, selectedSemester.endDate)
  ) {
    return true;
  }

  if (!semester?.id && !semester?.code && !semester?.startDate && !semester?.endDate) {
    return getCourseClassSessions(enrollment?.courseClass).some((session: any) =>
      isDateInRange(session.date, selectedSemester.startDate, selectedSemester.endDate),
    );
  }

  return false;
};

export default function ScheduleListView() {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [studentProfile, setStudentProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [filter, setFilter] = useState("all");

  const normalizedEnrollments = useMemo(
    () => dedupeEnrollments(enrollments),
    [enrollments],
  );

  useEffect(() => {
    fetch("/api/semesters")
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setAllSemesters(Array.isArray(data) ? data : []))
      .catch(() => setAllSemesters([]));
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const user = readStudentSessionUser();
        const userId = getStudentUserId(user);
        if (!userId) return;
        const profile = await StudentService.getProfile(userId);
        setStudentProfile(profile || null);
        if (profile?.enrollments) {
          setEnrollments(profile.enrollments);
        } else if (profile?.id) {
          setEnrollments((await StudentService.getEnrollments(profile.id)) || []);
        }
      } catch (error) {
        console.error("Failed to fetch schedule:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const cohortMeta = useMemo(() => {
    const cohortCode =
      studentProfile?.adminClass?.cohort ||
      studentProfile?.intake ||
      normalizedEnrollments[0]?.courseClass?.adminClasses?.[0]?.cohort ||
      studentProfile?.course ||
      "";
    return inferCohortMeta(cohortCode);
  }, [normalizedEnrollments, studentProfile]);

  const semesterOptions = useMemo<SemesterOption[]>(() => {
    const map = new Map<string, SemesterOption & { keys: Set<string> }>();

    allSemesters.forEach((semester) => {
      const selectionKey = getSemesterSelectionKey(semester);
      if (!selectionKey || !semester?.id) return;

      const existing = map.get(selectionKey);
      if (existing) {
        existing.id = existing.id || semester.id;
        existing.code = existing.code || semester.code;
        existing.name = existing.name || semester.name || semester.id;
        existing.startDate = existing.startDate || toDate(semester.startDate);
        existing.endDate = existing.endDate || toDate(semester.endDate);
        return;
      }

      map.set(selectionKey, {
        id: semester.id,
        selectionKey,
        code: semester.code,
        name: semester.name || semester.id,
        startDate: toDate(semester.startDate),
        endDate: toDate(semester.endDate),
        sessionDates: [],
        keys: new Set<string>(),
      });
    });

    normalizedEnrollments.forEach((enrollment) => {
      const semester = enrollment.courseClass?.semester;
      const semesterId = enrollment.courseClass?.semesterId || semester?.id;
      const selectionKey = getSemesterSelectionKey({
        id: semesterId,
        code: semester?.code,
      });
      if (!selectionKey || !semesterId) return;

      if (!map.has(selectionKey)) {
        map.set(selectionKey, {
          id: semesterId,
          selectionKey,
          code: semester?.code,
          name: semester?.name || semesterId,
          startDate: toDate(semester?.startDate),
          endDate: toDate(semester?.endDate),
          sessionDates: [],
          keys: new Set<string>(),
        });
      }

      const target = map.get(selectionKey)!;
      target.id = target.id || semesterId;
      target.code = target.code || semester?.code;
      target.name = target.name || semester?.name || semesterId;
      target.startDate = target.startDate || toDate(semester?.startDate);
      target.endDate = target.endDate || toDate(semester?.endDate);
      getCourseClassSessions(enrollment.courseClass)
        .map((session: any) => toDate(session.date))
        .filter(Boolean)
        .forEach((date: any) => {
          const key = date.toISOString();
          if (!target.keys.has(key)) {
            target.keys.add(key);
            target.sessionDates.push(date);
          }
        });
    });

    const baseSemesters = Array.from(map.values())
      .map(({ keys, ...semester }) => ({
        ...semester,
        sessionDates: [...semester.sessionDates].sort((left, right) => left.getTime() - right.getTime()),
      }))
      .sort((left, right) => getSemesterSortTime(right) - getSemesterSortTime(left));

    const cohortSemesters = getVisibleSemestersForCohort(
      baseSemesters as (SemesterOption & { year?: number })[],
      cohortMeta,
    );

    const visibleSemesters = cohortSemesters.length ? cohortSemesters : baseSemesters;
    return limitToPastAndCurrentSemesters(visibleSemesters);
  }, [allSemesters, cohortMeta, normalizedEnrollments]);

  useEffect(() => {
    if (!semesterOptions.length) {
      setSelectedSemesterId("");
      return;
    }

    // Determine the most relevant semester for today
    const currentSem = semesterOptions.find((s) => isCurrentSemester(s));
    const latestWithData = [...semesterOptions]
      .filter((s) => s.sessionDates.length > 0)
      .sort((a, b) => getSemesterSortTime(b) - getSemesterSortTime(a))[0];

    const preferred =
      currentSem || latestWithData || getCurrentOrLatestStartedSemester(semesterOptions) || semesterOptions[0];

    setSelectedSemesterId((currentValue) => {
      if (semesterOptions.some((s) => s.selectionKey === currentValue)) {
        return currentValue;
      }
      return preferred.selectionKey;
    });
  }, [semesterOptions]);

  const selectedSemester = useMemo(
    () => semesterOptions.find((semester) => semester.selectionKey === selectedSemesterId) || null,
    [semesterOptions, selectedSemesterId],
  );

  const visibleEnrollments = useMemo(() => {
    if (!selectedSemesterId || !selectedSemester) return normalizedEnrollments;

    return normalizedEnrollments.filter((enrollment) =>
      enrollmentMatchesSemester(enrollment, selectedSemester, selectedSemesterId),
    );
  }, [normalizedEnrollments, selectedSemester, selectedSemesterId]);

  const visibleSessionDates = useMemo(
    () =>
      visibleEnrollments
        .flatMap((enrollment) => getCourseClassSessions(enrollment.courseClass))
        .map((session: any) => toDate(session.date))
        .filter(Boolean) as Date[],
    [visibleEnrollments],
  );

  useEffect(() => {
    if (selectedSemester) {
      setSelectedDate(pickAnchorDateFromSessionDates(selectedSemester, visibleSessionDates));
    }
  }, [selectedSemester, visibleSessionDates]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

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
    <div className="mx-auto max-w-6xl space-y-3 pb-12">
      {/* Compact Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        {/* Left: filters + semester */}
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

          <select
            value={selectedSemesterId}
            onChange={(event) => setSelectedSemesterId(event.target.value)}
            className="h-9 min-w-[260px] rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-semibold text-slate-700 outline-none focus:border-blue-400 transition-colors"
          >
            {semesterOptions.map((semester) => (
              <option key={semester.selectionKey} value={semester.selectionKey}>
                {formatSemesterOptionLabel(semester, cohortMeta?.startYear)}
              </option>
            ))}
          </select>
        </div>

        {/* Right: date picker + week nav */}
        <div className="flex items-center gap-2">
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
            <button onClick={() => changeWeek(-7)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600 transition-all">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="px-2 text-center select-none">
              <div className="text-[11px] font-bold text-slate-700 whitespace-nowrap">
                {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} – {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
              </div>
            </div>
            <button onClick={() => changeWeek(7)} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white hover:shadow-sm text-slate-500 hover:text-blue-600 transition-all">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Warnings (compact) */}
      {selectedSemester && visibleEnrollments.length > 0 && !hasSessions && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[13px] font-semibold text-rose-700">
          Bạn đã có học phần trong học kỳ này nhưng chưa có buổi học nào được xếp lịch.
        </div>
      )}

      {/* Schedule Grid */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full border-collapse">
            <thead>
              <tr>
                <th className="w-20 border-b border-r border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-[10px] font-black uppercase tracking-widest text-blue-600">
                  Ca
                </th>
                {DAYS.map((day, index) => {
                  const isToday = new Date().toDateString() === weekDays[index].toDateString();
                  return (
                    <th
                      key={day.value}
                      className={`min-w-[132px] border-b border-r border-slate-200 px-2 py-2.5 text-center ${isToday ? "bg-blue-50/60" : "bg-slate-50"}`}
                    >
                      <div className={`text-[10px] font-black uppercase tracking-wider ${isToday ? "text-blue-600" : "text-slate-600"}`}>{day.name}</div>
                      <div className={`text-[10px] font-semibold tabular-nums ${isToday ? "text-blue-500" : "text-slate-400"}`}>
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
                    <div className="flex flex-col items-center justify-center gap-1 px-2 py-3 min-h-[120px]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 [writing-mode:vertical-lr] rotate-180">
                        {row.label}
                      </span>
                      <span className="text-[9px] font-medium text-slate-400">
                        {SESSION_BUCKETS.find((b) => b.value === row.value)?.time}
                      </span>
                    </div>
                  </td>
                  {row.cells.map((cell) => {
                    const isToday = new Date().toDateString() === cell.date.toDateString();
                    return (
                      <td
                        key={`${row.value}-${cell.day.value}`}
                        className={`border-b border-r border-slate-200 p-1.5 align-top min-h-[120px] ${isToday ? "bg-blue-50/30" : ""}`}
                      >
                        {cell.items.length === 0 ? (
                          <div className="min-h-[120px]" />
                        ) : (
                          <div className="space-y-1.5">
                            {cell.items.map((item) => (
                              <div
                                key={item.id}
                                className={`rounded-lg border px-2.5 py-2 text-[10px] shadow-sm ${getTone(item.type, item.roomLabel)}`}
                              >
                                <h4 className="font-black leading-tight text-blue-700 line-clamp-2">{item.subjectName}</h4>
                                <p className="text-[9px] font-semibold text-slate-500 mt-0.5">{item.classCode}</p>
                                <div className="mt-1.5 border-t border-black/5 pt-1.5 space-y-0.5 text-[9px] font-semibold text-slate-600">
                                  <div className="flex items-center gap-1"><Clock3 className="h-3 w-3 text-slate-400" />Tiết {item.startShift}–{item.endShift}</div>
                                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3 text-slate-400" />{item.roomLabel}</div>
                                  <div className="flex items-center gap-1 truncate"><UserSquare2 className="h-3 w-3 text-slate-400" />{item.lecturerName}</div>
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[10px] font-semibold text-slate-500">
          <div className="flex flex-wrap items-center gap-4">
            {LEGEND.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2.5 w-5 rounded-sm border ${item.className}`} />
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
