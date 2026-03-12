"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    MapPin,
    Clock,
    Printer,
    Maximize2,
    CheckCircle2,
    Info,
    CalendarCheck,
    Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SESSIONS = [
    { label: "Sáng", range: "1-6", time: "07:00 - 12:15", value: 1, color: "bg-yellow-50/50" },
    { label: "Chiều", range: "7-12", time: "13:00 - 18:15", value: 2, color: "bg-blue-50/50" },
    { label: "Tối", range: "13-14", time: "18:30 - 21:00", value: 3, color: "bg-slate-50/50" },
];

const DAYS = [
    { name: "Thứ Hai", value: 2 },
    { name: "Thứ Ba", value: 3 },
    { name: "Thứ Tư", value: 4 },
    { name: "Thứ Năm", value: 5 },
    { name: "Thứ Sáu", value: 6 },
    { name: "Thứ Bảy", value: 7 },
    { name: "Chủ Nhật", value: 8 },
];

const LEGEND = [
    { label: "Lịch học lý thuyết", color: "bg-slate-100 border-slate-300" },
    { label: "Lịch học thực hành", color: "bg-green-100 border-green-300" },
    { label: "Lịch học trực tuyến", color: "bg-sky-100 border-sky-300" },
    { label: "Lịch thi", color: "bg-yellow-100 border-yellow-300" },
    { label: "Lịch tạm ngưng", color: "bg-red-100 border-red-300" },
];

