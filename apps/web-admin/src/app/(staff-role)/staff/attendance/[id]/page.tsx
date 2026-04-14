"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    AlertCircle,
    Users,
    Search,
    Info,
    CheckSquare,
    ChevronRight,
    SearchX,
    ChevronLeft,
    Zap,
    ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

export default function StaffAttendancePage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT_EXCUSED" | "ABSENT">("ALL");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());

    const toYYYYMMDD = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const isDateInSchedule = (checkDate: Date) => {
        if (!courseClass?.sessions) return false;
        return courseClass.sessions.some((s: any) => new Date(s.date).toDateString() === checkDate.toDateString());
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

    const filtered = enrollments.filter(e => {
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
        <div className="min-h-screen p-4 md:p-8 space-y-6 bg-[#fbfcfd]">
            <CompactLecturerHeader 
                userName={user?.fullName || "Cán bộ Quản lý"} 
                userId={`CB-${user?.username || "UNETI"}`}
                minimal={true}
                title={`Xem điểm danh: ${courseClass?.subject?.name || "Lớp học phần"}`}
                onSemesterChange={() => {}} 
            />

            {/* Compact Action Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-black text-uneti-blue uppercase tracking-[0.2em] mb-1">
                        <Zap size={12} />
                        <span>Thông tin học phần (Chế độ xem)</span>
                    </div>
                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
                        {courseClass?.name || courseClass?.subject?.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 underline decoration-uneti-blue/20 decoration-2 underline-offset-4">
                         <span className="text-[10px] font-black text-slate-400 uppercase italic leading-none">{courseClass?.code}</span>
                         <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter leading-none">{courseClass?.semester?.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    <div className="relative" onClick={(e) => { e.stopPropagation(); setIsCalendarOpen(!isCalendarOpen); }}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-right">Ngày học</p>
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-slate-100">
                             <CalendarIcon size={14} className="text-indigo-500" />
                             <span className="text-sm font-black text-slate-800">{new Date(date).toLocaleDateString('vi-VN')}</span>
                        </div>
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

                    <Button
                        variant="ghost"
                        onClick={() => router.back()}
                        className="h-10 px-6 text-xs font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 uppercase tracking-widest transition-all rounded-xl border border-slate-100"
                    >
                        <ArrowLeft size={16} className="mr-2" /> Quay lại
                    </Button>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-30">
                    <div className="flex items-center gap-6">
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

                <div className="overflow-y-auto flex-1 scrollbar-hide">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-20 shadow-sm">
                            <tr className="bg-slate-50/80 backdrop-blur-sm">
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">STT</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin cá nhân</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Lớp hành chính</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest w-40">Trạng thái</th>
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, idx) => (
                                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all group">
                                    <td className="py-4 px-8">
                                        <span className="text-[11px] font-black text-slate-200 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-9 w-9 rounded-xl bg-white border-2 border-slate-100 flex items-center justify-center text-[11px] font-black text-slate-400 shadow-sm transition-all group-hover:rotate-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-100">
                                                {e.student?.fullName?.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-800 tracking-tight">{e.student?.fullName}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded uppercase w-fit">{e.student?.studentCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 font-black text-slate-500 text-[11px]">
                                        {e.student?.adminClass?.code || "N/A"}
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            {e.currentStatus === 'PRESENT' ? (
                                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-wider">Có mặt</span>
                                            ) : e.currentStatus === 'ABSENT_EXCUSED' ? (
                                                <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-wider">Vắng (P)</span>
                                            ) : (
                                                <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[9px] font-black uppercase tracking-wider">Vắng (KP)</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-8 text-[11px] font-medium text-slate-500 italic">
                                        {e.note || "---"}
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

                <div className="px-10 py-5 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest sticky bottom-0 bg-white z-30">
                    <span>Thời gian thực: {new Date().toLocaleTimeString('vi-VN')}</span>
                    <div className="flex items-center gap-2 text-indigo-500">
                        <Info size={14} strokeWidth={3} />
                        <span>Chế độ Chỉ xem - Không thể chỉnh sửa</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
