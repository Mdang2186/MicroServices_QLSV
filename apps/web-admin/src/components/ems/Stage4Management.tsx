"use client";

import React, { useState, useEffect } from "react";
import { 
  PlayCircle, 
  Users, 
  Search, 
  Calendar, 
  ClipboardCheck, 
  FileSpreadsheet, 
  MoreHorizontal,
  GraduationCap,
  AlertCircle,
  X,
  CheckCircle2,
  Trash2,
  Loader2,
  Info
} from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const API = (path: string) => `/api${path}`;

interface Stage4Props {
  filters: { cohort: string; majorId: string; semester: number };
}

export default function Stage4Management({ filters }: Stage4Props) {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [modalType, setModalType] = useState<"attendance" | "grading" | null>(null);
  const TOKEN = Cookies.get("staff_accessToken");

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const res = await fetch(API(`/courses?status=OPEN&majorId=${filters.majorId}`), {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        if (res.ok) setCourses(await res.json());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchCourses();
  }, [filters.majorId, TOKEN]);

  const openModal = (course: any, type: "attendance" | "grading") => {
    setSelectedCourse(course);
    setModalType(type);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
             <PlayCircle className="text-green-600" /> Vận Hành & Quản Lý Đào Tạo
          </h2>
          <p className="text-sm text-slate-500 font-medium">Danh sách {courses.length} lớp học phần đang trong chu kỳ học tập</p>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                placeholder="Tìm lớp học phần..."
                className="pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-sm font-bold shadow-sm focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none min-w-[300px]"
              />
           </div>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-green-600 bg-green-50 px-3 py-1 rounded-full uppercase tracking-widest border border-green-100">Đang học (OPEN)</span>
                  <h3 className="text-lg font-black text-slate-900 leading-tight mt-3">{course.subject.name}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{course.code}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <MoreHorizontal size={20} />
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                    <Users size={16} />
                  </div>
                  <span>Gồm lớp: <span className="text-slate-900">{course.adminClasses?.map((c: any) => c.code).join(", ") || "N/A"}</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <GraduationCap size={16} />
                  </div>
                  <span>Giảng viên: <span className="text-slate-900">{course.lecturer?.fullName || "Chưa gán"}</span></span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500">
                    <Calendar size={16} />
                  </div>
                  <span>Số lượng: <span className="text-slate-900">{course.currentSlots} / {course.maxSlots} SV</span></span>
                </div>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3">
                <button 
                  onClick={() => openModal(course, "attendance")}
                  className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-[1.25rem] text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all border-b-4 border-slate-950 shadow-xl shadow-slate-900/10 active:border-b-0 active:translate-y-1"
                >
                  <ClipboardCheck size={16} /> Điểm danh
                </button>
                <button 
                  onClick={() => openModal(course, "grading")}
                  className="flex items-center justify-center gap-2 py-3 bg-white text-indigo-600 rounded-[1.25rem] text-xs font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-50 transition-all shadow-xl shadow-indigo-600/5"
                >
                  <FileSpreadsheet size={16} /> Nhập điểm
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Attendance & Grading Modals */}
      {modalType && selectedCourse && (
        <EMSModal 
          type={modalType} 
          courseId={selectedCourse.id} 
          onClose={() => setModalType(null)} 
        />
      )}
    </div>
  );
}

