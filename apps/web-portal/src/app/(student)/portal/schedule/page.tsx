"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Clock,
    Printer,
    Maximize2,
    CalendarCheck,
    Search,
    Users,
    Info,
    Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSIONS = [
    { label: "Sáng", time: "07:00 - 12:15", value: "morning", color: "bg-blue-50/10 text-slate-500 border-slate-100" },
    { label: "Chiều", time: "13:00 - 18:15", value: "afternoon", color: "bg-blue-50/10 text-slate-500 border-slate-100" },
    { label: "Tối", time: "18:30 - 21:00", value: "evening", color: "bg-blue-50/10 text-slate-500 border-slate-100" },
];

const DAYS = [
    { name: "Thứ Hai", short: "T2", value: 2 },
    { name: "Thứ Ba", short: "T3", value: 3 },
    { name: "Thứ Tư", short: "T4", value: 4 },
    { name: "Thứ Năm", short: "T5", value: 5 },
    { name: "Thứ Sáu", short: "T6", value: 6 },
    { name: "Thứ Bảy", short: "T7", value: 7 },
    { name: "Chủ Nhật", short: "CN", value: 8 },
];

const LEGEND = [
    { label: "Lý thuyết", color: "bg-white border-slate-200", textColor: "text-slate-500" },
    { label: "Thực hành", color: "bg-green-50/80 border-green-100", textColor: "text-green-700" },
    { label: "Lịch thi", color: "bg-yellow-50/80 border-yellow-200", textColor: "text-yellow-700" },
];

