"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  BookOpen,
  Plus,
  ShieldCheck,
  Calendar,
  Users,
  MapPin,
  Clock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building,
  CheckCircle2,
  Library,
  Search
} from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
  headers: any;
  semesters: any[];
  majors: any[];
  rooms: any[];
  lecturers: any[];
}

type Step = "subject" | "class" | "schedule" | "summary";

export default function CourseClassCreationWizard({
  onClose,
  onSuccess,
  headers,
  semesters,
  majors,
  rooms,
  lecturers
}: WizardProps) {
  const [step, setStep] = useState<Step>("subject");
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchingSubjects, setSearchingSubjects] = useState(false);

  // --- Wizard State ---
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [newSubject, setNewSubject] = useState({
    code: "",
    name: "",
    credits: 3,
    majorId: majors[0]?.id || ""
  });
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);

  const [classInfo, setClassInfo] = useState({
    semesterId: semesters.find(s => s.isCurrent)?.id || semesters[0]?.id || "",
    lecturerId: "",
    maxSlots: 60,
    status: "OPEN"
  });

  const [schedules, setSchedules] = useState<any[]>([
    { dayOfWeek: 2, startShift: 1, endShift: 3, roomId: "", type: "LECTURE" }
  ]);

  // --- Fetch Subjects ---
  useEffect(() => {
    const fetchSubjects = async () => {
      setSearchingSubjects(true);
      try {
        const res = await fetch("/api/courses/subjects/by-faculty", { headers });
        if (res.ok) setSubjects(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setSearchingSubjects(false);
      }
    };
    fetchSubjects();
  }, [headers]);

  // --- Actions ---
  const handleSave = async () => {
    setLoading(true);
    try {
      let subjectId = selectedSubject?.id;

      // 1. Create Subject if needed
      if (isCreatingNewSubject) {
        const subRes = await fetch("/api/courses/subjects", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify(newSubject)
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          subjectId = subData.id;
        } else {
          throw new Error("Không thể tạo môn học mới.");
        }
      }

      // 2. Create Course Class with Schedules
      const classRes = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          subjectId,
          ...classInfo,
          schedules: schedules.filter(s => s.roomId)
        })
      });

      if (classRes.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await classRes.json();
        alert(err.message || "Lỗi khi tạo lớp học phần.");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addSchedule = () => {
    setSchedules([...schedules, { dayOfWeek: 2, startShift: 1, endShift: 3, roomId: "", type: "LECTURE" }]);
  };

  const removeSchedule = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const updateSchedule = (index: number, field: string, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index][field] = value;
    setSchedules(newSchedules);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-4xl bg-white rounded-[48px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 max-h-[90vh]">
        {/* HEADER */}
        <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 rounded-[24px] flex items-center justify-center text-white shadow-xl shadow-slate-200">
               <Zap size={24} strokeWidth={3} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase">Cấu hình vận hành mới</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-2">Hệ thống tạo học phần và xếp lịch định kỳ bản vá 2026</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-2xl transition-all shadow-sm">
            <X size={20} />
          </button>
        </header>

        {/* STEPPER */}
        <div className="flex px-10 py-6 bg-white border-b border-slate-50 justify-center gap-4">
           {[
             { id: "subject", label: "Học phần" },
             { id: "class", label: "Vận hành" },
             { id: "schedule", label: "Lịch định kỳ" },
             { id: "summary", label: "Hoàn tất" }
           ].map((s, idx) => (
             <div key={s.id} className="flex items-center gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all",
                  step === s.id ? "bg-slate-900 text-white shadow-lg" : "bg-slate-50 text-slate-300"
                )}>
                  {idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  step === s.id ? "text-slate-900" : "text-slate-300"
                )}>{s.label}</span>
                {idx < 3 && <div className="w-8 h-0.5 bg-slate-50" />}
             </div>
           ))}
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-10">
          
          {/* STEP: SUBJECT */}
          {step === "subject" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
               <div className="grid grid-cols-2 gap-8">
                  <div className={cn(
                    "p-8 rounded-[40px] border-2 transition-all cursor-pointer group flex flex-col gap-6",
                    !isCreatingNewSubject ? "bg-blue-50/50 border-uneti-blue shadow-xl shadow-blue-100" : "bg-white border-slate-50 hover:bg-slate-50 text-slate-400"
                  )} onClick={() => setIsCreatingNewSubject(false)}>
                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", !isCreatingNewSubject ? "bg-uneti-blue text-white" : "bg-slate-100 text-slate-300")}>
                        <Library size={24} />
                     </div>
                     <div>
                        <h3 className={cn("text-lg font-black tracking-tight leading-none uppercase", !isCreatingNewSubject ? "text-slate-900" : "text-slate-400")}>Sử dụng mẫu</h3>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-2", !isCreatingNewSubject ? "text-uneti-blue" : "text-slate-300")}>Lấy từ Danh mục Học phần hiện có</p>
                     </div>
                  </div>

                  <div className={cn(
                    "p-8 rounded-[40px] border-2 transition-all cursor-pointer group flex flex-col gap-6",
                    isCreatingNewSubject ? "bg-emerald-50/50 border-emerald-500 shadow-xl shadow-emerald-100" : "bg-white border-slate-50 hover:bg-slate-50 text-slate-400"
                  )} onClick={() => setIsCreatingNewSubject(true)}>
                     <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm", isCreatingNewSubject ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-400")}>
                        <Plus size={24} strokeWidth={3} />
                     </div>
                     <div>
                        <h3 className={cn("text-lg font-black tracking-tight leading-none uppercase", isCreatingNewSubject ? "text-slate-900" : "text-slate-400")}>Tạo mới hoàn toàn</h3>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest mt-2", isCreatingNewSubject ? "text-emerald-500" : "text-slate-300")}>Khi học phần chưa tồn tại trong hệ thống</p>
                     </div>
                  </div>
               </div>

               {isCreatingNewSubject ? (
                 <div className="grid grid-cols-2 gap-6 p-10 bg-emerald-50/20 border border-emerald-100 rounded-[40px] animate-in zoom-in-95 duration-300">
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Mã học phần</label>
                      <input className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800" placeholder="VD: ACC101" value={newSubject.code} onChange={e => setNewSubject({...newSubject, code: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Tên học phần</label>
                      <input className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800" placeholder="VD: Kế toán đại cương" value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Số tín chỉ</label>
                      <input type="number" className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800" value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Bộ môn phụ trách</label>
                      <select className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-4 text-[11px] font-black outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer text-slate-800" value={newSubject.majorId} onChange={e => setNewSubject({...newSubject, majorId: e.target.value})}>
                         {majors.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                 </div>
               ) : (
                 <div className="space-y-4 animate-in zoom-in-95 duration-300">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Tìm và chọn danh mẫu học phần</label>
                    <div className="relative group">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-uneti-blue transition-colors" size={18} />
                       <input className="w-full bg-slate-50 border-none rounded-[32px] pl-14 pr-6 py-5 text-[12px] font-black outline-none focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all" placeholder="Nhập mã hoặc tên học phần mẫu..." />
                    </div>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto custom-scrollbar p-2">
                       {subjects.slice(0, 10).map(s => (
                         <button key={s.id} onClick={() => setSelectedSubject(s)} className={cn(
                           "px-6 py-4 rounded-2xl border text-[11px] font-black text-left transition-all",
                           selectedSubject?.id === s.id ? "bg-slate-900 border-slate-900 text-white" : "bg-white border-slate-100 text-slate-500 hover:border-uneti-blue/30"
                         )}>
                           <p className="opacity-60 text-[9px] uppercase mb-1">{s.code}</p>
                           <p className="truncate uppercase">{s.name}</p>
                         </button>
                       ))}
                    </div>
                 </div>
               )}
            </div>
          )}

          {/* STEP: CLASS */}
          {step === "class" && (
            <div className="space-y-10 animate-in fade-in slide-in-from-right-5 duration-500">
               <div className="p-8 bg-slate-50 border border-slate-100 rounded-[40px] flex items-center gap-6 shadow-sm">
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-uneti-blue shadow-lg border border-slate-100">
                     <BookOpen size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight uppercase leading-tight text-slate-900">{isCreatingNewSubject ? newSubject.name : selectedSubject?.name}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{isCreatingNewSubject ? newSubject.code : selectedSubject?.code} · {isCreatingNewSubject ? newSubject.credits : selectedSubject?.credits} TÍN CHỈ</p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Chu kỳ Học kỳ</label>
                    <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-[11px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none cursor-pointer" value={classInfo.semesterId} onChange={e => setClassInfo({...classInfo, semesterId: e.target.value})}>
                       {semesters.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Sĩ số giới hạn</label>
                    <input type="number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-[11px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all" value={classInfo.maxSlots} onChange={e => setClassInfo({...classInfo, maxSlots: parseInt(e.target.value)})} />
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Phân công giảng viên</label>
                    <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-[11px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none cursor-pointer" value={classInfo.lecturerId} onChange={e => setClassInfo({...classInfo, lecturerId: e.target.value})}>
                       <option value="">-- CHƯA PHÂN CÔNG --</option>
                       {lecturers.map(l => <option key={l.id} value={l.id}>{l.fullName.toUpperCase()}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-2">Trạng thái phát hành</label>
                    <select className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 text-[11px] font-black text-slate-800 outline-none focus:ring-4 focus:ring-uneti-blue/5 transition-all appearance-none cursor-pointer" value={classInfo.status} onChange={e => setClassInfo({...classInfo, status: e.target.value})}>
                       <option value="OPEN">MỞ ĐĂNG KÝ (OPEN)</option>
                       <option value="CLOSED">ĐÓNG LỚP (CLOSED)</option>
                       <option value="CANCELLED">HỦY BỎ (CANCELLED)</option>
                    </select>
                  </div>
               </div>
            </div>
          )}

          {/* STEP: SCHEDULE */}
          {step === "schedule" && (
            <div className="space-y-8 animate-in fade-in slide-in-from-right-5 duration-500">
               <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">Mẫu lịch lặp lại</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Buổi học sẽ tự động được sinh ra dựa trên pattern tuần</p>
                  </div>
                  <button onClick={addSchedule} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200">
                     <Plus size={14} strokeWidth={3} /> Thêm Pattern mới
                  </button>
               </div>

               <div className="space-y-4">
                  {schedules.map((s, idx) => (
                    <div key={idx} className="p-8 bg-slate-50 border border-slate-100 rounded-[40px] grid grid-cols-4 gap-6 relative group animate-in zoom-in-95 duration-300 transition-all hover:bg-white hover:shadow-xl hover:shadow-slate-100">
                       <button onClick={() => removeSchedule(idx)} className="absolute -top-3 -right-3 w-8 h-8 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all">
                          <X size={14} strokeWidth={3} />
                       </button>

                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Thứ trong tuần</label>
                          <select className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black outline-none focus:ring-2 focus:ring-uneti-blue/10 appearance-none" value={s.dayOfWeek} onChange={e => updateSchedule(idx, 'dayOfWeek', parseInt(e.target.value))}>
                             {[2,3,4,5,6,7,8].map(day => <option key={day} value={day}>{day === 8 ? 'Chủ Nhật' : `Thứ ${day}`}</option>)}
                          </select>
                       </div>
                       <div>
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Bắt đầu Ca (Shift)</label>
                          <select className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black outline-none focus:ring-2 focus:ring-uneti-blue/10 appearance-none" value={s.startShift} onChange={e => updateSchedule(idx, 'startShift', parseInt(e.target.value))}>
                             <option value={1}>Ca 1 (7:10)</option>
                             <option value={2}>Ca 2 (9:45)</option>
                             <option value={3}>Ca 3 (13:10)</option>
                             <option value={4}>Ca 4 (15:45)</option>
                          </select>
                       </div>
                       <div className="col-span-2">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Phòng học ấn định</label>
                          <select className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 text-[11px] font-black outline-none focus:ring-2 focus:ring-uneti-blue/10 appearance-none" value={s.roomId} onChange={e => updateSchedule(idx, 'roomId', e.target.value)}>
                             <option value="">-- CHỌN PHÒNG --</option>
                             {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
                          </select>
                       </div>
                    </div>
                  ))}
               </div>

               <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[32px] flex items-center gap-4">
                  <Clock size={20} className="text-uneti-blue" />
                  <p className="text-[10px] font-bold text-slate-500 leading-tight italic">
                    Dựa trên ngày bắt đầu/kết thúc của học kỳ đã chọn, hệ thống sẽ tự động sinh mã định danh và tất cả các buổi học tương ứng với các thứ trong tuần đã khai báo.
                  </p>
               </div>
            </div>
          )}

          {/* STEP: SUMMARY */}
          {step === "summary" && (
            <div className="space-y-10 animate-in zoom-in-95 duration-500 text-center flex flex-col items-center">
               <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-[40px] flex items-center justify-center mb-4">
                  <CheckCircle2 size={48} strokeWidth={2.5} />
               </div>
               
               <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tighter text-slate-900 uppercase">Sẵn sàng vận hành</h3>
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">Dữ liệu đã được kiểm chứng tính hợp lệ</p>
               </div>

               <div className="w-full max-w-lg bg-slate-50 rounded-[40px] p-10 space-y-6 text-left border border-slate-100 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-16 translate-x-16 opacity-50" />
                  
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 relative z-10">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học phần</span>
                     <span className="text-[11px] font-black text-slate-900 uppercase">{isCreatingNewSubject ? newSubject.name : selectedSubject?.name}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 relative z-10">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tín chỉ</span>
                     <span className="text-[11px] font-black text-slate-900">{isCreatingNewSubject ? newSubject.credits : selectedSubject?.credits}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4 relative z-10">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảng viên</span>
                     <span className="text-[11px] font-black text-slate-900">{lecturers.find(l => l.id === classInfo.lecturerId)?.fullName || "CHƯA PHÂN CÔNG"}</span>
                  </div>
                  <div className="flex items-center justify-between relative z-10">
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số buổi/Tuần</span>
                     <span className="text-[11px] font-black text-uneti-blue">{schedules.length} BUỔI</span>
                  </div>
               </div>

               <div className="p-8 bg-slate-900 rounded-[32px] text-white w-full max-w-lg flex items-center gap-6 shadow-2xl">
                  <div className="w-12 h-12 bg-uneti-blue rounded-2xl flex items-center justify-center shadow-lg">
                    <ShieldCheck size={24} />
                  </div>
                  <div className="text-left">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Xác nhận ghi danh</p>
                     <p className="text-[12px] font-black leading-tight mt-1">Hệ thống sẽ đồng bộ hóa cơ sở dữ liệu và kích hoạt tiến trình sinh lịch tự động.</p>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* FOOTER ACTIONS */}
        <footer className="px-10 py-8 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          <button
            onClick={() => {
              if (step === "class") setStep("subject");
              else if (step === "schedule") setStep("class");
              else if (step === "summary") setStep("schedule");
              else onClose();
            }}
            className="flex items-center gap-3 px-8 py-4 rounded-3xl bg-slate-50 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all font-montserrat"
          >
            <ChevronLeft size={16} strokeWidth={3} /> Quay lại
          </button>

          <button
            onClick={() => {
              if (step === "subject") {
                if (isCreatingNewSubject) {
                    if (!newSubject.code || !newSubject.name) alert("Vui lòng nhập mã và tên học phần");
                    else setStep("class");
                } else {
                    if (!selectedSubject) alert("Vui lòng chọn 1 học phần mẫu");
                    else setStep("class");
                }
              }
              else if (step === "class") {
                  if (!classInfo.semesterId) alert("Vui lòng chọn học kỳ");
                  else setStep("schedule");
              }
              else if (step === "schedule") {
                  if (!schedules.some(s => s.roomId)) alert("Vui lòng thiết lập ít nhất 1 pattern lịch (có chọn phòng)");
                  else setStep("summary");
              }
              else if (step === "summary") handleSave();
            }}
            disabled={loading}
            className="flex items-center gap-3 px-10 py-5 bg-uneti-blue text-white rounded-[32px] text-[12px] font-black uppercase tracking-widest shadow-2xl shadow-uneti-blue/30 hover:bg-slate-900 transition-all font-montserrat disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (
              <>
                {step === "summary" ? "Kích hoạt định danh" : "Tiếp tục thiết lập"} <ChevronRight size={18} strokeWidth={3} />
              </>
            )}
          </button>
        </footer>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
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
