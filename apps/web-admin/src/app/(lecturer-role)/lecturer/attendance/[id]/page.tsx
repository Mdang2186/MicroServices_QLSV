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
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 space-y-6">
            {/* Header / Breadcrumbs */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Link href="/lecturer/attendance" className="hover:text-blue-600 transition-colors">Điểm danh SV</Link>
                    <ChevronRight size={12} />
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Chi tiết buổi học</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 px-4 text-xs font-bold text-slate-500 hover:bg-slate-50"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="h-10 px-8 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100/50 rounded-lg uppercase tracking-wider transition-all active:scale-95"
                    >
                        {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu kết quả
                    </Button>
                </div>
            </div>

             {/* Title Block */}
             <div className="flex items-center justify-between">
                 <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                    Cổng thông tin giảng viên
                    <span className="text-indigo-600">/ Điểm danh sinh viên</span>
                </h1>
            </div>

            {/* Quick Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Môn học</p>
                    <h3 className="text-sm font-black text-slate-800 leading-tight line-clamp-2">{courseClass?.subject?.name}</h3>
                    <p className="text-[10px] font-bold text-indigo-600 mt-2">{courseClass?.code}</p>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Quy mô</p>
                        <h3 className="text-xl font-black text-slate-800 tabular-nums">{enrollments.length} <span className="text-xs text-slate-400 font-bold ml-1">Sinh viên</span></h3>
                    </div>
                    <Users size={20} className="text-slate-200" />
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vắng mặt</p>
                        <div className="flex items-baseline gap-2">
                             <h3 className="text-xl font-black text-rose-500 tabular-nums">{enrollments.filter(e => e.currentStatus === 'ABSENT_UNEXCUSED').length}</h3>
                             <span className="text-[10px] font-bold text-slate-400 uppercase">Không phép</span>
                        </div>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 font-black text-xs">!</div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-4 relative group cursor-pointer hover:border-indigo-400 transition-all bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed" onClick={() => setIsCalendarOpen(!isCalendarOpen)}>
                    <div className="flex items-center justify-between mb-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày điểm danh</p>
                         <CalendarIcon size={14} className="text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-black text-slate-800">{new Date(date).toLocaleDateString('vi-VN')}</h3>
                    <p className="text-[10px] font-bold text-indigo-600">{currentPeriods} Tiết học được xếp</p>

                    {isCalendarOpen && (
                        <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-[280px]" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-4 px-2">
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
                                <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}</span>
                                <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
                            </div>
                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                    <div key={d} className="text-[9px] font-black text-slate-300 uppercase">{d}</div>
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
                                            onClick={() => { if (isCurrentMonth) { setDate(toYYYYMMDD(d)); setIsCalendarOpen(false); } }}
                                            className={cn(
                                                "aspect-square flex flex-col items-center justify-center rounded-xl text-[11px] font-bold cursor-pointer relative transition-all",
                                                !isCurrentMonth && "text-slate-100 cursor-default",
                                                isCurrentMonth && isSelected && "bg-indigo-600 text-white shadow-xl scale-110 z-10",
                                                isCurrentMonth && !isSelected && "hover:bg-indigo-50 text-slate-600"
                                            )}
                                        >
                                            {d.getDate()}
                                            {hasSchedule && isCurrentMonth && (
                                                <div className={cn("h-1 w-1 rounded-full absolute bottom-1", isSelected ? "bg-white" : "bg-indigo-500 animate-pulse")}></div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Danh sách lớp học</h2>
                        
                        <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                             {[
                                { id: "ALL", label: "Tất cả", color: "indigo" },
                                { id: "ABSENT_EXCUSED", label: "Nghỉ có phép", color: "emerald" },
                                { id: "ABSENT_UNEXCUSED", label: "Không phép", color: "rose" }
                             ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setFilterStatus(opt.id as any)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        filterStatus === opt.id 
                                            ? `bg-white text-${opt.color}-600 shadow-sm` 
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {opt.label}
                                </button>
                             ))}
                        </div>
                    </div>

                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sinh viên..."
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto flex-1">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">STT</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin cá nhân</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Lớp hành chính</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-emerald-600 uppercase tracking-widest w-40 underline decoration-emerald-100 decoration-2 underline-offset-4">Nghỉ có phép</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-rose-600 uppercase tracking-widest w-40 underline decoration-rose-100 decoration-2 underline-offset-4">Không phép</th>
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Phản hồi / Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, idx) => (
                                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                                    <td className="py-6 px-8">
                                        <span className="text-[11px] font-black text-slate-200 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400 shadow-sm transition-all group-hover:rotate-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-100">
                                                {e.student?.fullName?.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-800 tracking-tight">{e.student?.fullName}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{e.student?.studentCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4 font-black text-slate-500 text-[11px]">
                                        {e.student?.adminClass?.code || "N/A"}
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT_EXCUSED' ? 'PRESENT' : 'ABSENT_EXCUSED')}
                                                className={cn(
                                                    "h-7 w-7 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm",
                                                    e.currentStatus === 'ABSENT_EXCUSED'
                                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                                        : "bg-white border-slate-200 hover:border-emerald-400 text-transparent"
                                                )}
                                            >
                                                <CheckSquare size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-6 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT_UNEXCUSED' ? 'PRESENT' : 'ABSENT_UNEXCUSED')}
                                                className={cn(
                                                    "h-7 w-7 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm",
                                                    e.currentStatus === 'ABSENT_UNEXCUSED'
                                                        ? "bg-rose-600 border-rose-600 text-white"
                                                        : "bg-white border-slate-200 hover:border-rose-400 text-transparent"
                                                )}
                                            >
                                                <CheckSquare size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <input
                                            type="text"
                                            placeholder="Thêm lý do vắng..."
                                            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-5 py-2.5 text-[10px] font-bold text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-inner"
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
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <SearchX size={48} className="text-slate-200 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                Không tìm thấy dữ liệu tìm kiếm
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-10 py-8 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Thời gian thực: {new Date().toLocaleTimeString('vi-VN')}</span>
                    <div className="flex items-center gap-2 text-indigo-500">
                        <Info size={14} strokeWidth={3} />
                        <span>Nhấn 'Lưu kết quả' để đồng bộ dữ liệu</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
