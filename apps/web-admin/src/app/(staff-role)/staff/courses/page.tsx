"use client";

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from "react";
import Cookies from "js-cookie";
import {
  LayoutList,
  Search,
  Plus,
  RefreshCw,
  MoreVertical,
  Calendar,
  Users,
  MapPin,
  Clock,
  ChevronDown,
  Loader2,
  Zap,
  Filter,
  Layers,
  GraduationCap,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import CourseClassDetailDrawer from "./components/CourseClassDetailDrawer";
import CourseClassCreationWizard from "./components/CourseClassCreationWizard";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API = (path: string) => `/api${path}`;

// --- Utils ---
const getAcademicYear = (semesterName: string) => {
  const match = semesterName.match(/\((\d{4}-\d{4})\)/);
  return match ? match[1] : "Khác";
};

export default function RedesignedStaffCoursesPage() {
  const TOKEN = Cookies.get("admin_accessToken") || Cookies.get("staff_accessToken");
  const headers = useMemo(() => ({ Authorization: `Bearer ${TOKEN}` }), [TOKEN]);

  // --- Data Master ---
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [courseClasses, setCourseClasses] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  
  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // --- Filtering & UI State ---
  const [selectedCohort, setSelectedCohort] = useState<string>("all");
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
  const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCourseClassId, setSelectedCourseClassId] = useState<string | null>(null);
  const [showCreationWizard, setShowCreationWizard] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());

  const filteredMajors = useMemo(() => {
    if (selectedFacultyId === "all") return majors;
    return majors.filter(m => m.facultyId === selectedFacultyId);
  }, [majors, selectedFacultyId]);

  const filteredDepartments = useMemo(() => {
    if (selectedFacultyId === "all") return departments;
    return departments.filter(
      d => d.facultyId === selectedFacultyId || d.faculty?.id === selectedFacultyId,
    );
  }, [departments, selectedFacultyId]);

  const operationalSemester = useMemo(() => {
    const sortedSemesters = [...semesters].sort(
      (left, right) =>
        new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
    );
    return sortedSemesters.find((semester: any) => semester.isCurrent) || sortedSemesters[0] || null;
  }, [semesters]);
  const isInitialLoading =
    semesters.length === 0 &&
    faculties.length === 0 &&
    majors.length === 0 &&
    departments.length === 0 &&
    cohorts.length === 0;

  // --- Fetching ---
  const fetchMasters = useCallback(async () => {
    setLoading(true);
    try {
      const [semRes, majorRes, deptRes, roomRes, lectRes, facRes, cohortRes] = await Promise.all([
        fetch(API("/semesters"), { headers }),
        fetch(API("/courses/majors"), { headers }),
        fetch("/api/departments", { headers }),
        fetch(API("/rooms"), { headers }),
        fetch(API("/courses/lecturers/by-faculty"), { headers }),
        fetch(API("/courses/faculties"), { headers }),
        fetch(API("/courses/cohorts"), { headers })
      ]);

      if (semRes.ok) setSemesters(await semRes.json());
      if (majorRes.ok) setMajors(await majorRes.json());
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (roomRes.ok) setRooms(await roomRes.json());
      if (lectRes.ok) setLecturers(await lectRes.json());
      if (facRes.ok) setFaculties(await facRes.json());
      if (cohortRes.ok) setCohorts(await cohortRes.json());
    } catch (err) {
      console.error("Failed to fetch master data", err);
    } finally {
      setLoading(false);
    }
  }, [headers]);

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedFacultyId !== "all") params.append("facultyId", selectedFacultyId);
      if (selectedMajorId !== "all") params.append("majorId", selectedMajorId);
      if (selectedDepartmentId !== "all") params.append("departmentId", selectedDepartmentId);
      if (selectedCohort !== "all") params.append("cohort", selectedCohort);
      if (deferredSearchTerm) params.append("search", deferredSearchTerm);
      params.append("page", currentPage.toString());
      params.append("limit", "50");

      const classRes = await fetch(API(`/courses?${params.toString()}`), { headers });
      if (classRes.ok) {
          const resMap = await classRes.json();
          setCourseClasses(resMap.data || []);
          setTotalPages(resMap.metadata?.lastPage || 1);
          setTotalItems(resMap.metadata?.total || 0);
      }
    } catch (err) {
      console.error("Fetch course classes failed", err);
    } finally {
      setLoading(false);
    }
  }, [
    headers,
    selectedFacultyId,
    selectedMajorId,
    selectedDepartmentId,
    selectedCohort,
    currentPage,
    deferredSearchTerm,
  ]);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleBulkAutomate = async () => {
    if (!operationalSemester?.id) {
        alert("Chưa có học kỳ khả dụng để chạy xếp lịch.");
        return;
    }
    if (!confirm(`Xếp lịch tự động toàn bộ cho ${operationalSemester.name}?`)) return;
    setLoading(true);
    try {
        const res = await fetch(API("/semester-plan/bulk-create"), {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify({ semesterId: operationalSemester.id })
        });
        if (res.ok) {
            alert("Đã hoàn tất tiến trình xếp lịch thông minh.");
            fetchClasses();
        }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (isInitialLoading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-uneti-blue animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Đang tối ưu dữ liệu vận hành...</p>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F9FBFC] text-slate-800 font-sans select-none overflow-hidden">
      {/* ── TOP TOOLBAR ── */}
      <header className="bg-white border-b border-slate-100 flex flex-col shrink-0 z-40">
        <div className="px-10 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
              <LayoutList size={20} />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight leading-none uppercase">Quản lý Học phần</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                 {format(new Date(), "EEEE, dd MMMM, yyyy", { locale: vi })} <span className="w-1 h-1 rounded-full bg-slate-200" /> Vận hành chính thức
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button onClick={handleBulkAutomate} className="flex items-center gap-2 px-6 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100">
                <Zap size={13} className="text-uneti-blue" /> Xếp lịch thông minh
             </button>
             <button
               onClick={() => setShowCreationWizard(true)}
               className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/20"
             >
                <Plus size={14} strokeWidth={3} /> Tạo lớp học phần
             </button>
             <button
               onClick={() => {
                 if (currentPage !== 1) setCurrentPage(1);
                 else fetchClasses();
               }}
               className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:bg-slate-100 transition-all rounded-xl border border-slate-100"
             >
                <RefreshCw size={16} />
             </button>
          </div>
        </div>

         {/* ── FILTERING BAR ── */}
        <div className="px-10 py-4 border-t border-slate-50 flex items-center flex-wrap gap-4 bg-slate-50/30">
           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm shadow-slate-100/50">
              <span className="text-[9px] font-black text-uneti-blue uppercase tracking-widest">Khóa SV:</span>
              <select className="bg-transparent border-none text-[10px] font-black text-slate-700 focus:ring-0 outline-none cursor-pointer" value={selectedCohort} onChange={e => {
                  setSelectedCohort(e.target.value);
                  setCurrentPage(1);
              }}>
                 <option value="all">TẤT CẢ KHÓA</option>
                 {cohorts.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Khoa:</span>
              <select className="bg-transparent border-none text-[10px] font-black text-slate-700 focus:ring-0 outline-none cursor-pointer max-w-[150px]" value={selectedFacultyId} onChange={e => {
                  setSelectedFacultyId(e.target.value);
                  setSelectedMajorId("all");
                  setSelectedDepartmentId("all");
                  setCurrentPage(1);
              }}>
                 <option value="all">TẤT CẢ KHOA</option>
                 {faculties.map(f => <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>)}
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngành:</span>
              <select className="bg-transparent border-none text-[10px] font-black text-slate-700 focus:ring-0 outline-none cursor-pointer max-w-[150px]" value={selectedMajorId} onChange={e => {
                  setSelectedMajorId(e.target.value);
                  setCurrentPage(1);
              }}>
                 <option value="all">TẤT CẢ NGÀNH</option>
                 {filteredMajors.map(m => <option key={m.id} value={m.id}>{m.name.toUpperCase()}</option>)}
              </select>
           </div>

           <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bộ môn:</span>
              <select className="bg-transparent border-none text-[10px] font-black text-slate-700 focus:ring-0 outline-none cursor-pointer max-w-[180px]" value={selectedDepartmentId} onChange={e => {
                  setSelectedDepartmentId(e.target.value);
                  setCurrentPage(1);
              }}>
                 <option value="all">TẤT CẢ BỘ MÔN</option>
                 {filteredDepartments.map(d => <option key={d.id} value={d.id}>{d.name.toUpperCase()}</option>)}
              </select>
           </div>


           <div className="flex-1 min-w-[200px] relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-uneti-blue transition-colors" size={14} />
              <input
                type="text"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm mã lớp, mã môn, tên môn, giảng viên, khoa, ngành, bộ môn..."
                className="w-full pl-12 pr-6 py-2.5 bg-white border border-slate-100 rounded-xl text-[10px] font-bold placeholder:text-slate-300 focus:ring-4 focus:ring-uneti-blue/5 focus:border-uneti-blue transition-all outline-none uppercase"
              />
           </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <main className="flex-1 overflow-hidden flex flex-col pt-6">
          <div className="px-10 flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                 <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Danh sách vận hành hiện tại</h2>
                 <div className="h-4 w-px bg-slate-200" />
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Hiển thị {courseClasses.length} / {totalItems} kết quả
                 </p>
              </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-10 pb-20">
               {/* LIST TABLE HEADER */}
               <div className="grid grid-cols-[80px_1fr_150px_180px_120px_100px_100px] gap-4 px-6 py-3 border-b border-slate-100 sticky top-0 bg-[#F9FBFC] z-10">
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mã lớp</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tên học phần / Môn học</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giảng viên</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Học kỳ</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sĩ số</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</div>
               </div>

               {/* LIST ITEMS */}
               <div className="space-y-1 py-1">
                {courseClasses.map(c => (
                    <div 
                        key={c.id}
                        onClick={() => setSelectedCourseClassId(c.id)}
                        className="grid grid-cols-[80px_1fr_150px_180px_120px_100px_100px] gap-4 items-center px-6 py-4 bg-white hover:bg-slate-900 group transition-all cursor-pointer border border-transparent hover:border-slate-900 rounded-xl"
                    >
                        <div className="text-[10px] font-black text-uneti-blue group-hover:text-blue-400 truncate">{c.code}</div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-black text-slate-900 group-hover:text-white uppercase truncate">{c.subject?.name || c.name}</span>
                            <span className="text-[9px] font-bold text-slate-400 group-hover:text-slate-500 uppercase truncate">{c.subject?.code}</span>
                        </div>
                        <div className="text-[10px] font-bold text-slate-600 group-hover:text-slate-300 truncate">
                            {c.lecturer?.fullName || "Chưa gán"}
                        </div>
                        <div className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400 uppercase truncate">
                            {c.semester?.name}
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="w-16 h-1.5 bg-slate-100 group-hover:bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-uneti-blue" 
                                    style={{ width: `${Math.min(100, (c._count?.enrollments || 0) / (c.maxSlots || 1) * 100)}%` }}
                                />
                             </div>
                             <span className="text-[9px] font-black text-slate-400 group-hover:text-slate-500 uppercase">{c._count?.enrollments || 0}/{c.maxSlots}</span>
                        </div>
                        <div>
                             <span className={cn(
                                "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                                c.status === 'OPEN' ? "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/20 group-hover:text-emerald-400" : "bg-slate-50 text-slate-400 border-slate-100"
                             )}>
                                {c.status === 'OPEN' ? 'Hoạt động' : 'Đã đóng'}
                             </span>
                        </div>
                        <div className="flex justify-end pr-2 text-slate-300 group-hover:text-white transition-all">
                             <ArrowRight size={14} />
                        </div>
                    </div>
                ))}
               </div>

               {courseClasses.length === 0 && !loading && (
                    <div className="py-40 flex flex-col items-center opacity-30 text-center">
                        <Layers size={64} className="text-slate-200 mb-6" strokeWidth={1} />
                        <p className="text-[11px] font-black uppercase tracking-[0.4em]">Danh sách vận hành trống</p>
                        <p className="text-[10px] font-bold mt-2 uppercase tracking-widest text-slate-400 italic">Không có lớp học phần khớp bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
               )}
          </div>

          {/* ── PAGINATION CONTROLS ── */}
          <footer className="shrink-0 bg-white border-t border-slate-100 px-10 py-5 flex items-center justify-between z-40">
              <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trang {currentPage} / {totalPages}</span>
              </div>
              
              <div className="flex items-center gap-1.5">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-slate-400"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      // Simple sliding window for page numbers
                      let pageNum = currentPage;
                      if (totalPages <= 5) pageNum = i + 1;
                      else if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      return (
                        <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                                "w-10 h-10 flex items-center justify-center rounded-xl text-[10px] font-black transition-all",
                                currentPage === pageNum ? "bg-uneti-blue text-white shadow-lg shadow-uneti-blue/20" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                            )}
                        >
                            {pageNum}
                        </button>
                      );
                  })}

                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-slate-50 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-slate-400"
                  >
                    <ChevronRight size={18} />
                  </button>
              </div>
          </footer>
      </main>

      {/* ── MODALS & DRAWER ── */}
      {selectedCourseClassId && (
          <CourseClassDetailDrawer
            courseClass={courseClasses.find(c => c.id === selectedCourseClassId)}
            onClose={() => setSelectedCourseClassId(null)}
            onRefresh={() => { fetchClasses(); setSelectedCourseClassId(null); }}
            headers={headers}
            rooms={rooms}
            lecturers={lecturers}
          />
      )}

      <CourseClassCreationWizard
        open={showCreationWizard}
        onClose={() => setShowCreationWizard(false)}
        onSuccess={async () => {
          await fetchClasses();
          setShowCreationWizard(false);
        }}
        headers={headers}
        semesters={semesters}
        faculties={faculties}
        majors={majors}
        departments={departments}
        cohorts={cohorts}
        rooms={rooms}
        lecturers={lecturers}
      />

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
        
        body {
          font-family: 'Montserrat', sans-serif;
          background-color: #F9FBFC;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #E2E8F0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #CBD5E1;
        }
      `}</style>
    </div>
  );
}
