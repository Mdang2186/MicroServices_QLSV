"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  ShieldCheck,
  Calendar,
  Users,
  MapPin,
  Clock,
  Zap,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Loader2,
  ChevronRight,
  ArrowRightLeft,
  Settings,
  Activity,
  Plus,
  ArrowUpRight,
  ClipboardCheck,
  GraduationCap
} from "lucide-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { vi } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from "next/link";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface DetailDrawerProps {
  courseClass: any;
  onClose: () => void;
  onRefresh: () => void;
  headers: any;
  rooms: any[];
  lecturers: any[];
}

type TabType = "config" | "schedule" | "students" | "conflicts";
type ScheduleMode = "list" | "calendar";

export default function CourseClassDetailDrawer({
  courseClass,
  onClose,
  onRefresh,
  headers,
  rooms,
  lecturers
}: DetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabType>("schedule");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("list");
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [movingSession, setMovingSession] = useState<any | null>(null);
  const [showAddSession, setShowAddSession] = useState(false);
  
  const [newSessionForm, setNewSessionForm] = useState({
      date: format(new Date(), "yyyy-MM-dd"),
      startShift: 1,
      endShift: 3,
      roomId: "none"
  });

  // --- Form State ---
  const [form, setForm] = useState({
    name: courseClass?.name || "",
    lecturerId: courseClass?.lecturerId || "none",
    status: courseClass?.status || "OPEN",
    maxSlots: courseClass?.maxSlots || 60
  });

  useEffect(() => {
    if (courseClass) {
      setForm({
        name: courseClass.name || "",
        lecturerId: courseClass.lecturerId || "none",
        status: courseClass.status || "OPEN",
        maxSlots: courseClass.maxSlots || 60
      });
      fetchSessions();
    }
  }, [courseClass]);

  const fetchSessions = async () => {
    if (!courseClass) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}/sessions`, { headers });
      if (res.ok) setSessions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleUpdateConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/courses/${courseClass.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          ...form,
          lecturerId: form.lecturerId === "none" ? null : form.lecturerId
        })
      });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveSession = async (sessionId: string, newDate: string, newShift: number) => {
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/courses/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ date: newDate, startShift: newShift, endShift: newShift + 2 })
      });
      if (res.ok) {
        fetchSessions();
        setMovingSession(null);
      } else {
        const err = await res.json();
        alert(err.message || "Không thể dời lịch do có xung đột.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSessionLoading(false);
    }
  };

  const handleAddSession = async () => {
      setSessionLoading(true);
      try {
          const res = await fetch(`/api/courses/${courseClass.id}/sessions`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...headers },
              body: JSON.stringify({
                  ...newSessionForm,
                  roomId: newSessionForm.roomId === "none" ? null : newSessionForm.roomId
              })
          });
          if (res.ok) {
              fetchSessions();
              setShowAddSession(false);
          } else {
              const err = await res.json();
              alert(err.message || "Không thể thêm lịch do có xung đột.");
          }
      } catch (err) { console.error(err); } finally { setSessionLoading(false); }
  };

  const handleDeleteSession = async (id: string) => {
      if (!confirm("Xác nhận xóa buổi học này?")) return;
      setSessionLoading(true);
      try {
          const res = await fetch(`/api/courses/sessions/${id}`, { method: "DELETE", headers });
          if (res.ok) fetchSessions();
      } catch (err) { console.error(err); } finally { setSessionLoading(false); }
  };

  // --- Calendar Logic ---
  const currentWeekStart = useMemo(() => startOfWeek(new Date(), { weekStartsOn: 1 }), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)), [currentWeekStart]);

  if (!courseClass) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end text-slate-800">
      {/* OVERLAY */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in" onClick={onClose} />

      {/* DRAWER CONTENT */}
      <div className="relative w-[700px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500">
        {/* HEADER */}
        <header className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-2xl transition-all">
              <X size={20} />
            </button>
            <div>
              <h2 className="text-[15px] font-black text-slate-900 tracking-tight leading-none uppercase">{courseClass.name}</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{courseClass.code} · {courseClass.semester?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
              <Link href={`/staff/attendance?classId=${courseClass.id}`} className="flex items-center gap-2 group">
                  <div className="w-9 h-9 flex items-center justify-center bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                      <ClipboardCheck size={16} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-emerald-600 transition-all">Điểm danh</span>
              </Link>
              <Link href={`/staff/grades?classId=${courseClass.id}`} className="flex items-center gap-2 group">
                  <div className="w-9 h-9 flex items-center justify-center bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
                      <GraduationCap size={16} />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-amber-600 transition-all">Quản lý điểm</span>
              </Link>
          </div>
        </header>

        {/* TABS */}
        <nav className="flex px-8 border-b border-slate-100 bg-slate-50/40 shrink-0">
          {[
            { id: "schedule", label: "Lịch Vận Hành", icon: Calendar },
            { id: "config", label: "Thông tin chi tiết", icon: Settings },
            { id: "students", label: "Danh sách SV", icon: Users },
            { id: "conflicts", label: "Kiểm tra trùng", icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative border-b-2",
                activeTab === tab.id ? "border-uneti-blue text-uneti-blue bg-white" : "border-transparent text-slate-400 hover:text-slate-600"
              )}
            >
              <tab.icon size={13} strokeWidth={2.5} />
              {tab.label}
            </button>
          ))}
        </nav>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {/* --- SCHEDULE TAB --- */}
          {activeTab === "schedule" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-slate-900 px-6 py-4 rounded-[32px] text-white">
                  <div className="flex items-center gap-4">
                      <div className="flex bg-slate-800 p-1 rounded-xl">
                          <button onClick={() => setScheduleMode("list")} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", scheduleMode === 'list' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-white")}>Danh sách</button>
                          <button onClick={() => setScheduleMode("calendar")} className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all", scheduleMode === 'calendar' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-white")}>Thời khóa biểu</button>
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button onClick={() => setShowAddSession(true)} className="flex items-center gap-2 bg-uneti-blue text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all">
                        <Plus size={14} /> Thêm ca học
                      </button>
                      <button className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white px-4 py-2 transition-all uppercase tracking-widest">
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Xếp lại
                      </button>
                  </div>
              </div>

              {sessionLoading ? (
                 <div className="py-20 flex flex-col items-center opacity-30">
                    <Loader2 className="animate-spin text-uneti-blue mb-4" size={32} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Đang tải lịch trình...</p>
                 </div>
              ) : scheduleMode === "list" ? (
                <div className="space-y-3">
                  {sessions.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((s, idx) => (
                    <div key={s.id} className="p-6 bg-white border border-slate-100 rounded-[24px] flex items-center justify-between group hover:border-uneti-blue/30 transition-all hover:bg-slate-50/30">
                      <div className="flex items-center gap-5">
                         <div className="w-14 h-14 bg-slate-900 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                            <span className="text-lg font-black leading-none">{format(new Date(s.date), "dd")}</span>
                            <span className="text-[8px] font-black uppercase opacity-60">{format(new Date(s.date), "MMM", { locale: vi })}</span>
                         </div>
                         <div className="h-10 w-px bg-slate-100" />
                         <div>
                            <div className="flex items-center gap-2 mb-1">
                               <MapPin size={12} className="text-slate-300" />
                               <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">{s.room?.name || "CHƯA XẾP PHÒNG"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-uneti-blue rounded-md text-[9px] font-bold">
                                  <Clock size={10} /> Tiết {s.startShift}-{s.endShift}
                               </div>
                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{format(new Date(s.date), "EEEE", { locale: vi })}</span>
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMovingSession(s)}
                          className="w-10 h-10 flex items-center justify-center bg-transparent group-hover:bg-uneti-blue group-hover:text-white rounded-2xl transition-all text-slate-300 hover:text-uneti-blue"
                          title="Dời ngày học / Đổi ca"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button onClick={() => handleDeleteSession(s.id)} className="w-10 h-10 flex items-center justify-center bg-transparent group-hover:bg-rose-50 group-hover:text-rose-500 rounded-2xl transition-all text-slate-300 hover:text-rose-500" title="Hủy buổi này">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm overflow-hidden">
                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {weekDays.map(d => (
                            <div key={d.toString()} className="text-center">
                                <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{format(d, "EEE", { locale: vi })}</p>
                                <p className={cn("text-[10px] font-black w-7 h-7 flex items-center justify-center mx-auto rounded-full", isSameDay(d, new Date()) ? "bg-uneti-blue text-white" : "text-slate-600")}>{format(d, "d")}</p>
                            </div>
                        ))}
                    </div>
                    {/* Simplified Weekly Grid */}
                    <div className="space-y-2">
                        {[1, 2, 3, 4].map(shift => (
                            <div key={shift} className="grid grid-cols-7 gap-2 h-16">
                                {weekDays.map(day => {
                                    const sess = sessions.find(s => isSameDay(new Date(s.date), day) && s.startShift === (shift * 3 - 2));
                                    return (
                                        <div key={day.toString()} className={cn("rounded-xl border transition-all flex flex-col items-center justify-center p-1", sess ? "bg-blue-50 border-blue-100 shadow-sm" : "bg-slate-50 border-transparent opacity-20")}>
                                            {sess && (
                                                <>
                                                    <span className="text-[8px] font-black text-uneti-blue leading-none">{sess.room?.name || "NA"}</span>
                                                    <span className="text-[6px] font-bold text-slate-400 uppercase mt-1">C{shift}</span>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-uneti-blue" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ca học hiện tại</span></div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-100" /><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ca trống</span></div>
                    </div>
                </div>
              )}

              {sessions.length === 0 && !sessionLoading && (
                 <div className="py-24 text-center border-2 border-dashed border-slate-100 rounded-[32px] opacity-30">
                    <Calendar size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em]">Lớp chưa có lịch vận hành</p>
                 </div>
              )}
            </div>
          )}

          {/* --- CONFIG TAB --- */}
          {activeTab === "config" && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl shadow-slate-200">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Trạng thái vận hành</h4>
                  <div className="flex items-center justify-between">
                     <p className="text-lg font-black tracking-tight uppercase">Đang đồng bộ hóa</p>
                     <button onClick={handleUpdateConfig} disabled={loading} className="px-6 py-2.5 bg-uneti-blue text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-slate-900 transition-all disabled:opacity-50">
                        {loading ? <Loader2 size={14} className="animate-spin" /> : "Ghi nhận thay đổi"}
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6 pb-20">
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Tên hiển thị lớp</label>
                     <input
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all text-slate-800"
                        value={form.name}
                        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Sĩ số tối đa</label>
                     <input
                        type="number"
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all text-slate-800"
                        value={form.maxSlots}
                        onChange={e => setForm(p => ({ ...p, maxSlots: parseInt(e.target.value) }))}
                     />
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Trạng thái lớp</label>
                     <select
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none text-slate-800"
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                     >
                        <option value="OPEN">Mở (Hoạt động)</option>
                        <option value="CLOSED">Đóng (Kết thúc)</option>
                        <option value="CANCELLED">Hủy lớp</option>
                     </select>
                  </div>
                  <div className="space-y-4">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Giảng viên phụ trách</label>
                     <select
                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none text-slate-800"
                        value={form.lecturerId}
                        onChange={e => setForm(p => ({ ...p, lecturerId: e.target.value }))}
                     >
                        <option value="none">-- Chưa gán giảng viên --</option>
                        {lecturers.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                     </select>
                  </div>
               </div>
            </div>
          )}

          {/* --- STUDENTS TAB --- */}
          {activeTab === "students" && (
            <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Sinh viên ghi danh ({courseClass._count?.enrollments || 0})</h3>
                    <button className="text-[10px] font-black text-uneti-blue flex items-center gap-2 uppercase tracking-widest underline decoration-blue-100">Xuất danh sách</button>
                </div>
                {/* Mock student row */}
                <div className="py-20 flex flex-col items-center opacity-30 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                    <Users size={40} className="text-slate-300 mb-4" strokeWidth={1} />
                    <p className="text-[9px] font-black uppercase tracking-[0.3em]">Đang đồng bộ danh sách sinh viên...</p>
                </div>
            </div>
          )}

          {/* --- CONFLICTS TAB --- */}
          {activeTab === "conflicts" && (
            <div className="space-y-6">
               <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-[32px] flex items-center gap-5">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                     <CheckCircle2 size={24} />
                  </div>
                  <div>
                     <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Không phát hiện trùng lặp</p>
                     <p className="text-[9px] font-bold text-slate-500 mt-0.5 uppercase tracking-widest leading-none">Cơ sở dữ liệu lịch biểu đồng nhất</p>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 gap-4">
                    {[
                        { label: "Trùng phòng học", status: "CLEAN" },
                        { label: "Trùng giảng viên", status: "CLEAN" },
                        { label: "Trùng lớp hành chính", status: "CLEAN" }
                    ].map(c => (
                        <div key={c.label} className="p-5 bg-white border border-slate-100 rounded-2xl flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-700 uppercase">{c.label}</span>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">An toàn</span>
                            </div>
                        </div>
                    ))}
               </div>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="px-8 py-5 border-t border-slate-100 bg-slate-50/20 flex items-center justify-between shrink-0">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic underline decoration-slate-200">System Sync</span>
              </div>
              <div className="h-4 w-px bg-slate-200" />
              <p className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <Activity size={12} className="text-uneti-blue" /> Lớp đang hoạt động
              </p>
           </div>
           <p className="text-[10px] font-black text-uneti-blue">
              SĨ SỐ: {courseClass._count?.enrollments || 0} / {courseClass.maxSlots} SV
           </p>
        </footer>

        {/* --- MOVING SESSION DIALOG --- */}
        {movingSession && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setMovingSession(null)} />
            <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
               <div className="flex flex-col items-center text-center gap-4 mb-8">
                  <div className="w-16 h-16 bg-uneti-blue/10 text-uneti-blue rounded-[24px] flex items-center justify-center">
                    <ArrowRightLeft size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">Dời lịch học</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Buổi ngày {format(new Date(movingSession.date), "dd/MM/yyyy")}</p>
                  </div>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block pl-2">Chọn ngày mới</label>
                    <input
                      type="date"
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all text-slate-800"
                      defaultValue={format(new Date(movingSession.date), "yyyy-MM-dd")}
                      onChange={e => setMovingSession({ ...movingSession, nextDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block pl-2">Chọn ca mới</label>
                    <select
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none text-slate-800"
                      defaultValue={movingSession.startShift}
                      onChange={e => setMovingSession({ ...movingSession, nextShift: parseInt(e.target.value) })}
                    >
                      <option value={1}>Ca 1 (Tiết 1-3)</option>
                      <option value={4}>Ca 2 (Tiết 4-6)</option>
                      <option value={7}>Ca 3 (Tiết 7-9)</option>
                      <option value={10}>Ca 4 (Tiết 10-12)</option>
                    </select>
                  </div>
               </div>

               <div className="flex gap-3 mt-10">
                  <button
                    onClick={() => handleMoveSession(movingSession.id, movingSession.nextDate || format(new Date(movingSession.date), "yyyy-MM-dd"), movingSession.nextShift || movingSession.startShift)}
                    className="flex-1 py-4 bg-uneti-blue text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-uneti-blue/20 hover:bg-slate-900 transition-all font-montserrat"
                  >
                    Xác nhận
                  </button>
                  <button
                    onClick={() => setMovingSession(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-montserrat"
                  >
                    Hủy
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* --- ADD SESSION DIALOG --- */}
        {showAddSession && (
             <div className="absolute inset-0 z-50 flex items-center justify-center p-8">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddSession(null)} />
                <div className="relative w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center text-center gap-4 mb-8">
                        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[24px] flex items-center justify-center">
                            <Plus size={32} />
                        </div>
                        <div>
                            <h3 className="text-lg font-black tracking-tight text-slate-900">Thêm buổi học mới</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bổ sung vào lịch trình vận hành</p>
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Ngày học</label>
                             <input type="date" className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 text-slate-800" value={newSessionForm.date} onChange={e => setNewSessionForm(p => ({ ...p, date: e.target.value }))} />
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Ca học</label>
                             <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 text-slate-800" value={newSessionForm.startShift} onChange={e => setNewSessionForm(p => ({ ...p, startShift: parseInt(e.target.value), endShift: parseInt(e.target.value) + 2 }))}>
                                <option value={1}>Ca 1 (Tiết 1-3)</option>
                                <option value={4}>Ca 2 (Tiết 4-6)</option>
                                <option value={7}>Ca 3 (Tiết 7-9)</option>
                                <option value={10}>Ca 4 (Tiết 10-12)</option>
                             </select>
                        </div>
                        <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Phòng học</label>
                             <select className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 text-slate-800" value={newSessionForm.roomId} onChange={e => setNewSessionForm(p => ({ ...p, roomId: e.target.value }))}>
                                <option value="none">-- Tự động xếp phòng --</option>
                                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                             </select>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-10">
                        <button onClick={handleAddSession} className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-uneti-blue transition-all font-montserrat shadow-xl">Thêm ngay</button>
                        <button onClick={() => setShowAddSession(null)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-montserrat">Hủy bỏ</button>
                    </div>
                </div>
             </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
