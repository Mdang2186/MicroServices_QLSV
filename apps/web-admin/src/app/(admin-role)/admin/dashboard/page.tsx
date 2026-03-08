"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { EnrollmentChart, GpaPieChart } from "@/components/charts";
import { Building2, BookOpen, Users, CircleDollarSign, Fingerprint, CalendarDays, TrendingUp, ShieldCheck } from "lucide-react";

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }

        // Fetch dashboard stats from API
        fetch("http://localhost:3000/api/students/dashboard/stats")
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    if (loading) return (
        <div className="flex min-h-screen items-center justify-center p-8 bg-[#f4f7fe]">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 overflow-x-hidden">
            {/* Breadcrumb / Top Bar */}
            <div className="flex items-center justify-between pl-1 sm:pl-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Fingerprint className="text-blue-600" size={18} />
                    <span className="tracking-tight hidden sm:inline">Quản trị hệ thống</span>
                    <span className="tracking-tight sm:hidden">Hệ thống</span>
                    <span className="text-slate-300 mx-0.5 sm:mx-1">/</span>
                    <span className="text-blue-600">Bảng điều khiển</span>
                </div>
            </div>

            {/* Welcome Banner */}
            <div className="relative bg-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between border border-slate-100 shadow-sm overflow-hidden gap-6">
                <div className="absolute top-0 right-0 w-64 h-64 bg-uneti-blue-light/50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 relative z-10 w-full lg:w-auto">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-uneti-blue text-white flex items-center justify-center shadow-lg shadow-uneti-blue/20 shrink-0">
                        <span className="text-xl sm:text-2xl font-black">{user?.username?.charAt(0).toUpperCase() || "A"}</span>
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-tight">
                                Hệ thống, <span className="text-uneti-blue">{user?.username || "Admin"}</span>
                            </h1>
                        </div>
                        <p className="text-slate-400 font-semibold mt-0.5 text-[10px] sm:text-xs flex items-center gap-2 uppercase tracking-wider">
                            <ShieldCheck size={14} className="text-uneti-blue" />
                            Quản trị viên cấp cao • UNETI
                        </p>
                    </div>
                </div>

                <div className="flex w-full lg:w-auto items-center gap-3 sm:gap-4 relative z-10 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
                    {[
                        { label: "Khoa", value: stats?.systemStats?.totalFaculties || 0 },
                        { label: "Ngành", value: stats?.systemStats?.totalMajors || 0 },
                        { label: "Đội ngũ GV", value: stats?.systemStats?.totalLecturers || 0 },
                    ].map((s, idx) => (
                        <div key={idx} className="flex flex-col items-center bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 min-w-[80px] shrink-0">
                            <span className="text-lg sm:text-xl font-black text-uneti-blue">{s.value}</span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-10 h-10 bg-uneti-blue-light text-uneti-blue rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Users size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Tổng Sinh Viên</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats?.totalStudents?.toLocaleString("vi-VN") || "0"}</h3>
                        <p className="text-[10px] font-bold text-emerald-500 flex items-center gap-1 mt-2 uppercase tracking-wide">
                            <TrendingUp size={10} /> Toàn trường
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <BookOpen size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Lớp Học Phần</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats?.activeCourses || "0"}</h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">Đang mở học kỳ</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-10 h-10 bg-fuchsia-50 text-fuchsia-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CircleDollarSign size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Doanh thu dự kiến</p>
                        <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                            {((stats?.totalRevenue || 0) / 1e9).toFixed(1)} <span className="text-sm text-slate-400">Tỷ</span>
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">Học phí tổng</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4">
                        <div className="w-10 h-10 bg-cyan-50 text-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Building2 size={18} />
                        </div>
                    </div>
                    <div>
                        <p className="text-[9px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Lớp Hành Chính</p>
                        <h3 className="text-2xl font-black text-slate-800">{stats?.systemStats?.totalAdminClasses || "0"}</h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-2 uppercase tracking-wide">Lớp sinh hoạt</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: GPA Chart */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-tight">Phổ điểm GPA</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">Xếp loại hệ 4.0</p>
                    <div className="flex-1 flex items-center justify-center min-h-[200px] mt-4">
                        {stats?.gpaDistribution ? (
                            <GpaPieChart distribution={stats.gpaDistribution} />
                        ) : (
                            <div className="text-slate-300 text-xs">Chưa đủ dữ liệu</div>
                        )}
                    </div>
                </div>

                {/* Right: Enrollment Trend */}
                <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                    <h3 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-tight">Xu hướng Ghi danh</h3>
                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">6 tháng gần nhất</p>
                    <div className="flex-1 min-h-[200px] w-full mt-4 overflow-hidden">
                        {stats?.enrollmentTrends ? (
                            <EnrollmentChart trends={stats.enrollmentTrends} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-300 text-xs">Đang tải dữ liệu...</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Table */}
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 uppercase tracking-tight">Hoạt động đăng ký</h3>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-wide">Real-time luồng dữ liệu</p>
                    </div>
                    <div className="flex shrink-0">
                        <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Live Trực Tuyến
                        </span>
                    </div>
                </div>

                {stats?.recentEnrollments?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50">
                                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Học sinh</th>
                                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Học phần</th>
                                    <th className="pb-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.recentEnrollments.slice(0, 5).map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-uneti-blue-light text-uneti-blue flex items-center justify-center font-black text-[10px] shrink-0 border border-uneti-blue/10">
                                                    {item.name?.charAt(0) || "SV"}
                                                </div>
                                                <span className="font-bold text-slate-700 text-xs">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3.5 font-bold text-uneti-blue text-xs lowercase tracking-tight">
                                            {item.course}
                                        </td>
                                        <td className="py-3.5 text-right text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                                            {new Date(item.time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })} • {new Date(item.time).toLocaleDateString("vi-VN")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-300">
                        <CalendarDays className="w-12 h-12 mb-3 text-slate-200" strokeWidth={1.5} />
                        <p className="text-sm font-medium">Chưa có luồng dữ liệu mới</p>
                    </div>
                )}
            </div>
        </div>
    );
}
