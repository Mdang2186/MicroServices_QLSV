"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
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
import { getStudentUserId, readStudentSessionUser } from "@/lib/student-session";
import ScheduleListView from "./ScheduleListView";

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
    { name: "Chủ nhật", short: "CN", value: 8 },
];

const LEGEND = [
    { label: "Lý thuyết", color: "bg-white border-slate-200", textColor: "text-slate-500" },
    { label: "Thực hành", color: "bg-green-50/80 border-green-100", textColor: "text-green-700" },
    { label: "Lịch thi", color: "bg-yellow-50/80 border-yellow-200", textColor: "text-yellow-700" },
];

type SemesterOption = {
    id: string;
    code?: string;
    name: string;
    startDate?: Date | null;
    endDate?: Date | null;
    sessionDates: Date[];
};

const normalizeDate = (value: any) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getSemesterSortTime = (semester: SemesterOption) => {
    const lastSession = semester.sessionDates[semester.sessionDates.length - 1];
    return (lastSession || semester.endDate || semester.startDate || new Date(0)).getTime();
};

const formatSemesterOptionLabel = (semester: Partial<SemesterOption>) => {
    const code = `${semester.code || ""}`.trim();
    const name = `${semester.name || ""}`.trim();

    if (!code) return name || "Học kỳ";
    if (!name) return code;
    if (name.toUpperCase().includes(code.toUpperCase())) return name;
    return `${code} - ${name}`;
};

const pickSemesterAnchorDate = (semester: SemesterOption) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = semester.startDate ? new Date(semester.startDate) : null;
    const endDate = semester.endDate ? new Date(semester.endDate) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    if (startDate && endDate && today >= startDate && today <= endDate) {
        return today;
    }

    const futureSession = semester.sessionDates.find((date) => date >= today);
    if (futureSession) {
        return new Date(futureSession);
    }

    if (semester.sessionDates.length > 0) {
        return new Date(semester.sessionDates[0]);
    }

    if (startDate) {
        return new Date(startDate);
    }

    return today;
};

const isDateWithinSemester = (date: Date, semester: SemesterOption | null) => {
    if (!semester) return true;
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);

    const startDate = semester.startDate ? new Date(semester.startDate) : null;
    const endDate = semester.endDate ? new Date(semester.endDate) : null;

    if (!startDate || !endDate) {
        return true;
    }

    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    return target >= startDate && target <= endDate;
};