export default function SchedulePage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
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

    const getSchedulesForDayAndSession = (dayValue: number, sessionValue: number) => {
        const dateAtIdx = weekDays[dayValue === 8 ? 6 : dayValue - 2];

        return enrollments.flatMap(enr => {
            const schedules = enr.courseClass?.schedules || [];
            return schedules
                .filter((s: any) => {
                    if (s.dayOfWeek !== dayValue) return false;

                    // Session mapping
                    if (sessionValue === 1 && s.startShift > 6) return false;
                    if (sessionValue === 2 && (s.startShift < 7 || s.startShift > 12)) return false;
                    if (sessionValue === 3 && s.startShift < 13) return false;

                    // Semester range check
                    if (enr.courseClass?.semester) {
                        const start = new Date(enr.courseClass.semester.startDate);
                        const end = new Date(enr.courseClass.semester.endDate);
                        return dateAtIdx >= start && dateAtIdx <= end;
                    }
                    return true;
                })
                .map((s: any) => ({
                    ...s,
                    subjectName: enr.courseClass?.subject?.name,
                    classCode: enr.courseClass?.code,
                    roomName: s.room?.name,
                    lecturerName: enr.courseClass?.lecturer?.fullName,
                    type: s.type || 'THEORY'
                }));
        });
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
        <div className="min-h-screen space-y-4 bg-transparent pb-20">
            {/* Main Container */}
            <div className="bg-white border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center bg-slate-50 border-b border-slate-200 gap-4">
                    <h1 className="text-xl font-bold text-slate-700">Lịch học, lịch thi theo tuần</h1>

                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" checked={filter === "all"} onChange={() => setFilter("all")} className="w-4 h-4 text-blue-600" /> Tất cả
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" checked={filter === "study"} onChange={() => setFilter("study")} className="w-4 h-4 text-blue-600" /> Lịch học
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input type="radio" checked={filter === "exam"} onChange={() => setFilter("exam")} className="w-4 h-4 text-blue-600" /> Lịch thi
                            </label>
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-slate-300 p-0.5 rounded shadow-sm">
                            <input
                                type="text"
                                readOnly
                                value={`${weekDays[0].toLocaleDateString('vi-VN')} - ${weekDays[6].toLocaleDateString('vi-VN')}`}
                                className="px-2 py-1 text-sm border-none focus:ring-0 w-44 font-medium text-slate-700"
                            />
                            <div className="p-1 text-slate-400">
                                <CalendarIcon className="h-4 w-4" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 flex flex-wrap justify-end items-center gap-2 bg-white border-b border-slate-200">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedDate(new Date())}
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-sm h-8 px-4 flex items-center gap-1.5"
                    >
                        <CalendarCheck className="h-4 w-4" /> Hiện tại
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-sm h-8 px-4 flex items-center gap-1.5"
                    >
                        <Printer className="h-4 w-4" /> In lịch
                    </Button>
                    <div className="flex bg-sky-500 p-0.5 rounded-sm">
                        <button
                            onClick={() => navigateDate('prev')}
                            className="h-7 px-2 hover:bg-sky-600 text-white transition-colors border-r border-sky-400 flex items-center justify-center gap-1 text-xs font-bold"
                        >
                            <ChevronLeft className="h-4 w-4" /> Trở về
                        </button>
                        <button
                            onClick={() => navigateDate('next')}
                            className="h-7 px-2 hover:bg-sky-600 text-white transition-colors flex items-center justify-center gap-1 text-xs font-bold"
                        >
                            Tiếp <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className="bg-sky-500 hover:bg-sky-600 text-white rounded-sm h-8 px-2"
                    >
                        <Maximize2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* Table Grid */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1200px] border-l border-t border-slate-200">
                        <thead>
                            <tr className="bg-sky-50">
                                <th className="w-24 p-3 border-r border-b border-slate-200 text-sm font-bold text-sky-700 text-center">Ca học</th>
                                {DAYS.map((day, idx) => {
                                    const isToday = new Date().toDateString() === weekDays[idx].toDateString();
                                    return (
                                        <th
                                            key={day.value}
                                            className={cn(
                                                "p-3 border-r border-b border-slate-200 text-center",
                                                isToday && "bg-sky-100"
                                            )}
                                        >
                                            <p className="text-sm font-bold text-sky-700">{day.name}</p>
                                            <p className="text-sm font-bold text-sky-700">{weekDays[idx].toLocaleDateString('vi-VN')}</p>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {SESSIONS.map((session) => (
                                <tr key={session.value}>
                                    <td className={cn("p-4 border-r border-b border-slate-200 text-center font-bold text-slate-700 align-middle", session.color)}>
                                        <div className="flex flex-col items-center">
                                            <span className="text-sm">{session.label}</span>
                                        </div>
                                    </td>
                                    {DAYS.map((day, idx) => {
                                        const schedules = getSchedulesForDayAndSession(day.value, session.value);
                                        return (
                                            <td
                                                key={`${day.value}-${session.value}`}
                                                className="p-1 border-r border-b border-slate-200 align-top min-h-[160px] bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed"
                                            >
                                                <div className="space-y-1">
                                                    {schedules.map((s, i) => (
                                                        <div
                                                            key={i}
                                                            onClick={() => setSelectedSchedule(s)}
                                                            className={cn(
                                                                "p-3 border rounded shadow-sm cursor-pointer transition-all hover:brightness-95",
                                                                s.type === 'PRACTICE' ? "bg-green-100 border-green-300" :
                                                                    s.type === 'ONLINE' ? "bg-sky-100 border-sky-300" :
                                                                        "bg-slate-100 border-slate-300"
                                                            )}
                                                        >
                                                            <div className="space-y-1 leading-tight">
                                                                <h4 className="text-sm font-bold text-slate-800">{s.subjectName}</h4>
                                                                <p className="text-xs font-medium text-slate-600 uppercase">{s.classCode}</p>
                                                                <div className="pt-1.5 space-y-0.5">
                                                                    <p className="text-[11px] font-medium text-slate-600">Tiết: {s.startShift} - {s.endShift}</p>
                                                                    <p className="text-[11px] font-medium text-slate-600">Phòng: {s.roomName || '---'}</p>
                                                                    <p className="text-[11px] font-medium text-slate-600 truncate">GV: {s.lecturerName || '---'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
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

                {/* Legend */}
                <div className="px-6 py-6 bg-slate-50 border-t border-slate-200">
                    <div className="flex flex-wrap gap-x-8 gap-y-4">
                        {LEGEND.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <div className={cn("h-4 w-10 border shadow-sm", item.color)} />
                                <span className="text-xs font-medium text-slate-600">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Detail Modal (Keep and simplify) */}
            <AnimatePresence>
                {selectedSchedule && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedSchedule(null)}
                            className="absolute inset-0 bg-slate-900/20"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="relative w-full max-w-md bg-white p-6 shadow-xl border border-slate-200"
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{selectedSchedule.classCode}</span>
                                    <h2 className="text-lg font-bold text-slate-800 leading-tight">{selectedSchedule.subjectName}</h2>
                                </div>
                                <button
                                    onClick={() => setSelectedSchedule(null)}
                                    className="text-slate-400 hover:text-slate-600"
                                >
                                    <Maximize2 className="h-5 w-5 rotate-45" />
                                </button>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-500 font-medium">Phòng học</span>
                                    <span className="text-sm text-slate-800 font-bold">{selectedSchedule.roomName || '---'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-500 font-medium">Tiết học</span>
                                    <span className="text-sm text-slate-800 font-bold">{selectedSchedule.startShift} - {selectedSchedule.endShift}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-500 font-medium">Giảng viên</span>
                                    <span className="text-sm text-slate-800 font-bold">{selectedSchedule.lecturerName || 'Chưa cập nhật'}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-sm text-slate-500 font-medium">Hình thức</span>
                                    <span className="text-sm text-slate-800 font-bold">{selectedSchedule.type === 'PRACTICE' ? 'Thực hành' : selectedSchedule.type === 'ONLINE' ? 'Trực tuyến' : 'Lý thuyết'}</span>
                                </div>
                            </div>

                            <Button
                                onClick={() => setSelectedSchedule(null)}
                                className="mt-6 w-full h-10 bg-slate-800 text-white font-medium hover:bg-slate-700"
                            >
                                Đóng
                            </Button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
