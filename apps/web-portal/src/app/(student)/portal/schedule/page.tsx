"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    Calendar,
    Clock,
    MapPin,
    BookOpen,
    UserCircle,
    ChevronLeft,
    ChevronRight,
    AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentSchedulePage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDayStr, setCurrentDayStr] = useState("");

    // Setup dates for the current week view
    const [currentDate, setCurrentDate] = useState(new Date());

    // Simple View switching state
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) { setLoading(false); return; }

                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                if (studentId) {
                    const profileData = await StudentService.getProfile(studentId);
                    if (profileData && profileData.id) {
                        const enrollmentsData = await StudentService.getEnrollments(profileData.id);
                        setEnrollments(enrollmentsData || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch schedule data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        setCurrentDayStr(new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }));
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="relative flex h-20 w-20 items-center justify-center">
                    <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                    <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                </div>
            </div>
        );
    }

    // Process all schedules into a flat array
    const allSchedules = enrollments.flatMap((e: any) =>
        (e.courseClass?.schedules || []).map((s: any) => ({
            ...s,
            subject: e.courseClass?.subject?.name,
            courseCode: e.courseClass?.code,
            lecturer: e.courseClass?.lecturer?.fullName,
            credits: e.courseClass?.subject?.credits,
            status: e.status
        }))
    );

    // Days of Week Mapping (2: Monday, ..., 8: Sunday)
    const daysOfWeek = [
        { id: 2, name: "Thứ 2", short: "T2" },
        { id: 3, name: "Thứ 3", short: "T3" },
        { id: 4, name: "Thứ 4", short: "T4" },
        { id: 5, name: "Thứ 5", short: "T5" },
        { id: 6, name: "Thứ 6", short: "T6" },
        { id: 7, name: "Thứ 7", short: "T7" },
        { id: 8, name: "Chủ nhật", short: "CN" },
    ];

    // Shifts mapping for UI
    const periods = [
        { label: "Sáng (Ca 1)", range: "Tiết 1-3", time: "07:00 - 09:30" },
        { label: "Sáng (Ca 2)", range: "Tiết 4-6", time: "09:30 - 12:00" },
        { label: "Chiều (Ca 3)", range: "Tiết 7-9", time: "13:00 - 15:30" },
        { label: "Chiều (Ca 4)", range: "Tiết 10-12", time: "15:30 - 18:00" },
        { label: "Tối (Ca 5)", range: "Tiết 13-15", time: "18:00 - 20:30" },
    ];

    // Removed simple view switching state because it was moved up

    return (
        <div className="min-h-screen space-y-8 bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30 p-1 pb-12">

            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur-xl"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/10 to-indigo-400/10 blur-3xl" />

                <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-5">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20">
                            <Calendar className="h-8 w-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Thời Khóa Biểu Sinh Viên
                            </h1>
                            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                                Hôm nay: <span className="font-semibold text-blue-600">{currentDayStr}</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Chế độ Bảng (Tuần)
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Chế độ Danh Sách
                        </button>
                    </div>
                </div>
            </motion.div>

            {/* Content Area */}
            {enrollments.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-3xl bg-white/50 ring-1 ring-slate-200">
                    <AlertCircle className="h-12 w-12 text-slate-300 mb-4" />
                    <p className="text-lg font-semibold text-slate-600">Bạn chưa đăng ký môn học nào.</p>
                </div>
            ) : (
                <AnimatePresence mode="wait">
                    {viewMode === 'grid' ? (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-x-auto rounded-3xl bg-white/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200 backdrop-blur-xl"
                        >
                            <div className="min-w-[1000px] p-2">
                                {/* Header Row */}
                                <div className="grid grid-cols-8 gap-2 bg-slate-50/50 p-4 rounded-t-2xl border-b border-slate-100">
                                    <div className="col-span-1 font-bold text-slate-500 uppercase tracking-wider text-xs text-center">Ca / Thời gian</div>
                                    {daysOfWeek.map((day) => (
                                        <div key={day.id} className="col-span-1 text-center font-bold text-slate-700 uppercase tracking-wider text-sm">
                                            {day.name}
                                        </div>
                                    ))}
                                </div>

                                {/* Body Rows */}
                                <div className="p-4 space-y-4">
                                    {periods.map((period, idx) => {
                                        const caStartShift = idx * 3 + 1; // 1, 4, 7, 10, 13
                                        const caEndShift = caStartShift + 2; // 3, 6, 9, 12, 15

                                        return (
                                            <div key={idx} className="grid grid-cols-8 gap-3 items-stretch">
                                                {/* Left Column (Time) */}
                                                <div className="col-span-1 flex flex-col items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 p-2 text-center text-xs">
                                                    <span className="font-bold text-blue-600 mb-1">{period.label}</span>
                                                    <span className="text-slate-500 font-medium">{period.range}</span>
                                                    <span className="text-slate-400 mt-1">{period.time}</span>
                                                </div>

                                                {/* Days Columns */}
                                                {daysOfWeek.map((day) => {
                                                    // Find if there is a class at this Day and this Shift range
                                                    const classHere = allSchedules.find(s =>
                                                        s.dayOfWeek === day.id &&
                                                        ((s.startShift >= caStartShift && s.startShift <= caEndShift) ||
                                                            (s.endShift >= caStartShift && s.endShift <= caEndShift))
                                                    );

                                                    if (classHere) {
                                                        const isSuccess = classHere.status === 'SUCCESS' || classHere.status === 'REGISTERED';
                                                        return (
                                                            <div key={day.id} className="col-span-1 h-full">
                                                                <div className={`h-full flex flex-col justify-between rounded-2xl p-3 border shadow-sm transition-all hover:-translate-y-1 hover:shadow-md
                                                                    ${isSuccess ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-100' : 'bg-amber-50 border-amber-100'}
                                                                `}>
                                                                    <div>
                                                                        <div className="flex justify-between items-start mb-2">
                                                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSuccess ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                                {classHere.courseCode}
                                                                            </span>
                                                                        </div>
                                                                        <h3 className="text-sm font-bold text-slate-800 line-clamp-3 mb-2 leading-tight">
                                                                            {classHere.subject}
                                                                        </h3>
                                                                    </div>
                                                                    <div className="space-y-1.5 mt-2 border-t border-black/5 pt-2">
                                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                                            <MapPin className="h-3 w-3 text-red-400" />
                                                                            {classHere.room}
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                                            <UserCircle className="h-3 w-3 text-indigo-400" />
                                                                            <span className="truncate">{classHere.lecturer}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                                                                            <Clock className="h-3 w-3 text-emerald-400" />
                                                                            Tiết {classHere.startShift}-{classHere.endShift}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    }

                                                    // Empty Cell
                                                    return (
                                                        <div key={day.id} className="col-span-1 border-2 border-dashed border-slate-100 rounded-2xl bg-white/40 flex flex-col items-center justify-center p-2 opacity-50">
                                                            {/* Empty state */}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="list"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2 }}
                            className="bg-transparent"
                        >
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {allSchedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((item, idx) => {
                                    const dayInfo = daysOfWeek.find(d => d.id === item.dayOfWeek);
                                    return (
                                        <div key={idx} className="group relative overflow-hidden rounded-3xl bg-white/80 p-6 shadow-sm ring-1 ring-slate-200 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-lg">
                                            <div className="absolute top-0 right-0 p-4 opacity-10">
                                                <BookOpen className="h-24 w-24 text-blue-900" />
                                            </div>
                                            <div className="relative z-10">
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-full">
                                                        {dayInfo?.name || "Không rõ"}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-400 border border-slate-200 px-2 py-1 rounded-full bg-white">
                                                        {item.courseCode}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-800 mb-1 leading-snug">{item.subject}</h3>
                                                <p className="text-sm font-medium text-slate-500 mb-6">{item.credits} Tín chỉ</p>

                                                <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600"><Clock className="h-3.5 w-3.5" /></div>
                                                            <span>Tiết {item.startShift} - {item.endShift}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                            <div className="p-1.5 rounded-lg bg-red-100 text-red-600"><MapPin className="h-3.5 w-3.5" /></div>
                                                            <span>Phòng {item.room}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                                                            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-600"><UserCircle className="h-3.5 w-3.5" /></div>
                                                            <span>{item.lecturer}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            )}
        </div>
    );
}
