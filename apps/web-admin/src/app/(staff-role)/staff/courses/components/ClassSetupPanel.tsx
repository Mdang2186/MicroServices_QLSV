"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Loader2,
  Lock,
  Trash2,
  Zap,
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ClipboardList,
  Building,
  ChevronRight,
  RefreshCw,
  UserCheck,
  ClipboardCheck,
  MapPin,
  Clock,
  AlertCircle,
  CheckCheck,
  Bell,
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TabType = "config" | "schedule" | "students" | "exam";

interface ClassSetupPanelProps {
  activeCourse: any;
  selectedSubjectId: string | null;
  isCreating: boolean;
  isLocked: boolean;
  rooms: any[];
  lecturers: any[];
  adminClasses: any[];
  headers: any;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const SHIFT_LABELS: Record<number, string> = {
  1: "Tiết 1-3 (7:10-9:35)",
  2: "Tiết 4-6 (9:45-12:10)",
  3: "Tiết 7-9 (13:10-15:35)",
  4: "Tiết 10-12 (15:45-18:10)",
};

// ===== CONFLICT BADGE =====
function ConflictBadge({ msg }: { msg: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[9px] font-black uppercase tracking-wider">
      <AlertTriangle size={11} /> {msg}
    </div>
  );
}

export default function ClassSetupPanel({
  activeCourse,
  selectedSubjectId,
  isCreating,
  isLocked,
  rooms,
  lecturers,
  adminClasses,
  headers,
  onClose,
  onSaveSuccess,
}: ClassSetupPanelProps) {
  const [viewTab, setViewTab] = useState<TabType>("config");
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    lecturerId: "",
    maxSlots: 60,
    status: "OPEN",
    adminClassIds: [] as string[],
    periodsPerSession: 3,
    sessionsPerWeek: 1,
  });

  // Sessions (schedule tab)
  const [sessions, setSessions] = useState<any[]>([]);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Students tab
  const [students, setStudents] = useState<any[]>([]);
  const [studentLoading, setStudentLoading] = useState(false);

  // Exam tab
  const [examDate, setExamDate] = useState("");
  const [examShift, setExamShift] = useState("1");
  const [examType, setExamType] = useState("TU_LUAN");
  const [examRooms, setExamRooms] = useState<any[]>([]); // [{room, students}]
  const [examPlanning, setExamPlanning] = useState(false);
  const [examAttendance, setExamAttendance] = useState<Record<string, boolean>>(
    {},
  );
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [adminClassSearch, setAdminClassSearch] = useState("");

  // Sync form with active course
  useEffect(() => {
    if (activeCourse) {
      setForm({
        name: activeCourse.name || "",
        lecturerId: activeCourse.lecturerId || "",
        maxSlots: activeCourse.maxSlots || 60,
        status: activeCourse.status || "OPEN",
        adminClassIds: (activeCourse.adminClasses || []).map(
          (ac: any) => ac.id,
        ),
        periodsPerSession: activeCourse.periodsPerSession || 3,
        sessionsPerWeek: activeCourse.sessionsPerWeek || 1,
      });
      fetchSessions(activeCourse.id);
    } else if (isCreating) {
      setForm({
        name: "",
        lecturerId: "",
        maxSlots: 60,
        status: "OPEN",
        adminClassIds: [],
        periodsPerSession: 3,
        sessionsPerWeek: 1,
      });
      setSessions([]);
      setStudents([]);
      setExamRooms([]);
    }
  }, [activeCourse, isCreating]);

  // Auto-fetch students when switching to students tab
  useEffect(() => {
    if (viewTab === "students" && activeCourse) fetchStudents(activeCourse.id);
  }, [viewTab, activeCourse]);

  // ===== FETCH =====
  const fetchSessions = async (courseId: string) => {
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseId}/sessions`, { headers });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setSessionLoading(false);
    }
  };

  const fetchStudents = async (courseId: string) => {
    setStudentLoading(true);
    try {
      const res = await fetch(
        `/api/enrollments/admin/classes/${courseId}/enrollments`,
        { headers },
      );
      const data = await res.json();
      setStudents(Array.isArray(data) ? data : []);
    } catch {
    } finally {
      setStudentLoading(false);
    }
  };

  // ===== ACTIONS =====
  const handleAutoSchedule = async () => {
    if (!activeCourse) return;
    setFormLoading(true);
    setConflicts([]);
    try {
      const res = await fetch(
        `/api/semester-plan/schedule/${activeCourse.semesterId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({
            classId: activeCourse.id,
            periodsPerSession: form.periodsPerSession,
            sessionsPerWeek: form.sessionsPerWeek,
          }),
        },
      );
      const data = await res.json().catch(() => null);
      if (res.ok) {
        const warnings = Array.isArray(data?.failures)
          ? data.failures
          : Array.isArray(data?.conflicts)
            ? data.conflicts
            : [];
        setConflicts(warnings);
        fetchSessions(activeCourse.id);
        onSaveSuccess();
      } else {
        const warnings = Array.isArray(data?.failures)
          ? data.failures
          : Array.isArray(data?.conflicts)
            ? data.conflicts
            : data?.message
              ? [data.message]
              : [];
        setConflicts(warnings);
      }
    } catch {
    } finally {
      setFormLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedSubjectId && !activeCourse) return;
    setFormLoading(true);
    try {
      const method = activeCourse ? "PATCH" : "POST";
      const url = activeCourse
        ? `/api/courses/${activeCourse.id}`
        : `/api/courses`;
      const body = activeCourse
        ? form
        : { ...form, subjectId: selectedSubjectId };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
      });
      if (res.ok) onSaveSuccess();
    } catch {
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!activeCourse) return;
    setFormLoading(true);
    try {
      const res = await fetch(`/api/courses/${activeCourse.id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        onSaveSuccess();
        onClose();
      }
    } catch {
    } finally {
      setFormLoading(false);
      setDeleteConfirm(false);
    }
  };

  const syncStudentsFromAdminClass = async () => {
    if (!activeCourse) return;
    setStudentLoading(true);
    try {
      const res = await fetch(
        `/api/courses/${activeCourse.id}/sync-enrollments`,
        {
          method: "POST",
          headers,
        },
      );
      if (res.ok) fetchStudents(activeCourse.id);
    } catch {
    } finally {
      setStudentLoading(false);
    }
  };

  // ===== EXAM PLANNING =====
  const handlePlanExam = async () => {
    if (!activeCourse || !examDate) {
      alert("Chọn ngày thi trước.");
      return;
    }
    setExamPlanning(true);
    try {
      // Fetch eligible students
      const gradeRes = await fetch(`/api/grades/class/${activeCourse.id}`, {
        headers,
      });
      const grades: any[] = gradeRes.ok ? await gradeRes.json() : [];
      const eligible = grades.filter((g) => g.isEligibleForExam !== false);

      // Init attendance state
      const initAtt: Record<string, boolean> = {};
      eligible.forEach((g) => {
        initAtt[g.studentId] = !g.isAbsentFromExam;
      });
      setExamAttendance(initAtt);

      // Filter rooms by exam type
      const isPractice = examType === "THUC_HANH";
      const suitableRooms = rooms.filter((r) =>
        isPractice ? r.type === "LAB" : r.type !== "LAB",
      );
      const perRoom = isPractice ? 25 : 30;

      // Assign students to rooms
      const assigned: any[] = [];
      let studentIdx = 0;
      for (const room of suitableRooms) {
        if (studentIdx >= eligible.length) break;
        const batch = eligible.slice(
          studentIdx,
          studentIdx + Math.min(perRoom, room.capacity || perRoom),
        );
        assigned.push({ room, students: batch });
        studentIdx += batch.length;
      }
      // If not enough rooms, stack remainder into last room
      if (studentIdx < eligible.length && assigned.length > 0) {
        assigned[assigned.length - 1].students.push(
          ...eligible.slice(studentIdx),
        );
      }
      setExamRooms(assigned);
    } catch {
    } finally {
      setExamPlanning(false);
    }
  };

  const handleSaveAttendance = async () => {
    if (!activeCourse) return;
    setSavingAttendance(true);
    try {
      // Build grade updates
      const updates = Object.entries(examAttendance).map(
        ([studentId, present]) => ({
          studentId,
          courseClassId: activeCourse.id,
          isAbsentFromExam: !present,
          ...(!present ? { examScore1: 0 } : {}),
        }),
      );
      await fetch(`/api/grades/bulk-attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ updates }),
      });
    } catch {
    } finally {
      setSavingAttendance(false);
    }
  };

  // ===== COMPUTED =====
  const filteredAdminClasses = adminClasses
    .filter((ac) =>
      ac.code.toLowerCase().includes(adminClassSearch.toLowerCase()),
    )
    .slice(0, 20);

  const eligibleCount = useMemo(
    () => examRooms.reduce((a, r) => a + r.students.length, 0),
    [examRooms],
  );
  const absentCount = Object.values(examAttendance).filter((v) => !v).length;

  // ===== STYLES =====
  const labelCls =
    "text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block";
  const inputCls =
    "w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all";

  const TABS: { id: TabType; label: string; icon: React.ElementType }[] = [
    { id: "config", label: "Cấu hình", icon: ShieldCheck },
    { id: "schedule", label: "Lịch học", icon: Calendar },
    { id: "students", label: "Sinh viên", icon: Users },
    { id: "exam", label: "Tổ chức Thi", icon: ClipboardList },
  ];

  return (
    <div className="w-[680px] bg-white border-l border-slate-100 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 overflow-hidden relative z-40 shrink-0">
      {/* ===== HEADER ===== */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-xl z-20 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 rounded-xl transition-all shrink-0"
          >
            <X size={18} className="text-slate-400 hover:text-rose-600" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[13px] font-black text-slate-800 tracking-tight truncate">
              {activeCourse ? activeCourse.name : "Thiết lập lớp mới"}
            </h2>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              {activeCourse ? activeCourse.code : "Khởi tạo"}
              {activeCourse?.subject && ` • ${activeCourse.subject.credits} TC`}
            </span>
          </div>
        </div>
        {isLocked && (
          <span className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1 shrink-0">
            <Lock size={11} /> Chỉ xem
          </span>
        )}
      </div>

      {/* ===== TAB BAR ===== */}
      <div className="flex border-b border-slate-100 bg-slate-50/60 shrink-0 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setViewTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-5 py-3 text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2",
              viewTab === tab.id
                ? "border-uneti-blue text-uneti-blue bg-white"
                : "border-transparent text-slate-400 hover:text-slate-600",
            )}
          >
            <tab.icon size={13} /> {tab.label}
          </button>
        ))}
      </div>

      {/* ===== BODY ===== */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* ── TAB: CONFIG ── */}
        {viewTab === "config" && (
          <div className="p-6 space-y-6">
            {/* Save Banner */}
            <div className="p-5 bg-slate-900 rounded-2xl text-white flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest">
                  Sẵn sàng đồng bộ
                </p>
                <p className="text-[9px] font-bold text-emerald-400 uppercase mt-0.5 opacity-80">
                  Dữ liệu thời gian thực
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={formLoading || isLocked}
                className="px-5 py-2.5 bg-uneti-blue text-white rounded-xl text-[10px] font-black uppercase hover:bg-uneti-blue/90 transition-all disabled:opacity-40"
              >
                {formLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  "Lưu thay đổi"
                )}
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Tên lớp học phần</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Nhập tên lớp..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Sĩ số tối đa</label>
                  <input
                    type="number"
                    className={inputCls}
                    value={form.maxSlots}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        maxSlots: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className={labelCls}>Trạng thái</label>
                  <select
                    className={inputCls}
                    value={form.status}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="OPEN">Mở</option>
                    <option value="CLOSED">Đóng</option>
                    <option value="CANCELLED">Huỷ</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Giảng viên</label>
                <select
                  className={inputCls}
                  value={form.lecturerId}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, lecturerId: e.target.value }))
                  }
                >
                  <option value="">-- Chọn giảng viên --</option>
                  {lecturers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Số buổi / Tuần
                  </label>
                  <input
                    type="number"
                    className={cn(inputCls, "bg-white")}
                    value={form.sessionsPerWeek}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        sessionsPerWeek: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Tiết / Buổi
                  </label>
                  <input
                    type="number"
                    className={cn(inputCls, "bg-white")}
                    value={form.periodsPerSession}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        periodsPerSession: parseInt(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div>
                <label className={labelCls}>Lớp hành chính</label>
                <input
                  type="text"
                  placeholder="Tìm lớp..."
                  value={adminClassSearch}
                  onChange={(e) => setAdminClassSearch(e.target.value)}
                  className={cn(inputCls, "mb-3")}
                />
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 border border-slate-100 rounded-2xl max-h-40 overflow-y-auto">
                  {filteredAdminClasses.map((ac) => (
                    <button
                      key={ac.id}
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          adminClassIds: p.adminClassIds.includes(ac.id)
                            ? p.adminClassIds.filter((id) => id !== ac.id)
                            : [...p.adminClassIds, ac.id],
                        }))
                      }
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all",
                        form.adminClassIds.includes(ac.id)
                          ? "bg-uneti-blue border-uneti-blue text-white"
                          : "bg-white border-slate-200 text-slate-500 hover:border-uneti-blue/30",
                      )}
                    >
                      {ac.code}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {activeCourse && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full py-3 border-2 border-dashed border-rose-100 rounded-2xl text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={13} /> Gỡ bỏ lớp học phần
              </button>
            )}
          </div>
        )}

        {/* ── TAB: SCHEDULE ── */}
        {viewTab === "schedule" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={15} className="text-uneti-blue" />
                Lịch học ({sessions.length} buổi)
              </h3>
              <button
                onClick={handleAutoSchedule}
                disabled={formLoading || isLocked || !activeCourse}
                className="flex items-center gap-1.5 text-[10px] font-black text-uneti-blue uppercase tracking-wider hover:text-uneti-blue/80 disabled:opacity-30 transition-colors"
              >
                <Zap size={13} /> Sinh lịch tự động
              </button>
            </div>

            {/* Conflict warnings */}
            {conflicts.length > 0 && (
              <div className="space-y-2">
                {conflicts.map((c, i) => (
                  <ConflictBadge key={i} msg={c} />
                ))}
              </div>
            )}

            {sessionLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:border-uneti-blue/20 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center min-w-[40px]">
                        <span className="text-xl font-black text-slate-800 leading-none">
                          {format(new Date(s.date), "dd")}
                        </span>
                        <span className="text-[8px] font-black text-slate-400 uppercase">
                          {format(new Date(s.date), "MMM", { locale: vi })}
                        </span>
                        <span className="text-[8px] font-bold text-slate-300">
                          {format(new Date(s.date), "yyyy")}
                        </span>
                      </div>
                      <div className="h-10 w-px bg-slate-100" />
                      <div>
                        <p className="text-[11px] font-black text-slate-800 flex items-center gap-2">
                          <MapPin size={11} className="text-slate-300" />
                          {s.room?.name || "Chưa xếp phòng"}
                          {s.room?.capacity && (
                            <span className="text-[9px] font-bold text-slate-400">
                              ({s.room.capacity} chỗ)
                            </span>
                          )}
                        </p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                          Tiết {s.startShift} – {s.endShift}
                          {s.type && (
                            <span className="ml-2 text-uneti-blue">
                              {s.type}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {s.type || "LECTURE"}
                    </span>
                  </div>
                ))}
                {sessions.length === 0 && !sessionLoading && (
                  <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <Calendar
                      size={32}
                      className="text-slate-200 mx-auto mb-3"
                      strokeWidth={1}
                    />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Chưa có lịch học
                    </p>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">
                      Bấm "Sinh lịch tự động" hoặc thêm thủ công
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: STUDENTS ── */}
        {viewTab === "students" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Users size={15} className="text-uneti-blue" />
                Danh sách SV ({students.length} sinh viên)
              </h3>
              <button
                onClick={syncStudentsFromAdminClass}
                disabled={studentLoading || !activeCourse}
                className="flex items-center gap-1.5 text-[10px] font-black text-uneti-blue uppercase tracking-wider hover:text-uneti-blue/80 disabled:opacity-30 transition-colors"
              >
                <RefreshCw size={13} /> Đồng bộ từ Lớp hành chính
              </button>
            </div>

            {/* Enrolled admin classes badge */}
            {activeCourse?.adminClasses?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeCourse.adminClasses.map((ac: any) => (
                  <span
                    key={ac.id}
                    className="text-[9px] font-black text-uneti-blue bg-blue-50 border border-blue-100 px-2 py-1 rounded-lg"
                  >
                    {ac.code}
                  </span>
                ))}
              </div>
            )}

            {studentLoading ? (
              <div className="py-16 flex justify-center">
                <Loader2 className="animate-spin text-slate-300" size={28} />
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((e, idx) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-all"
                  >
                    <span className="text-[10px] font-black text-slate-300 w-6 text-right">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-800 truncate">
                        {e.student?.fullName}
                      </p>
                      <p className="text-[9px] font-bold text-uneti-blue">
                        {e.student?.studentCode}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-[8px] font-black px-2 py-0.5 rounded-full border",
                        e.status === "REGISTERED"
                          ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                          : "text-slate-400 bg-slate-50 border-slate-100",
                      )}
                    >
                      {e.status}
                    </span>
                  </div>
                ))}
                {students.length === 0 && (
                  <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                    <Users
                      size={32}
                      className="text-slate-200 mx-auto mb-3"
                      strokeWidth={1}
                    />
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                      Chưa có sinh viên
                    </p>
                    <p className="text-[9px] text-slate-300 font-bold mt-1">
                      Đồng bộ từ lớp hành chính hoặc thêm thủ công
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: EXAM ── */}
        {viewTab === "exam" && (
          <div className="p-6 space-y-5">
            <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={15} className="text-rose-500" />
              Tổ Chức Kỳ Thi
            </h3>

            {/* Exam Planning Form */}
            <div className="p-5 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-4">
              <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">
                Cấu hình Kỳ thi
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Ngày Thi
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Ca Thi
                  </label>
                  <select
                    value={examShift}
                    onChange={(e) => setExamShift(e.target.value)}
                    className={inputCls}
                  >
                    <option value="1">Ca 1 — 7:10</option>
                    <option value="2">Ca 2 — 9:45</option>
                    <option value="3">Ca 3 — 13:10</option>
                    <option value="4">Ca 4 — 15:45</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">
                    Hình thức
                  </label>
                  <select
                    value={examType}
                    onChange={(e) => setExamType(e.target.value)}
                    className={inputCls}
                  >
                    <option value="TU_LUAN">Tự luận (Phòng LT)</option>
                    <option value="TRAC_NGHIEM">Trắc nghiệm (Phòng LT)</option>
                    <option value="THUC_HANH">Thực hành (Phòng TH)</option>
                    <option value="VAN_DAP">Vấn đáp</option>
                  </select>
                </div>
              </div>

              {/* Rules Info */}
              <div className="text-[9px] font-bold text-rose-500 space-y-1 pt-1">
                <p>
                  <ChevronRight size={10} className="inline" /> Tự luận / Trắc
                  nghiệm → Phòng Lý thuyết, max 30 SV/phòng
                </p>
                <p>
                  <ChevronRight size={10} className="inline" /> Thực hành →
                  Phòng Lab, max 25 SV/phòng
                </p>
                <p>
                  <ChevronRight size={10} className="inline" /> SV có TB TK &lt;
                  3.0 → Cấm thi (không có trong danh sách)
                </p>
              </div>

              <button
                onClick={handlePlanExam}
                disabled={examPlanning || !examDate}
                className="w-full py-3 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-100 transition-all disabled:opacity-40"
              >
                {examPlanning ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <ClipboardList size={14} />
                )}
                Tự động Xếp Phòng Thi
              </button>
            </div>

            {/* Exam Rooms & Attendance */}
            {examRooms.length > 0 && (
              <div className="space-y-4">
                {/* Summary */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-white border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Tổng SV đủ điều kiện
                    </p>
                    <p className="text-xl font-black text-slate-800">
                      {eligibleCount}
                    </p>
                  </div>
                  <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-amber-600 uppercase">
                      Vắng thi
                    </p>
                    <p className="text-xl font-black text-amber-700">
                      {absentCount}
                    </p>
                  </div>
                  <div className="flex-1 bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-black text-rose-600 uppercase">
                      Số phòng
                    </p>
                    <p className="text-xl font-black text-rose-700">
                      {examRooms.length}
                    </p>
                  </div>
                </div>

                {/* Rooms */}
                {examRooms.map((er, ri) => (
                  <div
                    key={ri}
                    className="bg-white border border-slate-100 rounded-2xl overflow-hidden"
                  >
                    <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-uneti-blue" />
                        <span className="text-[11px] font-black text-slate-800 uppercase">
                          {er.room?.name}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          ({er.room?.type})
                        </span>
                      </div>
                      <span className="text-[9px] font-black text-uneti-blue">
                        {er.students.length} SV
                      </span>
                    </div>
                    <div className="divide-y divide-slate-50">
                      {er.students.map((g: any, si: number) => {
                        const isPresent = examAttendance[g.studentId] !== false;
                        return (
                          <div
                            key={g.studentId}
                            className={cn(
                              "flex items-center gap-4 px-5 py-2.5 hover:bg-slate-50/50 transition-all",
                              !isPresent && "bg-amber-50/40",
                            )}
                          >
                            <span className="text-[10px] font-black text-slate-300 w-5 text-right">
                              {si + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-slate-800 truncate">
                                {g.student?.fullName}
                              </p>
                              <p className="text-[9px] font-bold text-uneti-blue">
                                {g.student?.studentCode}
                              </p>
                            </div>
                            {/* Attendance Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <span
                                className={cn(
                                  "text-[9px] font-black uppercase",
                                  isPresent
                                    ? "text-emerald-600"
                                    : "text-amber-600",
                                )}
                              >
                                {isPresent ? "Có mặt" : "Vắng"}
                              </span>
                              <div
                                onClick={() =>
                                  setExamAttendance((prev) => ({
                                    ...prev,
                                    [g.studentId]: !prev[g.studentId],
                                  }))
                                }
                                className={cn(
                                  "w-10 h-5 rounded-full transition-all cursor-pointer relative",
                                  isPresent ? "bg-emerald-400" : "bg-slate-200",
                                )}
                              >
                                <div
                                  className={cn(
                                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all",
                                    isPresent ? "left-5" : "left-0.5",
                                  )}
                                />
                              </div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Save Attendance */}
                <button
                  onClick={handleSaveAttendance}
                  disabled={savingAttendance}
                  className="w-full py-3 rounded-xl bg-uneti-blue hover:bg-uneti-blue/90 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  {savingAttendance ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCheck size={14} />
                  )}
                  Lưu Điểm Danh Thi
                </button>

                {/* Info about absent flow */}
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-[9px] font-bold text-amber-700 space-y-1">
                  <p className="font-black uppercase tracking-wider">
                    Quy trình sau điểm danh:
                  </p>
                  <p>• SV vắng thi: Điểm thi 1 = 0, chờ lịch thi lại</p>
                  <p>
                    • Thi lại vẫn không đạt (TK2 &lt; 5.0): Học lại học phần
                  </p>
                  <p>• Không đăng ký học lại: Nợ tín chỉ học phần này</p>
                </div>
              </div>
            )}

            {examRooms.length === 0 && (
              <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <ClipboardList
                  size={32}
                  className="text-slate-200 mx-auto mb-3"
                  strokeWidth={1}
                />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Chọn ngày thi và bấm Xếp Phòng
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== FOOTER ===== */}
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between shrink-0">
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] italic">
          UNETI EMS · Course Engine
        </span>
        <span className="text-[9px] font-bold text-slate-400">
          {activeCourse
            ? `${activeCourse._count?.enrollments || 0}/${activeCourse.maxSlots || "—"} SV`
            : ""}
        </span>
      </div>

      {/* ===== DELETE MODAL ===== */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <h3 className="text-base font-black text-slate-900 mb-2 uppercase">
              Xác nhận xóa lớp?
            </h3>
            <p className="text-[11px] text-slate-500 mb-6">
              Tất cả lịch học, đăng ký và điểm số của lớp này sẽ bị xóa vĩnh
              viễn khỏi hệ thống.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 py-3 bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-rose-700 transition-all"
              >
                Xóa vĩnh viễn
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
