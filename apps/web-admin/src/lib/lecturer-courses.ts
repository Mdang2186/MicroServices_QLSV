"use client";

export type SemesterOption = {
  id: string;
  code?: string;
  name?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
};

export type LecturerCourseSession = {
  id?: string;
  courseClassId?: string;
  date?: string | Date;
  startShift?: number;
  endShift?: number;
  type?: string;
  room?: {
    name?: string;
    building?: string;
  } | null;
};

export type LecturerCourse = {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  currentSlots?: number;
  maxSlots?: number;
  semesterId?: string;
  semester?: SemesterOption | null;
  subject?: {
    code?: string;
    name?: string;
    credits?: number;
    major?: { name?: string } | null;
  } | null;
  adminClasses?: any[];
  sessions?: LecturerCourseSession[];
  schedules?: any[];
};

export type LecturerCourseTodaySession = LecturerCourseSession & {
  course: LecturerCourse;
};

export type LecturerWeekSession = LecturerCourseSession & {
  courseClass?: LecturerCourse | null;
};

const getAuthHeaders = (token?: string | null): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const normalizePayloadList = <T>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toDateOnly = (value?: string | Date) => {
  if (!value) {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  if (typeof value === "string") {
    // Return early if matches YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.slice(0, 10);
    }
    return toDateOnly(new Date(value));
  }

  if (Number.isNaN(value.getTime())) return "";

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getJsDayFromDate = (value?: string | Date) => {
  if (!value) return new Date().getDay();

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const [y, m, d] = value.slice(0, 10).split("-").map(Number);
    // Create local date to get correct local day of week
    return new Date(y, m - 1, d).getDay();
  }

  return new Date(value).getDay();
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

const toDateInputValue = (value: Date) => toDateOnly(value);

const getWeekDateRange = (anchorDate = new Date()) => {
  const startDate = getWeekStart(anchorDate);
  const endDate = addDays(startDate, 6);
  return {
    startDate,
    endDate,
    startDateKey: toDateInputValue(startDate),
    endDateKey: toDateInputValue(endDate),
  };
};

const isWithinDateRange = (semester: SemesterOption, date = new Date()) => {
  if (!semester.startDate || !semester.endDate) return false;

  const target = new Date(date);
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);

  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  return target >= start && target <= end;
};

const sortSemesters = (semesters: SemesterOption[]) =>
  [...semesters].sort((left, right) => {
    const leftTime = new Date(left.startDate || 0).getTime();
    const rightTime = new Date(right.startDate || 0).getTime();
    return rightTime - leftTime;
  });

const normalizeCoursePayload = (payload: any) =>
  normalizePayloadList<LecturerCourse>(payload)
    .filter((course) => course?.id && `${course.status || ""}`.toUpperCase() !== "CANCELLED")
    .sort((left, right) =>
      `${left.code || ""}`.localeCompare(`${right.code || ""}`, "vi"),
    );

const fetchLecturerCoursesFrom = async (
  path: string,
  token?: string | null,
) => {
  const response = await fetch(path, {
    headers: getAuthHeaders(token),
  }).catch(() => null);

  if (!response?.ok) return [];

  const payload = await response.json().catch(() => []);
  return normalizeCoursePayload(payload);
};

const normalizeWeekSessionPayload = (payload: any) =>
  normalizePayloadList<LecturerWeekSession>(payload)
    .filter(
      (session) =>
        session?.id &&
        session?.courseClass?.id &&
        `${session.courseClass.status || ""}`.toUpperCase() !== "CANCELLED",
    )
    .sort((left, right) => {
      const leftDate = new Date(left.date || 0).getTime();
      const rightDate = new Date(right.date || 0).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return Number(left.startShift || 0) - Number(right.startShift || 0);
    });

const fetchLecturerWeekSessionsFrom = async (
  lecturerRef: string,
  token?: string | null,
  anchorDate = new Date(),
) => {
  const { startDateKey, endDateKey } = getWeekDateRange(anchorDate);
  const params = new URLSearchParams({
    startDate: startDateKey,
    endDate: endDateKey,
  });

  const response = await fetch(
    `/api/courses/sessions/lecturer/${encodeURIComponent(lecturerRef)}?${params.toString()}`,
    {
      headers: getAuthHeaders(token),
    },
  ).catch(() => null);

  if (!response?.ok) return [];

  const payload = await response.json().catch(() => []);
  return normalizeWeekSessionPayload(payload);
};

const mapWeekSessionToCourseSession = (
  session: LecturerWeekSession,
): LecturerCourseSession => ({
  id: session.id,
  courseClassId: session.courseClassId || session.courseClass?.id,
  date: session.date,
  startShift: session.startShift,
  endShift: session.endShift,
  type: session.type,
  room: session.room || null,
});

const mapWeekSessionToSchedule = (session: LecturerWeekSession) => {
  const jsDay = getJsDayFromDate(session.date);
  return {
    dayOfWeek: jsDay === 0 ? 8 : jsDay + 1,
    startShift: session.startShift,
    endShift: session.endShift,
    room: session.room || null,
    type: session.type || "THEORY",
  };
};

