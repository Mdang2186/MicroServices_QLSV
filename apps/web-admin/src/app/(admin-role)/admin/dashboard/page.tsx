"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { EnrollmentChart, GpaPieChart } from "@/components/charts";
import { Building2, BookOpen, Users, CircleDollarSign, Fingerprint, CalendarDays, TrendingUp } from "lucide-react";

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
            <div className="relative bg-gradient-to-br from-[#f0f5ff] to-[#f4f7fe] rounded-[20px] sm:rounded-[24px] p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row items-start lg:items-center justify-between border border-white shadow-sm overflow-hidden gap-6">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-blue-100/50 to-indigo-100/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 relative z-10 w-full lg:w-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
                        <span className="text-2xl sm:text-3xl font-bold">{user?.username?.charAt(0).toUpperCase() || "A"}</span>
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight leading-tight">
                            Hệ thống, <span className="text-blue-600">{user?.username || "Admin"}</span>
                        </h1>
                        <p className="text-slate-500 font-medium mt-1 text-xs sm:text-sm flex items-center gap-2">
                            <Fingerprint size={16} className="text-blue-400" />
                            Quản trị viên cấp cao • UNETI
                        </p>
                    </div>
                </div>

                <div className="flex w-full lg:w-auto items-center gap-3 sm:gap-6 relative z-10 overflow-x-auto pb-2 lg:pb-0 scrollbar-hide">
                    <div className="flex flex-col items-center bg-white px-4 sm:px-5 py-2 sm:py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[80px] sm:min-w-[100px] shrink-0">
                        <span className="text-xl sm:text-2xl font-black text-blue-600">{stats?.systemStats?.totalFaculties || 0}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Khoa</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-4 sm:px-5 py-2 sm:py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[80px] sm:min-w-[100px] shrink-0">
                        <span className="text-xl sm:text-2xl font-black text-blue-600">{stats?.systemStats?.totalMajors || 0}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Ngành</span>
                    </div>
                    <div className="flex flex-col items-center bg-white px-4 sm:px-5 py-2 sm:py-3 rounded-2xl border border-slate-100 shadow-sm min-w-[100px] sm:min-w-[120px] shrink-0">
                        <span className="text-xl sm:text-2xl font-black text-blue-600">{stats?.systemStats?.totalLecturers || 0}</span>
                        <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Đội ngũ GV</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
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
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <BookOpen size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Lớp Học Phần</p>
                        <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-800">{stats?.activeCourses || "0"}</h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Đang mở học kỳ này</p>
                    </div>
                </div>

                <div className="bg-white rounded-[20px] p-5 sm:p-6 shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-3 sm:p-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform">
                            <CircleDollarSign size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 mb-1 tracking-widest uppercase">Doanh thu dự kiến</p>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
                            {((stats?.totalRevenue || 0) / 1e9).toFixed(1)} <span className="text-base sm:text-lg text-slate-400">Tỷ</span>
                        </h3>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Tổng thu học phí</p>
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
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-400 mt-2">Tổng lớp sinh hoạt</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: GPA Chart */}
                <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 flex flex-col">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">Phổ điểm GPA</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 mb-6">Thống kê xếp loại hệ 4.0 toàn khối sinh viên</p>
                    <div className="flex-1 flex items-center justify-center min-h-[250px]">
                        {stats?.gpaDistribution ? (
                            <GpaPieChart distribution={stats.gpaDistribution} />
                        ) : (
                            <div className="text-slate-300 text-sm">Chưa đủ dữ liệu</div>
                        )}
                    </div>
                </div>

                {/* Right: Enrollment Trend */}
                <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100 lg:col-span-2 flex flex-col">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-1">Xu hướng Ghi danh</h3>
                    <p className="text-[11px] sm:text-xs text-slate-400 mb-6">Số lượng Sinh viên đăng ký tín chỉ 6 tháng gần nhất</p>
                    <div className="flex-1 min-h-[250px] w-full overflow-x-auto scrollbar-hide">
                        <div className="min-w-[400px] h-full">
                            {stats?.enrollmentTrends ? (
                                <EnrollmentChart trends={stats.enrollmentTrends} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-slate-300 text-sm">Chưa đủ phản hồi từ DB</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Table */}
            <div className="bg-white rounded-[20px] sm:rounded-[24px] p-5 sm:p-6 shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-800">Hoạt động đăng ký mới nhất</h3>
                        <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Real-time luồng quá trình nộp học phí và đăng ký</p>
                    </div>
                    <div className="flex shrink-0">
                        <span className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            Live Trực Tuyến
                        </span>
                    </div>
                </div>

                {stats?.recentEnrollments?.length > 0 ? (
                    <div className="overflow-x-auto -mx-5 sm:mx-0 px-5 sm:px-0">
                        <table className="w-full text-left text-sm border-collapse min-w-[500px]">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="pb-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Học sinh</th>
                                    <th className="pb-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Học phần</th>
                                    <th className="pb-3 text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Thời gian</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {stats.recentEnrollments.slice(0, 5).map((item: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                    {item.img || "SV"}
                                                </div>
                                                <span className="font-semibold text-slate-700 text-xs sm:text-sm">{item.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 font-medium text-blue-600 text-xs sm:text-sm">
                                            {item.course}
                                        </td>
                                        <td className="py-4 text-right text-[10px] sm:text-xs text-slate-400 font-medium whitespace-nowrap">
                                            {new Date(item.time).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
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
