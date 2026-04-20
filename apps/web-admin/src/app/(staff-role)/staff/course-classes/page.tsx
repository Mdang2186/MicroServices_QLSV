"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Cookies from "js-cookie";
import {
  LayoutGrid,
  Search,
  Filter,
  Plus,
  RefreshCw,
  MoreVertical,
  Calendar,
  Users,
  MapPin,
  Clock,
  ChevronRight,
  Loader2,
  AlertTriangle,
  Layers,
  GraduationCap
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import CourseClassDetailDrawer from "../courses/components/CourseClassDetailDrawer";
import CourseClassCreationWizard from "../courses/components/CourseClassCreationWizard";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API = (path: string) => `/api${path}`;

// --- Utils ---
const getAcademicYear = (semesterName: string) => {
  const match = semesterName.match(/\((\d{4}-\d{4})\)/);
  return match ? match[1] : "Khác";
};

export default function CourseClassManagementPage() {
  const TOKEN = Cookies.get("admin_accessToken") || Cookies.get("staff_accessToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${TOKEN}` }), [TOKEN]);

  // --- Data State ---
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [courseClasses, setCourseClasses] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, enrollmentRate: 0 });

  // --- UI State ---
  const [selectedCourseClassId, setSelectedCourseClassId] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // --- Filtering State ---
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // --- Computed ---
  const academicYears = useMemo(() => {
    const years = Array.from(new Set(semesters.map(s => getAcademicYear(s.name))));
    return years.sort((a, b) => b.localeCompare(a));
  }, [semesters]);

  const filteredClasses = useMemo(() => {
    let list = courseClasses;

    // Filter by Academic Year (multiple semesters)
    if (selectedYear) {
      const yearSemIds = semesters
        .filter(s => getAcademicYear(s.name) === selectedYear)
        .map(s => s.id);
      list = list.filter(c => yearSemIds.includes(c.semesterId));
    }

    if (selectedMajorId !== "all") {
      list = list.filter(c => c.subject?.majorId === selectedMajorId);
    }

    if (selectedStatus !== "all") {
      list = list.filter(c => c.status === selectedStatus);
    }

    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(c =>
        c.code.toLowerCase().includes(s) ||
        c.name.toLowerCase().includes(s) ||
        c.subject?.name?.toLowerCase().includes(s)
      );
    }

    return list;
  }, [courseClasses, selectedYear, selectedMajorId, selectedStatus, searchTerm, semesters]);

  const currentYearStats = useMemo(() => {
    const total = filteredClasses.length;
    const active = filteredClasses.filter(c => c.status === "OPEN").length;
    const totalSlots = filteredClasses.reduce((sum, c) => sum + (c.maxSlots || 0), 0);
    const totalEnrolled = filteredClasses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);
    const rate = totalSlots > 0 ? (totalEnrolled / totalSlots) * 100 : 0;

    return { total, active, enrollmentRate: Math.round(rate) };
  }, [filteredClasses]);

  // --- Fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [semRes, classRes, majorRes, roomRes, lectRes] = await Promise.all([
        fetch(API("/semesters"), { headers }),
        fetch(API("/courses"), { headers }),
        fetch(API("/courses/majors"), { headers }),
        fetch(API("/rooms"), { headers }),
        fetch(API("/courses/lecturers/by-faculty"), { headers })
      ]);

      if (semRes.ok) {
        const semData = await semRes.json();
        setSemesters(semData);
        if (!selectedYear && semData.length > 0) {
          const current = semData.find((s: any) => s.isCurrent);
          if (current) setSelectedYear(getAcademicYear(current.name));
          else setSelectedYear(getAcademicYear(semData[0].name));
        }
      }
      if (classRes.ok) setCourseClasses(await classRes.json());
      if (majorRes.ok) setMajors(await majorRes.json());
      if (roomRes.ok) setRooms(await roomRes.json());
      if (lectRes.ok) setLecturers(await lectRes.json());
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  }, [headers, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 text-center">
        <Loader2 className="w-12 h-12 text-uneti-blue animate-spin" />
        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Đang đồng bộ hóa dữ liệu vận hành...</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#fcfdfe] text-slate-900 overflow-hidden font-sans select-none">
      {/* --- TOPBAR --- */}
      <header className="px-8 py-5 flex items-center justify-between bg-white border-b border-slate-100 shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-5">
          <div className="w-12 h-12 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl shadow-slate-200">
            <Layers size={22} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter text-slate-900 leading-tight">Quản lý Học phần</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black text-uneti-blue uppercase tracking-widest">{selectedYear}</span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Vận hành đồng bộ toàn hệ thống</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-uneti-blue transition-colors" size={15} />
            <input
              type="text"
              placeholder="Tìm mã lớp, tên môn học..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-80 pl-11 pr-5 py-3 bg-slate-50 border-transparent rounded-[18px] text-[11px] font-bold placeholder:text-slate-300 hover:bg-slate-100 transition-all focus:bg-white focus:ring-4 focus:ring-uneti-blue/5 focus:border-uneti-blue outline-none border"
            />
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 px-6 py-3 bg-uneti-blue text-white rounded-[18px] text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-xl shadow-uneti-blue/20"
          >
            <Plus size={16} strokeWidth={3} /> Tạo Môn học mới
          </button>
          <button onClick={fetchData} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all rounded-[18px]">
            <RefreshCw size={18} />
          </button>
        </div>
      </header>

      {/* --- CONTENT AREA --- */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDE BAR FILTERS */}
        <aside className="w-72 bg-white border-r border-slate-100 p-8 flex flex-col gap-8 overflow-y-auto custom-scrollbar shrink-0">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Năm học vận hành</label>
            <div className="space-y-2">
              {academicYears.map(year => (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={cn(
                    "w-full px-5 py-4 rounded-2xl flex items-center justify-between text-[11px] font-black tracking-tight transition-all text-left",
                    selectedYear === year
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                      : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                  {year}
                  {selectedYear === year && <ChevronRight size={14} strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Bộ môn / Ngành</label>
            <select
              value={selectedMajorId}
              onChange={e => setSelectedMajorId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-black text-slate-600 outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all appearance-none cursor-pointer"
            >
              <option value="all">TẤT CẢ NGÀNH</option>
              {majors.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Trạng thái lớp</label>
            <div className="flex flex-col gap-2">
              {['all', 'OPEN', 'CLOSED', 'CANCELLED'].map(status => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all",
                    selectedStatus === status ? "bg-uneti-blue/10 text-uneti-blue border border-uneti-blue/20" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full",
                    status === 'OPEN' ? "bg-emerald-500" : status === 'CLOSED' ? "bg-slate-400" : status === 'CANCELLED' ? "bg-rose-500" : "bg-slate-200"
                  )} />
                  {status === 'all' ? 'Tất cả trạng thái' : status}
                </button>
              ))}
            </div>
          </div>

          {/* HELP TIP */}
          <div className="mt-auto p-5 bg-uneti-blue/5 border border-uneti-blue/10 rounded-3xl">
            <p className="text-[9px] font-black text-uneti-blue uppercase tracking-widest flex items-center gap-2">
              <AlertTriangle size={12} strokeWidth={3} /> Lưu ý vận hành
            </p>
            <p className="text-[10px] font-medium text-slate-500 mt-2 leading-relaxed italic">
              Việc đổi lịch học hoặc chuyển phòng sẽ tự động kiểm tra xung đột với dữ liệu giảng viên và phòng trống trong thời gian thực.
            </p>
          </div>
        </aside>

        {/* MAIN RESULTS GRID */}
        <main className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
          {/* STATS */}
          <section className="grid grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:border-uneti-blue/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-blue-50 text-uneti-blue rounded-2xl flex items-center justify-center group-hover:bg-uneti-blue group-hover:text-white transition-all">
                  <GraduationCap size={18} />
                </div>
                <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-50 px-3 py-1 rounded-full">Ổn định</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng lớp vận hành</p>
                <p className="text-3xl font-black tracking-tight text-slate-900 mt-1">{currentYearStats.total}</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:border-uneti-blue/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                  <LayoutGrid size={18} />
                </div>
                <span className="text-[9px] font-black text-uneti-blue uppercase bg-blue-50 px-3 py-1 rounded-full">{currentYearStats.active} Lớp Đang Mở</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đang giảng dạy</p>
                <div className="flex items-end gap-2">
                   <p className="text-3xl font-black tracking-tight text-slate-900 mt-1">{Math.round((currentYearStats.active / (currentYearStats.total || 1)) * 100)}%</p>
                   <p className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Năng suất kỳ này</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:border-uneti-blue/30 transition-all">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                  <Users size={18} />
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỉ lệ lắp đầy</p>
                <div className="mt-3 flex flex-col gap-2">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-uneti-blue transition-all duration-1000" style={{ width: `${currentYearStats.enrollmentRate}%` }} />
                    </div>
                    <p className="text-3xl font-black tracking-tight text-slate-900">{currentYearStats.enrollmentRate}%</p>
                </div>
              </div>
            </div>
          </section>

          {/* LIST GRID */}
          <div className="grid grid-cols-2 gap-6 pb-20">
            {filteredClasses.map(c => (
              <div
                key={c.id}
                onClick={() => setSelectedCourseClassId(c.id)}
                className="bg-white border border-slate-100 rounded-[32px] p-8 hover:shadow-2xl hover:shadow-slate-200 transition-all cursor-pointer group flex flex-col gap-6 relative overflow-hidden"
              >
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-16 translate-x-16 group-hover:bg-uneti-blue group-hover:opacity-5 transition-all" />

                <div className="flex items-start justify-between relative z-10">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black text-uneti-blue uppercase tracking-[0.2em]">{c.code}</span>
                    <h3 className="text-[15px] font-black text-slate-900 leading-tight group-hover:text-uneti-blue transition-colors uppercase">
                        {c.subject?.name || c.name}
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400">{c.subject?.major?.name || "Ngành tự do"}</p>
                  </div>
                  <button className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 group-hover:bg-uneti-blue group-hover:text-white transition-all">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-transparent group-hover:border-slate-100 transition-all">
                    <Calendar size={14} className="text-slate-400" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Học kỳ</p>
                      <p className="text-[10px] font-black text-slate-800 tracking-tight truncate">{c.semester?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-transparent group-hover:border-slate-100 transition-all">
                    <Users size={14} className="text-slate-400" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Sĩ số</p>
                      <p className="text-[10px] font-black text-slate-800 tracking-tight">{c._count?.enrollments || 0} / {c.maxSlots} SV</p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <Clock size={12} strokeWidth={3} />
                        </div>
                        <p className="text-[10px] font-black text-slate-600 truncate max-w-[150px]">
                            {c.lecturer?.fullName || "Chưa gán giảng viên"}
                        </p>
                    </div>
                    <span className={cn(
                        "text-[9px] font-black uppercase px-4 py-1.5 rounded-full border",
                        c.status === 'OPEN' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-100"
                    )}>{c.status === 'OPEN' ? 'Đang hoạt động' : 'Đã đóng'}</span>
                </div>
              </div>
            ))}

            {filteredClasses.length === 0 && (
                <div className="col-span-2 py-32 flex flex-col items-center opacity-30">
                    <LayoutGrid size={64} className="text-slate-200 mb-6" strokeWidth={1} />
                    <p className="text-[11px] font-black uppercase tracking-[0.4em]">Danh sách vận hành trống</p>
                    <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400 italic">Vui lòng điều chỉnh bộ lọc hoặc chạy điều phối từ bản kế hoạch</p>
                </div>
            )}
          </div>
        </main>
      </div>

      {selectedCourseClassId && (
          <CourseClassDetailDrawer
            courseClass={courseClasses.find(c => c.id === selectedCourseClassId)}
            onClose={() => setSelectedCourseClassId(null)}
            onRefresh={() => { fetchData(); setSelectedCourseClassId(null); }}
            headers={headers}
            rooms={rooms}
            lecturers={lecturers}
          />
      )}

      {showWizard && (
          <CourseClassCreationWizard
            onClose={() => setShowWizard(false)}
            onSuccess={() => { fetchData(); setShowWizard(false); }}
            headers={headers}
            semesters={semesters}
            majors={majors}
            rooms={rooms}
            lecturers={lecturers}
          />
      )}

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Montserrat', sans-serif;
        }

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
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
