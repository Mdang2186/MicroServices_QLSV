"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  QrCode,
  Save,
  Search,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AttendanceStatus = "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED";

const statusOptions: Array<{
  value: AttendanceStatus;
  label: string;
  className: string;
}> = [
  {
    value: "PRESENT",
    label: "Có mặt",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "ABSENT_EXCUSED",
    label: "Vắng phép",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    value: "ABSENT_UNEXCUSED",
    label: "Không phép",
    className: "border-rose-200 bg-rose-50 text-rose-700",
  },
];

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseAttendanceNote = (note?: string | null) => {
  if (!note) return { manualNote: "", meta: {} as any };

  try {
    const parsed = JSON.parse(note);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        manualNote: `${parsed.manualNote || ""}`,
        meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
      };
    }
  } catch {
    // Legacy plain text note.
  }

  return { manualNote: `${note}`, meta: {} as any };
};

const normalizeAttendance = (attendance: any) => {
  if (!attendance) return null;
  const parsed = parseAttendanceNote(attendance.note);
  return {
    ...attendance,
    note: parsed.manualNote,
    ...parsed.meta,
  };
};

const formatAttendanceMethod = (attendance: any) => {
  if (attendance?.method === "QR_GEO") return "Sinh viên quét QR code + GPS";
  if (attendance?.method === "QR") return "Sinh viên quét QR code";
  return "Giảng viên/Cán bộ nhập thủ công";
};

const getAttendanceSourceStyle = (attendance: any) => {
  if (attendance?.method === "QR_GEO" || attendance?.method === "QR") {
    return "bg-indigo-50 text-indigo-700 border-indigo-100";
  }
  return "bg-amber-50 text-amber-700 border-amber-100";
};

const normalizeNote = (value?: string | null) => value?.trim() || "";

const getDateKey = (value: unknown) => {
  const raw = `${value || ""}`;
  if (!raw) return "";
  if (raw.includes("T")) return raw.slice(0, 10);

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw.slice(0, 10) : toDateInputValue(parsed);
};

