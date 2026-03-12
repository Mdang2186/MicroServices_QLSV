"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    Users,
    BookOpen,
    Building2,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Info,
    CalendarDays,
    GraduationCap,
    BarChart3,
    ChevronRight,
    ShieldCheck,
    Activity,
    Clock,
    Zap,
    Pin
} from "lucide-react";

export default function StaffDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
        fetch("/api/students/dashboard/stats")
            .then(r => r.json()).then(setStats).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
            <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Building2 size={14} className="text-uneti-blue" />
                        <span>Phòng Đào Tạo</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Bảng điều khiển</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Trung tâm Điều hành</h1>
                        <div className="bg-uneti-blue-light px-2 py-1 rounded-lg flex items-center gap-1.5 border border-uneti-blue/10">
                            <span className="text-[9px] font-black text-uneti-blue uppercase tracking-widest leading-none">Cơ bản & Nghiệp vụ</span>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic">"{now}"</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <Clock size={16} className="text-uneti-blue" />
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest text-right whitespace-nowrap">Học kỳ mới sắp bắt đầu</span>
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
                                {user?.username?.charAt(0).toUpperCase() || "S"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Chào buổi làm việc, <br />
                                <span className="text-uneti-blue">Cán bộ {user?.username || "Giáo vụ"}</span>
                            </h2>
                            <p className="text-[13px] font-bold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                <ShieldCheck size={14} className="text-uneti-blue" />
                                Quản lý & Tổ chức Đào tạo • UNETI
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                        <div className="flex flex-col items-center bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 min-w-[140px]">
                            <span className="text-2xl font-black text-uneti-blue tabular-nums">{stats?.activeCourses || 0}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Lớp Học phần</span>
                        </div>
                        <div className="flex flex-col items-center bg-slate-50 px-6 py-4 rounded-3xl border border-slate-100 min-w-[140px]">
                            <span className="text-2xl font-black text-uneti-blue tabular-nums">{stats?.totalStudents?.toLocaleString("vi-VN") || 0}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Sinh viên</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Sinh Viên", value: stats?.totalStudents?.toLocaleString("vi-VN") || "0", icon: Users, color: "blue", trend: "Primary" },
                    { label: "Học Phần", value: stats?.activeCourses || "0", icon: BookOpen, color: "indigo", trend: "Current" },
                    { label: "Hành Chính", value: stats?.systemStats?.totalAdminClasses || "0", icon: Building2, color: "cyan", trend: "Stable" },
                    { label: "Giảng Viên", value: stats?.systemStats?.totalLecturers || "0", icon: CalendarDays, color: "fuchsia", trend: "Active" },
                ].map((item, i) => (
                    <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 bg-${item.color === 'blue' ? 'uneti-blue' : item.color + '-500'}/5 rounded-full -mr-12 -mt-12 blur-2xl`}></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.label}</span>
                            <div className={`p-2.5 rounded-xl ${item.color === 'blue' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${item.color}-50 text-${item.color}-600`} shadow-inner`}>
                                <item.icon size={18} />
                            </div>
                        </div>
                        <div className="relative z-10 space-y-1">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{item.value}</h3>
                            <div className="flex items-center gap-1.5">
                                <TrendingUp size={10} className="text-slate-300" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.trend}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Quick Tasks */}
                <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                    <div className="flex items-center justify-between mb-8">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Zap size={16} className="text-uneti-blue" />
                                Nghiệp vụ Học vụ
                            </h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Lối tắt xử lý nhanh</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { icon: GraduationCap, text: "Điểm định dạng", href: "/staff/students", color: "text-blue-500", bg: "bg-blue-50" },
                            { icon: BookOpen, text: "Xếp lớp & Tín chỉ", href: "/staff/courses", color: "text-indigo-500", bg: "bg-indigo-50" },
                            { icon: CalendarDays, text: "Thời khóa biểu", href: "/staff/schedule", color: "text-cyan-500", bg: "bg-cyan-50" },
                            { icon: Building2, text: "Cơ cấu Khoa", href: "/staff/departments", color: "text-fuchsia-500", bg: "bg-fuchsia-50" },
                        ].map((item, i) => (
                            <Link key={i} href={item.href} className="flex flex-col items-center text-center gap-4 p-6 rounded-[28px] border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-uneti-blue/10 hover:shadow-xl transition-all group">
                                <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-6 h-6" />
                                </div>
                                <span className="text-[13px] font-black text-slate-700 uppercase tracking-tight">{item.text}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Right Column: Notices */}
                <div className="bg-[#0f172a] rounded-[40px] p-8 shadow-2xl text-white relative overflow-hidden flex flex-col group/notices">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-uneti-blue/10 blur-[80px] rounded-full group-hover/notices:bg-uneti-blue/20 transition-colors duration-1000"></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black tracking-widest uppercase flex items-center gap-2">
                                    <Pin size={16} className="text-uneti-blue" />
                                    Lịch trình Đào tạo
                                </h2>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Thông báo & Hạn chót</p>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            {[
                                { type: "warning", Icon: AlertCircle, title: "Hạn đóng bảng điểm học kỳ", desc: "Đôn đốc Giảng viên hoàn tất cập nhật điểm.", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
                                { type: "info", Icon: Info, title: "Mở cổng đăng ký Tín chỉ", desc: "Chuẩn bị rà soát sĩ số lớp để dãn cách lịch đăng ký.", color: "text-uneti-blue-light", bg: "bg-uneti-blue-light/10", border: "border-uneti-blue-light/20" },
                                { type: "success", Icon: CheckCircle2, title: "Lịch thi Kết thúc học phần", desc: "Đã phân bổ 98% phòng thi và cán bộ coi thi.", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
                            ].map((item, i) => (
                                <div key={i} className={`flex items-start gap-4 p-5 rounded-2xl border ${item.bg} ${item.border} hover:bg-white/5 transition-colors group/item`}>
                                    <item.Icon className={`shrink-0 mt-0.5 w-5 h-5 ${item.color}`} />
                                    <div>
                                        <p className="text-[13px] font-black uppercase tracking-tight leading-none group-hover/item:text-uneti-blue-light transition-colors">{item.title}</p>
                                        <p className="text-[11px] mt-2 opacity-60 font-bold leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom: Course Popularity */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                <div className="flex items-center justify-between mb-10">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <BarChart3 className="text-uneti-blue" size={16} />
                            Mức độ quan tâm Đăng ký
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Phân tích lượt đăng ký theo học phần</p>
                    </div>
                    <Activity className="text-slate-100" size={32} strokeWidth={1} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {stats?.coursePopularity?.length > 0 ? (
                        stats.coursePopularity.slice(0, 3).map((course: any, i: number) => {
                            const progress = Math.min(100, Math.round((course.value / (stats?.totalStudents || 1000)) * 100)) + 30;
                            return (
                                <div key={i} className="bg-slate-50/50 rounded-[32px] p-6 border border-slate-50 relative overflow-hidden group hover:bg-white hover:border-uneti-blue/10 hover:shadow-xl transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="space-y-1">
                                            <h4 className="font-black text-slate-800 text-sm leading-tight pr-4">{course.fullName}</h4>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã HP: {course.name}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-white border border-slate-100 text-uneti-blue font-black text-[10px] flex items-center justify-center shrink-0 shadow-sm">
                                            #{i + 1}
                                        </div>
                                    </div>
                                    <div className="mt-8 space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div className="text-2xl font-black text-uneti-blue tabular-nums">
                                                {course.value}
                                                <span className="text-[10px] text-slate-400 font-bold ml-2 uppercase tracking-widest">Lượt</span>
                                            </div>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                                            <div className="h-full bg-uneti-blue rounded-full group-hover:bg-uneti-blue shadow-[0_0_8px_rgba(0,102,179,0.3)] transition-all" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full h-40 flex flex-col items-center justify-center text-slate-200 gap-3">
                            <Activity size={48} strokeWidth={1} className="opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Đang cập nhật chỉ số phân tích...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
