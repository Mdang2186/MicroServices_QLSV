"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    BookOpen,
    Calendar,
    GraduationCap,
    ChevronRight,
    BookMarked,
    Clock,
    Users,
    LayoutDashboard,
    ArrowUpRight,
    Activity,
    CalendarDays,
    Star,
    ShieldCheck
} from "lucide-react";

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
        fetch("/api/courses/my-classes", { headers })
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
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <GraduationCap size={14} className="text-uneti-blue" />
                        <span>Giảng viên</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Bảng điều khiển</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Khu vực Giảng dạy</h1>
                        <div className="bg-uneti-blue-light px-2 py-1 rounded-lg flex items-center gap-1.5 border border-uneti-blue/10">
                            <span className="text-[9px] font-black text-uneti-blue uppercase tracking-widest leading-none">Học kỳ 1 • 2025</span>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic">"{nowStr}"</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <CalendarDays size={16} className="text-uneti-blue" />
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Lịch trình hôm nay</span>
                    </div>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative group overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 p-8 sm:p-10">
                <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-uneti-blue/5 to-transparent pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[30px] bg-uneti-blue text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-uneti-blue/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                {user?.username?.charAt(0).toUpperCase() || "G"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Chào mừng quay trở lại, <br />
                                <span className="text-uneti-blue">Thầy/Cô {user?.username || "Giảng viên"}</span>
                            </h2>
                            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                <ShieldCheck size={14} className="text-uneti-blue" />
                                Mã cán bộ: {user?.id?.substring(0, 8).toUpperCase() || "UNETI-001"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-3xl">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trạng thái công tác</p>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                <span className="text-sm font-black text-slate-700">Đang giảng dạy</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Lớp học phần", value: courses.length, icon: BookOpen, color: "blue", sub: "Giao nhiệm vụ" },
                    { label: "Tổng tín chỉ", value: totalCredits, icon: BookMarked, color: "indigo", sub: "Khối lượng dạy" },
                    { label: "Tổng sinh viên", value: totalStudents, icon: Users, color: "emerald", sub: "Hồ sơ theo dõi" },
                    { label: "Tiết dạy hôm nay", value: todayCourses.length, icon: Clock, color: "orange", sub: "Đang chờ CA" },
                ].map((s, i) => (
                    <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${s.color === 'blue' ? 'uneti-blue' : s.color + '-500'}/5 rounded-full -mr-12 -mt-12 blur-2xl`}></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</span>
                            <div className={`p-2.5 rounded-xl ${s.color === 'blue' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${s.color}-50 text-${s.color}-600`} shadow-inner`}>
                                <s.icon size={18} />
                            </div>
                        </div>
                        <div className="relative z-10 flex items-baseline gap-2">
                            <span className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{s.value}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.sub}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Courses list */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <BookOpen size={16} className="text-uneti-blue" />
                                    Danh sách Lớp phụ trách
                                </h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Cập nhật theo học kỳ hiện tại</p>
                            </div>
                            <Link href="/lecturer/courses" className="px-4 py-2 text-[10px] font-black text-uneti-blue hover:text-white hover:bg-uneti-blue border border-uneti-blue/20 rounded-xl transition-all uppercase tracking-widest flex items-center gap-2 group">
                                Quản lý tập trung
                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>

                        {courses.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-200 gap-4">
                                <BookOpen size={48} strokeWidth={1} className="opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Chưa có dữ liệu phân công</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {courses.slice(0, 4).map((c: any, i: number) => {
                                    const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                                    return (
                                        <div key={i} className="p-6 rounded-[28px] border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-uneti-blue/10 hover:shadow-xl transition-all group relative overflow-hidden">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-uneti-blue/5 rounded-full -mr-12 -mt-12 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="flex justify-between items-start mb-4">
                                                <div className="px-3 py-1 bg-white border border-slate-100 rounded-lg shadow-sm">
                                                    <span className="text-[10px] font-black text-uneti-blue uppercase tracking-widest">{c.code}</span>
                                                </div>
                                                <div className="bg-uneti-blue-light p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Star size={12} className="text-uneti-blue fill-uneti-blue" />
                                                </div>
                                            </div>

                                            <h3 className="font-black text-slate-800 text-sm mb-4 line-clamp-2 min-h-[40px] leading-tight">
                                                {c.name || c.subject?.name}
                                            </h3>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-end">
                                                    <div className="space-y-0.5">
                                                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Sĩ số hiện tại</p>
                                                        <p className="text-xs font-black text-slate-600">{c.currentSlots} / {c.maxSlots}</p>
                                                    </div>
                                                    <span className="text-xs font-black text-uneti-blue">{progress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100/50 rounded-full overflow-hidden border border-slate-100">
                                                    <div className="h-full bg-uneti-blue rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,102,179,0.3)]" style={{ width: `${progress}%` }}></div>
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
                <div className="bg-[#0f172a] rounded-[40px] p-8 shadow-2xl text-white relative overflow-hidden flex flex-col group/schedule">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-uneti-blue/10 blur-[80px] rounded-full group-hover/schedule:bg-uneti-blue/20 transition-colors duration-1000"></div>
                    <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/5 blur-[80px] rounded-full"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
                                    <Clock size={16} className="text-uneti-blue" />
                                    Lịch biểu
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Thông tin ca dạy hôm nay</p>
                            </div>
                            <span className="text-[10px] font-black bg-white/10 border border-white/5 px-3 py-1.5 rounded-xl uppercase tracking-[0.2em]">{dayName}</span>
                        </div>

                        <div className="space-y-4 flex-1">
                            {todayCourses.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-500 py-16 gap-4">
                                    <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center bg-white/[0.02]">
                                        <Calendar size={24} className="opacity-20" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.15em]">Lịch giảng dạy trống</p>
                                </div>
                            ) : (
                                todayCourses.slice(0, 3).map((c: any, i: number) => {
                                    const sch = c.schedules?.find((s: any) => s.dayOfWeek === todayNum);
                                    return (
                                        <div key={i} className="bg-white/[0.03] border border-white/[0.05] rounded-2xl p-4 hover:bg-white/[0.07] transition-all group/item">
                                            <div className="flex gap-5">
                                                <div className="flex flex-col items-center justify-center w-12 h-12 bg-white/10 rounded-xl shrink-0 group-hover/item:scale-110 transition-transform">
                                                    <span className="text-[8px] text-slate-400 font-black uppercase tracking-widest">CA</span>
                                                    <span className="text-xl font-black leading-none mt-0.5">{sch?.shift || "?"}</span>
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <h3 className="font-black text-white text-[13px] truncate leading-tight">{c.name}</h3>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"></div>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phòng {sch?.room?.name || "?"}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <Link href="/lecturer/schedule" className="mt-10 flex items-center justify-center gap-3 text-[11px] font-black text-uneti-blue-light hover:text-white transition-all bg-white/[0.03] hover:bg-uneti-blue py-4 rounded-2xl border border-white/[0.05] uppercase tracking-[0.1em]">
                            Chi tiết lịch tuần
                            <ChevronRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
