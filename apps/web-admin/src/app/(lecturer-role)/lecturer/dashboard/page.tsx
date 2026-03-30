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
    Activity,
    CalendarDays,
    Star,
    ArrowUpRight,
    Zap,
    MapPin
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";

export default function LecturerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        if (!user?.profileId) return;
        setLoading(true);
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};
        
        const query = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : "";
        fetch(`/api/courses/lecturer/${user.profileId}${query}`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCourses(Array.isArray(data) ? data : data?.data || []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [user, TOKEN, selectedSemesterId]);

    const todayIndex = new Date().getDay();
    const todayNum = todayIndex === 0 ? 8 : todayIndex + 1;

    const todayCourses = courses.filter((c: any) =>
        c.schedules?.some((s: any) => s.dayOfWeek === todayNum)
    );

    let nextTeachingDay = todayNum;
    let nextCourses: any[] = [];
    if (todayCourses.length === 0) {
        for (let i = 1; i <= 7; i++) {
            const checkDay = ((todayNum + i - 2) % 7) + 2;
            const found = courses.filter((c: any) =>
                c.schedules?.some((s: any) => s.dayOfWeek === checkDay)
            );
            if (found.length > 0) {
                nextTeachingDay = checkDay;
                nextCourses = found;
                break;
            }
        }
    }

    const nextDayName = ["", "", "thứ Hai", "thứ Ba", "thứ Tư", "thứ Năm", "thứ Sáu", "thứ Bảy", "Chủ nhật"][nextTeachingDay];
    const totalCredits = courses.reduce((acc, c) => acc + (c.subject?.credits || 0), 0);
    const totalStudents = courses.reduce((acc, c) => acc + (c.currentSlots || 0), 0);

    const lecturerStats = [
        { 
            label: "Lớp học phần", 
            value: courses.length, 
            icon: BookOpen, 
            color: "blue", 
            sub: "Học kỳ hiện tại",
            trend: { value: "Tăng: 1", type: "up" as const }
        },
        { 
            label: "Tổng tín chỉ", 
            value: totalCredits, 
            icon: BookMarked, 
            color: "indigo", 
            sub: "Khối lượng dạy",
            trend: { value: "Duy trì", type: "neutral" as const }
        },
        { 
            label: "Tổng sinh viên", 
            value: totalStudents, 
            icon: Users, 
            color: "emerald", 
            sub: "Phụ trách đánh giá",
            trend: { value: "+15%", type: "up" as const }
        },
        { 
            label: "Lịch dạy hôm nay", 
            value: todayCourses.length, 
            icon: Clock, 
            color: "orange", 
            sub: "Ca học thực tế",
            trend: { value: todayCourses.length > 0 ? "Active" : "None", type: todayCourses.length > 0 ? "up" : "neutral" as const }
        },
    ];

    if (loading && courses.length === 0) return (
        <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
            <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20">
            <DashboardHeader 
                roleName="Giảng viên" 
                userName={`${user?.degree || "Giảng viên"} ${user?.fullName || "Cao cấp"}`} 
                userId={`Mã định danh: GV-${user?.username || "UNETI"}`}
                onSemesterChange={setSelectedSemesterId}
            />

            {/* Quick Actions & Status Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
                <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 px-4 border-r border-slate-100">
                        <div className="w-8 h-8 rounded-lg bg-uneti-blue-light flex items-center justify-center text-uneti-blue">
                            <Activity size={16} />
                        </div>
                        <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Trung tâm Giảng dạy</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Link href="/lecturer/courses" className="px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-uneti-blue hover:text-white transition-all flex items-center gap-2">
                            Quản lý lớp
                        </Link>
                        <Link href="/lecturer/schedule" className="px-4 py-2 rounded-xl bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-uneti-blue hover:text-white transition-all flex items-center gap-2">
                            Thời khóa biểu
                        </Link>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white px-5 py-2.5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
                     <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest relative z-10">Đang đồng bộ điểm học kỳ</span>
                </div>
            </div>

            <StatsGrid stats={lecturerStats} />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Courses List - Left Col (3/4) */}
                <div className="lg:col-span-3 space-y-8">
                    <div className="bg-white rounded-[40px] p-8 sm:p-10 border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
                         <div className="absolute -top-32 -left-32 w-64 h-64 bg-uneti-blue/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                    <BookOpen size={16} className="text-uneti-blue" />
                                    Các lớp đang phụ trách
                                </h2>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tight">Học kỳ: {courses[0]?.semester?.name || "Hiện tại"}</p>
                            </div>
                            <Link href="/lecturer/courses" className="px-5 py-2 text-[10px] font-black text-uneti-blue hover:text-white hover:bg-uneti-blue border border-uneti-blue/20 rounded-2xl transition-all uppercase tracking-widest flex items-center gap-2">
                                Xem tất cả <ArrowUpRight size={14} />
                            </Link>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                            {courses.length === 0 ? (
                                <div className="col-span-full py-24 text-center border-2 border-dashed border-slate-50 rounded-[32px]">
                                     <Activity size={40} className="mx-auto text-slate-100 mb-4 animate-pulse" />
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu giảng dạy</p>
                                </div>
                            ) : (
                                courses.slice(0, 4).map((c: any, k: number) => {
                                    const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                                    return (
                                        <div key={k} className="p-8 rounded-[32px] border border-slate-50 bg-slate-50/30 hover:bg-white hover:shadow-2xl transition-all group overflow-hidden relative">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-uneti-blue/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                                            
                                            <div className="flex justify-between items-start mb-8 relative z-10">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-uneti-blue uppercase bg-uneti-blue-light px-2.5 py-1 rounded-lg border border-uneti-blue/10">{c.code}</span>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase">TC: {c.subject?.credits}</span>
                                                    </div>
                                                    <h3 className="font-black text-slate-800 text-[15px] mt-4 line-clamp-2 min-h-[44px] leading-tight uppercase tracking-tight group-hover:text-uneti-blue transition-colors">{c.subject?.name}</h3>
                                                </div>
                                                <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-50 group-hover:shadow-md transition-all group-hover:rotate-12">
                                                    <Star size={16} className="text-uneti-blue fill-uneti-blue-light" />
                                                </div>
                                            </div>

                                            <div className="space-y-5 relative z-10">
                                                <div className="flex justify-between items-end px-1">
                                                    <div className="space-y-1">
                                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đăng ký</p>
                                                        <p className="text-lg font-black text-slate-900 tracking-tight">{c.currentSlots} <span className="text-[10px] text-slate-300 font-bold uppercase">/ {c.maxSlots} SV</span></p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Hoàn thiện</p>
                                                        <p className="text-lg font-black text-emerald-600">{progress}%</p>
                                                    </div>
                                                </div>
                                                <div className="h-2.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                                    <div className="h-full bg-gradient-to-r from-uneti-blue to-uneti-blue/80 rounded-full transition-all duration-1000 group-hover:shadow-[0_0_8px_rgba(0,102,179,0.3)]" style={{ width: `${progress}%` }}></div>
                                                </div>
                                                <div className="pt-4 flex justify-between items-center border-t border-slate-50/50">
                                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase italic">
                                                        <Clock size={12} className="text-slate-300" />
                                                        {c.schedules?.map((s:any)=>`T${s.dayOfWeek}`).join(", ")}
                                                    </div>
                                                    <Link href={`/lecturer/courses/${c.id}`} className="text-[10px] font-black text-uneti-blue hover:underline uppercase items-center flex gap-1 tracking-widest">
                                                        Chi tiết <ChevronRight size={12} />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Schedule Card - Right Col (1/4) */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 relative overflow-hidden h-full group">
                         <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        
                        <div className="flex items-center justify-between mb-10 relative z-10">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <Activity size={18} className="text-uneti-blue animate-pulse" />
                                {todayCourses.length > 0 ? "Lịch hôm nay" : `Sắp tới (${nextDayName})`}
                            </h2>
                            <div className={cn("h-2.5 w-2.5 rounded-full shadow-sm transition-all", todayCourses.length > 0 ? "bg-emerald-500 animate-ping" : "bg-amber-500")}></div>
                        </div>

                        <div className="space-y-8 px-1 relative z-10">
                            {(todayCourses.length > 0 ? todayCourses : nextCourses).length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-200 py-20 gap-4 border-2 border-dashed border-slate-50 rounded-[2.5rem] bg-slate-50/20">
                                    <CalendarDays size={40} strokeWidth={1} className="opacity-20 translate-y-2 group-hover:translate-y-0 transition-transform duration-500" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed">Thời lưu giảng dạy <br/> chưa được cập nhật</p>
                                </div>
                            ) : (
                                (todayCourses.length > 0 ? todayCourses : nextCourses).map((c: any, m: number) => {
                                    const sch = (todayCourses.length > 0 ? c.schedules?.find((s: any) => s.dayOfWeek === todayNum) : c.schedules?.find((s: any) => s.dayOfWeek === nextTeachingDay));
                                    return (
                                        <div key={m} className="group/item relative pl-8 border-l-2 border-slate-100 hover:border-uneti-blue transition-colors pb-8 last:pb-0">
                                            <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-slate-200 group-hover/item:bg-uneti-blue group-hover/item:shadow-[0_0_8px_rgba(0,102,179,0.5)] transition-all"></div>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-black text-uneti-blue uppercase bg-uneti-blue-light px-2.5 py-1 rounded-xl border border-uneti-blue/10 shadow-sm">Ca {sch?.startShift}-{sch?.endShift || "?"}</span>
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                                        <MapPin size={10} className="text-slate-300" />
                                                        {sch?.room?.name || "TBA"}
                                                    </div>
                                                </div>
                                                <h4 className="text-[14px] font-black text-slate-800 leading-tight group-hover/item:text-uneti-blue transition-colors uppercase tracking-tight">{c.subject?.name}</h4>
                                                <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                                    <div className="flex items-center gap-1.5">
                                                        <Users size={12} className="text-slate-200" />
                                                        <span>{c.currentSlots} SV</span>
                                                    </div>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                    <span>{c.code}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <Link href="/lecturer/schedule" className="mt-14 flex items-center justify-center h-14 w-full gap-3 text-[11px] font-black text-slate-600 hover:text-white transition-all bg-slate-50 hover:bg-slate-900 border border-slate-100 hover:border-slate-900 rounded-[2rem] uppercase tracking-widest shadow-inner group/btn">
                             Xem Thời khóa biểu <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