export default function SchedulePage() {
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const userId = user.id;

                const data = await StudentService.getProfile(userId);

                if (data.enrollments) {
                    setEnrollments(data.enrollments);
                } else {
                    const enrollmentsData = await StudentService.getEnrollments(data.id);
                    setEnrollments(enrollmentsData || []);
                }
            } catch (error) {
                console.error("Failed to fetch schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const startOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    };

    const addDays = (date: Date, days: number) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    };

    const weekDays = useMemo(() => {
        const start = startOfWeek(selectedDate);
        return Array.from({ length: 7 }, (_, i) => addDays(start, i));
    }, [selectedDate]);

    const getSchedulesForDayAndSession = (dayValue: number, sessionValue: string) => {
        const dateAtIdx = weekDays.find(d => d.getDay() === (dayValue === 8 ? 0 : dayValue));
        if (!dateAtIdx) return [];

        return enrollments.flatMap(enr => {
            const schedules = enr.courseClass?.schedules || [];
            return schedules
                .filter((s: any) => {
                    if (s.dayOfWeek !== dayValue) return false;

                    const start = Number(s.startShift);
                    let sessionMatch = false;
                    if (sessionValue === "morning") sessionMatch = start <= 6;
                    else if (sessionValue === "afternoon") sessionMatch = start > 6 && start <= 12;
                    else if (sessionValue === "evening") sessionMatch = start > 12;

                    if (!sessionMatch) return false;

                    // Filter based on UI filter state
                    if (filter === "study" && s.type === "EXAM") return false;
                    if (filter === "exam" && s.type !== "EXAM") return false;

                    if (enr.courseClass?.semester) {
                        const start = new Date(enr.courseClass.semester.startDate);
                        const end = new Date(enr.courseClass.semester.endDate);
                        return dateAtIdx >= start && dateAtIdx <= end;
                    }
                    return true;
                })
                .map((s: any) => ({
                    ...s,
                    id: `${enr.id}-${s.id}`,
                    subjectName: enr.courseClass?.subject?.name,
                    classCode: enr.courseClass?.code,
                    classId: enr.courseClass?.id,
                    roomName: s.room?.name || s.roomId || 'Chưa cập nhật',
                    lecturerName: enr.courseClass?.lecturer?.fullName,
                    type: s.type || 'THEORY'
                }));
        }).sort((a, b) => Number(a.startShift) - Number(b.startShift));
    };

    const navigateDate = (direction: 'next' | 'prev') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(d);
    };

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Elegant Header Area */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full w-fit mb-2">Academic Calendar</p>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Lịch học, lịch thi theo tuần</h1>
                </div>

                <div className="flex items-center gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                    <button
                        onClick={() => navigateDate('prev')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 py-1.5 text-xs font-black text-slate-700 tracking-tight flex flex-col items-center">
                        <span>Tuần từ {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                        <span className="text-[9px] text-slate-400 uppercase">Đến {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                    </div>
                    <button
                        onClick={() => navigateDate('next')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-white hover:shadow-sm text-slate-400 hover:text-blue-600 transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Toolbar & Filters */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <div className="h-10 px-4 rounded-xl bg-slate-50 flex items-center gap-3 border border-slate-100">
                        <Filter size={14} className="text-slate-400" />
                        <div className="flex items-center gap-6 text-[11px] font-bold text-slate-600">
                            {[
                                { id: "all", label: "Tất cả" },
                                { id: "study", label: "Lịch học" },
                                { id: "exam", label: "Lịch thi" }
                            ].map((f) => (
                                <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="radio"
                                            name="filter"
                                            checked={filter === f.id}
                                            onChange={() => setFilter(f.id)}
                                            className="peer h-4 w-4 appearance-none rounded-full border border-slate-300 checked:border-blue-600 transition-all cursor-pointer"
                                        />
                                        <div className="absolute h-2 w-2 rounded-full bg-blue-600 opacity-0 peer-checked:opacity-100 transition-opacity" />
                                    </div>
                                    <span className={cn("transition-colors group-hover:text-blue-600", filter === f.id && "text-blue-600 font-black")}>
                                        {f.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                    >
                        <CalendarCheck className="mr-2 h-4 w-4" /> Hôm nay
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100"
                    >
                        <Printer className="mr-2 h-4 w-4" /> Xuất PDF
                    </Button>
                </div>
            </div>

            {/* Schedule Grid */}
            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden relative">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32"></div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="w-20 p-3 text-[11px] font-black text-blue-600 uppercase border border-slate-200">Ca học</th>
                                {DAYS.map((day, idx) => {
                                    const isToday = new Date().toDateString() === weekDays[idx].toDateString();
                                    return (
                                        <th
                                            key={day.value}
                                            className={cn(
                                                "p-3 border border-slate-200 text-center transition-colors min-w-[140px]",
                                                isToday && "bg-blue-50/50"
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <p className={cn("text-[11px] font-black uppercase text-blue-600")}>{day.name}</p>
                                                <p className={cn("text-[11px] font-bold text-blue-500 tabular-nums")}>
                                                    {weekDays[idx].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SESSIONS.map((session) => (
                                <tr key={session.value} className="group/row">
                                    <td className="p-0 border border-slate-200 bg-slate-50/30">
                                        <div className="flex items-center justify-center p-4 min-h-[140px]">
                                            <span className="text-xs font-black text-slate-700 uppercase [writing-mode:vertical-lr] rotate-180">{session.label}</span>
                                        </div>
                                    </td>
                                    {DAYS.map((day, idx) => {
                                        const schedules = getSchedulesForDayAndSession(day.value, session.value);
                                        const isToday = new Date().toDateString() === weekDays[idx].toDateString();
                                        return (
                                            <td
                                                key={`${day.value}-${session.value}`}
                                                className={cn(
                                                    "p-1.5 border border-slate-200 align-top transition-colors min-h-[120px]",
                                                    isToday && "bg-blue-50/5"
                                                )}
                                            >
                                                <div className="space-y-1.5">
                                                    {schedules.map((s, i) => (
                                                        <motion.div
                                                            key={i}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            className={cn(
                                                                "p-2.5 rounded-sm border text-left transition-all shadow-sm",
                                                                s.type === 'EXAM' 
                                                                    ? "bg-yellow-50/90 border-yellow-200" 
                                                                    : (s.type === 'PRACTICE' || s.roomName?.toLowerCase().includes('lab'))
                                                                    ? "bg-green-50/90 border-green-200"
                                                                    : "bg-white border-slate-200"
                                                            )}
                                                        >
                                                            <div className="space-y-1">
                                                                <h4 className="text-[10px] font-black text-blue-700 leading-tight">
                                                                    {s.subjectName}
                                                                </h4>
                                                                <p className="text-[9px] font-bold text-slate-600">{s.classCode}</p>
                                                                <div className="space-y-0.5 mt-1 border-t border-black/5 pt-1">
                                                                    <p className="text-[9px] font-bold text-slate-700">Tiết: {s.startShift} - {s.endShift}</p>
                                                                    <p className="text-[9px] font-bold text-slate-700">Phòng: {s.roomName || 'Chưa cập nhật'}</p>
                                                                    <p className="text-[9px] font-bold text-slate-700 truncate">GV: {s.lecturerName || 'Hệ thống'}</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Simplified Legend */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-white border border-slate-300" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch học lý thuyết</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-green-50 border border-green-200" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch học thực hành</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-yellow-50 border border-yellow-200" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch thi</span>
                        </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                        <Info size={12} className="text-blue-400" />
                        Lịch học được cập nhật trực tiếp từ hệ thống UNETI
                    </p>
                </div>
            </div>

        </div>
    );
}