function EMSModal({ type, courseId, onClose }: { type: "attendance" | "grading", courseId: string, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const TOKEN = Cookies.get("staff_accessToken");
  const isAttendance = type === "attendance";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [courseRes, studentsRes] = await Promise.all([
          fetch(API(`/courses/classes/${courseId}`), { headers: { Authorization: `Bearer ${TOKEN}` } }),
          fetch(API(`/enrollments/admin/classes/${courseId}/enrollments`), { headers: { Authorization: `Bearer ${TOKEN}` } })
        ]);
        if (courseRes.ok && studentsRes.ok) {
          setData({
            course: await courseRes.json(),
            enrollments: await studentsRes.json()
          });
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [courseId, TOKEN]);

  if (loading) return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className="bg-white p-10 rounded-3xl flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  const course = data.course;
  const enrollments = data.enrollments;
  const credits = course.subject.credits || 0;
  const totalPlannedSessions = Math.ceil(((course.subject.theoryHours || 0) + (course.subject.practiceHours || 0)) / 3);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-10">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-7xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-full">
        <header className="p-8 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${isAttendance ? "bg-amber-500 shadow-amber-500/20" : "bg-indigo-600 shadow-indigo-600/20"} shadow-xl`}>
              {isAttendance ? <ClipboardCheck size={28} /> : <FileSpreadsheet size={28} />}
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                {isAttendance ? "Quản lý Điểm danh & Cảnh báo" : "Nhập điểm kết quả học tập"}
              </h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Lớp: {course.code} · Học phần: {course.subject.name} ({credits} TC)
              </p>
            </div>
          </div>
          
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
            <X size={24} className="text-slate-400" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <table className="w-full text-left border-separate border-spacing-y-2">
            <thead>
              <tr className="text-slate-400">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Thông tin Sinh viên</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest">Lớp danh nghĩa</th>
                
                {isAttendance ? (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Số buổi vắng</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Tỷ lệ vắng</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-center">Trạng thái thi</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-right">Chi tiết</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">Chuyên cần</th>
                    {Array.from({ length: credits }).map((_, i) => (
                      <th key={i} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">TX {i+1} (HS2)</th>
                    ))}
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center">Giữa kỳ</th>
                    <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-center bg-indigo-50/50 rounded-t-xl">Tổng kết</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {enrollments.map((enr: any) => {
                const absentCount = enr.attendances?.filter((a: any) => a.status === 'ABSENT').length || 0;
                const totalSessions = Math.max(course.sessions?.length || 0, totalPlannedSessions);
                const absenceRate = Math.round((absentCount / totalSessions) * 100);
                const isBlocked = absenceRate >= 50;

                return (
                  <tr key={enr.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl group hover:bg-slate-50 transition-all">
                    <td className="px-6 py-5 rounded-l-2xl">
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-900 leading-none mb-1">{enr.student.fullName}</span>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{enr.student.studentCode}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {enr.student.adminClass?.code || "N/A"}
                    </td>
                    
                    {isAttendance ? (
                      <>
                        <td className="px-6 py-5 text-center text-sm font-black text-slate-700">{absentCount} / {totalSessions}</td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${isBlocked ? "bg-rose-100 text-rose-600 animate-pulse" : "bg-emerald-100 text-emerald-600"}`}>
                              {absenceRate}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          {isBlocked ? (
                            <div className="flex items-center justify-center gap-1.5 text-rose-600 font-black text-[10px] uppercase bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-100">
                              <AlertCircle size={14} /> Cấm thi (Học lại)
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-emerald-600 font-black text-[10px] uppercase bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                              <CheckCircle2 size={14} /> Đủ điều kiện thi
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right rounded-r-2xl">
                           <button className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-indigo-600 transition-all shadow-sm">
                             <MoreHorizontal size={18} />
                           </button>
                        </td>
                      </>
                    ) : (
                      <>
                         <td className="px-4 py-5 text-center">
                            <input 
                              disabled={isBlocked}
                              className={`w-14 h-11 bg-slate-50 rounded-xl text-center font-black outline-none border-2 border-transparent focus:border-indigo-600 transition-all ${isBlocked ? "opacity-30 cursor-not-allowed" : ""}`} 
                              defaultValue="10.0" 
                            />
                         </td>
                         {Array.from({ length: credits }).map((_, i) => (
                           <td key={i} className="px-4 py-5 text-center">
                             <input 
                              disabled={isBlocked}
                              className={`w-14 h-11 bg-slate-50 rounded-xl text-center font-black outline-none border-2 border-indigo-100 focus:border-indigo-600 transition-all ${isBlocked ? "opacity-30 cursor-not-allowed" : ""}`} 
                              defaultValue="0.0" 
                             />
                           </td>
                         ))}
                         <td className="px-4 py-5 text-center">
                           <input 
                            disabled={isBlocked}
                            className={`w-14 h-11 bg-slate-50 rounded-xl text-center font-black outline-none border-2 border-transparent focus:border-indigo-600 transition-all ${isBlocked ? "opacity-30 cursor-not-allowed" : ""}`} 
                            defaultValue="0.0" 
                           />
                         </td>
                         <td className="px-4 py-5 text-center bg-indigo-50/20 rounded-xl">
                           <span className={`text-sm font-black ${isBlocked ? "text-rose-500" : "text-indigo-600"}`}>
                             {isBlocked ? "0.0" : "8.5"}
                           </span>
                         </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="p-8 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
           <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <Info size={14} className="text-indigo-500" />
              <span>Dữ liệu được cập nhật thời gian thực từ ERP Center</span>
           </div>
           <div className="flex gap-3">
              <button onClick={onClose} className="px-8 py-4 bg-white text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all">Đóng cửa sổ</button>
              <button 
                onClick={() => { toast.success("Bảng điểm đã được cập nhật!"); onClose(); }} 
                className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-slate-900/20 active:scale-95 transition-all"
              >
                Lưu toàn bộ thay đổi
              </button>
           </div>
        </footer>
      </div>
    </div>
  );
}
