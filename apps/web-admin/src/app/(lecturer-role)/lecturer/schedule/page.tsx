"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    ChevronLeft,
    ChevronRight,
    MapPin,
    Clock,
    Printer,
    CalendarCheck,
    Info,
    CalendarDays,
    ArrowUpRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    fetchLecturerWeekSessions,
    getLecturerFallbackRefs,
} from "@/lib/lecturer-courses";

const SESSIONS = [
    { label: "Sáng", time: "07:00 - 12:15", value: "morning" },
    { label: "Chiều", time: "13:00 - 18:15", value: "afternoon" },
    { label: "Tối", time: "18:30 - 21:00", value: "evening" },
];

const DAYS = [
    { name: "Thứ Hai", short: "T2", value: 2 },
    { name: "Thứ Ba", short: "T3", value: 3 },
    { name: "Thứ Tư", short: "T4", value: 4 },
    { name: "Thứ Năm", short: "T5", value: 5 },
    { name: "Thứ Sáu", short: "T6", value: 6 },
    { name: "Thứ Bảy", short: "T7", value: 7 },
    { name: "Chủ nhật", short: "CN", value: 8 },
];

const toDateInputValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const getWeekStart = (value: Date) => {
    const date = new Date(value);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    date.setHours(0, 0, 0, 0);
    return date;
};

const addDays = (value: Date, days: number) => {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
};

const getShiftBucket = (startShift: number) => {
    if (startShift <= 6) return "morning";
    if (startShift <= 12) return "afternoon";
    return "evening";
};

