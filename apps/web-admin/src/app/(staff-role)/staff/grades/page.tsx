"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  Edit3,
  GraduationCap,
  Layers3,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";

type Semester = {
  id: string;
  code?: string;
  name: string;
  isCurrent?: boolean;
  startDate?: string;
  endDate?: string;
};

type Faculty = {
  id: string;
  code?: string;
  name: string;
};

type Major = {
  id: string;
  code?: string;
  name: string;
  facultyId?: string;
  faculty?: Faculty | null;
};

type Cohort = {
  code: string;
  startYear?: number;
  endYear?: number;
  isActive?: boolean;
};

type CourseClass = {
  id: string;
  code?: string;
  name?: string;
  cohort?: string;
  semesterId?: string;
  semester?: Semester | null;
  lecturer?: {
    fullName?: string;
    user?: { fullName?: string };
  } | null;
  subject?: {
    code?: string;
    name?: string;
    credits?: number;
    majorId?: string;
    major?: Major | null;
    department?: {
      code?: string;
      name?: string;
    } | null;
  } | null;
  adminClasses?: Array<{
    code?: string;
    name?: string;
  }>;
  _count?: {
    enrollments?: number;
  };
  currentSlots?: number;
  maxSlots?: number;
};

const viDateFormatter = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const getAuthHeaders = (token?: string): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const toDateInputValue = (value: Date | string | null | undefined) => {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value: string) => {
  const [year, month, day] = value.split("-").map((item) => Number(item));
  if (!year || !month || !day) return null;

  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;

  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const containsDate = (semester: Semester, dateValue: string) => {
  const selectedDate = parseDateInputValue(dateValue);
  if (!selectedDate) return false;

  const startDate = semester.startDate ? new Date(semester.startDate) : null;
  const endDate = semester.endDate ? new Date(semester.endDate) : null;

  if (!startDate || !endDate) return false;

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  return selectedDate >= startDate && selectedDate <= endDate;
};

const sortSemesters = (semesters: Semester[]) =>
  [...semesters].sort((left, right) => {
    const leftTime = new Date(left.startDate || 0).getTime();
    const rightTime = new Date(right.startDate || 0).getTime();
    return rightTime - leftTime;
  });

const formatDateLabel = (value: string) => {
  const date = parseDateInputValue(value);
  return date ? viDateFormatter.format(date) : value;
};

const getStudentCount = (course: CourseClass) =>
  Number(course._count?.enrollments ?? course.currentSlots ?? 0);

const getLecturerName = (course: CourseClass) =>
  course.lecturer?.fullName ||
  course.lecturer?.user?.fullName ||
  "Chưa phân công";

const getFacultyLabel = (course: CourseClass) =>
  course.subject?.major?.faculty?.name ||
  course.subject?.major?.faculty?.code ||
  "Chưa gắn khoa";

const getMajorLabel = (course: CourseClass) =>
  course.subject?.major?.name || "Chưa gắn ngành";

const getAdminClassLabel = (course: CourseClass) => {
  const items = (course.adminClasses || [])
    .map((item) => item.code || item.name)
    .filter(Boolean);
  return items.length > 0 ? items.join(", ") : "Chưa gắn lớp hành chính";
};

const sortCourses = (courses: CourseClass[]) =>
  [...courses].sort((left, right) => {
    const leftSemesterTime = new Date(left.semester?.startDate || 0).getTime();
    const rightSemesterTime = new Date(right.semester?.startDate || 0).getTime();

    if (leftSemesterTime !== rightSemesterTime) {
      return rightSemesterTime - leftSemesterTime;
    }

    return `${left.code || ""}`.localeCompare(`${right.code || ""}`, "vi");
  });

async function fetchAllCourses(
  token: string,
  filters: {
    semesterId?: string;
    facultyId: string;
    majorId: string;
    cohort: string;
    search: string;
  },
) {
  const collected: CourseClass[] = [];
  let page = 1;
  let lastPage = 1;

  do {
    const params = new URLSearchParams({
      page: `${page}`,
      limit: "200",
    });

    if (filters.semesterId) params.set("semesterId", filters.semesterId);
    if (filters.facultyId) params.set("facultyId", filters.facultyId);
    if (filters.majorId) params.set("majorId", filters.majorId);
    if (filters.cohort) params.set("cohort", filters.cohort);
    if (filters.search) params.set("search", filters.search);

    const response = await fetch(`/api/courses?${params.toString()}`, {
      headers: getAuthHeaders(token),
    });

    if (!response.ok) {
      throw new Error("Không thể tải danh sách lớp học phần.");
    }

    const payload = await response.json();
    const data = Array.isArray(payload) ? payload : payload?.data || [];
    const metadata = Array.isArray(payload) ? null : payload?.metadata;

    collected.push(...data);
    lastPage = Math.max(Number(metadata?.lastPage || 1), 1);
    page += 1;
  } while (page <= lastPage);

  return collected;
}

export default function StaffGradeManagementPage() {
  const router = useRouter();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [majors, setMajors] = useState<Major[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [courses, setCourses] = useState<CourseClass[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [advancedSearch, setAdvancedSearch] = useState("");
  const [bootLoading, setBootLoading] = useState(true);
  const [courseLoading, setCourseLoading] = useState(false);
  const [filterError, setFilterError] = useState("");

  const token = Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");
  const deferredSearch = useDeferredValue(advancedSearch.trim());
  const isGlobalSearch = deferredSearch.length > 0;

  useEffect(() => {
    if (!token) {
      setBootLoading(false);
      return;
    }

    let cancelled = false;

    const bootstrap = async () => {
      setBootLoading(true);
      try {
        const headers = getAuthHeaders(token);
        const [semesterResponse, facultyResponse, majorResponse, cohortResponse] =
          await Promise.all([
            fetch("/api/semesters", { headers }),
            fetch("/api/faculties", { headers }),
            fetch("/api/majors", { headers }),
            fetch("/api/cohorts", { headers }),
          ]);

        const semesterPayload = semesterResponse.ok ? await semesterResponse.json() : [];
        const facultyPayload = facultyResponse.ok ? await facultyResponse.json() : [];
        const majorPayload = majorResponse.ok ? await majorResponse.json() : [];
        const cohortPayload = cohortResponse.ok ? await cohortResponse.json() : [];

        if (cancelled) return;

        setSemesters(sortSemesters(Array.isArray(semesterPayload) ? semesterPayload : []));
        setFaculties(Array.isArray(facultyPayload) ? facultyPayload : []);
        setMajors(Array.isArray(majorPayload) ? majorPayload : []);
        setCohorts(Array.isArray(cohortPayload) ? cohortPayload : []);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setSemesters([]);
          setFaculties([]);
          setMajors([]);
          setCohorts([]);
          setCourses([]);
          setFilterError("Không thể khởi tạo trang quản lý điểm học tập.");
        }
      } finally {
        if (!cancelled) {
          setBootLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const visibleMajors = useMemo(() => {
    const majorList = selectedFacultyId
      ? majors.filter(
        (major) =>
          (major.facultyId || major.faculty?.id || "") === selectedFacultyId,
      )
      : majors;

    return [...majorList].sort((left, right) =>
      `${left.name || ""}`.localeCompare(`${right.name || ""}`, "vi"),
    );
  }, [majors, selectedFacultyId]);

  const matchedSemesters = useMemo(
    () => semesters.filter((semester) => containsDate(semester, selectedDate)),
    [selectedDate, semesters],
  );

  const matchedSemesterIds = useMemo(
    () => matchedSemesters.map((semester) => semester.id),
    [matchedSemesters],
  );

  const displayedSemesterCount = useMemo(() => {
    if (!isGlobalSearch) return matchedSemesters.length;

    return new Set(
      courses
        .map((course) => course.semester?.id || course.semesterId)
        .filter(Boolean),
    ).size;
  }, [courses, isGlobalSearch, matchedSemesters.length]);

  useEffect(() => {
    if (!selectedMajorId) return;

    const exists = visibleMajors.some((major) => major.id === selectedMajorId);
    if (!exists) {
      setSelectedMajorId("");
    }
  }, [selectedMajorId, visibleMajors]);

  useEffect(() => {
    if (!token) return;
    if (!isGlobalSearch && matchedSemesterIds.length === 0) {
      setCourses([]);
      setCourseLoading(false);
      return;
    }

    let cancelled = false;

    const loadCourses = async () => {
      setCourseLoading(true);
      setFilterError("");

      try {
        const requests = isGlobalSearch
          ? [
            fetchAllCourses(token, {
              facultyId: selectedFacultyId,
              majorId: selectedMajorId,
              cohort: selectedCohort,
              search: deferredSearch,
            }),
          ]
          : matchedSemesterIds.map((semesterId) =>
            fetchAllCourses(token, {
              semesterId,
              facultyId: selectedFacultyId,
              majorId: selectedMajorId,
              cohort: selectedCohort,
              search: deferredSearch,
            }),
          );

        const results = await Promise.allSettled(requests);

        if (cancelled) return;

        const nextCourses: CourseClass[] = [];
        let failedSegments = 0;

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            nextCourses.push(...result.value);
            return;
          }

          failedSegments += 1;
          console.error(result.reason);
        });

        const deduped = sortCourses(
          [...new Map(nextCourses.map((course) => [course.id, course])).values()],
        );

        setCourses(deduped);

        if (failedSegments > 0) {
          setFilterError(
            "Một phần dữ liệu lớp học phần không tải được. Trang đang hiển thị các kết quả còn lại.",
          );
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setCourses([]);
          setFilterError("Không thể tải danh sách lớp học phần theo bộ lọc hiện tại.");
        }
      } finally {
        if (!cancelled) {
          setCourseLoading(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [
    isGlobalSearch,
    deferredSearch,
    matchedSemesterIds,
    selectedCohort,
    selectedFacultyId,
    selectedMajorId,
    token,
  ]);

  const resetFilters = () => {
    setSelectedDate(toDateInputValue(new Date()));
    setSelectedFacultyId("");
    setSelectedCohort("");
    setSelectedMajorId("");
    setAdvancedSearch("");
  };

  const openAttendance = (courseId: string) => {
    router.push(`/staff/attendance/${courseId}`);
  };

  const openGradeEntry = (courseId: string) => {
    router.push(`/staff/grades/${courseId}`);
  };

  if (bootLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb]">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-uneti-blue/10 border-t-uneti-blue" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-0 flex-col bg-[#f6f8fb]">
      <header className="flex-shrink-0 border-b border-slate-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Edit3 size={18} className="flex-shrink-0 text-uneti-blue" />
              <h1 className="truncate text-[16px] font-black tracking-tight text-slate-900">
                Quản lý điểm học tập
              </h1>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-black text-slate-700">
              {formatDateLabel(selectedDate)}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-black text-slate-700">
              {courses.length} lớp học phần
            </span>
            <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[12px] font-black text-uneti-blue">
              {isGlobalSearch
                ? `${displayedSemesterCount} học kỳ có kết quả`
                : `${matchedSemesters.length} học kỳ tương ứng`}
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[170px_1fr_1fr_1fr_2fr_auto]">
          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="mt-1 w-full border-0 bg-transparent p-0 text-[12px] font-black text-slate-900 outline-none"
            />
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

            <select
              value={selectedFacultyId}
              onChange={(event) => setSelectedFacultyId(event.target.value)}
              className="mt-1 w-full appearance-none border-0 bg-transparent p-0 text-[12px] font-black text-slate-900 outline-none"
            >
              <option value="">Tất cả khoa</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

            <select
              value={selectedCohort}
              onChange={(event) => setSelectedCohort(event.target.value)}
              className="mt-1 w-full appearance-none border-0 bg-transparent p-0 text-[12px] font-black text-slate-900 outline-none"
            >
              <option value="">Tất cả khóa</option>
              {cohorts.map((cohort) => (
                <option key={cohort.code} value={cohort.code}>
                  {cohort.code}
                  {cohort.startYear && cohort.endYear
                    ? ` (${cohort.startYear}-${cohort.endYear})`
                    : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

            <select
              value={selectedMajorId}
              onChange={(event) => {
                const nextMajorId = event.target.value;
                setSelectedMajorId(nextMajorId);

                const selectedMajor = majors.find((major) => major.id === nextMajorId);
                if (selectedMajor?.facultyId) {
                  setSelectedFacultyId(selectedMajor.facultyId);
                }
              }}
              className="mt-1 w-full appearance-none border-0 bg-transparent p-0 text-[12px] font-black text-slate-900 outline-none"
            >
              <option value="">Tất cả ngành</option>
              {visibleMajors.map((major) => (
                <option key={major.id} value={major.id}>
                  {major.name}
                </option>
              ))}
            </select>
          </label>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">

            <div className="mt-1 flex items-center gap-2">
              <Search size={15} className="text-slate-400" />
              <input
                type="text"
                value={advancedSearch}
                onChange={(event) => setAdvancedSearch(event.target.value)}
                placeholder="Mã lớp, mã HP, học phần, giảng viên..."
                className="w-full border-0 bg-transparent p-0 text-[12px] font-bold text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12px] font-black text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            Đặt lại
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
          {isGlobalSearch ? (
            <span>
              Đang tìm trên toàn bộ học kỳ với từ khóa <strong>{deferredSearch}</strong>.
            </span>
          ) : matchedSemesters.length > 0 ? (
            <span>
              Ngày {formatDateLabel(selectedDate)} thuộc{" "}
              {matchedSemesters.map((semester) => semester.code || semester.name).join(", ")}.
            </span>
          ) : (
            <span>Ngày {formatDateLabel(selectedDate)} hiện không nằm trong học kỳ nào.</span>
          )}
          {filterError ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 font-bold text-amber-700">
              {filterError}
            </span>
          ) : null}
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {courseLoading ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white text-center shadow-sm">
            <div className="mb-4 h-9 w-9 animate-spin rounded-full border-4 border-slate-100 border-t-uneti-blue" />
            <p className="text-[13px] font-bold text-slate-500">Đang tải lớp học phần...</p>
          </div>
        ) : !isGlobalSearch && matchedSemesters.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 text-center shadow-sm">
            <CalendarDays size={36} className="mb-4 text-slate-300" />
            <h3 className="text-[16px] font-black text-slate-800">
              Ngày chưa thuộc học kỳ nào
            </h3>
            <p className="mt-2 max-w-[520px] text-[13px] font-medium leading-6 text-slate-500">
              Hãy chọn một ngày khác để hệ thống xác định học kỳ và tải danh sách lớp học phần.
            </p>
          </div>
        ) : courses.length === 0 ? (
          <div className="flex h-full min-h-[360px] flex-col items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white px-6 text-center shadow-sm">
            <Search size={36} className="mb-4 text-slate-300" />
            <h3 className="text-[16px] font-black text-slate-800">
              Không có lớp học phần phù hợp
            </h3>
            <p className="mt-2 max-w-[520px] text-[13px] font-medium leading-6 text-slate-500">
              {isGlobalSearch
                ? "Không tìm thấy lớp học phần nào khớp với từ khóa hiện tại. Hãy thử mã lớp, mã học phần, học phần, giảng viên, khoa, ngành hoặc lớp hành chính."
                : "Bộ lọc hiện tại chưa trả về lớp học phần nào. Hãy nới điều kiện lọc hoặc đổi ngày."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-4 py-3">
              <div>
                <h2 className="text-[15px] font-black text-slate-900">
                  Danh sách lớp học phần
                </h2>

              </div>

            </div>

            <div className="divide-y divide-slate-100">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="grid gap-3 px-4 py-3 transition-all hover:bg-blue-50/30 xl:grid-cols-[1fr_auto]"
                >
                  <button
                    type="button"
                    onClick={() => openGradeEntry(course.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-uneti-blue text-[12px] font-black text-white shadow-md shadow-uneti-blue/20">
                        {getStudentCount(course)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-uneti-blue">
                            {course.semester?.code || course.semester?.name || "Học kỳ"}
                          </span>
                          {course.cohort ? (
                            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500">
                              {course.cohort}
                            </span>
                          ) : null}
                          {course.subject?.credits ? (
                            <span className="rounded-full border border-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-500">
                              {course.subject.credits} TC
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2 line-clamp-1 text-[15px] font-black text-slate-900">
                          {course.subject?.name || course.name || "Lớp học phần"}
                        </div>
                        <div className="mt-1 text-[12px] font-bold text-slate-500">
                          {course.code || "Chưa có mã lớp"} •{" "}
                          {course.subject?.code || "Chưa có mã HP"}
                        </div>
                        <div className="mt-2 grid gap-1 text-[11px] font-medium text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                          <span>GV: {getLecturerName(course)}</span>
                          <span>Khoa: {getFacultyLabel(course)}</span>
                          <span>Ngành: {getMajorLabel(course)}</span>
                          <span>Lớp HC: {getAdminClassLabel(course)}</span>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => openAttendance(course.id)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-black text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-uneti-blue"
                    >
                      <ClipboardList size={15} />
                      Xem điểm danh
                    </button>
                    <button
                      type="button"
                      onClick={() => openGradeEntry(course.id)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-uneti-blue px-4 text-[12px] font-black text-white shadow-md shadow-uneti-blue/20 transition-all hover:scale-[1.02]"
                    >
                      <Edit3 size={15} />
                      Nhập điểm học tập
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
