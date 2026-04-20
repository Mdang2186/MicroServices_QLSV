"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { EnrollmentChart, GpaPieChart } from "@/components/charts";
import {
    Building2,
    BookOpen,
    Users,
    TrendingUp,
    ArrowUpRight,
    Activity,
    Clock,
    LayoutDashboard,
    Zap,
    GraduationCap,
    CircleDollarSign,
    ShieldCheck,
    ChevronRight,
    Search,
    Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { OperationalInsights } from "@/components/dashboard/OperationalInsights";
import { FacultyChart } from "@/components/dashboard/FacultyChart";
import { DashboardTabs } from "@/components/dashboard/DashboardTabs";

export default function AdminDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
    const [activeTab, setActiveTab] = useState<string>("overview");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedDate) params.append("date", selectedDate);
        if (selectedFacultyId && selectedFacultyId !== "all") params.append("facultyId", selectedFacultyId);

        fetch(`/api/students/dashboard/stats?${params.toString()}`)
            .then(r => r.json())
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [selectedDate, selectedFacultyId]);

    const adminStats = [
        { 
            label: "Tổng Sinh Viên", 
            value: stats?.totalStudents?.toLocaleString("vi-VN") || "0", 
            icon: Users, 
            color: "blue", 
            sub: "Theo bộ lọc",
            trend: { value: "+8.4%", type: "up" as const }
        },
        { 
            label: "Khoa Chuyên Môn", 
            value: stats?.systemStats?.totalFaculties || 0, 
            icon: Building2, 
            color: "emerald", 
            sub: "Đơn vị đào tạo",
            trend: { value: "Mới: 1", type: "up" as const }
        },
        { 
            label: "Học phí Học kỳ", 
            value: stats?.operationalStats?.semesterRevenue?.toLocaleString("vi-VN") || "0", 
            icon: CircleDollarSign, 
            color: "orange", 
            sub: "Doanh thu tạm tính",
            trend: { value: "+15%", type: "up" as const }
        },
    ];

    if (loading && !stats) return (
        <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
            <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20">
            <DashboardHeader 
                roleName="Quản trị Hệ thống" 
                userName={`Quản trị viên ${user?.username || "Cấp cao"}`} 
                userId="Super Admin Context"
                onDateChange={setSelectedDate}
                onFacultyChange={setSelectedFacultyId}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <DashboardTabs activeTab={activeTab} onTabChange={setActiveTab} />
                
                {/* System Health Indicator */}
                <div className="flex items-center gap-4 bg-white px-6 py-2.5 rounded-2xl border border-slate-100 shadow-sm group hover:border-uneti-blue/20 transition-all cursor-help">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <div className="absolute inset-0 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest leading-none">System Operational</span>
                        <span className="text-[8px] font-bold text-slate-900 font-black mt-1 uppercase tracking-tighter">Latency: 24ms</span>
                    </div>
                </div>
            </div>

            <StatsGrid stats={adminStats} />

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="lg:col-span-2 space-y-8">
                        {/* Analytics Main */}
                        <div className="bg-white rounded-[40px] p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                             <div className="absolute -top-24 -left-24 w-64 h-64 bg-uneti-blue/5 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
                            
                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={16} className="text-uneti-blue" />
                                        Phân phối Học thuật Tổng thể
                                    </h3>
                                    <p className="text-[11px] font-bold text-slate-900 font-black uppercase tracking-tight italic">Dữ liệu hợp nhất toàn hệ thống</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-uneti-blue transition-all"><Filter size={16} /></button>
                                </div>
                            </div>
                            
                            <div className="relative z-10 space-y-10">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    {/* GPA Pie Chart */}
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <h4 className="text-[10px] font-black text-slate-900 font-extrabold uppercase tracking-widest">Biểu đồ GPA</h4>
                                            <span className="text-[9px] font-bold text-uneti-blue bg-uneti-blue-light px-2 py-0.5 rounded-lg">Scale 4.0</span>
                                        </div>
                                        <div className="min-h-[220px] flex items-center justify-center p-6 bg-slate-50/30 rounded-[32px] border border-slate-50 shadow-inner">
                                            <GpaPieChart distribution={stats?.gpaDistribution} />
                                        </div>
                                    </div>

                                    {/* Enrollment Trend Chart */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-slate-900 font-extrabold uppercase tracking-widest px-2">Xu hướng Ghi danh</h4>
                                        <div className="h-[220px] w-full bg-slate-50/20 rounded-[32px] p-6 border border-slate-50">
                                            <EnrollmentChart trends={stats?.enrollmentTrends} />
                                        </div>
                                    </div>
                                </div>

                                {/* Efficiency Cards - BOTTOM ROW to prevent overlap */}
                                <div className="px-2 grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
                                    <div className="p-6 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 group/card hover:bg-emerald-50 transition-all flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-70">Tỉ lệ Đậu</p>
                                            <p className="text-3xl font-black text-emerald-600 tracking-tight">92.4%</p>
                                        </div>
                                        <div className="w-16 h-1 w-full max-w-[100px] bg-emerald-100 rounded-full overflow-hidden self-end mb-2">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: "92.4%" }}></div>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-[2rem] bg-orange-50/50 border border-orange-100 group/card hover:bg-orange-50 transition-all flex items-center justify-between">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest opacity-70">Bỏ học (L0)</p>
                                            <p className="text-3xl font-black text-orange-600 tracking-tight">1.2%</p>
                                        </div>
                                        <div className="w-16 h-1 w-full max-w-[100px] bg-orange-100 rounded-full overflow-hidden self-end mb-2">
                                            <div className="h-full bg-orange-500 rounded-full" style={{ width: "1.2%" }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions Table */}
                        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/10 overflow-hidden group">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20 relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-uneti-blue/5 to-transparent pointer-events-none"></div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 relative z-10">
                                    <Clock size={16} className="text-uneti-blue" />
                                    Nhật ký Ghi danh & Đồng bộ
                                </h3>
                                <Link href="/admin/enrollments" className="text-[10px] font-black text-uneti-blue uppercase tracking-widest hover:underline relative z-10">Xem tất cả</Link>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <tbody className="divide-y divide-slate-50 text-[13px]">
                                        {stats?.recentEnrollments?.slice(0, 5).map((item: any, j: number) => (
                                            <tr key={j} className="hover:bg-slate-50/50 transition-all group/row">
                                                <td className="py-5 px-10">
                                                    <div className="flex items-center gap-5">
                                                        <div className="w-11 h-11 rounded-[1.2rem] bg-slate-50 text-uneti-blue flex items-center justify-center font-black text-sm border border-slate-100 group-hover/row:bg-uneti-blue group-hover/row:text-white transition-all cursor-default">{item.name?.charAt(0)}</div>
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-800 tracking-tight">{item.name}</span>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Student</span>
                                                                <span className="w-1 h-1 bg-slate-100 rounded-full"></span>
                                                                <span className="text-[9px] font-bold text-slate-900 italic">{item.time}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-5 px-10">
                                                    <div className="flex flex-col items-end">
                                                        <div className="inline-flex items-center px-4 py-1.5 bg-slate-50 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-tight group-hover/row:bg-uneti-blue-light group-hover/row:text-uneti-blue transition-colors">
                                                            {item.course}
                                                        </div>
                                                        <span className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-2">Verified</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <OperationalInsights stats={stats?.operationalStats} />
                        <FacultyChart data={stats?.operationalStats?.facultyDistribution || []} />
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ACADEMIC */}
            {activeTab === "academic" && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 px-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl group relative overflow-hidden">
                             <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl"></div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <GraduationCap size={20} className="text-emerald-500" />
                                Phổ điểm GPA Chi tiết
                            </h3>
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="flex-1 w-full flex justify-center">
                                    <GpaPieChart distribution={stats?.gpaDistribution} />
                                </div>
                                <div className="space-y-4 min-w-[180px]">
                                    {stats?.gpaDistribution?.map((d: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-white border border-transparent hover:border-slate-100 transition-all">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></div>
                                                <span className="text-[10px] font-black text-slate-900 font-extrabold uppercase tracking-tight">{d.name}</span>
                                            </div>
                                            <span className="text-sm font-black text-slate-800">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl group relative overflow-hidden">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <Building2 size={20} className="text-uneti-blue" />
                                Quy mô Sinh viên theo Đơn vị
                            </h3>
                            <FacultyChart data={stats?.operationalStats?.facultyDistribution || []} />
                        </div>
                    </div>

                    {/* Data Dense Table for Academic tab */}
                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck size={16} className="text-emerald-500" />
                                Thống kê Chuyên môn theo Khoa
                            </h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="py-5 px-10 text-left text-[10px] font-black text-slate-950 uppercase tracking-[0.2em]">Cơ cấu Khoa</th>
                                        <th className="py-5 px-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Số lượng SV</th>
                                        <th className="py-5 px-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">GPA Trung bình</th>
                                        <th className="py-5 px-10 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tiến độ</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stats?.operationalStats?.facultyDistribution?.map((f: any, i: number) => (
                                        <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                            <td className="py-6 px-10">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-uneti-blue-light text-uneti-blue flex items-center justify-center font-black">{f.name?.charAt(0)}</div>
                                                    <span className="font-black text-slate-800 text-[13px] uppercase tracking-tighter">{f.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-6 px-10 text-center text-sm font-black text-slate-700">{f.value.toLocaleString()}</td>
                                            <td className="py-6 px-10 text-center font-black text-emerald-600">3.{Math.floor(Math.random() * 5 + 2)}</td>
                                            <td className="py-6 px-10">
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="text-[10px] font-black text-slate-900">8{Math.floor(Math.random()*9)}%</span>
                                                    <div className="h-1.5 w-32 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-uneti-blue rounded-full" style={{ width: `${80+Math.random()*15}%` }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: OPERATIONS */}
            {activeTab === "operations" && (
                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
                        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-12 flex items-center gap-3 relative z-10">
                            <Activity size={20} className="text-uneti-blue" />
                            Tiến độ Core-Operations (Học kỳ hiện tại)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                            {[
                                { label: "Số lượng Nhập điểm", value: stats?.operationalStats?.gradeProgress || 0, color: "bg-uneti-blue", desc: "Giảng viên hoàn tất" },
                                { label: "Đăng ký tín chỉ", value: stats?.operationalStats?.registrationProgress || 0, color: "bg-emerald-500", desc: "Sinh viên hoàn tất" },
                                { label: "Số hóa Hồ sơ", value: stats?.operationalStats?.profileCompletion || 0, color: "bg-orange-400", desc: "Bộ phận Giáo vụ" },
                            ].map((bar, i) => (
                                <div key={i} className="space-y-5 p-6 rounded-[32px] bg-slate-50/50 border border-slate-50 group/bar hover:bg-white hover:shadow-lg transition-all">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">{bar.label}</span>
                                            <p className="text-[9px] font-bold text-slate-900 font-black italic">{bar.desc}</p>
                                        </div>
                                        <span className="text-2xl font-black text-slate-900 leading-none">{bar.value}%</span>
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1 shadow-inner border border-slate-50">
                                        <div className={cn("h-full rounded-full transition-all duration-1000 group-hover/bar:scale-x-105", bar.color)} style={{ width: `${bar.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-white rounded-[40px] p-10 border border-slate-100 shadow-xl shadow-slate-200/20">
                             <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center gap-3">
                                <CircleDollarSign size={20} className="text-orange-500" />
                                Phân tích Tài chính Tạm ứng
                            </h3>
                            <div className="flex flex-col md:flex-row gap-12 items-center">
                                <div className="flex-1 space-y-6 w-full">
                                    <div className="p-8 rounded-[32px] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50 mb-4">Dự kiến Doanh thu Kỳ này</p>
                                        <h4 className="text-4xl font-black tracking-tight">{stats?.operationalStats?.semesterRevenue?.toLocaleString("vi-VN")} <span className="text-lg opacity-30 tracking-normal">VND</span></h4>
                                        <div className="mt-8 flex items-center gap-3 text-emerald-400 text-[11px] font-black uppercase">
                                            <ArrowUpRight size={16} />
                                            <span>Tăng trưởng: +18.2% so với kỳ trước</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6 w-full md:w-[280px]">
                                    <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1">Đã quyết toán</p>
                                        <p className="text-xl font-black text-slate-950">{stats?.operationalStats?.settlementPercentage || 0}%</p>
                                        <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${stats?.operationalStats?.settlementPercentage || 0}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm transition-all hover:shadow-md">
                                        <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest mb-1">Chưa thu hồi</p>
                                        <p className="text-xl font-black text-slate-950">{stats?.operationalStats?.uncollectedPercentage || 0}%</p>
                                        <div className="mt-3 h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-400" style={{ width: `${stats?.operationalStats?.uncollectedPercentage || 0}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl flex flex-col items-center justify-center text-center group">
                            <div className="w-20 h-20 rounded-[2.5rem] bg-uneti-blue text-white flex items-center justify-center shadow-2xl shadow-uneti-blue/30 mb-8 group-hover:rotate-12 transition-transform duration-500">
                                <ShieldCheck size={40} />
                            </div>
                             <h4 className="text-base font-black text-slate-950 uppercase tracking-widest mb-2">Báo cáo Quyết toán</h4>
                             <p className="text-[11px] font-bold text-slate-900 px-6 leading-relaxed mb-8 uppercase tracking-tighter">Hệ thống đã tự động đối soát toàn bộ 14,283 giao dịch ghi danh trong học kỳ hiện tại.</p>
                            <button className="w-full py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-uneti-blue transition-all shadow-xl shadow-slate-900/10">Tải báo cáo PDF</button>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}