const mapWeekSessionsToCourses = (sessions: LecturerWeekSession[]) => {
  const courseMap = new Map<string, LecturerCourse>();

  sessions.forEach((session) => {
    const courseClass = session.courseClass;
    if (!courseClass?.id) return;

    const existing = courseMap.get(courseClass.id);
    const courseSession = mapWeekSessionToCourseSession(session);

    if (existing) {
      existing.sessions = [...(existing.sessions || []), courseSession];
      existing.schedules = [
        ...(existing.schedules || []),
        mapWeekSessionToSchedule(session),
      ];
      return;
    }

    courseMap.set(courseClass.id, {
      ...courseClass,
      currentSlots: Number(courseClass.currentSlots || 0),
      maxSlots: Number(courseClass.maxSlots || 0),
      sessions: [courseSession],
      schedules: [mapWeekSessionToSchedule(session)],
    });
  });

  return [...courseMap.values()].sort((left, right) => {
    const leftSession = left.sessions?.[0];
    const rightSession = right.sessions?.[0];
    const leftDate = new Date(leftSession?.date || 0).getTime();
    const rightDate = new Date(rightSession?.date || 0).getTime();
    if (leftDate !== rightDate) return leftDate - rightDate;

    const leftShift = Number(leftSession?.startShift || 0);
    const rightShift = Number(rightSession?.startShift || 0);
    if (leftShift !== rightShift) return leftShift - rightShift;

    return `${left.code || ""}`.localeCompare(`${right.code || ""}`, "vi");
  });
};

export const getSemesterLabel = (semester?: SemesterOption | null) =>
  semester?.name || semester?.code || "Học kỳ hiện tại";

export const getCurrentWeekLabel = (anchorDate = new Date()) => {
  const { startDate, endDate } = getWeekDateRange(anchorDate);
  return `${startDate.toLocaleDateString("vi-VN")} - ${endDate.toLocaleDateString("vi-VN")}`;
};

export const getLecturerCourseScopeLabel = (
  courses: LecturerCourse[],
  semester?: SemesterOption | null,
) => {
  const semesterCodes = new Set(
    courses
      .map((course) => course.semester?.code || course.semesterId || "")
      .filter(Boolean),
  );

  if (semesterCodes.size > 1) return "Tuần hiện tại";
  return getSemesterLabel(semester || courses[0]?.semester);
};

export const getLecturerFallbackRefs = (user: any) =>
  Array.from(
    new Set(
      [
        user?.profileId,
        user?.lecturerId,
        user?.lecturer?.id,
        user?.userId,
        user?.id,
      ]
        .map((value) => `${value || ""}`.trim())
        .filter(Boolean),
    ),
  );

export async function fetchCurrentSemester(
  token?: string | null,
): Promise<SemesterOption | null> {
  const response = await fetch("/api/semesters", {
    headers: getAuthHeaders(token),
  }).catch(() => null);

  if (!response?.ok) return null;

  const payload = await response.json().catch(() => []);
  const semesters = sortSemesters(normalizePayloadList<SemesterOption>(payload));

  return (
    semesters.find((semester) => semester.isCurrent) ||
    semesters.find((semester) => isWithinDateRange(semester)) ||
    semesters[0] ||
    null
  );
}

export async function fetchCurrentLecturerCourses(
  token?: string | null,
  lecturerRefs: string[] = [],
): Promise<{ courses: LecturerCourse[]; semester: SemesterOption | null }> {
  if (!token) return { courses: [], semester: null };

  const semester = await fetchCurrentSemester(token);
  const query = semester?.id
    ? `?semesterId=${encodeURIComponent(semester.id)}`
    : "";

  const primaryCourses = await fetchLecturerCoursesFrom(
    `/api/courses/my-classes${query}`,
    token,
  );

  if (primaryCourses.length > 0) {
    return { courses: primaryCourses, semester };
  }

  for (const lecturerRef of lecturerRefs) {
    const courses = await fetchLecturerCoursesFrom(
      `/api/courses/lecturer/${encodeURIComponent(lecturerRef)}${query}`,
      token,
    );

    if (courses.length > 0) {
      return { courses, semester };
    }
  }

  return { courses: [], semester };
}

export async function fetchLecturerWeekSessions(
  token?: string | null,
  lecturerRefs: string[] = [],
  anchorDate = new Date(),
) {
  if (!token) return [];

  for (const lecturerRef of lecturerRefs) {
    const sessions = await fetchLecturerWeekSessionsFrom(
      lecturerRef,
      token,
      anchorDate,
    );

    if (sessions.length > 0) return sessions;
  }

  return [];
}

export async function fetchCurrentLecturerTeachingCourses(
  token?: string | null,
  lecturerRefs: string[] = [],
  anchorDate = new Date(),
): Promise<{ courses: LecturerCourse[]; semester: SemesterOption | null }> {
  const sessions = await fetchLecturerWeekSessions(token, lecturerRefs, anchorDate);

  if (sessions.length > 0) {
    return { courses: mapWeekSessionsToCourses(sessions), semester: null };
  }

  return fetchCurrentLecturerCourses(token, lecturerRefs);
}

export function getTodaySessions(
  courses: LecturerCourse[],
  today = new Date(),
): LecturerCourseTodaySession[] {
  const todayKey = toDateOnly(today);

  return courses
    .flatMap((course) =>
      (course.sessions || [])
        .filter((session) => toDateOnly(session.date) === todayKey)
        .map((session) => ({ ...session, course })),
    )
    .sort((left, right) => {
      const leftShift = Number(left.startShift || 0);
      const rightShift = Number(right.startShift || 0);
      if (leftShift !== rightShift) return leftShift - rightShift;
      return Number(left.endShift || 0) - Number(right.endShift || 0);
    });
}

export function getCourseDayLabels(course: LecturerCourse) {
  const days = new Set<number>();

  (course.sessions || []).forEach((session) => {
    if (!session.date) return;
    const jsDay = getJsDayFromDate(session.date);
    days.add(jsDay === 0 ? 8 : jsDay + 1);
  });

  (course.schedules || []).forEach((schedule) => {
    if (schedule?.dayOfWeek) days.add(Number(schedule.dayOfWeek));
  });

  return [...days]
    .sort((left, right) => left - right)
    .map((day) => `T${day}`);
}
