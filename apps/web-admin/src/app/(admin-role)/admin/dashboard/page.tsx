"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { EnrollmentChart, GpaPieChart } from "@/components/charts";
import {
    Building2,
    BookOpen,
    Users,
    CircleDollarSign,
    Fingerprint,
    CalendarDays,
    TrendingUp,
    ShieldCheck,
    ChevronRight,
    ArrowUpRight,
    Activity,
    GraduationCap,
    Clock
} from "lucide-react";

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }

        // Fetch dashboard stats from API
        fetch("/api/students/dashboard/stats")
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
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
                        <ShieldCheck size={14} className="text-uneti-blue" />
                        <span>Quản trị viên</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Bảng điều khiển</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hệ thống UNETI</h1>
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Real-time</span>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic">"{now}"</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex -space-x-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400">
                                {String.fromCharCode(64 + i)}
                            </div>
                        ))}
                        <div className="w-8 h-8 rounded-full border-2 border-white bg-uneti-blue text-white flex items-center justify-center text-[10px] font-black shadow-lg shadow-uneti-blue/20">
                            +5
                        </div>
                    </div>
                    <div className="h-10 w-[1px] bg-slate-100 hidden md:block"></div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                        <CalendarDays size={16} className="text-slate-400 group-hover:text-uneti-blue transition-colors" />
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Học kỳ 1 • 2025</span>
                    </button>
                </div>
            </div>

            {/* Main Welcome Card */}
            <div className="relative group overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 p-8 sm:p-10">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-uneti-blue/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="flex items-center gap-6">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[30px] bg-uneti-blue text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-uneti-blue/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                {user?.username?.charAt(0).toUpperCase() || "A"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full"></div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Chào buổi chiều, <br />
                                <span className="text-uneti-blue">Quản trị viên {user?.username || "Cao cấp"}</span>
                            </h2>
                            <p className="text-[13px] font-bold text-slate-400 flex items-center gap-2">
                                <ShieldCheck size={14} className="text-emerald-500" />
                                Quyền kiểm soát toàn hệ thống • ID: UNETI-{user?.id?.substring(0, 4) || "0921"}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                        {[
                            { label: "Khoa đào tạo", value: stats?.systemStats?.totalFaculties || 0, icon: Building2 },
                            { label: "Ngành học", value: stats?.systemStats?.totalMajors || 0, icon: GraduationCap },
                            { label: "Giảng viên", value: stats?.systemStats?.totalLecturers || 0, icon: Users },
                        ].map((s, idx) => (
                            <div key={idx} className="bg-slate-50/50 hover:bg-white hover:border-uneti-blue/20 transition-all border border-transparent px-6 py-4 rounded-3xl group/card">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-uneti-blue shadow-sm group-hover/card:scale-110 transition-transform">
                                        <s.icon size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xl font-black text-slate-900 leading-none tabular-nums">{s.value}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mt-1.5">{s.label}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Primary Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Sinh viên", value: stats?.totalStudents?.toLocaleString("vi-VN") || "0", icon: GraduationCap, color: "blue", trend: "+12.5%", desc: "Toàn hệ thống" },
                    { label: "Lớp học phần", value: stats?.activeCourses || "0", icon: BookOpen, color: "indigo", trend: "Active", desc: "Học kỳ 1" },
                    { label: "Doanh thu", value: `${((stats?.totalRevenue || 0) / 1e9).toFixed(1)} Tỷ`, icon: CircleDollarSign, color: "fuchsia", trend: "+$2m", desc: "Học phí dự kiến" },
                    { label: "Hành chính", value: stats?.systemStats?.totalAdminClasses || "0", icon: Building2, color: "cyan", trend: "Stable", desc: "Lớp sinh hoạt" },
                ].map((item, i) => (
                    <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-32 h-32 bg-${item.color === 'blue' ? 'uneti-blue' : item.color + '-500'}/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-500`}></div>

                        <div className="flex justify-between items-start mb-6 relative z-10">
                            <div className={`w-12 h-12 rounded-2xl ${item.color === 'blue' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${item.color}-50 text-${item.color}-600`} flex items-center justify-center shadow-inner`}>
                                <item.icon size={22} />
                            </div>
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${item.trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                                }`}>
                                {item.trend}
                            </span>
                        </div>

                        <div className="relative z-10 space-y-1">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{item.label}</p>
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight">{item.value}</h3>
                            <div className="flex items-center gap-1.5 pt-2">
                                <Activity size={10} className="text-slate-300" />
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{item.desc}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* GPA Chart */}
                <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <TrendingUp size={16} className="text-uneti-blue" />
                                Phổ điểm GPA
                            </h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Thống kê toàn khóa học</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100/50 shadow-sm">
                            <ArrowUpRight size={12} />
                            2.8 AVG
                        </div>
                    </div>
                    <div className="min-h-[250px] flex items-center justify-center">
                        {stats?.gpaDistribution ? (
                            <GpaPieChart distribution={stats.gpaDistribution} />
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-slate-200">
                                <Activity size={48} strokeWidth={1} />
                                <span className="text-[10px] font-black uppercase">Đang tải biểu đồ...</span>
                            </div>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-slate-50">
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Xuất sắc</p>
                            <p className="text-lg font-black text-slate-800 tabular-nums">1.2k</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Yếu kém</p>
                            <p className="text-lg font-black text-slate-800 tabular-nums">142</p>
                        </div>
                    </div>
                </div>

                {/* Enrollment Trend */}
                <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 lg:col-span-2">
                    <div className="flex justify-between items-start mb-10">
                        <div className="space-y-1">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={16} className="text-uneti-blue" />
                                Xu hướng Ghi danh
                            </h3>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Biến động 6 tháng gần nhất</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-uneti-blue shadow-[0_0_8px_rgba(0,102,179,0.3)]"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Học kỳ này</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trung bình</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[250px] w-full">
                        {stats?.enrollmentTrends ? (
                            <EnrollmentChart trends={stats.enrollmentTrends} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-200 gap-4">
                                <div className="w-1.5 h-8 bg-slate-100 rounded-full animate-pulse"></div>
                                <div className="w-1.5 h-16 bg-slate-100 rounded-full animate-pulse delay-75"></div>
                                <div className="w-1.5 h-12 bg-slate-100 rounded-full animate-pulse delay-150"></div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                    <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                            <Clock size={16} className="text-uneti-blue" />
                            Giao dịch mới nhất
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Luồng đăng ký thời gian thực</p>
                    </div>
                    <Link href="/admin/students" className="px-5 py-2 text-[10px] font-black text-uneti-blue hover:text-white hover:bg-uneti-blue border border-uneti-blue/20 rounded-2xl transition-all uppercase tracking-widest flex items-center gap-2">
                        Kiểm soát toàn bộ <ChevronRight size={14} />
                    </Link>
                </div>

                <div className="overflow-x-auto">
                    {stats?.recentEnrollments?.length > 0 ? (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50">
                                    <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-50">Đối tượng sinh viên</th>
                                    <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-50">Học phần / Mô-đun</th>
                                    <th className="py-4 px-8 text-right text-[9px] font-black text-slate-400 uppercase tracking-[0.1em] border-b border-slate-50">Thời hiệu thực thi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.recentEnrollments.slice(0, 5).map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-5 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-slate-50 border border-slate-100 text-uneti-blue flex items-center justify-center font-black text-xs shadow-inner group-hover:bg-uneti-blue-light transition-colors">
                                                    {item.name?.charAt(0) || "SV"}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <span className="font-black text-slate-800 text-[13px] block">{item.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Mã SV: {Math.floor(Math.random() * 90000) + 10000}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8">
                                            <div className="flex flex-col gap-1">
                                                <div className="inline-flex items-center w-fit px-3 py-1 bg-uneti-blue-light/50 rounded-lg text-[10px] font-black text-uneti-blue uppercase tracking-tight">
                                                    {item.course}
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">Kỳ 1 • 2025</span>
                                            </div>
                                        </td>
                                        <td className="py-5 px-8 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-[12px] font-black text-slate-700 tabular-nums">
                                                    {new Date(item.time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-1">
                                                    {new Date(item.time).toLocaleDateString("vi-VN", { day: '2-digit', month: 'short' })}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-slate-200">
                            <Activity className="w-16 h-16 mb-4 opacity-20" strokeWidth={1} />
                            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Đang lắng nghe tín hiệu hệ thống...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
