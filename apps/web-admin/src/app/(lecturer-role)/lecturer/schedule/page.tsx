"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    Calendar,
    ChevronRight,
    ArrowLeft,
    Clock,
    MapPin,
    GraduationCap,
    Download,
    ChevronLeft,
    LayoutGrid,
    List,
    BookOpen,
    Info,
    Search,
    Printer
} from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DAYS = [
    { name: "Thứ Hai", short: "T2", value: 2 },
    { name: "Thứ Ba", short: "T3", value: 3 },
    { name: "Thứ Tư", short: "T4", value: 4 },
    { name: "Thứ Năm", short: "T5", value: 5 },
    { name: "Thứ Sáu", short: "T6", value: 6 },
    { name: "Thứ Bảy", short: "T7", value: 7 },
    { name: "Chủ Nhật", short: "CN", value: 8 },
];

const SHIFTS = Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    label: `Tiết ${i + 1}`,
    time: i < 6 ? "Sáng" : "Chiều"
}));

export default function LecturerSchedulePage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [courses, setCourses] = useState<any[]>([]);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const lecturerId = user.profileId || user.lecturer?.id || user.id;
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

        // Use the confirmed lecturer-specific endpoint
        fetch(`/api/courses/lecturer/${lecturerId}`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCourses(Array.isArray(data) ? data : data?.data || []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [user, TOKEN]);

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

    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(selectedDate), i));

    const navigateDate = (direction: 'next' | 'prev') => {
        const d = new Date(selectedDate);
        d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedDate(d);
    };

    // Helper to check if a schedule exists at a specific day and shift
    const getScheduleAtPos = (dayValue: number, shiftId: number) => {
        for (const c of courses) {
            for (const s of (c.schedules || [])) {
                if (s.dayOfWeek === dayValue && s.startShift === shiftId) {
                    return {
                        ...s,
                        courseName: c.title || c.subject?.name,
                        courseCode: c.code,
                        classId: c.id,
                        semesterName: c.semester?.name,
                        duration: (s.endShift - s.startShift) + 1
                    };
                }
            }
        }
        return null;
    };

    // Helper to check if a shift is covered by a spanning schedule
    const isShiftCovered = (dayValue: number, shiftId: number) => {
        for (const c of courses) {
            for (const s of (c.schedules || [])) {
                if (s.dayOfWeek === dayValue && shiftId > s.startShift && shiftId <= s.endShift) {
                    return true;
                }
            }
        }
        return false;
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Premium Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-slate-100 pt-4">
                <div className="space-y-1">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full w-fit mb-2">Teaching Schedule</p>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Lịch giảng dạy tuần này</h1>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <GraduationCap size={14} className="text-indigo-400" />
                        <span>Giảng viên: {user?.lecturer?.fullName || user?.fullName}</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1 bg-white rounded-2xl border border-slate-100 shadow-sm">
                    <button
                        onClick={() => navigateDate('prev')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-5 py-1.5 text-xs font-black text-slate-700 tracking-tight flex flex-col items-center">
                        <span>Tuần {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    <button
                        onClick={() => navigateDate('next')}
                        className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-indigo-600 transition-all"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => setSelectedDate(new Date())}
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"
                    >
                        Hôm nay
                    </Button>
                    <div className="h-6 w-px bg-slate-100 mx-1 hidden sm:block"></div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">
                        Lịch dạy thời gian thực
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all border border-slate-200"
                    >
                        <Printer className="mr-2 h-4 w-4" /> In lịch dạy
                    </Button>
                    <Button
                        className="h-10 rounded-xl px-4 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest"
                    >
                        <Download className="mr-2 h-4 w-4" /> Tải về (.xlsx)
                    </Button>
                </div>
            </div>

            {/* Schedule Grid - 12 Shift Format */}
            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden relative">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1000px] table-fixed">
                        <thead>
                            <tr className="bg-slate-50/80">
                                <th className="w-16 p-3 text-[11px] font-black text-indigo-600 uppercase border border-slate-200">Tiết</th>
                                {DAYS.map((day, idx) => {
                                    const isToday = new Date().toDateString() === weekDays[idx].toDateString();
                                    return (
                                        <th
                                            key={day.value}
                                            className={cn(
                                                "p-3 border border-slate-200 text-center transition-colors",
                                                isToday && "bg-indigo-50/50"
                                            )}
                                        >
                                            <div className="space-y-0.5">
                                                <p className="text-[11px] font-black uppercase text-indigo-600">{day.short}</p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {weekDays[idx].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                </p>
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SHIFTS.map((shift) => (
                                <tr key={shift.id}>
                                    <td className="p-2 border border-slate-200 bg-slate-50/30 text-center">
                                        <span className={cn(
                                            "text-[10px] font-black",
                                            shift.id <= 6 ? "text-amber-600" : "text-sky-600"
                                        )}>{shift.id}</span>
                                    </td>
                                    {DAYS.map((day, idx) => {
                                        const schedule = getScheduleAtPos(day.value, shift.id);
                                        const covered = isShiftCovered(day.value, shift.id);
                                        const isToday = new Date().toDateString() === weekDays[idx].toDateString();

                                        if (covered) return null; // Skip this cell as it's covered by rowSpan

                                        return (
                                            <td
                                                key={`${day.value}-${shift.id}`}
                                                rowSpan={schedule?.duration || 1}
                                                className={cn(
                                                    "p-1 border border-slate-200 align-top transition-colors min-h-[40px]",
                                                    isToday && "bg-indigo-50/5"
                                                )}
                                            >
                                                {schedule && (
                                                    <motion.div
                                                        initial={{ opacity: 0, y: 5 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className={cn(
                                                            "h-full p-2 rounded-none border text-left transition-all shadow-sm flex flex-col justify-center relative group/cell cursor-pointer overflow-hidden",
                                                            schedule.type === 'EXAM' 
                                                                ? "bg-yellow-50/90 border-yellow-200" 
                                                                : (schedule.type === 'PRACTICE' || schedule.room?.name?.toLowerCase().includes('lab'))
                                                                ? "bg-green-50/90 border-green-200"
                                                                : "bg-white border-slate-200 hover:border-indigo-300"
                                                        )}
                                                    >
                                                        {/* Quick Actions Overlay */}
                                                        <div className="absolute inset-0 bg-slate-900/90 opacity-0 group-hover/cell:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 z-20">
                                                            <Link 
                                                                href={`/lecturer/courses/${schedule.classId}/attendance`}
                                                                className="w-full py-1 text-[8px] font-black text-white hover:bg-indigo-600 transition-colors text-center uppercase tracking-widest"
                                                            >
                                                                Điểm danh
                                                            </Link>
                                                            <div className="w-full h-px bg-white/10" />
                                                            <Link 
                                                                href={`/lecturer/courses/${schedule.classId}/grades`}
                                                                className="w-full py-1 text-[8px] font-black text-white hover:bg-blue-600 transition-colors text-center uppercase tracking-widest"
                                                            >
                                                                Nhập điểm
                                                            </Link>
                                                        </div>

                                                        <h4 className="text-[10px] font-black text-indigo-700 leading-tight line-clamp-2 uppercase relative z-10">
                                                            {schedule.courseName}
                                                        </h4>
                                                        <div className="mt-1 space-y-0.5 relative z-10">
                                                            <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1">
                                                                <MapPin size={10} className="text-slate-400" />
                                                                {schedule.room?.name || '---'}
                                                            </p>
                                                            <p className="text-[9px] font-medium text-slate-500 italic">
                                                                Tiết {schedule.startShift}-{schedule.endShift}
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Grid Legend & Info */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-white border border-slate-300" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch dạy lý thuyết</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-green-50 border border-green-200" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch dạy thực hành</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-12 rounded-sm bg-yellow-50 border border-yellow-200" />
                            <span className="text-[10px] font-bold text-slate-600">Lịch thi</span>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