export default function SchedulePage() {
    return <ScheduleListView />;
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [allSemesters, setAllSemesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        fetch("/api/semesters")
            .then((response) => (response.ok ? response.json() : []))
            .then((data) => setAllSemesters(Array.isArray(data) ? data : []))
            .catch(() => setAllSemesters([]));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = readStudentSessionUser();
                const userId = getStudentUserId(user);
                if (!userId) return;

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

    const semesterOptions = useMemo<SemesterOption[]>(() => {
        const semesterMap = new Map<string, SemesterOption & { sessionKeys: Set<string> }>();

        allSemesters.forEach((semester) => {
            if (!semester?.id) return;
            semesterMap.set(semester.id, {
                id: semester.id,
                code: semester.code,
                name: semester.name || semester.id,
                startDate: normalizeDate(semester.startDate),
                endDate: normalizeDate(semester.endDate),
                sessionDates: [],
                sessionKeys: new Set<string>(),
            });
        });

        enrollments.forEach((enrollment) => {
            const semester = enrollment.courseClass?.semester;
            const semesterId = enrollment.courseClass?.semesterId || semester?.id;
            if (!semesterId) return;

            const existing = semesterMap.get(semesterId);
            const sessionDates = (enrollment.courseClass?.sessions || [])
                .map((session: any) => normalizeDate(session.date))
                .filter(Boolean) as Date[];

            if (!existing) {
                const option: SemesterOption & { sessionKeys: Set<string> } = {
                    id: semesterId,
                    code: semester?.code,
                    name: semester?.name || semesterId,
                    startDate: normalizeDate(semester?.startDate),
                    endDate: normalizeDate(semester?.endDate),
                    sessionDates: [],
                    sessionKeys: new Set<string>(),
                };

                sessionDates.forEach((date) => {
                    const key = date.toISOString();
                    if (!option.sessionKeys.has(key)) {
                        option.sessionKeys.add(key);
                        option.sessionDates.push(date);
                    }
                });

                semesterMap.set(semesterId, option);
                return;
            }

            sessionDates.forEach((date) => {
                const key = date.toISOString();
                if (!existing.sessionKeys.has(key)) {
                    existing.sessionKeys.add(key);
                    existing.sessionDates.push(date);
                }
            });
        });

        return Array.from(semesterMap.values())
            .map(({ sessionKeys, ...semester }) => ({
                ...semester,
                sessionDates: [...semester.sessionDates].sort(
                    (left, right) => left.getTime() - right.getTime(),
                ),
            }))
            .sort((left, right) => getSemesterSortTime(right) - getSemesterSortTime(left));
    }, [allSemesters, enrollments]);

    useEffect(() => {
        if (!semesterOptions.length) {
            setSelectedSemesterId("");
            return;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const semestersWithSessions = semesterOptions.filter(
            (semester) => semester.sessionDates.length > 0,
        );
        const preferredSemesters =
            semestersWithSessions.length > 0 ? semestersWithSessions : semesterOptions;

        const currentSemester =
            preferredSemesters.find((semester) => {
                const startDate = semester.startDate ? new Date(semester.startDate) : null;
                const endDate = semester.endDate ? new Date(semester.endDate) : null;
                if (!startDate || !endDate) return false;
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);
                return today >= startDate && today <= endDate;
            }) || preferredSemesters[0];

        setSelectedSemesterId((current) =>
            preferredSemesters.some((semester) => semester.id === current)
                ? current
                : currentSemester.id,
        );
    }, [semesterOptions]);

    useEffect(() => {
        if (!selectedSemesterId) return;
        const selectedSemester = semesterOptions.find(
            (semester) => semester.id === selectedSemesterId,
        );
        if (!selectedSemester) return;
        setSelectedDate(pickSemesterAnchorDate(selectedSemester));
    }, [selectedSemesterId, semesterOptions]);

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

    const selectedSemester = useMemo(
        () =>
            semesterOptions.find((semester) => semester.id === selectedSemesterId) || null,
        [semesterOptions, selectedSemesterId],
    );

    const visibleEnrollments = useMemo(() => {
        if (!selectedSemesterId) return enrollments;
        return enrollments.filter((enrollment) => {
            const semesterId =
                enrollment.courseClass?.semesterId || enrollment.courseClass?.semester?.id;
            return semesterId === selectedSemesterId;
        });
    }, [enrollments, selectedSemesterId]);

    const getSchedulesForDayAndSession = (dayValue: number, sessionValue: string) => {
        const targetJsDay = dayValue === 8 ? 0 : dayValue - 1;
        const dateAtIdx = weekDays.find(d => d.getDay() === targetJsDay);
        if (!dateAtIdx) return [];

        return visibleEnrollments.flatMap(enr => {
            const schedules = enr.courseClass?.sessions || [];
            return schedules
                .filter((s: any) => {
                    const sessionDateStr = new Date(s.date).toDateString();
                    if (sessionDateStr !== dateAtIdx.toDateString()) return false;

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

                <div className="flex items-center gap-2 flex-wrap">
                    <select
                        value={selectedSemesterId}
                        onChange={(event) => setSelectedSemesterId(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none"
                    >
                        {semesterOptions.map((semester) => (
                            <option key={semester.id} value={semester.id}>
                                {formatSemesterOptionLabel(semester)}
                            </option>
                        ))}
                    </select>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            const today = new Date();
                            if (isDateWithinSemester(today, selectedSemester)) {
                                setSelectedDate(today);
                                return;
                            }
                            if (selectedSemester) {
                                setSelectedDate(pickSemesterAnchorDate(selectedSemester));
                                return;
                            }
                            setSelectedDate(today);
                        }}
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"
                    >
                        <CalendarCheck className="mr-2 h-4 w-4" /> Hôm nay
                    </Button>

                </div>
            </div>

            {selectedSemester && (
                <div className="rounded-sm border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-bold text-slate-600">
                    Đang xem lịch của: <span className="text-blue-700">{selectedSemester.name}</span>
                    {selectedSemester.startDate && selectedSemester.endDate && (
                        <span className="ml-2 text-slate-500">
                            ({selectedSemester.startDate.toLocaleDateString("vi-VN")} - {selectedSemester.endDate.toLocaleDateString("vi-VN")})
                        </span>
                    )}
                </div>
            )}

            {selectedSemester && !isDateWithinSemester(selectedDate, selectedSemester) && (
                <div className="rounded-sm border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] font-bold text-amber-700">
                    Tuần đang xem nằm ngoài học kỳ đã chọn. Hệ thống khuyên dùng nút <span className="font-black">Về tuần có lịch</span> để quay về tuần có buổi học thật.
                </div>
            )}

            {selectedSemester &&
                visibleEnrollments.length > 0 &&
                visibleEnrollments.every(
                    (enrollment) =>
                        !Array.isArray(enrollment.courseClass?.sessions) ||
                        enrollment.courseClass.sessions.length === 0,
                ) && (
                    <div className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] font-bold text-rose-700">
                        Bạn đã có học phần trong học kỳ này nhưng chưa có buổi học nào được xếp lịch.
                    </div>
                )}

            {/* Schedule Grid */}
            <div className="bg-white rounded-none border border-slate-200 shadow-sm overflow-hidden relative">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full blur-3xl -mr-32 -mt-32"></div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[1160px]">
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