export default function StaffAttendancePage() {
  const params = useParams();
  const classId = `${params?.id || ""}`;
  const router = useRouter();

  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [baseline, setBaseline] = useState<any[]>([]);
  const [courseClass, setCourseClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [date, setDate] = useState(() => toDateInputValue(new Date()));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | "ALL">("ALL");

  const token = Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");

  const fetchData = useCallback(async () => {
    if (!classId || !token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [enrollmentRes, classRes] = await Promise.all([
        fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, { headers }),
        fetch(`/api/courses/classes/${classId}`, { headers }),
      ]);

      if (!enrollmentRes.ok || !classRes.ok) {
        throw new Error("Không thể tải dữ liệu điểm danh.");
      }

      const [data, classData] = await Promise.all([
        enrollmentRes.json(),
        classRes.json(),
      ]);

      const transformed = (Array.isArray(data) ? data : []).map((item: any) => {
        const existingAttendance = normalizeAttendance(
          item.attendances?.find((attendance: any) =>
            `${attendance.date || ""}`.startsWith(date),
          ),
        );

        return {
          ...item,
          currentStatus: existingAttendance?.status || "PRESENT",
          note: existingAttendance?.note || "",
          currentAttendance: existingAttendance,
        };
      });

      setCourseClass(classData);
      setEnrollments(transformed);
      setBaseline(transformed.map((item: any) => ({ ...item })));
    } catch (error) {
      console.error(error);
      setEnrollments([]);
      setBaseline([]);
      setMessage("Không thể tải dữ liệu điểm danh.");
    } finally {
      setLoading(false);
    }
  }, [classId, date, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dirtyCount = useMemo(() => {
    const baselineMap = new Map(baseline.map((item) => [item.id, item]));
    return enrollments.filter((item) => {
      const old = baselineMap.get(item.id);
      if (!old) return false;
      return (
        item.currentStatus !== old.currentStatus ||
        normalizeNote(item.note) !== normalizeNote(old.note)
      );
    }).length;
  }, [baseline, enrollments]);

  const scheduledDateMeta = useMemo(() => {
    const map = new Map<string, { sessions: any[]; periods: number }>();

    if (!Array.isArray(courseClass?.sessions)) return map;

    courseClass.sessions.forEach((session: any) => {
      const key = getDateKey(session.date);
      if (!key) return;

      const current = map.get(key) || { sessions: [], periods: 0 };
      current.sessions.push(session);
      current.periods += Math.max(
        Number(session.endShift) - Number(session.startShift) + 1,
        0,
      );
      map.set(key, current);
    });

    return map;
  }, [courseClass]);

  const scheduledSessions = scheduledDateMeta.get(date)?.sessions || [];

  const hasScheduledSession = scheduledSessions.length > 0;

  const scheduledPeriods = scheduledDateMeta.get(date)?.periods || 0;

  const calendarDays = useMemo(() => {
    const firstDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const startOffset = firstDate.getDay() === 0 ? 6 : firstDate.getDay() - 1;

    return Array.from({ length: 42 }).map((_, index) => {
      const day = new Date(
        viewDate.getFullYear(),
        viewDate.getMonth(),
        index - startOffset + 1,
      );
      const key = toDateInputValue(day);
      return {
        key,
        day,
        isCurrentMonth: day.getMonth() === viewDate.getMonth(),
        hasSchedule: scheduledDateMeta.has(key),
        meta: scheduledDateMeta.get(key),
      };
    });
  }, [scheduledDateMeta, viewDate]);

  const stats = useMemo(() => {
    if (!hasScheduledSession) {
      return { total: 0, present: 0, excused: 0, unexcused: 0, rate: 0 };
    }

    const total = enrollments.length;
    const present = enrollments.filter((item) => item.currentStatus === "PRESENT").length;
    const excused = enrollments.filter((item) => item.currentStatus === "ABSENT_EXCUSED").length;
    const unexcused = enrollments.filter((item) => item.currentStatus === "ABSENT_UNEXCUSED").length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { total, present, excused, unexcused, rate };
  }, [enrollments, hasScheduledSession]);

  const filtered = useMemo(
    () => {
      if (!hasScheduledSession) return [];

      return enrollments.filter((item) => {
        const query = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !query ||
          item.student?.fullName?.toLowerCase().includes(query) ||
          item.student?.studentCode?.toLowerCase().includes(query);
        const matchesStatus =
          filterStatus === "ALL" || item.currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
      });
    },
    [enrollments, filterStatus, hasScheduledSession, searchQuery],
  );

  const updateStatus = (enrollmentId: string, status: AttendanceStatus) => {
    if (!hasScheduledSession) return;

    setEnrollments((current) =>
      current.map((item) =>
        item.id === enrollmentId ? { ...item, currentStatus: status } : item,
      ),
    );
  };

  const updateNote = (enrollmentId: string, note: string) => {
    if (!hasScheduledSession) return;

    setEnrollments((current) =>
      current.map((item) => (item.id === enrollmentId ? { ...item, note } : item)),
    );
  };

  const markAllPresent = () => {
    if (!hasScheduledSession) return;

    setEnrollments((current) =>
      current.map((item) => ({ ...item, currentStatus: "PRESENT" as AttendanceStatus })),
    );
  };

  const saveAttendance = async () => {
    if (!token || !classId) return;
    if (!hasScheduledSession) {
      setMessage("Ngày được chọn không có lịch học, không thể tạo dữ liệu điểm danh.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/enrollments/attendance/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date,
          classId,
          method: "MANUAL",
          attendances: enrollments.map((item) => ({
            enrollmentId: item.id,
            status: item.currentStatus,
            note: normalizeNote(item.note),
          })),
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      setMessage("Đã lưu điểm danh và đồng bộ lại điểm chuyên cần.");
      await fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Không thể lưu dữ liệu điểm danh.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-uneti-blue" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] min-h-0 flex-col bg-[#f6f8fb]">
      <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="h-8 rounded-xl border border-slate-200 px-3 text-[11px] font-black text-slate-600"
              >
                <ArrowLeft size={14} className="mr-1.5" />
                Quay lại
              </Button>
              <h1 className="truncate text-[16px] font-black text-slate-900">
                Dữ liệu điểm danh
              </h1>
            </div>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              {courseClass?.subject?.name || courseClass?.name || "Lớp học phần"} •{" "}
              {courseClass?.code || classId}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-black text-slate-700">
              {stats.present}/{stats.total} có mặt
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[12px] font-black text-blue-700">
              {stats.excused} vắng phép
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[12px] font-black text-rose-700">
              {stats.unexcused} không phép
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-black text-emerald-700">
              {stats.rate}% chuyên cần
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-[12px] font-black",
                hasScheduledSession
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              {hasScheduledSession
                ? `${scheduledSessions.length} buổi • ${scheduledPeriods} tiết`
                : "Không có lịch học"}
            </span>
          </div>
        </div>

        <div className="mt-3 grid gap-2 lg:grid-cols-[180px_1fr_auto_auto]">
          <div className="relative rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setViewDate(new Date(`${date}T00:00:00`));
                setIsCalendarOpen((current) => !current);
              }}
              className="block w-full text-left"
            >
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                <CalendarDays size={13} />
                Ngày
              </div>
              <div className="mt-1 flex items-center justify-between gap-3">
                <span className="text-[12px] font-black text-slate-900">
                  {new Date(`${date}T00:00:00`).toLocaleDateString("vi-VN")}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[9px] font-black",
                    hasScheduledSession
                      ? "bg-indigo-50 text-indigo-700"
                      : "bg-amber-50 text-amber-700",
                  )}
                >
                  {hasScheduledSession ? "Có lịch" : "Không lịch"}
                </span>
              </div>
            </button>

            {isCalendarOpen ? (
              <div className="absolute left-0 top-[calc(100%+8px)] z-50 w-[320px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
                <div className="mb-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1),
                      )
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="text-[12px] font-black uppercase tracking-widest text-slate-800">
                    Tháng {viewDate.getMonth() + 1}/{viewDate.getFullYear()}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setViewDate(
                        new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1),
                      )
                    }
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="mb-2 grid grid-cols-7 gap-1 text-center">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                    <div
                      key={label}
                      className="text-[9px] font-black uppercase text-slate-300"
                    >
                      {label}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((item) => {
                    const isSelected = item.key === date;
                    const isToday = item.key === toDateInputValue(new Date());

                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          setDate(item.key);
                          setIsCalendarOpen(false);
                        }}
                        title={
                          item.hasSchedule
                            ? `${item.meta?.sessions.length || 0} buổi, ${item.meta?.periods || 0} tiết`
                            : "Không có lịch học"
                        }
                        className={cn(
                          "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-[11px] font-black transition-all",
                          item.isCurrentMonth ? "text-slate-700" : "text-slate-300",
                          item.hasSchedule
                            ? "border-indigo-200 bg-indigo-50 hover:bg-indigo-100"
                            : "border-transparent bg-white hover:bg-slate-50",
                          isSelected && "border-slate-900 bg-slate-900 text-white hover:bg-slate-900",
                          isToday && !isSelected && "ring-1 ring-emerald-300",
                        )}
                      >
                        <span>{item.day.getDate()}</span>
                        {item.hasSchedule ? (
                          <span
                            className={cn(
                              "absolute bottom-1 h-1.5 w-1.5 rounded-full",
                              isSelected ? "bg-white" : "bg-indigo-600",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex items-center gap-2 text-[10px] font-bold text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-indigo-600" />
                  Ngày có lịch học được đánh dấu. Chỉ những ngày này mới mở danh sách điểm danh.
                </div>
              </div>
            ) : null}
          </div>

          <label className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
              <Search size={13} />
              Tìm kiếm
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              disabled={!hasScheduledSession}
              placeholder="Mã sinh viên, họ tên..."
              className="mt-1 w-full border-0 bg-transparent p-0 text-[12px] font-bold text-slate-900 outline-none placeholder:text-slate-400 disabled:text-slate-300"
            />
          </label>

          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            {(["ALL", "PRESENT", "ABSENT_EXCUSED", "ABSENT_UNEXCUSED"] as const).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "rounded-lg px-3 py-2 text-[10px] font-black transition-all",
                    filterStatus === status
                      ? "bg-uneti-blue text-white"
                      : "text-slate-500 hover:bg-slate-50",
                  )}
                >
                  {status === "ALL"
                    ? "Tất cả"
                    : status === "PRESENT"
                      ? "Có mặt"
                      : status === "ABSENT_EXCUSED"
                        ? "Vắng phép"
                        : "Không phép"}
                </button>
              ),
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={markAllPresent}
              disabled={!hasScheduledSession}
              className="h-full rounded-xl px-4 text-[12px] font-black"
            >
              Tất cả có mặt
            </Button>
            <Button
              onClick={saveAttendance}
              disabled={saving || dirtyCount === 0 || !hasScheduledSession}
              className="h-full rounded-xl bg-uneti-blue px-4 text-[12px] font-black text-white disabled:bg-slate-100 disabled:text-slate-400"
            >
              {saving ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              ) : (
                <Save size={15} className="mr-2" />
              )}
              Lưu {dirtyCount > 0 ? `(${dirtyCount})` : ""}
            </Button>
          </div>
        </div>

        {message ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[12px] font-medium text-slate-600">
            {message}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <div className="h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {!hasScheduledSession ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <CalendarDays size={42} className="mb-4 text-slate-300" />
              <h2 className="text-[18px] font-black text-slate-800">
                Ngày này không có lịch học
              </h2>
              <p className="mt-2 max-w-[560px] text-[13px] font-medium leading-6 text-slate-500">
                Danh sách điểm danh chỉ được mở theo ngày có buổi học trong lịch của lớp học phần.
                Chọn ngày có lịch để xem hoặc chỉnh sửa điểm danh, tránh tạo bản ghi ngoài lịch làm
                sai tổng số buổi và tổng số tiết.
              </p>
            </div>
          ) : (
          <div className="h-full overflow-auto">
            <table className="min-w-full border-separate border-spacing-0 text-[13px] text-slate-800">
              <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                <tr>
                  <th className="border-r border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    STT
                  </th>
                  <th className="border-r border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Sinh viên
                  </th>
                  <th className="border-r border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Lớp DN
                  </th>
                  <th className="border-r border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Trạng thái
                  </th>
                  <th className="border-r border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ghi chú
                  </th>
                  <th className="border-b border-slate-200 px-3 py-3 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Nguồn
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, index) => (
                  <tr key={item.id} className="hover:bg-blue-50/30">
                    <td className="border-r border-b border-slate-200 px-3 py-2 text-slate-500 tabular-nums">
                      {index + 1}
                    </td>
                    <td className="border-r border-b border-slate-200 px-3 py-2">
                      <div className="font-black text-slate-900">
                        {item.student?.fullName || "Sinh viên"}
                      </div>
                      <div className="mt-0.5 text-[11px] font-bold text-uneti-blue">
                        {item.student?.studentCode || ""}
                      </div>
                    </td>
                    <td className="border-r border-b border-slate-200 px-3 py-2 text-[12px] font-bold text-slate-600">
                      {item.student?.adminClass?.code || "N/A"}
                    </td>
                    <td className="border-r border-b border-slate-200 px-3 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => updateStatus(item.id, option.value)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1 text-[11px] font-black transition-all",
                              item.currentStatus === option.value
                                ? option.className
                                : "border-slate-200 bg-white text-slate-400 hover:bg-slate-50",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="border-r border-b border-slate-200 px-3 py-2">
                      <input
                        type="text"
                        value={item.note || ""}
                        onChange={(event) => updateNote(item.id, event.target.value)}
                        placeholder="Lý do, ghi chú chỉnh sửa..."
                        className="h-9 w-full min-w-[240px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-[12px] font-medium text-slate-700 outline-none transition-all focus:border-blue-200 focus:bg-white focus:ring-2 focus:ring-blue-100"
                      />
                    </td>
                    <td className="border-b border-slate-200 px-3 py-2">
                      {item.currentAttendance ? (
                        <div className="flex flex-wrap gap-1.5 text-[10px] font-bold text-slate-500">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                              getAttendanceSourceStyle(item.currentAttendance),
                            )}
                          >
                            {item.currentAttendance?.method === "QR" ||
                            item.currentAttendance?.method === "QR_GEO" ? (
                              <QrCode size={11} />
                            ) : (
                              <UserCheck size={11} />
                            )}
                            {formatAttendanceMethod(item.currentAttendance)}
                          </span>
                          {item.currentAttendance?.markedAt ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                              <Clock3 size={11} />
                              {new Date(item.currentAttendance.markedAt).toLocaleTimeString(
                                "vi-VN",
                                { hour: "2-digit", minute: "2-digit" },
                              )}
                            </span>
                          ) : null}
                          {item.currentAttendance?.isLocationVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700">
                              <ShieldCheck size={11} />
                              GPS OK
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-400">
                          Chưa có bản ghi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 ? (
              <div className="flex h-60 items-center justify-center text-[13px] font-bold text-slate-400">
                Không có dữ liệu phù hợp.
              </div>
            ) : null}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
