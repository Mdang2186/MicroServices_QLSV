"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ArrowLeft,
    Save,
    AlertCircle,
    CheckCircle2,
    Users,
    Search,
    Info,
    CheckSquare,
    ChevronRight,
    SearchX,
    ChevronLeft,
    ChevronRight as ChevronRightIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LecturerAttendancePage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT_EXCUSED" | "ABSENT">("ALL");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());

    const toYYYYMMDD = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const isDateInSchedule = (checkDate: Date) => {
        if (!courseClass?.schedules) return false;
        const jsDay = checkDate.getDay();
        const prismaDay = jsDay === 0 ? 8 : jsDay + 1;
        return courseClass.schedules.some((s: any) => s.dayOfWeek === prismaDay);
    };

    const getPeriodsForDate = (checkDate: Date) => {
        if (!courseClass?.schedules) return 0;
        const jsDay = checkDate.getDay();
        const prismaDay = jsDay === 0 ? 8 : jsDay + 1;
        const schedules = courseClass.schedules.filter((s: any) => s.dayOfWeek === prismaDay);
        return schedules.reduce((acc: number, s: any) => acc + (s.endShift - s.startShift + 1), 0);
    };

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!classId || !TOKEN) return;

        const fetchData = async () => {
            try {
                const [enrollmentRes, classRes] = await Promise.all([
                    fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    }),
                    fetch(`/api/courses/classes/${classId}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    })
                ]);

                if (enrollmentRes.ok && classRes.ok) {
                    const data = await enrollmentRes.json();
                    const classData = await classRes.json();
                    setCourseClass(classData);

                    const transformed = data.map((e: any) => {
                        const existingAtt = e.attendances?.find((a: any) => a.date.startsWith(date));
                        return {
                            ...e,
                            currentStatus: existingAtt?.status || "PRESENT",
                            note: existingAtt?.note || ""
                        };
                    });
                    setEnrollments(transformed);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId, TOKEN, date]);

    const handleStatusChange = (enrollmentId: string, status: string) => {
        setEnrollments(prev => prev.map(e =>
            e.id === enrollmentId ? { ...e, currentStatus: status } : e
        ));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ text: "", type: "" });

        try {
            const body = {
                date,
                attendances: enrollments.map(e => ({
                    enrollmentId: e.id,
                    status: e.currentStatus,
                    note: e.note
                }))
            };

            const res = await fetch(`/api/enrollments/attendance/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setMessage({ text: "Đã lưu thông tin điểm danh của " + enrollments.length + " sinh viên", type: "success" });
                setTimeout(() => setMessage({ text: "", type: "" }), 3000);
            } else {
                throw new Error("Lỗi khi lưu dữ liệu");
            }
        } catch (error) {
            setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const currentPeriods = getPeriodsForDate(new Date(date));

    const filtered = enrollments.filter(e => {
        const checkD = new Date(date);
        if (!isDateInSchedule(checkD)) return false;

        const matchesSearch = e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || e.currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 bg-[#fcfdfe]">
            {/* Nav & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Link href="/lecturer/courses" className="hover:text-indigo-600">Lớp học phần</Link>
                        <ChevronRightIcon size={10} />
                        <span className="text-indigo-600">Điểm danh</span>
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        {courseClass?.subject?.name}
                        <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded-md">{courseClass?.code}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 rounded-xl px-4 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-slate-200"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 rounded-xl px-6 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
                    >
                        {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full"></div> : <Save className="mr-2 h-4 w-4" />}
                        Lưu kết quả
                    </Button>
                </div>
            </div>

            {/* Quick Info & Date Selection */}
            <div className="grid grid-cols-1 gap-4">
                <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-md bg-slate-50 text-slate-500 flex items-center justify-center shrink-0 border border-slate-200">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Thống kê điểm danh</p>
                            <div className="flex items-center gap-6">
                                <h3 className="text-base font-black text-slate-800 tabular-nums">{enrollments.length} <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">Học viên</span></h3>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[10px] font-bold text-slate-600">{enrollments.filter(e => e.currentStatus === 'ABSENT_EXCUSED').length} Nghỉ có phép</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                                        <span className="text-[10px] font-bold text-slate-600">{enrollments.filter(e => e.currentStatus === 'ABSENT').length} Nghỉ không phép</span>
                                    </div>
                                </div>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{currentPeriods} Tiết/Buổi</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end gap-1.5 w-full md:w-auto relative">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày điểm danh</p>
                        <div 
                            className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-400 transition-colors"
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        >
                            <CalendarIcon size={14} className="text-indigo-600 ml-1" />
                            <span className="text-xs font-bold text-slate-700 min-w-[100px]">
                                {new Date(date).toLocaleDateString('vi-VN')}
                            </span>
                            <ChevronRightIcon size={14} className={cn("text-slate-400 transition-transform", isCalendarOpen && "rotate-90")} />
                        </div>

                        {/* Custom Calendar Dropdown */}
                        {isCalendarOpen && (
                            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-3 w-[260px]">
                                <div className="flex items-center justify-between mb-3">
                                    <button 
                                        onClick={(ev) => { ev.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)); }}
                                        className="p-1 hover:bg-slate-100 rounded"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                                        Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}
                                    </span>
                                    <button 
                                        onClick={(ev) => { ev.stopPropagation(); setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)); }}
                                        className="p-1 hover:bg-slate-100 rounded"
                                    >
                                        <ChevronRightIcon size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-1">
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                        <div key={d} className="text-[8px] font-bold text-slate-400 uppercase">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: 42 }).map((_, i) => {
                                        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                                        const startIdx = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                                        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i - startIdx + 1);
                                        const isSelected = toYYYYMMDD(d) === date;
                                        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                                        const hasSchedule = isDateInSchedule(d);

                                        return (
                                            <div 
                                                key={i}
                                                onClick={(ev) => {
                                                    ev.stopPropagation();
                                                    if (isCurrentMonth) {
                                                        setDate(toYYYYMMDD(d));
                                                        setIsCalendarOpen(false);
                                                    }
                                                }}
                                                className={cn(
                                                    "aspect-square flex flex-col items-center justify-center rounded text-[10px] font-bold cursor-pointer relative",
                                                    !isCurrentMonth && "text-slate-200 cursor-default",
                                                    isCurrentMonth && isSelected && "bg-indigo-600 text-white shadow-sm",
                                                    isCurrentMonth && !isSelected && "hover:bg-slate-50 text-slate-600"
                                                )}
                                            >
                                                {d.getDate()}
                                                {hasSchedule && isCurrentMonth && (
                                                    <div className={cn("h-1 w-1 rounded-full absolute bottom-1", isSelected ? "bg-white" : "bg-emerald-500")}></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Alert */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        className={cn(
                            "p-5 rounded-[2rem] border flex items-center justify-between gap-4 shadow-lg",
                            message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800 shadow-emerald-100/20" : "bg-rose-50 border-rose-100 text-rose-800 shadow-rose-100/20"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", message.type === 'success' ? "bg-emerald-100 text-emerald-600" : "bg-rose-100 text-rose-600")}>
                                {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest">{message.text}</p>
                        </div>
                        <button onClick={() => setMessage({ text: "", type: "" })} className="p-2 hover:bg-black/5 rounded-full text-slate-400">
                            <SearchX size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Table & Search */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                {/* Search Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Danh sách sinh viên</h2>
                        
                        <div className="flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                            <button
                                onClick={() => setFilterStatus("ALL")}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === 'ALL' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                Tất cả
                            </button>
                            <button
                                onClick={() => setFilterStatus("ABSENT_EXCUSED")}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === 'ABSENT_EXCUSED' ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-emerald-600"
                                )}
                            >
                                Nghỉ có phép
                            </button>
                            <button
                                onClick={() => setFilterStatus("ABSENT")}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === 'ABSENT' ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-rose-600"
                                )}
                            >
                                Nghỉ không phép
                            </button>
                        </div>
                    </div>

                    <div className="relative w-full md:w-60">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 focus:ring-1 focus:ring-indigo-100 transition-all placeholder:text-slate-300 outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Table View */}
                <div className="flex-1 overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50">
                                <th className="py-4 px-8 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16">STT</th>
                                <th className="py-4 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thông tin sinh viên</th>
                                <th className="py-4 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lớp hành chính</th>
                                <th className="py-4 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-36">Nghỉ có phép</th>
                                <th className="py-4 px-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest w-36">Nghỉ không phép</th>
                                <th className="py-4 px-8 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, idx) => (
                                <tr key={e.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-6 px-10">
                                        <span className="text-xs font-black text-slate-300 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border-2 border-white shadow-sm transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-100 group-hover:rotate-3">
                                                {e.student?.fullName?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-xs font-black text-slate-800 tracking-tight">{e.student?.fullName}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">{e.student?.studentCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <span className="text-[11px] font-black text-slate-500 bg-slate-100/50 px-2 py-1 rounded-md border border-slate-200">
                                            {e.student?.adminClass?.code || "N/A"}
                                        </span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT_EXCUSED' ? 'PRESENT' : 'ABSENT_EXCUSED')}
                                                className={cn(
                                                    "h-6 w-6 rounded border-2 transition-all flex items-center justify-center",
                                                    e.currentStatus === 'ABSENT_EXCUSED'
                                                        ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                                                        : "bg-white border-slate-200 hover:border-emerald-400"
                                                )}
                                            >
                                                {e.currentStatus === 'ABSENT_EXCUSED' && <CheckSquare size={14} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT' ? 'PRESENT' : 'ABSENT')}
                                                className={cn(
                                                    "h-6 w-6 rounded border-2 transition-all flex items-center justify-center",
                                                    e.currentStatus === 'ABSENT'
                                                        ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                                                        : "bg-white border-slate-200 hover:border-rose-400"
                                                )}
                                            >
                                                {e.currentStatus === 'ABSENT' && <CheckSquare size={14} strokeWidth={3} />}
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-6 px-10">
                                        <input
                                            type="text"
                                            placeholder="Thêm ghi chú..."
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 focus:bg-white focus:ring-1 focus:ring-indigo-300 outline-none transition-all"
                                            value={e.note || ""}
                                            onChange={(ev) => {
                                                const val = ev.target.value;
                                                setEnrollments(prev => prev.map(enr => 
                                                    enr.id === e.id ? { ...enr, note: val } : enr
                                                ));
                                            }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-40">
                            <SearchX size={48} className="text-slate-200 mb-4" />
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                {!isDateInSchedule(new Date(date)) ? "Ngày này không có lịch học" : "Không tìm thấy dữ liệu"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Thời gian hệ thống: {new Date().toLocaleTimeString('vi-VN')}</span>
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-indigo-400" />
                        <span>Nhấn 'Lưu kết quả' để ghi nhận dữ liệu</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
