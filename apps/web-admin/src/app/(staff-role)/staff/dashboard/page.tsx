"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { Users, BookOpen, Building2, TrendingUp, AlertCircle, CheckCircle2, Info, CalendarDays, GraduationCap, BarChart3 } from "lucide-react";

export default function StaffDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
        fetch("http://localhost:3000/api/students/dashboard/stats")
            .then(r => r.json()).then(setStats).catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-[#f4f7fe]">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Breadcrumb / Top Bar */}
            <div className="flex items-center justify-between pl-1 sm:pl-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Building2 className="text-emerald-600" size={18} />
                    <span className="tracking-tight hidden sm:inline">Phòng Đào Tạo</span>
                    <span className="tracking-tight sm:hidden">ĐT</span>
                    <span className="text-slate-300 mx-0.5 sm:mx-1">/</span>
                    <span className="text-emerald-600">Bảng điều khiển</span>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative bg-gradient-to-br from-[#eff8f3] to-[#f4f7fe] rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between border border-white shadow-sm overflow-hidden gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-emerald-100/60 to-teal-100/60 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200 shrink-0">
                        <span className="text-2xl sm:text-3xl font-bold">{user?.username?.charAt(0).toUpperCase() || "S"}</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                            Phòng ban, <span className="text-emerald-600">{user?.username || "Giáo vụ"}</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm flex items-center gap-2">
                            <Users size={16} className="text-emerald-400" />
                            Quản lý & Tổ chức Đào tạo • UNETI
                        </p>
                    </div>
                </div>

                <div className="flex w-full lg:w-auto items-center gap-3 sm:gap-6 relative z-10 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    <div className="flex flex-col items-center bg-white px-4 sm:px-5 py-2 sm:py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[100px] sm:min-w-[120px] shrink-0">
                        <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats?.activeCourses || 0}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lớp Học phần</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-4 sm:px-5 py-2 sm:py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[100px] sm:min-w-[120px] shrink-0">
                        <span className="text-xl sm:text-2xl font-black text-emerald-600">{stats?.totalStudents?.toLocaleString("vi-VN") || 0}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sinh viên</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <Users size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Tổng Sinh Viên</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{stats?.totalStudents?.toLocaleString("vi-VN") || "0"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-emerald-500 flex items-center gap-1 mt-2">
                            <TrendingUp size={12} /> Số liệu toàn trường
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <BookOpen size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Lớp Học Phần</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{stats?.activeCourses || "0"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2 flex items-center gap-1">
                            Học kỳ hiện tại
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-cyan-50 text-cyan-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <Building2 size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Lớp Hành Chính</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{stats?.systemStats?.totalAdminClasses || "0"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Đang sinh hoạt</p>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <CalendarDays size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Giảng Viên</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{stats?.systemStats?.totalLecturers || "0"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Cán bộ tham gia giảng dạy</p>
                    </div>
                </div>
            </div>

            {/* Main Content Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

                {/* Left Column: Quick Tasks */}
                <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-5">⚡ Nghiệp vụ Học vụ</h3>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {[
                            { icon: GraduationCap, text: "Điểm định dạng", href: "/staff/students", color: "text-blue-500", bg: "bg-blue-50", hover: "hover:border-blue-200" },
                            { icon: BookOpen, text: "Xếp lớp & Tín chỉ", href: "/staff/courses", color: "text-emerald-500", bg: "bg-emerald-50", hover: "hover:border-emerald-200" },
                            { icon: CalendarDays, text: "Thời khóa biểu", href: "/staff/schedule", color: "text-orange-500", bg: "bg-orange-50", hover: "hover:border-orange-200" },
                            { icon: Building2, text: "Cơ cấu Khoa", href: "/staff/departments", color: "text-purple-500", bg: "bg-purple-50", hover: "hover:border-purple-200" },
                        ].map((item, i) => (
                            <a key={i} href={item.href} className={`flex flex-col items-center text-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 bg-[#fafcff] transition-all cursor-pointer ${item.hover}`}>
                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                </div>
                                <span className="text-xs sm:text-sm font-bold text-slate-700">{item.text}</span>
                            </a>
                        ))}
                    </div>
                </div>

                {/* Right Column: Notices */}
                <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-4 sm:mb-5">📌 Lịch trình Đào tạo</h3>
                    <div className="space-y-3 sm:space-y-4 flex-1">
                        {[
                            { type: "warning", Icon: AlertCircle, title: "Hạn đóng bảng điểm học kỳ", desc: "Đôn đốc Giảng viên hoàn tất cập nhật điểm.", colors: "bg-orange-50 text-orange-600 border-orange-100" },
                            { type: "info", Icon: Info, title: "Mở cổng đăng ký Tín chỉ", desc: "Chuẩn bị rà soát sĩ số lớp để dãn cách lịch đăng ký.", colors: "bg-blue-50 text-blue-600 border-blue-100" },
                            { type: "success", Icon: CheckCircle2, title: "Lịch thi Kết thúc học phần", desc: "Đã phân bổ 98% phòng thi và cán bộ coi thi.", colors: "bg-emerald-50 text-emerald-600 border-emerald-100" },
                        ].map((item, i) => (
                            <div key={i} className={`flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl border ${item.colors}`}>
                                <item.Icon className="shrink-0 mt-0.5 w-4 h-4 sm:w-5 sm:h-5" />
                                <div>
                                    <p className="text-xs sm:text-sm font-bold">{item.title}</p>
                                    <p className="text-[11px] sm:text-xs mt-1 opacity-80 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* Bottom: Course Popularity (Academic Metric) */}
            <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100">
                <div className="flex items-center gap-2 mb-5 sm:mb-6">
                    <BarChart3 className="text-emerald-500" size={20} />
                    <h3 className="text-base sm:text-lg font-bold text-slate-800">Mức độ quan tâm của Sinh viên đối với các Lớp học phần</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {stats?.coursePopularity?.length > 0 ? (
                        stats.coursePopularity.slice(0, 3).map((course: any, i: number) => {
                            const progress = Math.min(100, Math.round((course.value / (stats?.totalStudents || 1000)) * 100)) + 30; // scaled effect
                            return (
                                <div key={i} className="bg-[#fafcff] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-slate-100 relative overflow-hidden group">
                                    <div className="flex justify-between items-start mb-2 sm:mb-3">
                                        <h4 className="font-extrabold text-slate-800 text-sm sm:text-base pr-4 break-words">{course.fullName}</h4>
                                        <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] sm:text-xs flex items-center justify-center shrink-0">
                                            #{i + 1}
                                        </div>
                                    </div>
                                    <div className="text-xs sm:text-sm font-semibold text-slate-500 mb-3 sm:mb-4">
                                        Mã HP: {course.name}
                                    </div>
                                    <div className="flex justify-between items-end mb-1 sm:mb-2">
                                        <div className="text-xs sm:text-sm font-bold text-emerald-600">
                                            {course.value} <span className="text-[10px] sm:text-xs text-slate-400 font-medium">Đăng ký</span>
                                        </div>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full group-hover:bg-emerald-400 transition-colors" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full h-32 flex items-center justify-center text-slate-400 text-sm font-medium">
                            Chưa đủ dữ liệu lớp học phần để phân tích
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}
