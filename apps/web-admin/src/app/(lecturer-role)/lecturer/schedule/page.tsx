"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
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
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

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
    { name: "Chủ Nhật", short: "CN", value: 8 },
];

export default function LecturerSchedulePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [schedule, setSchedule] = useState<any[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [filter, setFilter] = useState("all");

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user?.profileId || !selectedSemesterId) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        fetch(`/api/courses/schedule/lecturer/${user.profileId}?semesterId=${selectedSemesterId}`, {
            headers: TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                setSchedule(Array.isArray(data) ? data : []);
            })
            .catch(() => setSchedule([]))
            .finally(() => setLoading(false));
    }, [user, selectedSemesterId, TOKEN]);

    const weekDays = useMemo(() => {
        const d = new Date(selectedDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(date.getDate() + i);
            return date;
        });
    }, [selectedDate]);

    const getSchedulesForDayAndSession = (dayValue: number, sessionValue: string) => {
        return schedule.filter(s => {
            if (s.dayOfWeek !== dayValue) return false;

            const start = Number(s.startShift);
            let sessionMatch = false;
            if (sessionValue === "morning") sessionMatch = start <= 6;
            else if (sessionValue === "afternoon") sessionMatch = start > 6 && start <= 12;
            else if (sessionValue === "evening") sessionMatch = start > 12;

            if (!sessionMatch) return false;

            if (filter === "study" && s.type === "EXAM") return false;
            if (filter === "exam" && s.type !== "EXAM") return false;

            return true;
        }).sort((a, b) => Number(a.startShift) - Number(b.startShift));
    };

    const navigateWeek = (direction: 'next' | 'prev') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(d);
    };

    return (
        <div className="min-h-screen space-y-4 pb-20 max-w-7xl mx-auto p-4 md:p-6 animate-in fade-in duration-700 bg-[#fbfcfd]">
            <CompactLecturerHeader 
                userName={`${user?.degree || "Giảng viên"} ${user?.fullName || "Cao cấp"}`} 
                userId={`GV-${user?.username || "UNETI"}`}
                minimal={true}
                title="Lịch giảng dạy chi tiết"
                onSemesterChange={setSelectedSemesterId}
            />

            {/* Compact Toolbar & Navigation */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-3 px-5 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3 pr-6 border-r border-slate-100">
                        <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue">
                            <CalendarDays size={18} />
                        </div>
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                            {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </h2>
                    </div>

                    <div className="hidden lg:flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {[
                            { id: "all", label: "Tất cả" },
                            { id: "study", label: "Giảng dạy" },
                            { id: "exam", label: "Lịch thi" }
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg transition-all",
                                    filter === f.id ? "bg-slate-100 text-uneti-blue" : "hover:text-uneti-blue"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                        <button
                            onClick={() => navigateWeek('prev')}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-uneti-blue transition-all"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedDate(new Date())}
                            className="h-8 px-3 text-[10px] font-black uppercase text-slate-600 hover:bg-white hover:shadow-sm transition-all"
                        >
                            <CalendarCheck className="mr-1.5 h-3.5 w-3.5 text-uneti-blue" /> Hôm nay
                        </Button>
                        <button
                            onClick={() => navigateWeek('next')}
                            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-uneti-blue transition-all"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 w-10 p-0 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100 shadow-sm"
                    >
                        <Printer size={16} />
                    </Button>
                </div>
            </div>

            {/* Main Schedule Grid */}
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
                    <table className="w-full border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="w-20 p-4 text-[10px] font-black text-uneti-blue/60 uppercase border-b border-r border-slate-100 tracking-widest bg-slate-50/80 sticky left-0 z-20 backdrop-blur-md">Ca</th>
                                {DAYS.map((day, idx) => {
                                    const isToday = new Date().toDateString() === weekDays[idx].toDateString();
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
                                                    {weekDays[idx].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
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
                                    <td className="p-0 border-b border-r border-slate-100 bg-slate-50/30 sticky left-0 z-10 backdrop-blur-md">
                                        <div className="flex flex-col items-center justify-center p-4 min-h-[160px] gap-2">
                                            <span className="text-[10px] font-black text-slate-800 uppercase [writing-mode:vertical-lr] rotate-180 tracking-[0.3em]">{session.label}</span>
                                            <Clock size={12} className="text-slate-300" />
                                        </div>
                                    </td>
                                    {DAYS.map((day, idx) => {
                                        const daySchedules = getSchedulesForDayAndSession(day.value, session.value);
                                        const isToday = new Date().toDateString() === weekDays[idx].toDateString();
                                        return (
                                            <td
                                                key={`${day.value}-${session.value}`}
                                                className={cn(
                                                    "p-2 border-b border-r border-slate-100 align-top transition-colors",
                                                    isToday && "bg-uneti-blue/5"
                                                )}
                                            >
                                                <div className="space-y-2">
                                                    {daySchedules.map((s, i) => {
                                                        // Extract nominal class name (the part after " - ")
                                                        const nominalName = s.courseClass?.name?.includes(" - ") 
                                                            ? s.courseClass?.name?.split(" - ")[1] 
                                                            : s.courseClass?.name;
                                                        const subjectName = s.courseClass?.name?.includes(" - ")
                                                            ? s.courseClass?.name?.split(" - ")[0]
                                                            : s.courseClass?.subject?.name;

                                                        return (
                                                            <Link
                                                                key={i}
                                                                href={`/lecturer/courses/${s.courseClassId}`}
                                                                className={cn(
                                                                    "block p-3.5 rounded-2xl border text-left transition-all group relative overflow-hidden",
                                                                    s.type === 'EXAM' 
                                                                        ? "bg-orange-50 border-orange-100 hover:shadow-orange-100" 
                                                                        : (s.type === 'PRACTICE')
                                                                        ? "bg-emerald-50 border-emerald-100 hover:shadow-emerald-100"
                                                                        : "bg-white border-slate-100 hover:border-uneti-blue hover:shadow-lg active:scale-[0.98]"
                                                                )}
                                                            >
                                                                <div className="space-y-1 relative z-10">
                                                                    <p className="text-[9px] font-black text-uneti-blue uppercase tracking-widest opacity-60 leading-none">
                                                                        {subjectName}
                                                                    </p>
                                                                    <h4 className="text-[13px] font-black text-slate-800 leading-tight tracking-tight capitalize group-hover:text-uneti-blue transition-colors">
                                                                        {nominalName || "Lớp học phần"}
                                                                    </h4>
                                                                    
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded leading-none border border-slate-100">{s.courseClass?.code}</span>
                                                                    </div>

                                                                    <div className="space-y-1 pt-2 border-t border-slate-50/50 mt-2">
                                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                                            <Clock size={10} className="text-slate-300" />
                                                                            <span>Tiết {s.startShift} - {s.endShift}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-tight">
                                                                            <MapPin size={10} className="text-slate-300" />
                                                                            <span className="truncate">P. {s.room?.name || '---'} {s.room?.building ? `(${s.room?.building})` : ''}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Minimal hover indicator */}
                                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all">
                                                                    <div className="p-1 px-2 rounded-lg bg-uneti-blue text-white text-[8px] font-black flex items-center gap-1 shadow-lg shadow-uneti-blue/20">
                                                                        CHI TIẾT <ArrowUpRight size={10} />
                                                                    </div>
                                                                </div>
                                                            </Link>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Legend Area */}
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
                            <span>Lịch thi / Chấm</span>
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
