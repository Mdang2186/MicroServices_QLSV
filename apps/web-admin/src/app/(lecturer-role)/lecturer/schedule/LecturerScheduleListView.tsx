"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  Info,
  MapPin,
  Printer,
  UserSquare2,
} from "lucide-react";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

type SemesterOption = {
  id: string;
  selectionKey: string;
  code?: string;
  name: string;
  startDate?: Date | null;
  endDate?: Date | null;
  sessionDates: Date[];
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
  { id: "study", label: "Giảng dạy" },
  { id: "exam", label: "Lịch thi" },
];

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
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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

const formatSemesterOptionLabel = (semester: Partial<SemesterOption>) => {
  const code = `${semester.code || ""}`.trim();
  const name = `${semester.name || ""}`.trim();
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

const getCurrentOrLatestStartedSemester = <T extends SemesterOption>(semesters: T[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const current = semesters.find((semester) => isCurrentSemester(semester));

  if (current) {
    return current;
  }

  return (
    [...semesters]
      .filter((semester) => {
        if (semester.startDate) {
          const startDate = new Date(semester.startDate);
          startDate.setHours(0, 0, 0, 0);
          return startDate <= today;
        }

        const lastSession = semester.sessionDates[semester.sessionDates.length - 1];
        if (!lastSession) return false;
        const sessionDate = new Date(lastSession);
        sessionDate.setHours(0, 0, 0, 0);
        return sessionDate <= today;
      })
      .sort((left, right) => getSemesterSortTime(right) - getSemesterSortTime(left))[0] || null
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

  return sessionDates.find((date) => date >= today) || sessionDates[0] || startDate || today;
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
const getTone = (type?: string) => (type === "EXAM" ? "border-amber-200 bg-amber-50 text-amber-800" : type === "PRACTICE" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-800");
const getRoomLabel = (room?: any, roomId?: string) => {
  const name = room?.name || roomId || "Chưa xếp phòng";
  return room?.building ? `${name} - ${room.building}` : name;
};

export default function LecturerScheduleListView() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [allSemesters, setAllSemesters] = useState<any[]>([]);
  const [semesterOptions, setSemesterOptions] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filter, setFilter] = useState("all");

  const token = Cookies.get("admin_accessToken");

  useEffect(() => {
    const raw = Cookies.get("admin_user");
    if (!raw) return;
    try {
      setUser(JSON.parse(raw));
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetch("/api/semesters", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setAllSemesters(Array.isArray(data) ? data : []))
      .catch(() => setAllSemesters([]));
  }, [token]);

  useEffect(() => {
    if (!user?.profileId) {
      setSemesterOptions([]);
      return;
    }

    fetch(`/api/courses/lecturer/${user.profileId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const classes = Array.isArray(data) ? data : [];
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

        classes.forEach((courseClass: any) => {
          const semester = courseClass.semester;
          const semesterId = courseClass.semesterId || semester?.id;
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
          (courseClass.sessions || [])
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

        const options = Array.from(map.values())
          .map(({ keys, ...semester }) => ({
            ...semester,
            sessionDates: [...semester.sessionDates].sort((left, right) => left.getTime() - right.getTime()),
          }))
          .sort((left, right) => getSemesterSortTime(right) - getSemesterSortTime(left));

        setSemesterOptions(limitToPastAndCurrentSemesters(options));
      })
      .catch(() => setSemesterOptions([]));
  }, [allSemesters, token, user]);

  useEffect(() => {
    if (!semesterOptions.length) {
      setSelectedSemesterId("");
      return;
    }

    const currentWithSessions = semesterOptions.find(
      (semester) => isCurrentSemester(semester) && semester.sessionDates.length > 0,
    );
    const latestWithSessions =
      [...semesterOptions]
        .filter((semester) => semester.sessionDates.length > 0)
        .sort((left, right) => getSemesterSortTime(right) - getSemesterSortTime(left))[0] || null;
    const preferred =
      currentWithSessions ||
      latestWithSessions ||
      getCurrentOrLatestStartedSemester(semesterOptions) ||
      semesterOptions.find((semester) => semester.sessionDates.length > 0) ||
      semesterOptions[0];

    setSelectedSemesterId((value) =>
      semesterOptions.some((semester) => semester.selectionKey === value)
        ? value
        : preferred.selectionKey,
    );
  }, [semesterOptions]);

  useEffect(() => {
    const selectedSemester = semesterOptions.find(
      (semester) => semester.selectionKey === selectedSemesterId,
    );
    const semesterRef =
      selectedSemester?.code || selectedSemester?.selectionKey || selectedSemester?.id || selectedSemesterId;

    if (!user?.profileId || !semesterRef) {
      setSchedule([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/courses/schedule/lecturer/${user.profileId}?semesterId=${encodeURIComponent(semesterRef)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => setSchedule(Array.isArray(data) ? data : []))
      .catch(() => setSchedule([]))
      .finally(() => setLoading(false));
  }, [selectedSemesterId, semesterOptions, token, user]);

  const selectedSemester = useMemo(
    () => semesterOptions.find((semester) => semester.selectionKey === selectedSemesterId) || null,
    [semesterOptions, selectedSemesterId],
  );

  const headerSemesterOptions = useMemo(
    () =>
      semesterOptions.map((semester) => ({
        id: semester.id,
        selectionKey: semester.selectionKey,
        code: semester.code,
        name: semester.name,
        isCurrent: isCurrentSemester(semester),
        startDate: semester.startDate?.toISOString(),
        endDate: semester.endDate?.toISOString(),
      })),
    [semesterOptions],
  );

  useEffect(() => {
    if (selectedSemester) {
      setSelectedDate(pickSemesterAnchorDate(selectedSemester));
    }
  }, [selectedSemester]);

  const weekDays = useMemo(() => {
    const start = getWeekStart(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(start, index));
  }, [selectedDate]);

  const weeklyGroups = useMemo(
    () =>
      DAYS.map((day, index) => {
        const date = weekDays[index];
        const items = schedule
          .filter((session) => {
            if (!sameDate(session.date, date)) return false;
            if (filter === "study" && session.type === "EXAM") return false;
            if (filter === "exam" && session.type !== "EXAM") return false;
            return true;
          })
          .sort((left, right) => Number(left.startShift) - Number(right.startShift))
          .map((session) => ({
            id: session.id,
            subjectName: session.courseClass?.subject?.name || session.courseClass?.name,
            className: session.courseClass?.name || session.courseClass?.code,
            classId: session.courseClassId,
            roomLabel: getRoomLabel(session.room, session.roomId),
            startShift: Number(session.startShift),
            endShift: Number(session.endShift),
            type: session.type || "THEORY",
          }));

        return { ...day, date, items };
      }),
    [filter, schedule, weekDays],
  );

  const changeWeek = (offset: number) => {
    setSelectedDate((current) => addDays(current, offset));
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl space-y-4 bg-[#fbfcfd] p-4 pb-20 md:p-6">
      <CompactLecturerHeader
        userName={`${user?.degree || "Giảng viên"} ${user?.fullName || ""}`.trim()}
        userId={`GV-${user?.username || "UNETI"}`}
        minimal
        title="Lịch giảng dạy"
        onSemesterChange={setSelectedSemesterId}
        selectedSemesterId={selectedSemesterId}
        semesterOptions={headerSemesterOptions}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-600">Lịch giảng dạy theo tuần</div>
            <h1 className="mt-1 text-2xl font-black text-slate-900">Danh sách buổi dạy</h1>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Xem theo danh sách 7 ngày trong tuần, có đủ Chủ nhật và lọc theo học kỳ đã chọn.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-semibold text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              {FILTERS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  className={`rounded-md px-2 py-1 ${filter === item.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-2">
              <button onClick={() => changeWeek(-7)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-2 text-center">
                <div className="text-[12px] font-black text-slate-800">
                  Tuần {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  đến {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                </div>
              </div>
              <button onClick={() => changeWeek(7)} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {selectedSemester && (
        <section className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">
          Đang xem lịch của <span className="font-black text-blue-700">{formatSemesterOptionLabel(selectedSemester)}</span>
          {selectedSemester.startDate && selectedSemester.endDate && (
            <span className="ml-2 text-slate-500">
              ({selectedSemester.startDate.toLocaleDateString("vi-VN")} - {selectedSemester.endDate.toLocaleDateString("vi-VN")})
            </span>
          )}
        </section>
      )}

      {selectedSemester && !isDateWithinSemester(selectedDate, selectedSemester) && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
          Tuần đang xem nằm ngoài học kỳ đã chọn. Hãy quay lại tuần có lịch bằng nút <span className="font-black">Hôm nay</span>.
        </section>
      )}

      {selectedSemester && schedule.length === 0 && (
        <section className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600">
          Học kỳ đang chọn chưa có buổi dạy nào được xếp lịch.
        </section>
      )}

      <section className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            const today = new Date();
            setSelectedDate(
              isDateWithinSemester(today, selectedSemester)
                ? today
                : selectedSemester
                  ? pickSemesterAnchorDate(selectedSemester)
                  : today,
            );
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm"
        >
          <CalendarCheck className="h-4 w-4" />
          Hôm nay
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">
          <Printer className="h-4 w-4" />
          Xuất PDF
        </button>
      </section>

      <section className="space-y-3">
        {weeklyGroups.map((group) => (
          <article key={group.value} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <div className="text-sm font-black text-slate-900">{group.name}</div>
                <div className="text-xs font-semibold text-slate-500">
                  {group.date.toLocaleDateString("vi-VN", {
                    weekday: "long",
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-500">{group.items.length} mục</div>
            </div>

            {group.items.length === 0 ? (
              <div className="px-4 py-4 text-sm font-medium text-slate-500">Không có buổi dạy nào trong ngày này.</div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {group.items.map((item: any) => (
                  <li key={item.id} className="px-4 py-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-md border px-2 py-1 text-[11px] font-black uppercase ${getTone(item.type)}`}>
                            {item.type === "EXAM" ? "Lịch thi" : item.type === "PRACTICE" ? "Thực hành" : "Lý thuyết"}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">{getBucket(item.startShift)}</span>
                        </div>
                        <div className="mt-2 text-base font-black text-slate-900">{item.subjectName}</div>
                        <Link href={`/lecturer/courses/${item.classId}`} className="mt-1 inline-block text-sm font-semibold text-blue-700 hover:underline">
                          {item.className}
                        </Link>
                      </div>

                      <div className="grid gap-2 text-sm font-semibold text-slate-600 sm:grid-cols-3 lg:min-w-[520px]">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Clock3 className="h-3.5 w-3.5" />Tiết học</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{item.startShift} - {item.endShift}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400"><MapPin className="h-3.5 w-3.5" />Phòng</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{item.roomLabel}</div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                          <div className="inline-flex items-center gap-2 text-xs font-black uppercase text-slate-400"><UserSquare2 className="h-3.5 w-3.5" />Ca</div>
                          <div className="mt-1 text-sm font-black text-slate-800">{getBucket(item.startShift)}</div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded-sm border border-slate-200 bg-white" />Lý thuyết</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded-sm border border-emerald-200 bg-emerald-50" />Thực hành</span>
          <span className="inline-flex items-center gap-2"><span className="h-3 w-6 rounded-sm border border-amber-200 bg-amber-50" />Lịch thi</span>
        </div>
        <div className="inline-flex items-center gap-2"><Info className="h-4 w-4 text-blue-500" />Lịch lấy trực tiếp từ các buổi học đã xếp.</div>
      </section>
    </div>
  );
}
