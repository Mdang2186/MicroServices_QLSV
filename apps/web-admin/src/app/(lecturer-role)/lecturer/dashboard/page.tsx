"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    BookOpen,
    Calendar,
    BookMarked,
    Clock,
    Users,
    CalendarDays,
    ArrowRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import {
    fetchCurrentLecturerTeachingCourses,
    getCourseDayLabels,
    getLecturerFallbackRefs,
    getLecturerCourseScopeLabel,
    getTodaySessions,
    type SemesterOption,
} from "@/lib/lecturer-courses";

export default function LecturerDashboard() {
    const [user, setUser] = useState<any>(null);
    const [userLoaded, setUserLoaded] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [currentSemester, setCurrentSemester] = useState<SemesterOption | null>(null);
    const [loading, setLoading] = useState(true);

    const token = Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken");
    const lecturerFallbackRefs = useMemo(() => getLecturerFallbackRefs(user), [user]);

    useEffect(() => {
        const raw = Cookies.get("lecturer_user") || Cookies.get("admin_user");
        if (raw) {
            try {
                setUser(JSON.parse(raw));
            } catch {
                setUser(null);
            }
        }
        setUserLoaded(true);
    }, []);

    useEffect(() => {
        if (!userLoaded) return;

        if (!token) {
            setCourses([]);
            setCurrentSemester(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchCurrentLecturerTeachingCourses(token, lecturerFallbackRefs)
            .then(({ courses: lecturerCourses, semester }) => {
                setCourses(lecturerCourses);
                setCurrentSemester(semester);
            })
            .catch(() => {
                setCourses([]);
                setCurrentSemester(null);
            })
            .finally(() => setLoading(false));
    }, [lecturerFallbackRefs, token, userLoaded]);

    const todaySessions = useMemo(() => getTodaySessions(courses), [courses]);
    const courseScopeLabel = getLecturerCourseScopeLabel(courses, currentSemester);

    const totalCredits = courses.reduce((acc, course) => acc + (course.subject?.credits || 0), 0);
    const totalStudents = courses.reduce((acc, course) => acc + (course.currentSlots || 0), 0);

    const lecturerStats: any[] = [
        {
            label: "Lớp học phần",
            value: courses.length,
            icon: BookOpen,
            color: "blue",
            sub: courseScopeLabel,
            trend: { value: "Active", type: "up" }
        },
        {
            label: "Tổng tín chỉ",
            value: totalCredits,
            icon: BookMarked,
            color: "indigo",
            sub: "Khối lượng hiện tại",
            trend: { value: "Duy trì", type: "neutral" }
        },
        {
            label: "Tổng sinh viên",
            value: totalStudents,
            icon: Users,
            color: "emerald",
            sub: "Danh sách hiện tại",
            trend: { value: `${courses.length || 0} lớp`, type: "up" }
        },
        {
            label: "Ca dạy hôm nay",
            value: todaySessions.length,
            icon: Clock,
            color: "orange",
            sub: "Lịch theo ngày hiện tại",
            trend: { value: todaySessions.length > 0 ? "Bận" : "Trống", type: todaySessions.length > 0 ? "up" : "neutral" }
        },
    ];

    if (loading && courses.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20 p-4 md:p-6 w-full max-w-full">
            <CompactLecturerHeader
                userName={`${user?.degree || "Giảng viên"} ${user?.fullName || "Cao cấp"}`}
                userId={`GV-${user?.username || "UNETI"}`}
                onSemesterChange={() => {}}
                hideSemester={true}
            />

            <StatsGrid stats={lecturerStats} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col min-h-[520px]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue">
                                    <BookOpen size={18} />
                                </div>
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                                    Lớp học đang dạy ({courses.length})
                                </h2>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link href="/lecturer/courses" className="text-[10px] font-black text-uneti-blue hover:underline uppercase tracking-widest flex items-center gap-1.5 bg-uneti-blue-light/30 px-3 py-1.5 rounded-lg border border-uneti-blue/10">
                                    Quản lý <ArrowRight size={12} />
                                </Link>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3" style={{ maxHeight: "420px" }}>
                            {courses.length === 0 ? (
                                <div className="py-20 text-center border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/20">
                                     <CalendarDays size={32} className="mx-auto text-slate-200 mb-3" />
                                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Không có dữ liệu giảng dạy</p>
                                </div>
                            ) : (
                                courses.map((course: any, index: number) => {
                                    const progress = Math.min(100, Math.round(((course.currentSlots || 0) / (course.maxSlots || 1)) * 100));
                                    return (
                                        <Link key={index} href={`/lecturer/courses/${course.id}`} className="flex flex-col md:flex-row items-center gap-4 p-4 rounded-xl border border-slate-50 hover:border-uneti-blue hover:bg-slate-50/50 transition-all group">
                                            <div className="flex-1 min-w-0 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-uneti-blue uppercase bg-white px-2 py-0.5 rounded-md border border-uneti-blue/10">{course.code}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TC: {course.subject?.credits}</span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-[13px] truncate uppercase group-hover:text-uneti-blue transition-colors">{course.subject?.name}</h3>
                                                <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                                    <Calendar size={10} className="text-slate-300" />
                                                    <span className="text-slate-600">{getCourseDayLabels(course).join(", ") || "Chưa xếp lịch"}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 w-full md:w-auto">
                                                <div className="flex flex-col gap-1 w-20">
                                                    <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                        <span>SV: {course.currentSlots}</span>
                                                    </div>
                                                    <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-uneti-blue rounded-full" style={{ width: `${progress}%` }}></div>
                                                    </div>
                                                </div>

                                                <div className="p-2 rounded-lg bg-slate-50 text-slate-300 group-hover:bg-uneti-blue-light group-hover:text-uneti-blue transition-all">
                                                    <ArrowRight size={14} />
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>

                        <div className="mt-4 pt-4 border-t border-slate-50 flex justify-center">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] italic">Cuộn để xem thêm các lớp khác</p>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative overflow-hidden h-full flex flex-col group min-h-[520px]">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                            <div className="space-y-1">
                                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                    <CalendarDays size={18} className="text-uneti-blue" />
                                    Lịch hôm nay
                                </h2>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Ngày {new Date().toLocaleDateString("vi-VN")}</p>
                            </div>
                            <div className={cn("h-2 w-2 rounded-full", todaySessions.length > 0 ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-200")}></div>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4" style={{ maxHeight: "380px" }}>
                            {todaySessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-slate-200 py-20 gap-3 border-2 border-dashed border-slate-50 rounded-2xl bg-slate-50/20">
                                    <Clock size={32} strokeWidth={1} className="opacity-20" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-relaxed px-4">Hôm nay bạn không có <br /> lịch dạy chuyên môn</p>
                                </div>
                            ) : (
                                todaySessions.map((session: any, index: number) => {
                                    const course = session.course;
                                    return (
                                        <Link
                                            key={index}
                                            href={`/lecturer/courses/${course.id}`}
                                            className="group/item block relative pl-6 border-l-2 border-slate-100 hover:border-uneti-blue transition-colors pb-6 last:pb-0"
                                        >
                                            <div className="absolute top-0 -left-[5px] w-2 h-2 rounded-full bg-slate-200 group-hover/item:bg-uneti-blue transition-all"></div>
                                            <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] font-black text-uneti-blue uppercase bg-uneti-blue-light px-2 py-0.5 rounded-lg border border-uneti-blue/10">Ca {session.startShift || "?"}-{session.endShift || "?"}</span>
                                                    <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                                                        {session.room?.name || "---"}
                                                    </div>
                                                </div>
                                                <h4 className="text-[12px] font-black text-slate-800 leading-tight uppercase tracking-tight group-hover/item:text-uneti-blue transition-colors">{course.subject?.name}</h4>
                                                <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                                    <div className="flex items-center gap-1">
                                                        <Users size={10} className="text-slate-300" />
                                                        <span>{course.currentSlots} SV</span>
                                                    </div>
                                                    <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                    <span>{course.code}</span>
                                                </div>
                                            </div>
                                        </Link>
                                    );
                                })
                            )}
                        </div>

                        <Link href="/lecturer/schedule" className="mt-8 flex items-center justify-center h-12 w-full gap-2 text-[10px] font-black text-slate-500 hover:text-uneti-blue transition-all bg-slate-50 hover:bg-uneti-blue-light/50 border border-slate-100 rounded-xl uppercase tracking-widest group/btn">
                             Thời khóa biểu chi tiết <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
