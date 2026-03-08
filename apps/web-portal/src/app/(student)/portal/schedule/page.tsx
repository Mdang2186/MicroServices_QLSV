"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    MapPin,
    User,
    Clock,
    Search,
    Filter,
    BookOpen,
    LayoutGrid,
    List,
    Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Shift time mapping
const shiftTimes: Record<number, string> = {
    1: "07:00 - 07:45",
    2: "07:50 - 08:35",
    3: "08:45 - 09:30",
    4: "09:40 - 10:25",
    5: "10:35 - 11:20",
    6: "11:30 - 12:15",
    7: "13:00 - 13:45",
    8: "13:50 - 14:35",
    9: "14:45 - 15:30",
    10: "15:40 - 16:25",
    11: "16:35 - 17:20",
    12: "17:30 - 18:15",
};

// Helper for ca (periods)
const getCaFromShift = (start: number) => {
    if (start <= 3) return 1;
    if (start <= 6) return 2;
    if (start <= 9) return 3;
    return 4;
};

export default function SchedulePage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<"weekly" | "daily">("weekly");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                const data = await StudentService.getEnrollments(studentId);
                setEnrollments(data);
            } catch (error) {
                console.error("Failed to fetch schedule:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Get all schedules from enrollments
    const allSchedules = useMemo(() => {
        const schedules: any[] = [];
        enrollments.forEach(enr => {
            if (enr.courseClass?.schedules) {
                enr.courseClass.schedules.forEach((sch: any) => {
                    schedules.push({
                        ...sch,
                        subject: enr.courseClass.subject,
                        lecturer: enr.courseClass.lecturer,
                        classCode: enr.courseClass.code,
                        semester: enr.courseClass.semester
                    });
                });
            }
        });
        return schedules;
    }, [enrollments]);

    // Helpers for date manipulation
    const startOfWeek = (date: Date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
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

    const weekSchedule = useMemo(() => {
        const days = [1, 2, 3, 4, 5, 6, 7]; // Mon-Sun
        return days.map((dayNum, idx) => {
            const dateAtIdx = weekDays[idx];
            return allSchedules.filter(s => {
                // Match day of week
                if (s.dayOfWeek !== (dayNum === 7 ? 8 : dayNum + 1)) { // Adjusted for schema's 2-8 (Mon-Sun)
                    // Wait, schema says 2-8 for Mon-Sun? Let's check.
                    // Actually, schema comment says "Thứ (2-8)". 
                    // JS dayOfWeek: 0-Sun, 1-Mon, 2-Tue...
                    const schemaDay = dayNum + 1; // 1 -> 2 (Mon), 6 -> 7 (Sat), 7 -> 8 (Sun)
                    if (s.dayOfWeek !== schemaDay) return false;
                }

                // Also check if date falls within semester range
                if (s.semester) {
                    const start = new Date(s.semester.startDate);
                    const end = new Date(s.semester.endDate);
                    return dateAtIdx >= start && dateAtIdx <= end;
                }
                return true;
            });
        });
    }, [allSchedules, weekDays]);

    const navigateDate = (direction: 'next' | 'prev') => {
        const d = new Date(selectedDate);
        if (viewMode === 'weekly') {
            d.setDate(d.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            d.setDate(d.getDate() + (direction === 'next' ? 1 : -1));
        }
        setSelectedDate(d);
    };

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 bg-transparent pb-20">
            {/* Header / Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2.5rem] border border-white bg-white/70 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900">Lịch học</h1>
                        <p className="mt-1 text-lg font-medium text-slate-500">
                            {viewMode === 'weekly' ? 'Xem thời khóa biểu tuần' : 'Xem lịch trình trong ngày'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex bg-slate-100/80 p-1 rounded-2xl ring-1 ring-slate-200">
                            <button
                                onClick={() => setViewMode('weekly')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    viewMode === 'weekly' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <LayoutGrid className="h-4 w-4 inline-block mr-2" /> Tuần
                            </button>
                            <button
                                onClick={() => setViewMode('daily')}
                                className={cn(
                                    "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                                    viewMode === 'daily' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                <List className="h-4 w-4 inline-block mr-2" /> Ngày
                            </button>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigateDate('prev')}
                                className="rounded-xl border-slate-200 hover:bg-white"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </Button>

                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
                                <CalendarIcon className="h-4 w-4 text-slate-400" />
                                <span className="text-sm font-bold text-slate-700 min-w-[140px] text-center">
                                    {viewMode === 'weekly'
                                        ? `Tuần ${weekDays[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}`
                                        : selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                                    }
                                </span>
                            </div>

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => navigateDate('next')}
                                className="rounded-xl border-slate-200 hover:bg-white"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </Button>

                            <Button
                                variant="ghost"
                                onClick={() => setSelectedDate(new Date())}
                                className="text-blue-600 font-bold hover:bg-blue-50 rounded-xl"
                            >
                                Hôm nay
                            </Button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Calendar View */}
            <div className="w-full">
                {viewMode === 'weekly' ? (
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                        {weekDays.map((date, idx) => {
                            const isToday = new Date().toDateString() === date.toDateString();
                            const daySchedules = weekSchedule[idx];

                            return (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.05 * idx }}
                                    className="flex flex-col gap-4"
                                >
                                    {/* Day Header */}
                                    <div className={cn(
                                        "p-4 rounded-3xl text-center border transition-all",
                                        isToday
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200"
                                            : "bg-white/60 border-white text-slate-500 backdrop-blur-xl"
                                    )}>
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">
                                            {date.toLocaleDateString('vi-VN', { weekday: 'short' })}
                                        </p>
                                        <p className="text-xl font-black">
                                            {date.getDate()}
                                        </p>
                                    </div>

                                    {/* Schedule Cards for this day */}
                                    <div className="space-y-4 flex-1">
                                        {daySchedules.length > 0 ? (
                                            daySchedules.sort((a, b) => a.shift - b.shift).map((sch, i) => (
                                                <div
                                                    key={i}
                                                    className="p-4 rounded-[1.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
                                                            Ca {getCaFromShift(sch.startShift)}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-400">
                                                            {sch.startShift}-{sch.endShift} ({shiftTimes[sch.startShift]?.split(' - ')[0]} - {shiftTimes[sch.endShift]?.split(' - ')[1]})
                                                        </span>
                                                    </div>
                                                    <h4 className="text-sm font-black text-slate-900 leading-tight mb-2 line-clamp-2">
                                                        {sch.subject?.name}
                                                    </h4>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                                                            <MapPin className="h-3 w-3 text-slate-400" />
                                                            <span>P. {sch.room?.name || '---'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500">
                                                            <User className="h-3 w-3 text-slate-400" />
                                                            <span className="truncate">{sch.lecturer?.fullName || 'Giảng viên'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center p-8 rounded-[1.5rem] bg-slate-50/50 border border-dashed border-slate-200">
                                                <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : (
                    /* Daily View */
                    <div className="max-w-3xl mx-auto space-y-6">
                        {allSchedules
                            .filter(s => {
                                const dayNum = selectedDate.getDay() === 0 ? 8 : selectedDate.getDay() + 1; // 2-8
                                if (s.dayOfWeek !== dayNum) return false;
                                if (s.semester) {
                                    const start = new Date(s.semester.startDate);
                                    const end = new Date(s.semester.endDate);
                                    const d = new Date(selectedDate);
                                    d.setHours(0, 0, 0, 0);
                                    return d >= start && d <= end;
                                }
                                return true;
                            })
                            .sort((a, b) => a.startShift - b.startShift)
                            .map((sch, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 * i }}
                                    className="flex gap-6"
                                >
                                    {/* Timeline */}
                                    <div className="w-24 pt-2 flex flex-col items-end">
                                        <span className="text-sm font-black text-slate-900">{shiftTimes[sch.startShift]?.split(' - ')[0]}</span>
                                        <span className="text-[10px] font-bold text-slate-400">Tiết {sch.startShift}</span>
                                    </div>

                                    {/* Detailed Card */}
                                    <div className="flex-1 p-8 rounded-[2rem] border border-white bg-white/60 shadow-lg backdrop-blur-2xl flex flex-col md:flex-row gap-8 items-start md:items-center">
                                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shrink-0">
                                            <BookOpen className="h-8 w-8" />
                                        </div>

                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black uppercase text-blue-600 tracking-widest">{sch.classCode}</span>
                                                <div className="h-1 w-1 rounded-full bg-slate-300" />
                                                <span className="text-xs font-bold text-slate-500">{sch.type === 'THEORY' ? 'Lý thuyết' : 'Thực hành'}</span>
                                            </div>
                                            <h3 className="text-2xl font-black text-slate-900">{sch.subject?.name}</h3>

                                            <div className="flex flex-wrap gap-4 pt-2">
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100/50 px-3 py-1.5 rounded-lg">
                                                    <MapPin className="h-4 w-4 text-blue-500" />
                                                    <span>Phòng {sch.room?.name || '---'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100/50 px-3 py-1.5 rounded-lg">
                                                    <User className="h-4 w-4 text-blue-500" />
                                                    <span>GV: {sch.lecturer?.fullName || 'Chưa cập nhật'}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-100/50 px-3 py-1.5 rounded-lg">
                                                    <Clock className="h-4 w-4 text-blue-500" />
                                                    <span>Tiết {sch.startShift}-{sch.endShift} ({shiftTimes[sch.startShift]?.split(' - ')[0]} - {shiftTimes[sch.endShift]?.split(' - ')[1]})</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button className="rounded-2xl h-12 px-6 font-bold bg-white text-slate-900 border border-slate-200 hover:bg-slate-50 shadow-sm hidden md:flex">
                                            Chi tiết
                                        </Button>
                                    </div>
                                </motion.div>
                            ))
                        }

                        {allSchedules.filter(s => {
                            const dayNum = selectedDate.getDay() === 0 ? 8 : selectedDate.getDay() + 1;
                            if (s.dayOfWeek !== dayNum) return false;
                            if (s.semester) {
                                const start = new Date(s.semester.startDate);
                                const end = new Date(s.semester.endDate);
                                const d = new Date(selectedDate);
                                d.setHours(0, 0, 0, 0);
                                return d >= start && d <= end;
                            }
                            return true;
                        }).length === 0 && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-24 bg-white/40 rounded-[2.5rem] border border-white border-dashed"
                                >
                                    <div className="h-20 w-20 flex items-center justify-center rounded-full bg-slate-100/50 mb-6">
                                        <CalendarIcon className="h-10 w-10 text-slate-300" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800">Không có lịch học</h3>
                                    <p className="text-slate-500 font-medium">Bạn không có hoạt động học tập nào trong ngày hôm nay.</p>
                                    <Button
                                        variant="outline"
                                        className="mt-6 rounded-xl border-slate-200"
                                        onClick={() => navigateDate('next')}
                                    >
                                        Xem ngày tiếp theo
                                    </Button>
                                </motion.div>
                            )}
                    </div>
                )}
            </div>

            {/* Quick Actions / Info */}
            <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-8 rounded-[2.5rem] bg-indigo-600 text-white shadow-xl relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Filter className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black mb-2">Đăng ký học phần</h3>
                        <p className="text-indigo-100 mb-6 font-medium">
                            Đợt đăng ký học phần học kỳ mới sắp diễn ra. Hãy chuẩn bị danh sách môn học của bạn.
                        </p>
                        <Button className="rounded-2xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold px-8 h-12 shadow-lg">
                            Đi đến đăng ký
                        </Button>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-8 rounded-[2.5rem] bg-white border border-white shadow-xl flex flex-col justify-center"
                >
                    <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Clock className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 mb-2">Quy định giờ học</h3>
                            <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                Sinh viên cần có mặt tại phòng học ít nhất 5 phút trước khi bắt đầu ca học.
                                Việc đi muộn quá 15 phút sẽ bị tính là vắng mặt không lý do.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
