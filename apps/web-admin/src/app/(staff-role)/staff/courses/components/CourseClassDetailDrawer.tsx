"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRightLeft,
  Calendar,
  CalendarPlus,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import CourseSchedulePlannerModal from "./CourseSchedulePlannerModal";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DetailDrawerProps {
  courseClass: any;
  onClose: () => void;
  onRefresh: () => void;
  headers: any;
  rooms: any[];
  lecturers: any[];
}

type TabType = "schedule" | "config" | "students" | "conflicts";

const SHIFT_OPTIONS = [
  { value: 1, label: "Ca 1 (Tiết 1-3)" },
  { value: 4, label: "Ca 2 (Tiết 4-6)" },
  { value: 7, label: "Ca 3 (Tiết 7-9)" },
  { value: 10, label: "Ca 4 (Tiết 10-12)" },
];

const PERIOD_OPTIONS = Array.from({ length: 6 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} tiết`,
}));

function getStatusBadge(status: string) {
  if (status === "PAID" || status === "ENROLLED") {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }
  if (status === "CANCELLED") {
    return "bg-rose-50 text-rose-600 border-rose-100";
  }
  return "bg-slate-50 text-slate-500 border-slate-100";
}

function extractErrorMessage(payload: any, fallback: string) {
  if (Array.isArray(payload?.message)) {
    return payload.message.join(", ");
  }
  if (typeof payload?.message === "string") {
    return payload.message;
  }
  return fallback;
}

export default function CourseClassDetailDrawer({
  courseClass,
  onClose,
  onRefresh,
  headers,
  rooms,
  lecturers,
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [conflictsLoading, setConflictsLoading] = useState(false);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const [sessions, setSessions] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [conflicts, setConflicts] = useState<any | null>(null);

  const [movingSession, setMovingSession] = useState<any | null>(null);
  const [addingSession, setAddingSession] = useState<any | null>(null);
  const [plannerOpen, setPlannerOpen] = useState(false);

  const [form, setForm] = useState({
    name: courseClass?.name || "",
    lecturerId: courseClass?.lecturerId || "none",
    status: courseClass?.status || "OPEN",
    maxSlots: courseClass?.maxSlots || 60,
  });

  useEffect(() => {
    if (!courseClass) return;
    setSessions([]);
    setEnrollments([]);
    setConflicts(null);
    setMovingSession(null);
    setAddingSession(null);
    setPlannerOpen(false);
    setForm({
      name: courseClass.name || "",
      lecturerId: courseClass.lecturerId || "none",
      status: courseClass.status || "OPEN",
      maxSlots: courseClass.maxSlots || 60,
    });
    setActiveTab("schedule");
    void fetchSessions();
  }, [courseClass]);

  useEffect(() => {
    if (!courseClass || activeTab !== "students" || enrollments.length > 0) return;
    void fetchEnrollments();
  }, [activeTab, courseClass]);

  useEffect(() => {
    if (!courseClass || activeTab !== "conflicts") return;
    void fetchConflicts();
  }, [activeTab, courseClass]);

  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((left, right) => {
        const leftDate = new Date(left.date).getTime();
        const rightDate = new Date(right.date).getTime();
        if (leftDate !== rightDate) return leftDate - rightDate;
        return Number(left.startShift || 0) - Number(right.startShift || 0);
      }),
    [sessions],
  );

  const sessionStats = useMemo(() => {
    const now = new Date().getTime();
    const nextSession = sortedSessions.find(
      (session) => new Date(session.date).getTime() >= now,
    );
    const uniqueRooms = new Set(
      sortedSessions.map((session) => session.room?.name || session.roomId).filter(Boolean),
    );
    return {
      total: sortedSessions.length,
      nextSession,
      roomCount: uniqueRooms.size,
    };
  }, [sortedSessions]);

  async function fetchSessions() {
    if (!courseClass) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}/sessions`, { headers });
      if (!res.ok) throw new Error("Không thể tải lịch lớp học phần.");
      setSessions(await res.json());
    } catch (error) {
      console.error(error);
      setSessions([]);
    } finally {
      setSessionLoading(false);
    }
  }

  async function fetchEnrollments() {
    if (!courseClass) return;
    setStudentsLoading(true);
    try {
      const res = await fetch(
        `/api/enrollments/admin/classes/${courseClass.id}/enrollments`,
        { headers },
      );
      if (!res.ok) throw new Error("Không thể tải danh sách sinh viên.");
      setEnrollments(await res.json());
    } catch (error) {
      console.error(error);
      setEnrollments([]);
    } finally {
      setStudentsLoading(false);
    }
  }

  async function fetchConflicts() {
    if (!courseClass) return;
    setConflictsLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}/conflicts`, { headers });
      if (!res.ok) throw new Error("Không thể kiểm tra xung đột.");
      setConflicts(await res.json());
    } catch (error) {
      console.error(error);
      setConflicts({ issues: [], summary: { room: 0, lecturer: 0, adminClass: 0 } });
    } finally {
      setConflictsLoading(false);
    }
  }

  async function handleUpdateConfig() {
    if (!courseClass) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          ...form,
          lecturerId: form.lecturerId === "none" ? null : form.lecturerId,
        }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, "Không thể cập nhật học phần."));
      }
      onRefresh();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Không thể cập nhật học phần.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMoveSession() {
    if (!movingSession) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/sessions/${movingSession.id}/reschedule`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          date: movingSession.nextDate || format(new Date(movingSession.date), "yyyy-MM-dd"),
          startShift: Number(movingSession.nextShift || movingSession.startShift),
          endShift:
            Number(movingSession.nextShift || movingSession.startShift) +
            Number(
              movingSession.nextPeriodCount ||
                movingSession.periodCount ||
                movingSession.endShift - movingSession.startShift + 1,
            ) -
            1,
          roomId:
            movingSession.nextRoomId === "keep"
              ? movingSession.roomId || null
              : movingSession.nextRoomId || movingSession.roomId || null,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          extractErrorMessage(payload, "Không thể đổi lịch buổi học."),
        );
      }

      await fetchSessions();
      if (activeTab === "conflicts") await fetchConflicts();
      setMovingSession(null);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Không thể đổi lịch buổi học.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleAddSession() {
    if (!addingSession) return;
    if (!addingSession.date) {
      alert("Vui lòng chọn ngày học.");
      return;
    }

    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}/manual-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          date: addingSession.date,
          startShift: Number(addingSession.startShift || 1),
          endShift:
            Number(addingSession.startShift || 1) +
            Number(addingSession.periodCount || 3) -
            1,
          roomId:
            addingSession.roomId && addingSession.roomId !== "none"
              ? addingSession.roomId
              : null,
          type: addingSession.type || "EXTRA",
          note: addingSession.note || "Học bù",
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, "Không thể thêm buổi học."));
      }

      await fetchSessions();
      if (activeTab === "conflicts") await fetchConflicts();
      setAddingSession(null);
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Không thể thêm buổi học.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleDeleteSession(sessionId: string) {
    if (!confirm("Xóa buổi học này khỏi lớp học phần?")) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(extractErrorMessage(payload, "Không thể xóa buổi học."));
      }
      await fetchSessions();
      if (activeTab === "conflicts") await fetchConflicts();
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Không thể xóa buổi học.");
    } finally {
      setSessionLoading(false);
    }
  }

  async function handleCleanupConflicts() {
    if (!courseClass) return;
    if (
      !confirm(
        "Hệ thống sẽ xóa các buổi học bị trùng của chính học phần này. Bạn có muốn tiếp tục không?",
      )
    ) {
      return;
    }

    setCleanupLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}/cleanup-conflicts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          extractErrorMessage(payload, "Không thể dọn các ca học bị trùng."),
        );
      }

      await fetchSessions();
      await fetchConflicts();

      if ((payload?.deletedCount || 0) > 0) {
        alert(`Đã xóa ${payload.deletedCount} buổi học bị trùng.`);
      } else {
        alert("Không phát hiện ca học trùng để xóa.");
      }
    } catch (error: any) {
      console.error(error);
      alert(error?.message || "Không thể dọn các ca học bị trùng.");
    } finally {
      setCleanupLoading(false);
    }
  }

  if (!courseClass) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex h-full w-[720px] flex-col bg-white shadow-2xl">
        <header className="border-b border-slate-100 px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <button
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
              >
                <X size={18} />
              </button>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-uneti-blue">
                  Quản lý học phần
                </p>
                <h2 className="mt-2 text-[17px] font-black uppercase tracking-tight text-slate-900">
                  {courseClass.subject?.name || courseClass.name}
                </h2>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {courseClass.code} • {courseClass.semester?.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={`/staff/courses/${courseClass.id}`}
                onClick={onClose}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-900 hover:text-white"
              >
                Chi tiết học phần
              </Link>
              <Link
                href={`/staff/attendance/${courseClass.id}`}
                onClick={onClose}
                className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white"
              >
                Điểm danh
              </Link>
              <Link
                href={`/staff/grades/${courseClass.id}`}
                onClick={onClose}
                className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-amber-600 transition-all hover:bg-amber-600 hover:text-white"
              >
                Quản lý điểm
              </Link>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Tổng buổi học
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{sessionStats.total}</p>
            </div>
            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Phòng sử dụng
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">{sessionStats.roomCount}</p>
            </div>
            <div className="rounded-[28px] border border-slate-100 bg-slate-50/80 p-5">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                Sĩ số hiện tại
              </p>
              <p className="mt-2 text-2xl font-black text-slate-900">
                {courseClass._count?.enrollments || 0}/{courseClass.maxSlots}
              </p>
            </div>
          </div>
        </header>

        <nav className="flex border-b border-slate-100 bg-slate-50/60 px-8">
          {[
            { id: "schedule", label: "Lịch vận hành", icon: Calendar },
            { id: "config", label: "Cấu hình", icon: ShieldCheck },
            { id: "students", label: "Sinh viên", icon: Users },
            { id: "conflicts", label: "Kiểm tra trùng", icon: Activity },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "relative flex items-center gap-2 border-b-2 px-5 py-4 text-[10px] font-black uppercase tracking-widest transition-all",
                activeTab === tab.id
                  ? "border-uneti-blue bg-white text-uneti-blue"
                  : "border-transparent text-slate-400 hover:text-slate-700",
              )}
            >
              <tab.icon size={13} strokeWidth={2.5} />
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          {activeTab === "schedule" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between rounded-[32px] bg-slate-900 px-6 py-4 text-white">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Lịch đầy đủ của lớp
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-200">
                    {sessionStats.nextSession
                      ? `Buổi gần nhất: ${format(
                          new Date(sessionStats.nextSession.date),
                          "dd/MM/yyyy",
                        )}`
                      : "Chưa có buổi học"}
                  </p>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    onClick={() => setPlannerOpen(true)}
                    className="rounded-2xl bg-white/10 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white hover:text-slate-900"
                  >
                    Xếp lại lịch
                  </button>
                  <button
                    onClick={() =>
                      setAddingSession({
                        date: format(new Date(), "yyyy-MM-dd"),
                        startShift: 1,
                        periodCount: 3,
                        roomId: "none",
                        type: "EXTRA",
                        note: "Học bù",
                      })
                    }
                    className="rounded-2xl bg-uneti-blue px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white hover:text-slate-900"
                  >
                    <span className="flex items-center gap-2">
                      <CalendarPlus size={14} />
                      Thêm buổi học
                    </span>
                  </button>
                </div>
              </div>

              {sessionLoading ? (
                <div className="flex flex-col items-center py-20 text-center opacity-40">
                  <Loader2 className="mb-4 animate-spin text-uneti-blue" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Đang tải lịch lớp
                  </p>
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="rounded-[32px] border-2 border-dashed border-slate-100 py-24 text-center opacity-40">
                  <Calendar className="mx-auto mb-4 text-slate-200" size={44} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Lớp chưa có lịch vận hành
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedSessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-[28px] border border-slate-100 bg-white p-6 transition-all hover:border-uneti-blue/30 hover:shadow-lg hover:shadow-slate-100"
                    >
                      <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
                          <span className="text-lg font-black leading-none">
                            {format(new Date(session.date), "dd")}
                          </span>
                          <span className="text-[8px] font-black uppercase opacity-60">
                            {format(new Date(session.date), "MMM", { locale: vi })}
                          </span>
                        </div>

                        <div>
                          <div className="mb-2 flex items-center gap-2">
                            <MapPin size={12} className="text-slate-300" />
                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-800">
                              {session.room?.name || "Chưa xếp phòng"}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="rounded-lg bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-uneti-blue">
                              Tiết {session.startShift}-{session.endShift}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              {format(new Date(session.date), "EEEE", { locale: vi })}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                              {session.type || "LECTURE"}
                            </span>
                          </div>
                          {session.note ? (
                            <p className="mt-2 text-[10px] font-medium italic text-slate-500">
                              {session.note}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            setMovingSession({
                              ...session,
                              nextDate: format(new Date(session.date), "yyyy-MM-dd"),
                              nextShift: session.startShift,
                              nextPeriodCount: session.endShift - session.startShift + 1,
                              periodCount: session.endShift - session.startShift + 1,
                              nextRoomId: session.roomId || "keep",
                            })
                          }
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-uneti-blue hover:text-white"
                          title="Đổi ngày, ca hoặc phòng"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button
                          onClick={() => void handleDeleteSession(session.id)}
                          className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500"
                          title="Xóa buổi học"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-8">
              <div className="rounded-[32px] bg-slate-900 p-8 text-white shadow-2xl shadow-slate-200">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Đồng bộ thông tin vận hành
                    </p>
                    <p className="mt-2 text-lg font-black uppercase tracking-tight">
                      Chỉnh cấu hình lớp học phần
                    </p>
                  </div>
                  <button
                    onClick={() => void handleUpdateConfig()}
                    disabled={loading}
                    className="rounded-2xl bg-uneti-blue px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white hover:text-slate-900 disabled:opacity-60"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : "Lưu thay đổi"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Tên hiển thị lớp
                  </label>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, name: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Sĩ số tối đa
                  </label>
                  <input
                    type="number"
                    value={form.maxSlots}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxSlots: Number(event.target.value || 0),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>

                <div className="space-y-4">
                  <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Giảng viên phụ trách
                  </label>
                  <select
                    value={form.lecturerId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lecturerId: event.target.value }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="none">-- Chưa phân công --</option>
                    {lecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Trạng thái lớp
                  </label>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="CLOSED">CLOSED</option>
                    <option value="CANCELLED">CANCELLED</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Danh sách sinh viên ghi danh
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    {enrollments.length} sinh viên trong lớp học phần
                  </p>
                </div>
              </div>

              {studentsLoading ? (
                <div className="flex flex-col items-center py-20 text-center opacity-40">
                  <Loader2 className="mb-4 animate-spin text-uneti-blue" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Đang tải danh sách sinh viên
                  </p>
                </div>
              ) : enrollments.length === 0 ? (
                <div className="rounded-[32px] border-2 border-dashed border-slate-100 py-24 text-center opacity-40">
                  <Users className="mx-auto mb-4 text-slate-200" size={44} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Chưa có sinh viên ghi danh
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {enrollments.map((enrollment: any, index) => (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between rounded-[24px] border border-slate-100 bg-white p-5 transition-all hover:border-uneti-blue/30"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-50 text-[10px] font-black text-slate-400">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-tight text-slate-900">
                            {enrollment.student?.user?.fullName ||
                              enrollment.student?.fullName ||
                              "Sinh viên"}
                          </p>
                          <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                            {enrollment.student?.studentCode} •{" "}
                            {enrollment.student?.adminClass?.code || "Chưa xếp lớp"}
                          </p>
                        </div>
                      </div>

                      <span
                        className={cn(
                          "rounded-xl border px-3 py-1.5 text-[9px] font-black uppercase tracking-widest",
                          getStatusBadge(enrollment.status),
                        )}
                      >
                        {enrollment.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "conflicts" && (
            <div className="space-y-6">
              <div className="rounded-[32px] border border-slate-100 bg-slate-50/60 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      Kiểm tra trùng lịch từ CSDL
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Đối chiếu theo từng buổi học thực tế của lớp
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => setPlannerOpen(true)}
                      className="rounded-2xl bg-white px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-900 hover:text-white"
                    >
                      Xếp lại lịch
                    </button>
                    <button
                      onClick={() => void handleCleanupConflicts()}
                      disabled={cleanupLoading}
                      className="rounded-2xl bg-rose-50 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-rose-600 transition-all hover:bg-rose-600 hover:text-white disabled:opacity-60"
                    >
                      {cleanupLoading ? "Đang dọn..." : "Dọn ca trùng"}
                    </button>
                    <button
                      onClick={() => void fetchConflicts()}
                      className="rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-uneti-blue"
                    >
                      Quét lại
                    </button>
                  </div>
                </div>
              </div>

              {conflictsLoading ? (
                <div className="flex flex-col items-center py-20 text-center opacity-40">
                  <Loader2 className="mb-4 animate-spin text-uneti-blue" size={32} />
                  <p className="text-[10px] font-black uppercase tracking-[0.3em]">
                    Đang đối chiếu xung đột
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Tự trùng ca",
                        value: conflicts?.summary?.self || 0,
                        color: "text-violet-600",
                        bg: "bg-violet-50",
                      },
                      {
                        label: "Trùng phòng",
                        value: conflicts?.summary?.room || 0,
                        color: "text-rose-600",
                        bg: "bg-rose-50",
                      },
                      {
                        label: "Trùng giảng viên",
                        value: conflicts?.summary?.lecturer || 0,
                        color: "text-amber-600",
                        bg: "bg-amber-50",
                      },
                      {
                        label: "Trùng lớp hành chính",
                        value: conflicts?.summary?.adminClass || 0,
                        color: "text-uneti-blue",
                        bg: "bg-blue-50",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[28px] border border-slate-100 bg-white p-5"
                      >
                        <div
                          className={cn(
                            "mb-4 flex h-10 w-10 items-center justify-center rounded-2xl",
                            item.bg,
                            item.color,
                          )}
                        >
                          <AlertTriangle size={18} />
                        </div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                          {item.label}
                        </p>
                        <p className={cn("mt-2 text-2xl font-black", item.color)}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {!conflicts?.issues?.length ? (
                    <div className="flex items-center gap-4 rounded-[32px] border border-emerald-100 bg-emerald-50 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-widest text-emerald-600">
                          Không phát hiện xung đột
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          Lịch lớp đang khớp với phòng, giảng viên và lớp hành chính
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conflicts.issues.map((issue: any) => (
                        <div
                          key={`${issue.type}-${issue.sessionId}-${issue.conflictSessionId}`}
                          className="rounded-[24px] border border-rose-100 bg-white p-5"
                        >
                          <div className="flex items-start justify-between gap-6">
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-600">
                                {issue.type === "SELF"
                                  ? "Tự trùng ca"
                                  : issue.type === "ROOM"
                                    ? "Trùng phòng"
                                    : issue.type === "LECTURER"
                                      ? "Trùng giảng viên"
                                      : "Trùng lớp hành chính"}
                              </p>
                              <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-700">
                                {issue.message}
                              </p>
                              <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                {format(new Date(issue.date), "dd/MM/yyyy")} • Tiết{" "}
                                {issue.startShift}-{issue.endShift} •{" "}
                                {issue.type === "SELF"
                                  ? courseClass.code
                                  : issue.counterpartClassCode}
                              </p>
                            </div>

                            <span
                              className={cn(
                                "rounded-xl px-3 py-1.5 text-[9px] font-black uppercase tracking-widest",
                                issue.type === "SELF"
                                  ? "bg-violet-50 text-violet-600"
                                  : "bg-rose-50 text-rose-600",
                              )}
                            >
                              {issue.type === "SELF"
                                ? "Nội bộ học phần"
                                : issue.roomName || "CSDL"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/30 px-8 py-5">
          <div className="flex items-center gap-2">
            <UserCheck size={14} className="text-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Đồng bộ theo dữ liệu thật
            </span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-uneti-blue">
            {courseClass.lecturer?.fullName || "Chưa phân công giảng viên"}
          </p>
        </footer>

        <CourseSchedulePlannerModal
          open={plannerOpen}
          courseClass={courseClass}
          sessions={sortedSessions}
          rooms={rooms}
          headers={headers}
          onClose={() => setPlannerOpen(false)}
          onSuccess={async () => {
            await fetchSessions();
            await fetchConflicts();
          }}
        />

        {movingSession ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setMovingSession(null)}
            />
            <div className="relative w-full max-w-md rounded-[40px] bg-white p-10 shadow-2xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-uneti-blue/10 text-uneti-blue">
                  <ArrowRightLeft size={30} />
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  Đổi lịch buổi học
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Chuyển ngày, ca và phòng học
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ngày học mới
                  </label>
                  <input
                    type="date"
                    value={movingSession.nextDate}
                    onChange={(event) =>
                      setMovingSession((current: any) => ({
                        ...current,
                        nextDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ca học mới
                  </label>
                  <select
                    value={movingSession.nextShift}
                    onChange={(event) =>
                      setMovingSession((current: any) => ({
                        ...current,
                        nextShift: Number(event.target.value),
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Số tiết
                  </label>
                  <select
                    value={movingSession.nextPeriodCount || movingSession.periodCount || 3}
                    onChange={(event) =>
                      setMovingSession((current: any) => ({
                        ...current,
                        nextPeriodCount: Number(event.target.value),
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Phòng học
                  </label>
                  <select
                    value={movingSession.nextRoomId || "keep"}
                    onChange={(event) =>
                      setMovingSession((current: any) => ({
                        ...current,
                        nextRoomId: event.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="keep">Giữ nguyên phòng hiện tại</option>
                    <option value="">Bỏ gán phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} {room.building ? `- ${room.building}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button
                  onClick={() => void handleMoveSession()}
                  className="flex-1 rounded-2xl bg-uneti-blue py-4 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-900"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => setMovingSession(null)}
                  className="flex-1 rounded-2xl bg-slate-100 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-200"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {addingSession ? (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
            <div
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setAddingSession(null)}
            />
            <div className="relative w-full max-w-md rounded-[40px] bg-white p-10 shadow-2xl">
              <div className="mb-8 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] bg-emerald-50 text-emerald-600">
                  <CalendarPlus size={30} />
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-900">
                  Thêm buổi học mới
                </h3>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Học bù, phụ đạo hoặc điều phối bổ sung
                </p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ngày học
                  </label>
                  <input
                    type="date"
                    value={addingSession.date}
                    onChange={(event) =>
                      setAddingSession((current: any) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ca học
                  </label>
                  <select
                    value={addingSession.startShift}
                    onChange={(event) =>
                      setAddingSession((current: any) => ({
                        ...current,
                        startShift: Number(event.target.value),
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    {SHIFT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Số tiết
                  </label>
                  <select
                    value={addingSession.periodCount || 3}
                    onChange={(event) =>
                      setAddingSession((current: any) => ({
                        ...current,
                        periodCount: Number(event.target.value),
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    {PERIOD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Phòng học
                  </label>
                  <select
                    value={addingSession.roomId}
                    onChange={(event) =>
                      setAddingSession((current: any) => ({
                        ...current,
                        roomId: event.target.value,
                      }))
                    }
                    className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="none">Chưa gán phòng</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} {room.building ? `- ${room.building}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Ghi chú
                  </label>
                  <input
                    value={addingSession.note}
                    onChange={(event) =>
                      setAddingSession((current: any) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button
                  onClick={() => void handleAddSession()}
                  className="flex-1 rounded-2xl bg-emerald-600 py-4 text-[11px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-900"
                >
                  Tạo buổi học
                </button>
                <button
                  onClick={() => setAddingSession(null)}
                  className="flex-1 rounded-2xl bg-slate-100 py-4 text-[11px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-200"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
