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
    List
} from "lucide-react";
// @ts-ignore
import { Button } from "../../../../components/ui/button";
import { cn } from "@/lib/utils";

const DAYS = [
    { name: "Thứ Hai", value: 2 },
    { name: "Thứ Ba", value: 3 },
    { name: "Thứ Tư", value: 4 },
    { name: "Thứ Năm", value: 5 },
    { name: "Thứ Sáu", value: 6 },
    { name: "Thứ Bảy", value: 7 },
    { name: "Chủ Nhật", value: 8 },
];

const SHIFTS = [1, 2, 3, 4]; // Assuming 4 shifts per day

export default function LecturerSchedulePage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'weekly' | 'daily'>('weekly');
    const [courses, setCourses] = useState<any[]>([]);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const lecturerId = user.lecturer?.id || user.id;
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

        fetch(`/api/courses/lecturer/${lecturerId}`, { headers })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCourses(Array.isArray(data) ? data : data?.data || []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [user, TOKEN]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f7fe]">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    // Date Helpers
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

    const getShiftTimes = (shift: number) => {
        const times: Record<number, string> = {
            1: "07:00 - 07:45", 2: "07:50 - 08:35", 3: "08:45 - 09:30",
            4: "09:40 - 10:25", 5: "10:35 - 11:20", 6: "11:30 - 12:15",
            7: "13:00 - 13:45", 8: "13:50 - 14:35", 9: "14:45 - 15:30",
            10: "15:40 - 16:25", 11: "16:35 - 17:20", 12: "17:30 - 18:15"
        };
        return times[shift] || "";
    };

    const getScheduleForDayAndShift = (dayOfWeek: number, ca: number) => {
        return courses.flatMap(c =>
            (c.schedules || [])
                .filter((s: any) => {
                    // Match day
                    if (s.dayOfWeek !== dayOfWeek) return false;

                    // Match ca (period)
                    const start = s.startShift;
                    const shiftCa = start <= 3 ? 1 : start <= 6 ? 2 : start <= 9 ? 3 : 4;
                    if (shiftCa !== ca) return false;

                    // Match week dates within semester
                    const dayIdx = dayOfWeek === 8 ? 6 : dayOfWeek - 2;
                    const dateAtIdx = weekDays[dayIdx];
                    if (c.semester) {
                        const semStart = new Date(c.semester.startDate);
                        const semEnd = new Date(c.semester.endDate);
                        return dateAtIdx >= semStart && dateAtIdx <= semEnd;
                    }
                    return true;
                })
                .map((s: any) => ({ ...s, courseName: c.title || c.subject?.name, courseCode: c.code }))
        );
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Link href="/lecturer/dashboard" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Quay lại Dashboard</span>
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-indigo-600">Lịch giảng dạy</span>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigateDate('prev')}
                            className="h-9 w-9 rounded-xl border-slate-200"
                        >
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-700 min-w-[150px] text-center shadow-sm">
                            {weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigateDate('next')}
                            className="h-9 w-9 rounded-xl border-slate-200"
                        >
                            <ChevronRight size={18} />
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedDate(new Date())}
                            className="text-indigo-600 font-bold hover:bg-indigo-50 rounded-xl"
                        >
                            Hôm nay
                        </Button>
                    </div>

                    <button className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-50 transition-colors">
                        <Download size={16} />
                        <span className="hidden sm:inline">Xuất lịch dạy</span>
                    </button>
                </div>
            </div>

            {/* Title Section */}
            <div className="bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[24px] p-8 sm:p-10 border border-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                            Lịch <span className="text-indigo-600">Giảng dạy</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-400" />
                            Theo dõi các tiết dạy trong tuần học hiện tại
                        </p>
                    </div>
                    <div className="bg-white/80 backdrop-blur-md px-6 py-4 rounded-2xl border border-white shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                            {selectedDate.getDate()}
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Đang xem ngày</p>
                            <p className="text-sm font-extrabold text-slate-800 uppercase">
                                {selectedDate.toLocaleDateString("vi-VN", { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weekly Grid */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse min-w-[800px]">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="w-24 py-6 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ca / Tiết</th>
                            {DAYS.map((day, idx) => {
                                const dateStr = weekDays[idx].toDateString();
                                const isToday = new Date().toDateString() === dateStr;
                                return (
                                    <th
                                        key={day.value}
                                        className={`py-6 px-4 border-b border-l border-slate-100 text-center ${isToday ? 'bg-indigo-50/50' : ''}`}
                                    >
                                        <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                            {day.name}
                                        </p>
                                        <p className="text-sm font-extrabold text-slate-800">{weekDays[idx].getDate()}/{weekDays[idx].getMonth() + 1}</p>
                                        {isToday && <span className="mt-1 inline-block px-2 py-0.5 bg-indigo-600 text-white text-[9px] font-bold rounded-full uppercase">Hôm nay</span>}
                                    </th>
                                );
                            })}
                        </tr>
                    </thead>
                    <tbody>
                        {SHIFTS.map((shift) => (
                            <tr key={shift}>
                                <td className="py-10 border-b border-slate-100 text-center bg-slate-50/30">
                                    <div className="flex flex-col items-center gap-1">
                                        <Clock size={16} className="text-slate-300" />
                                        <span className="text-lg font-black text-slate-800">Ca {shift}</span>
                                        <span className="text-[10px] font-bold text-slate-400 text-center px-2 leading-tight">
                                            {shift === 1 ? '07:00 - 09:30' : shift === 2 ? '09:45 - 12:15' : shift === 3 ? '13:00 - 15:30' : '15:45 - 18:15'}
                                        </span>
                                    </div>
                                </td>
                                {DAYS.map((day, idx) => {
                                    const schs = getScheduleForDayAndShift(day.value, shift);
                                    const isToday = new Date().toDateString() === weekDays[idx].toDateString();

                                    return (
                                        <td
                                            key={`${day.value}-${shift}`}
                                            className={`p-3 border-b border-l border-slate-100 align-top transition-colors ${isToday ? 'bg-indigo-50/20' : ''}`}
                                        >
                                            <div className="space-y-3">
                                                {schs.map((s, idx) => (
                                                    <div
                                                        key={idx}
                                                        className={`p-4 rounded-2xl border transition-all ${isToday ? 'bg-white border-indigo-200 shadow-indigo-100 shadow-md ring-1 ring-indigo-50' : 'bg-[#fafcff] border-slate-100 hover:border-indigo-100 hover:bg-white hover:shadow-lg'}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[9px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">
                                                                {s.courseCode}
                                                            </span>
                                                            <MapPin size={12} className="text-indigo-400" />
                                                        </div>
                                                        <h4 className="text-xs font-extrabold text-slate-800 leading-snug line-clamp-2 min-h-[32px]">
                                                            {s.courseName}
                                                        </h4>
                                                        <div className="mt-3 pt-3 border-t border-slate-100/50 flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                                                <span className="text-[10px] font-bold text-slate-500">P. {s.room?.name || "???"}</span>
                                                            </div>
                                                            <div className="text-[9px] font-bold text-slate-400">
                                                                Tiết {s.startShift}-{s.endShift}
                                                            </div>
                                                        </div>
                                                        <div className="mt-2 text-[9px] text-slate-400 font-medium">
                                                            {getShiftTimes(s.startShift).split(' - ')[0]} - {getShiftTimes(s.endShift).split(' - ')[1]}
                                                        </div>
                                                    </div>
                                                ))}
                                                {schs.length === 0 && (
                                                    <div className="h-12 flex items-center justify-center">
                                                        <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer Summary */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-2">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center overflow-hidden">
                                <span className="text-[10px] font-bold text-slate-400">{i}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm font-medium text-slate-500">
                        Hệ thống đã tự động cập nhật lịch từ <strong>Học kỳ 1 (2025-2026)</strong>
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-600 shadow-sm shadow-indigo-200"></div>
                        <span className="text-xs font-bold text-slate-700">Tiết dạy hiện tại</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-slate-100 border border-slate-200"></div>
                        <span className="text-xs font-bold text-slate-700">Trống</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
