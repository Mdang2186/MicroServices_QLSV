"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    Users,
    BookOpen,
    Building2,
    GraduationCap,
    Clock,
    Zap,
    LayoutDashboard,
    Search,
    Activity,
    CalendarDays,
    ArrowUpRight,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { OperationalInsights } from "@/components/dashboard/OperationalInsights";
import { FacultyChart } from "@/components/dashboard/FacultyChart";

async function readJsonSafely(response: Response) {
    const rawText = await response.text();
    if (!rawText) return null;
    try {
        return JSON.parse(rawText);
    } catch {
        return null;
    }
}

export default function StaffDashboard() {
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [keyword, setKeyword] = useState<string>("");
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
    const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
    const [selectedIntake, setSelectedIntake] = useState<string>("all");
    const [quickAction, setQuickAction] = useState<string | null>(null);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedDate) params.append("date", selectedDate);
        if (keyword) params.append("keyword", keyword);
        if (selectedFacultyId && selectedFacultyId !== "all") params.append("facultyId", selectedFacultyId);
        if (selectedMajorId && selectedMajorId !== "all") params.append("majorId", selectedMajorId);
        if (selectedIntake && selectedIntake !== "all") params.append("intake", selectedIntake);

        fetch(`/api/students/dashboard/stats?${params.toString()}`, {
            signal: controller.signal,
        })
            .then(async (response) => {
                const payload = await readJsonSafely(response);
                if (!response.ok || !payload) {
                    throw new Error(
                        (typeof payload === "object" && payload?.message) ||
                        "Không thể tải dữ liệu dashboard.",
                    );
                }
                setStats(payload);
            })
            .catch((error) => {
                if (error?.name === "AbortError") return;
                console.error(error);
                setStats(null);
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => controller.abort();
    }, [selectedDate, keyword, selectedFacultyId, selectedMajorId, selectedIntake]);

    if (loading && !stats) return (
        <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
            <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
        </div>
    );

    const staffStats = [
        { 
            label: "Tổng Sinh Viên", 
            value: stats?.totalStudents?.toLocaleString("vi-VN") || "0", 
            icon: Users, 
            color: "blue", 
            sub: "Theo bộ lọc",
            trend: { value: "+12%", type: "up" as const }
        },
        { 
            label: "Lớp Học Phần", 
            value: stats?.activeCourses || "0", 
            icon: BookOpen, 
            color: "indigo", 
            sub: "Học kỳ hiện tại",
            trend: { value: "Ổn định", type: "neutral" as const }
        },
        { 
            label: "Lớp Hành Chính", 
            value: stats?.systemStats?.totalAdminClasses || "0", 
            icon: Building2, 
            color: "emerald", 
            sub: "Quản lý sinh hoạt",
            trend: { value: "+5", type: "up" as const }
        },
        { 
            label: "Tổng Giảng Viên", 
            value: stats?.systemStats?.totalLecturers || "0", 
            icon: GraduationCap, 
            color: "orange", 
            sub: "Đội ngũ giảng dạy",
            trend: { value: "98%", type: "up" as const }
        },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20">
            <DashboardHeader 
                roleName="Phòng Đào Tạo" 
                userName={`Cán bộ ${user?.username || "Giáo vụ"}`} 
                userId={`Mã Cán bộ: ${user?.id?.substring(0, 8).toUpperCase() || "STAFF-01"}`}
                onDateChange={setSelectedDate}
                onKeywordChange={setKeyword}
                onFacultyChange={setSelectedFacultyId}
                onMajorChange={setSelectedMajorId}
                onIntakeChange={setSelectedIntake}
                onQuickAction={setQuickAction}
            />

            <StatsGrid stats={staffStats} />

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Tasks Grid (2/3) */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white rounded-[32px] p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden">
                        <div className="flex items-center justify-between mb-10">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <Zap size={16} className="text-uneti-blue" />
                                    Danh mục Nghiệp vụ
                                </h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Xử lý hồ sơ & Dữ liệu</p>
                            </div>
                            <button className="p-2 rounded-xl bg-slate-50 text-slate-400 hover:text-uneti-blue transition-colors">
                                <Search size={18} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 gap-6">
                            {[
                                { icon: Users, text: "Sinh viên", href: "/staff/students", color: "text-blue-500", bg: "bg-blue-50", desc: "Hồ sơ, Khen thưởng" },
                                { icon: CreditCard, text: "Học phí", href: "/staff/tuition", color: "text-emerald-500", bg: "bg-emerald-50", desc: "Quản lý nộp phí" },
                                { icon: Building2, text: "Khoa/Viện", href: "/staff/departments", color: "text-orange-500", bg: "bg-orange-50", desc: "Cơ cấu tổ chức" },
                                { icon: LayoutDashboard, text: "Học phần", href: "/staff/courses", color: "text-cyan-500", bg: "bg-cyan-50", desc: "Lớp học phần vận hành" },
                            ].map((item, i) => (
                                <Link key={i} href={item.href} className="p-6 rounded-[28px] border border-slate-50 bg-slate-50/30 hover:bg-white hover:border-uneti-blue/10 hover:shadow-xl transition-all group flex flex-col items-center text-center">
                                    <div className={`w-14 h-14 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform mb-4`}>
                                        <item.icon size={28} />
                                    </div>
                                    <span className="text-[13px] font-black text-slate-800 uppercase tracking-tight">{item.text}</span>
                                    <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{item.desc}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Operational Progress Bars */}
                    <div className="bg-white rounded-[40px] p-6 shadow-xl shadow-slate-200/20 border border-slate-100 relative group overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-uneti-blue/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <h2 className="text-[10px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2 mb-6">
                            <Activity size={14} className="text-uneti-blue" />
                            Tiến độ Vận hành Hệ thống
                        </h2>
                        <div className="space-y-6">
                            {[
                                { label: "Nhập điểm học kỳ", value: stats?.operationalStats?.gradeProgress || 0, color: "bg-uneti-blue" },
                                { label: "Đăng ký tín chỉ", value: stats?.operationalStats?.registrationProgress || 0, color: "bg-emerald-500" },
                                { label: "Hoàn thiện hồ sơ", value: stats?.operationalStats?.profileCompletion || 0, color: "bg-orange-400" },
                            ].map((bar, i) => (
                                <div key={i} className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase tracking-tight text-slate-500 px-1">
                                        <span>{bar.label}</span>
                                        <span className="text-slate-900">{bar.value}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5">
                                        <div className={cn("h-full rounded-full transition-all duration-1000 shadow-sm", bar.color)} style={{ width: `${bar.value}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* Right Column: Business Insights (1/3) */}
                <div className="space-y-8 h-full">
                    <OperationalInsights stats={stats?.operationalStats} />
                    
                    <div className="grid grid-cols-1 gap-8">
                        <FacultyChart 
                            title="Tỷ lệ Sinh viên theo Ngành" 
                            data={stats?.majorDistribution || []} 
                            iconType="compass"
                            totalLabel="Học kỳ đang chọn" 
                        />
                        <FacultyChart 
                            title="Tỷ lệ Sinh viên theo Khóa" 
                            data={stats?.intakeDistribution || []} 
                            iconType="graduation"
                            totalLabel="Phân bổ qua các Khóa" 
                        />
                         <FacultyChart 
                            title="Xếp loại GPA Sinh viên" 
                            data={stats?.gpaDistribution || []} 
                            iconType="graduation" 
                            totalLabel="Tất cả dữ liệu" 
                        />
                        <FacultyChart 
                            title="Tình trạng Học tập" 
                            data={stats?.statusDistribution || []} 
                            iconType="building" 
                            totalLabel="Theo bộ lọc" 
                        />
                    </div>
                </div>
            </div>

            {/* QUICK ACTION POPUPS */}
            {quickAction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuickAction(null)} />
                    <div className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl p-10 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center gap-4 mb-8">
                            <div className="w-16 h-16 bg-uneti-blue/10 text-uneti-blue rounded-[24px] flex items-center justify-center">
                                <Zap size={32} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                                    Thao tác: {quickAction === 'student' ? 'Thêm sinh viên' : 'Tạo lớp học'}
                                </h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Nghiệp vụ thực hiện nhanh tại Dashboard</p>
                            </div>
                        </div>
                        
                        <div className="space-y-4">
                            <p className="text-[12px] font-medium text-slate-500 text-center px-10">Bạn đang thực hiện thao tác nhanh. Để quản lý chi tiết hơn, vui lòng truy cập danh mục nghiệp vụ tương ứng.</p>
                            <div className="flex gap-4 mt-6">
                                <Link 
                                    href={quickAction === 'student' ? '/staff/students' : '/staff/courses'}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest text-center hover:bg-uneti-blue transition-all"
                                >
                                    Vào trang quản lý
                                </Link>
                                <button 
                                    onClick={() => setQuickAction(null)}
                                    className="flex-1 py-4 bg-slate-100 text-slate-400 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all font-montserrat"
                                >
                                    Hủy bỏ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