export default function LecturerSchedulePage() {
    const [user, setUser] = useState<any>(null);
    const [userLoaded, setUserLoaded] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [schedule, setSchedule] = useState<any[]>([]);
    const [filter, setFilter] = useState<"all" | "study" | "exam">("all");

    const token = Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken");
    const lecturerFallbackRefs = useMemo(() => getLecturerFallbackRefs(user), [user]);
    const weekStart = useMemo(() => getWeekStart(selectedDate), [selectedDate]);
    const weekDays = useMemo(
        () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
        [weekStart],
    );

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

        if (!lecturerFallbackRefs.length || !token) {
            setSchedule([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchLecturerWeekSessions(token, lecturerFallbackRefs, selectedDate)
            .then((data) => setSchedule(Array.isArray(data) ? data : []))
            .catch(() => setSchedule([]))
            .finally(() => setLoading(false));
    }, [lecturerFallbackRefs, selectedDate, token, userLoaded]);

    const getSchedulesForDayAndSession = (dayValue: number, sessionValue: string) => {
        const targetJsDay = dayValue === 8 ? 0 : dayValue - 1;
        const targetDate = weekDays.find((date) => date.getDay() === targetJsDay);
        if (!targetDate) return [];

        const targetKey = toDateInputValue(targetDate);

        return schedule
            .filter((session) => {
                const sessionKey = `${session.date || ""}`.slice(0, 10);
                if (sessionKey !== targetKey) return false;

                const bucket = getShiftBucket(Number(session.startShift));
                if (bucket !== sessionValue) return false;

                if (filter === "study" && session.type === "EXAM") return false;
                if (filter === "exam" && session.type !== "EXAM") return false;
                return true;
            })
            .sort((left, right) => Number(left.startShift) - Number(right.startShift));
    };

    const navigateWeek = (direction: "next" | "prev") => {
        const nextDate = new Date(selectedDate);
        nextDate.setDate(nextDate.getDate() + (direction === "next" ? 7 : -7));
        setSelectedDate(nextDate);
    };

    return (
        <div className="min-h-screen space-y-4 pb-20 w-full max-w-full p-4 md:p-6 animate-in fade-in duration-700 bg-[#fbfcfd]">

            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 px-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                        <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue">
                            <CalendarDays size={18} />
                        </div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {weekDays[0].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </h2>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {[
                            { id: "all", label: "Tất cả" },
                            { id: "study", label: "Giảng dạy" },
                            { id: "exam", label: "Lịch thi" }
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setFilter(item.id as "all" | "study" | "exam")}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all",
                                    filter === item.id ? "bg-slate-100 text-uneti-blue" : "hover:text-uneti-blue"
                                )}
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                        <button
                            onClick={() => navigateWeek("prev")}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-uneti-blue transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <input
                            type="date"
                            value={toDateInputValue(selectedDate)}
                            onChange={(event) => setSelectedDate(new Date(event.target.value))}
                            className="h-8 rounded-lg border border-transparent bg-transparent px-2 text-[10px] font-black uppercase tracking-widest text-slate-600 outline-none"
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDate(new Date())}
                            className="h-8 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            <CalendarCheck className="mr-1.5 h-3.5 w-3.5 text-uneti-blue" /> Hôm nay
                        </Button>
                        <button
                            onClick={() => navigateWeek("next")}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-uneti-blue transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.print()}
                        className="h-10 w-10 p-0 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-sm"
                    >
                        <Printer size={16} />
                    </Button>
                </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] font-black text-slate-600">
                Hiển thị toàn bộ lịch của tuần chứa ngày đã chọn, không lọc theo học kỳ.
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative min-h-[600px]">
                {loading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-50 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-uneti-blue uppercase tracking-widest">Đang cập nhật...</span>
                        </div>
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1160px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="w-20 p-4 text-[10px] font-black text-uneti-blue/60 uppercase border-b border-r border-slate-100 tracking-widest bg-slate-50/80 sticky left-0 z-20 backdrop-blur-md">Ca</th>
                                {DAYS.map((day, index) => {
                                    const isToday = new Date().toDateString() === weekDays[index].toDateString();
                                    return (
                                        <th
                                            key={day.value}
                                            className={cn(
                                                "p-4 border-b border-r border-slate-100 text-center transition-colors min-w-[140px]",
                                                isToday && "bg-uneti-blue/5"
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <p className={cn("text-[10px] font-black uppercase tracking-widest leading-none", isToday ? "text-uneti-blue" : "text-slate-400")}>{day.name}</p>
                                                <p className={cn("text-[13px] font-black tabular-nums", isToday ? "text-uneti-blue" : "text-slate-700")}>
                                                    {weekDays[index].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
                                                </p>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SESSIONS.map((session) => (
                                <tr key={session.value}>
                                    <td className="p-0 border-b border-r border-slate-100 bg-slate-50/30 sticky left-0 z-10 backdrop-blur-md">
                                        <div className="flex flex-col items-center justify-center p-4 min-h-[160px] gap-2">
                                            <span className="text-[10px] font-black text-slate-800 uppercase [writing-mode:vertical-lr] rotate-180 tracking-[0.3em]">{session.label}</span>
                                            <Clock size={12} className="text-slate-300" />
                                        </div>
                                    </td>
                                    {DAYS.map((day, index) => {
                                        const daySchedules = getSchedulesForDayAndSession(day.value, session.value);
                                        const isToday = new Date().toDateString() === weekDays[index].toDateString();
                                        return (
                                            <td
                                                key={`${day.value}-${session.value}`}
                                                className={cn(
                                                    "p-2 border-b border-r border-slate-100 align-top transition-colors",
                                                    isToday && "bg-uneti-blue/5"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    {daySchedules.map((item, itemIndex) => (
                                                        <Link
                                                            key={itemIndex}
                                                            href={`/lecturer/courses/${item.courseClassId}`}
                                                            className={cn(
                                                                "block p-3.5 rounded-2xl border text-left transition-all group relative overflow-hidden",
                                                                item.type === "EXAM"
                                                                    ? "bg-orange-50 border-orange-100 hover:shadow-orange-100"
                                                                    : item.type === "PRACTICE"
                                                                        ? "bg-emerald-50 border-emerald-100 hover:shadow-emerald-100"
                                                                        : "bg-white border-slate-100 hover:border-uneti-blue hover:shadow-lg active:scale-[0.98]"
                                                            )}
                                                        >
                                                            <div className="space-y-1 relative z-10">
                                                                <p className="text-[9px] font-black text-uneti-blue uppercase tracking-widest opacity-60 leading-none">
                                                                    {item.courseClass?.subject?.name}
                                                                </p>
                                                                <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight capitalize group-hover:text-uneti-blue transition-colors mt-0.5">
                                                                    {item.courseClass?.name || item.courseClass?.subject?.name}
                                                                </h4>

                                                                <div className="flex items-center gap-2 mt-2">
                                                                    <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded leading-none border border-slate-100">{item.courseClass?.code}</span>
                                                                </div>

                                                                <div className="space-y-1 pt-2 border-t border-slate-50/50 mt-2">
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                                        <Clock size={10} className="text-slate-300" />
                                                                        <span>Tiết {item.startShift} - {item.endShift}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                                        <MapPin size={10} className="text-slate-300" />
                                                                        <span className="truncate">P. {item.room?.name || "---"} {item.room?.building ? `(${item.room?.building})` : ""}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                <div className="p-1 px-2 rounded-lg bg-uneti-blue text-white text-[8px] font-black flex items-center gap-1 shadow-lg shadow-uneti-blue/20">
                                                                    CHI TIẾT <ArrowUpRight size={10} />
                                                                </div>
                                                            </div>
                                                        </Link>
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

                <div className="px-8 py-5 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-6">
                    <div className="flex flex-wrap gap-8 font-black uppercase tracking-widest text-[9px] text-slate-400">
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-white border border-slate-200" />
                            <span>Lý thuyết</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-emerald-100 border border-emerald-200" />
                            <span>Thực hành</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-3 w-3 rounded-full bg-orange-100 border border-orange-200" />
                            <span>Lịch thi</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Info size={14} className="text-uneti-blue" />
                        <span>Nhấp vào lịch để xem chi tiết</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
