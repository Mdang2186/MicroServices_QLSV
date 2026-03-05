"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { BookOpen, Calendar, GraduationCap, ChevronRight, BookMarked, Clock } from "lucide-react";

export default function LecturerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        if (!user?.id && !user?.username) return;
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
        fetch("http://localhost:3000/api/courses/my-classes", { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCourses(Array.isArray(data) ? data : data?.data || []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [user, TOKEN]);

    const todayIndex = new Date().getDay(); // 0 is Sunday
    const dayName = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][todayIndex];
    const todayNum = todayIndex === 0 ? 8 : todayIndex + 1; // schema: Mon=2, Sun=8

    const todayCourses = courses.filter((c: any) =>
        c.schedules?.some((s: any) => s.dayOfWeek === todayNum)
    );

    const nowStr = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const totalCredits = courses.reduce((acc, c) => acc + (c.subject?.credits || 0), 0);
    const totalStudents = courses.reduce((acc, c) => acc + (c.currentSlots || 0), 0);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center p-8 bg-[#f4f7fe]">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Header Toolbar (Optional Breadcrumbs) */}
            <div className="flex items-center justify-between pl-1 sm:pl-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <GraduationCap className="text-indigo-600" size={18} />
                    <span className="tracking-tight hidden sm:inline">Giảng viên Portal</span>
                    <span className="tracking-tight sm:hidden">Giảng viên</span>
                    <span className="text-slate-300 mx-0.5 sm:mx-1">/</span>
                    <span className="text-indigo-600">Bảng điều khiển</span>
                </div>
                <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 font-medium">
                    <span>Học kỳ 1, 2025-2026</span>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between border border-white shadow-sm overflow-hidden gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full blur-3xl opacity-50 -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
                        <span className="text-2xl sm:text-3xl font-bold">{user?.username?.charAt(0).toUpperCase() || "G"}</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111827] tracking-tight leading-tight">
                            Chào mừng, <span className="text-indigo-600">{user?.username || "Giảng viên"}</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm flex items-center gap-2">
                            <GraduationCap size={16} className="text-indigo-400" />
                            Phụ trách đào tạo • Mã CB: {user?.id?.substring(0, 8).toUpperCase() || "UNETI-01"}
                        </p>
                    </div>
                </div>

                <div className="hidden lg:flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-100 shadow-sm relative z-10 shrink-0">
                    <Calendar size={18} className="text-indigo-500" />
                    <span className="text-sm font-semibold text-slate-700">{nowStr}</span>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {/* Stat 1 */}
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <BookOpen size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">LỚP HỌC PHẦN</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{courses.length}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Học kỳ này</p>
                    </div>
                </div>

                {/* Stat 2 */}
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <BookMarked size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">TỔNG TÍN CHỈ</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalCredits}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Đang giảng dạy</p>
                    </div>
                </div>

                {/* Stat 3 */}
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <GraduationCap size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">TỔNG SINH VIÊN</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{totalStudents}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Toàn bộ các lớp</p>
                    </div>
                </div>

                {/* Stat 4 */}
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <Clock size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">LỊCH HÔM NAY</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{todayCourses.length}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Lớp cần điểm danh</p>
                    </div>
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">

                {/* Left Column: Courses list */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-6">
                    <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-5 sm:mb-6">
                            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Lớp học phụ trách</h2>
                            <Link href="/lecturer/courses" className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 group whitespace-nowrap">
                                Xem tất cả
                                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {courses.length === 0 ? (
                            <div className="h-40 sm:h-48 flex flex-col items-center justify-center text-slate-400">
                                <BookOpen className="mb-3 sm:mb-4 text-slate-200 stroke-[1.5] w-10 h-10 sm:w-12 sm:h-12" />
                                <p className="text-sm">Bạn chưa được phân công lớp học phần nào.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                {courses.slice(0, 4).map((c: any, i: number) => {
                                    const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                                    return (
                                        <div key={i} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 bg-[#fafcff] hover:bg-white hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="bg-indigo-50 text-indigo-600 font-bold text-[10px] sm:text-xs px-2.5 py-1 rounded-lg">
                                                    {c.code}
                                                </div>
                                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-indigo-400 group-hover:text-indigo-600 transition-colors shrink-0">
                                                    <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-sm sm:text-[15px] leading-snug mb-3 sm:mb-4 min-h-[36px] sm:min-h-[38px] line-clamp-2">
                                                {c.name || c.subject?.name}
                                            </h3>

                                            <div className="space-y-1.5 sm:space-y-2">
                                                <div className="flex justify-between text-[11px] sm:text-xs font-medium text-slate-500">
                                                    <span>Sĩ số: {c.currentSlots}/{c.maxSlots}</span>
                                                    <span>{progress}%</span>
                                                </div>
                                                <div className="h-1.5 sm:h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Schedule */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="bg-[#0f172a] rounded-[20px] sm:rounded-[24px] p-5 sm:p-8 shadow-lg text-white h-auto lg:h-full relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-3xl rounded-full"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>

                        <div className="relative z-10 flex flex-col h-full w-full">
                            <div className="flex items-center justify-between mb-6 sm:mb-8">
                                <h2 className="text-lg sm:text-xl font-bold tracking-tight">Lịch diễn ra</h2>
                                <span className="text-[10px] sm:text-xs font-semibold bg-white/10 px-2.5 sm:px-3 py-1 rounded-full whitespace-nowrap">{dayName}</span>
                            </div>

                            <div className="flex-1 w-full">
                                {todayCourses.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center text-slate-400 mt-6 sm:mt-8 mb-8 sm:mb-12">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-3 sm:mb-4">
                                            <Calendar size={24} className="sm:w-7 sm:h-7 text-slate-500" />
                                        </div>
                                        <p className="text-xs sm:text-sm font-medium">Hôm nay không có tiết dạy.</p>
                                        <p className="text-[10px] sm:text-xs mt-1">Nghỉ ngơi thật tốt nhé!</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 sm:space-y-4">
                                        {todayCourses.map((c: any, i: number) => {
                                            const sch = c.schedules?.find((s: any) => s.dayOfWeek === todayNum);
                                            return (
                                                <div key={i} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 hover:bg-white/15 transition-colors cursor-default">
                                                    <div className="flex gap-3 sm:gap-4">
                                                        <div className="flex flex-col items-center justify-center shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-white/10 rounded-lg sm:rounded-xl">
                                                            <span className="text-[9px] sm:text-[10px] text-slate-300 font-medium uppercase tracking-wider">CA</span>
                                                            <span className="text-lg sm:text-xl font-bold text-white leading-none mt-0.5">{sch?.shift || "?"}</span>
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="font-semibold text-white text-sm sm:text-[15px] leading-snug truncate sm:whitespace-normal sm:line-clamp-1">{c.name}</h3>
                                                            <div className="text-[11px] sm:text-xs text-slate-300 font-medium mt-1.5 flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                                                                <span className="truncate">Phòng {sch?.room?.name || "Chưa xếp"}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div className="mt-6 sm:mt-auto sm:pt-8 w-full">
                                <Link href="/lecturer/schedule" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-indigo-300 hover:text-indigo-200 transition-colors w-full bg-white/5 py-3 rounded-xl sm:bg-transparent sm:py-0 sm:rounded-none">
                                    Xem lịch cả tuần <ChevronRight size={14} className="sm:w-4 sm:h-4" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
