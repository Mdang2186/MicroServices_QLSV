"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { EnrollmentChart, AttendancePieChart, GpaPieChart } from "@/components/charts";
import { StatsCard } from "@/components/stats-card";

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const userCookie = Cookies.get("admin_user");
        if (userCookie) {
            try {
                setUser(JSON.parse(userCookie));
            } catch (e) {
                console.error("Failed to parse user cookie");
            }
        }

        // Fetch Real Data from API Setup
        fetch("http://localhost:3000/api/students/dashboard/stats")
            .then(res => {
                if (!res.ok) throw new Error("Failed to load dashboard data");
                return res.json();
            })
            .then(setStats)
            .catch(err => console.error("Dashboard Fetch Error", err));
    }, []);

    const handleLogout = () => {
        Cookies.remove("admin_accessToken");
        Cookies.remove("admin_role");
        Cookies.remove("admin_user");
        Cookies.remove("accessToken");
        Cookies.remove("role");
        Cookies.remove("user");

        localStorage.removeItem("admin_accessToken");
        localStorage.removeItem("admin_user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        router.push("/login");
    };

    if (!stats) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-4">
                <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium animate-pulse">Đang tải cấu trúc dữ liệu nhà trường...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">
            {/* Header / Banners */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-gradient-to-r from-blue-900 to-indigo-800 p-8 rounded-2xl shadow-lg border border-indigo-900 transition-all text-white">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight">Hệ Thống Quản Trị UNETI</h1>
                    <p className="text-indigo-200 mt-2 font-medium text-lg">Chào mừng <span className="text-white font-bold">{user?.username || "Admin"}</span>! Bảng điều khiển giám sát đào tạo & sinh viên.</p>
                </div>

                <div className="flex items-center gap-4">
                    <div
                        className="flex items-center gap-3 cursor-pointer group p-2 pr-4 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-sm transition-all shadow-sm"
                        onClick={handleLogout}
                        title="Đăng xuất"
                    >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-900 text-lg font-bold shadow-md group-hover:scale-105 transition-transform">
                            {user?.username?.[0]?.toUpperCase() || "A"}
                        </div>
                        <span className="font-semibold text-sm text-white transition-colors">Đăng xuất</span>
                    </div>
                </div>
            </div>

            {/* Row 1: System Level Stats (UNETI Org) */}
            <div className="mb-2 flex items-center gap-2">
                <Icons.Dashboard className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Cơ Cấu Tổ Chức</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Khoa / Bộ Môn"
                    value={stats.systemStats?.totalFaculties || 0}
                    icon={Icons.Course}
                    color="blue"
                    trend=""
                    trendLabel="Đơn vị đào tạo"
                    trendUp={true}
                />
                <StatsCard
                    title="Ngành Học"
                    value={stats.systemStats?.totalMajors || 0}
                    icon={Icons.Filter}
                    color="indigo"
                    trend=""
                    trendLabel="Chuyên ngành"
                    trendUp={true}
                />
                <StatsCard
                    title="Lớp Hành Chính"
                    value={stats.systemStats?.totalAdminClasses || 0}
                    icon={Icons.Student}
                    color="cyan"
                    trend=""
                    trendLabel="Đang sinh hoạt"
                    trendUp={true}
                />
                <StatsCard
                    title="Giảng Viên"
                    value={stats.systemStats?.totalLecturers || 0}
                    icon={Icons.Logout}
                    color="orange"
                    trend=""
                    trendLabel="Cán bộ giảng dạy"
                    trendUp={true}
                />
            </div>

            {/* Row 2: Student & Academic Stats */}
            <div className="mb-2 flex items-center gap-2 mt-4">
                <Icons.Student className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-bold text-slate-800 tracking-tight">Học Viên & Đào Tạo</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatsCard
                    title="Tổng Sinh Viên"
                    value={stats.totalStudents.toLocaleString('vi-VN')}
                    icon={Icons.Student}
                    color="emerald"
                    trend="5.2%"
                    trendLabel="so với kỳ trước"
                    trendUp={true}
                />
                <StatsCard
                    title="Lớp Học Phần"
                    value={stats.activeCourses.toLocaleString('vi-VN')}
                    icon={Icons.Course}
                    color="green"
                    trend="Mở mới"
                    trendLabel="học kỳ này"
                    trendUp={true}
                />
                <StatsCard
                    title="Kinh Phí Thu Phí"
                    value={`${(stats.totalRevenue / 1000000000).toFixed(2)} Tỷ`}
                    icon={Icons.Report}
                    color="purple"
                    trend="Tiến độ"
                    trendLabel="ổn định"
                    trendUp={true}
                />
                <StatsCard
                    title="Tổng Tín Chỉ"
                    value={stats.totalCreditsAssigned ? stats.totalCreditsAssigned.toLocaleString('vi-VN') : "0"}
                    icon={Icons.Report}
                    color="orange"
                    trend="Khối lượng"
                    trendLabel="giảng dạy"
                    trendUp={true}
                />
            </div>

            {/* Charts Section: Row 3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* GPA Dist */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 flex flex-col items-center hover:shadow-md transition-shadow">
                    <h3 className="text-xl w-full text-left font-bold text-slate-800 tracking-tight mb-2">Phân Bổ Học Lực</h3>
                    <p className="w-full text-left text-sm text-slate-500 font-medium mb-8">Thống kê theo thang điểm Hệ 4.0 toàn trường</p>

                    {stats.gpaDistribution ? (
                        <GpaPieChart distribution={stats.gpaDistribution} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-400 font-medium">Chưa có đánh giá GPA</div>
                    )}
                </div>

                {/* Enrollment Trends */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Lưu Lượng Ghi Danh Môn Học</h3>
                            <p className="text-sm text-slate-500 font-medium">Thống kê lượt đăng ký tín chỉ 6 tháng qua</p>
                        </div>
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Icons.Course className="w-5 h-5" />
                        </div>
                    </div>
                    {stats.enrollmentTrends ? (
                        <EnrollmentChart trends={stats.enrollmentTrends} />
                    ) : (
                        <div className="h-64 flex items-center justify-center text-slate-400 font-medium">Không có dữ liệu</div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top Modules Bar */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow lg:col-span-2">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 tracking-tight">Top Lớp Học Phần Đông Nhất</h3>
                            <p className="text-sm text-slate-500 font-medium">Thống kê tải trọng giảng dạy hệ thống</p>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
                            <Icons.Dashboard className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="h-64 mt-4 bg-slate-50/50 rounded-xl p-4 border border-dashed border-slate-200">
                        {stats.coursePopularity && stats.coursePopularity.length > 0 ? (
                            <div className="flex items-end justify-between h-full gap-4 px-4 pb-2">
                                {stats.coursePopularity.map((course: any, i: number) => {
                                    const maxVal = Math.max(...(stats.coursePopularity.map((c: any) => c.value)), 1);
                                    const heightPerc = (course.value / maxVal) * 100;

                                    return (
                                        <div key={i} className="flex flex-col items-center gap-3 flex-1 group relative h-full justify-end" title={`${course.fullName} \nSĩ số: ${course.value} Sinh viên`}>
                                            <div
                                                className="w-full max-w-[64px] bg-gradient-to-t from-emerald-500 to-teal-400 rounded-t-lg group-hover:from-emerald-600 group-hover:to-teal-500 transition-all flex items-start justify-center pt-2 shadow-sm"
                                                style={{ height: `${heightPerc}%`, minHeight: '32px' }}
                                            >
                                                <span className="text-xs text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity -mt-8 bg-slate-800 px-3 py-1 rounded shadow pointer-events-none whitespace-nowrap absolute z-10">
                                                    {course.value} SV
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-bold text-slate-600 truncate max-w-full uppercase tracking-wider text-center">
                                                {course.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 font-medium">Đang mở đăng ký...</div>
                        )}
                    </div>
                </div>

                {/* Recent Enrollments Stream */}
                <div className="bg-white p-7 rounded-3xl shadow-sm border border-slate-100 col-span-1 border-t-4 border-t-indigo-500 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 tracking-tight">Hoạt Động Gần Đây</h3>
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                        </span>
                    </div>

                    <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                        {stats.recentEnrollments?.length > 0 ? stats.recentEnrollments.map((student: any, i: number) => {
                            const date = new Date(student.time);
                            const now = new Date();
                            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
                            const timeStr = diffDays === 0 ? "Hôm nay" : `${diffDays} ngày trước`;

                            return (
                                <div key={i} className="group flex items-start justify-between p-4 bg-slate-50 hover:bg-indigo-50/60 rounded-xl transition-all border border-slate-100 hover:border-indigo-100 cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 bg-white shadow-sm border border-slate-200 rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 shrink-0">
                                            {student.img}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-900 transition-colors leading-tight">{student.name}</p>
                                            <p className="text-[11px] font-medium text-slate-500 mt-1 line-clamp-2 leading-relaxed">Đã đăng ký lớp học phần <span className="text-indigo-600 font-semibold">{student.course}</span></p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap ml-2">{timeStr}</span>
                                </div>
                            );
                        }) : (
                            <div className="flex flex-col items-center justify-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                <Icons.Student className="w-10 h-10 text-slate-300 mb-3" />
                                <span className="text-sm text-slate-500 font-medium">Hệ thống đang rảnh rỗi</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
