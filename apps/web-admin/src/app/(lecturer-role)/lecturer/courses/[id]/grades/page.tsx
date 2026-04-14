"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronRight,
    ArrowLeft,
    Save,
    Users,
    Search,
    AlertCircle,
    CheckCircle2,
    Calculator,
    TrendingUp,
    Info,
    GraduationCap,
    Lock,
    Unlock,
    ShieldAlert,
    X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LecturerGradesPage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchQuery, setSearchQuery] = useState("");

    const TOKEN = Cookies.get("admin_accessToken");

    const credits = courseClass?.subject?.credits ?? 3;
    const isTheory = (courseClass?.subject?.theoryHours ?? 0) > 0
        || (courseClass?.subject?.practiceHours ?? 0) === 0;

    useEffect(() => {
        if (!classId || !TOKEN) return;

        const fetchData = async () => {
            try {
                const [gradeRes, classRes, enrollmentRes] = await Promise.all([
                    fetch(`/api/grades/class/${classId}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    }),
                    fetch(`/api/courses/classes/${classId}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    }),
                    fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    })
                ]);

                if (gradeRes.ok && classRes.ok && enrollmentRes.ok) {
                    const gradeData = await gradeRes.json();
                    const classData = await classRes.json();
                    const enrollmentData = await enrollmentRes.json();
                    
                    setCourseClass(classData);

                    // Check deadline
                    const deadline = classData.semester?.midtermGradeDeadline;
                    if (deadline) {
                        const now = new Date();
                        const dlDate = new Date(deadline);
                        const diffDays = Math.ceil((dlDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        
                        if (now > dlDate) {
                            setMessage({ text: "Đã quá hạn nhập điểm giữa kỳ. Bảng điểm đã bị khóa.", type: "error" });
                        } else if (diffDays <= 14) {
                            setMessage({ text: `Hạn nhập điểm giữa kỳ còn ${diffDays} ngày (${dlDate.toLocaleDateString('vi-VN')}). Vui lòng hoàn thành sớm.`, type: "warning" });
                        }
                    }

                    // Merge attendance info into grades + auto-calculate CC score
                    const merged = gradeData.map((g: any) => {
                        const enr = enrollmentData.find((e: any) => e.studentId === g.studentId);
                        const attendances = enr?.attendances || [];
                        const totalPeriods = attendances.length;
                        const absentPeriods = attendances.filter((a: any) =>
                            a.status === 'ABSENT' || a.status === 'ABSENT_UNEXCUSED'
                        ).length;

                        // Tính % vắng và điểm CC theo quy chế UNETI
                        const missedPct = totalPeriods > 0 ? (absentPeriods / totalPeriods) * 100 : 0;
                        let autoCC: number | null = null;
                        let isIneligible = false;
                        if (totalPeriods > 0) {
                            if (missedPct === 0)       autoCC = 10;
                            else if (missedPct < 10)   autoCC = 8;
                            else if (missedPct < 20)   autoCC = 6;
                            else if (missedPct < 35)   autoCC = 4;
                            else if (missedPct < 50)   autoCC = 2;
                            else { autoCC = 0; isIneligible = true; } // >= 50%: cấm thi
                        }

                        return {
                            ...g,
                            // Override CC với giá trị tự động nếu có dữ liệu điểm danh
                            attendanceScore: autoCC !== null ? autoCC : (g.attendanceScore ?? null),
                            attendanceAutoCalc: autoCC !== null, // flag: CC đã tự động tính
                            isIneligible,
                            totalPeriods,
                            absentPeriods,
                            missedPct: Math.round(missedPct * 10) / 10
                        };
                    });
                    
                    setEnrollments(merged);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId, TOKEN]);

    // ─── Helpers ─────────────────────────────────────────────────────────────
    const mapGradeLetter = (score: number): string => {
        if (score >= 8.5) return 'A';
        if (score >= 7.8) return 'B+';
        if (score >= 7.0) return 'B';
        if (score >= 6.3) return 'C+';
        if (score >= 5.5) return 'C';
        if (score >= 4.8) return 'D+';
        if (score >= 4.0) return 'D';
        if (score >= 3.0) return 'F+';
        return 'F';
    };

    const handleGradeChange = (gradeId: string, field: string, value: string) => {
        const numValue = value === "" ? null : parseFloat(value);
        if (numValue !== null && (numValue < 0 || numValue > 10)) return;

        setEnrollments(prev => prev.map(g => {
            if (g.id === gradeId) {
                if (g.isLocked) return g;
                const updated = { ...g, [field]: numValue };

                // CC read-only nếu đã tự động tính từ điểm danh
                const cc  = updated.attendanceScore ?? 0;  // Chuyên cần
                const dkd = updated.regularScore1   ?? 0;  // ĐKĐ (HT2)
                const tx  = updated.regularScore2   ?? 0;  // TX (HT1)
                const fin = updated.finalScore       ?? 0;  // Thi kết thúc

                let processAvg = 0;
                let total10    = 0;

                // Sinh viên cấm thi: điểm thi tính = 0
                const effectiveFin = updated.isIneligible ? 0 : fin;

                if (isTheory) {
                    /**
                     * Điều 1a – Học phần Lý thuyết:
                     *   ĐQT = (CC×credits + ĐKĐ×2 + TX×1) / (credits + 3)
                     *   ĐHP = ĐQT × 0.4 + Thi × 0.6
                     */
                    const qt = (cc * credits + dkd * 2 + tx * 1) / (credits + 3);
                    processAvg = Math.round(qt * 10) / 10;
                    total10    = Math.round((processAvg * 0.4 + effectiveFin * 0.6) * 10) / 10;
                } else {
                    /**
                     * Điều 2a – Học phần Thực hành / Đồ án:
                     *   ĐHP = (CC×1 + ĐKĐ×credits) / (1 + credits) — (không có thi)
                     */
                    total10    = Math.round(((cc + dkd * credits) / (1 + credits)) * 10) / 10;
                    processAvg = total10;
                }

                updated.midtermScore  = processAvg;
                updated.totalScore10  = total10;
                updated.letterGrade   = mapGradeLetter(total10);
                updated.isPassed      = total10 >= 5.5;

                return updated;
            }
            return g;
        }));
    };

    const handleSave = async (showMsg = true) => {
        setSaving(true);
        if (showMsg) setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`/api/grades/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ grades: enrollments })
            });

            if (res.ok) {
                if (showMsg) {
                    setMessage({ text: "Đã lưu bảng điểm thành công", type: "success" });
                    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
                }
                return true;
            } else {
                throw new Error("Lỗi khi lưu dữ liệu");
            }
        } catch (error) {
            if (showMsg) setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại.", type: "error" });
            return false;
        } finally {
            setSaving(false);
        }
    };

    const handleLock = async () => {
        if (!confirm("Sau khi 'Gửi điểm', bạn sẽ không thể chỉnh sửa trừ khi có yêu cầu mở khóa. Bạn có chắc chắn?")) return;
        
        const saved = await handleSave(false);
        if (!saved) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/grades/submit/${classId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });

            if (res.ok) {
                setMessage({ text: "Bảng điểm đã được gửi và khóa", type: "success" });
                setEnrollments(prev => prev.map(e => ({ ...e, isLocked: true })));
            }
        } catch (error) {
            setMessage({ text: "Lỗi khi khóa bảng điểm", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const filtered = enrollments.filter(e =>
        e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Nav & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Link href="/lecturer/courses" className="hover:text-indigo-600">Lớp học phần</Link>
                        <ChevronRight size={10} />
                        <span className="text-blue-600 px-2 py-0.5 bg-blue-50 rounded-lg">Nhập điểm</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 mt-2">
                        {courseClass?.subject?.name}
                        <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded-lg">{courseClass?.code}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => handleSave()}
                        disabled={saving || enrollments.some(e => e.isLocked) || (courseClass?.semester?.midtermGradeDeadline && new Date() > new Date(courseClass.semester.midtermGradeDeadline))}
                        className="h-12 rounded-xl px-6 text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                    >
                        <Save className="mr-2 h-4 w-4" /> Lưu nháp
                    </Button>
                    <Button
                        onClick={handleLock}
                        disabled={saving || enrollments.some(e => e.isLocked) || (courseClass?.semester?.midtermGradeDeadline && new Date() > new Date(courseClass.semester.midtermGradeDeadline))}
                        className="h-12 rounded-xl px-8 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest disabled:opacity-50"
                    >
                        {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full"></div> : <ShieldAlert className="mr-2 h-4 w-4" />}
                        Gửi điểm & Khóa
                    </Button>
                </div>
            </div>

            {/* Quick Stats & Rules Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Sinh viên</p>
                        <h3 className="text-sm font-black text-slate-800">{enrollments.length}</h3>
                    </div>
                    <Users size={16} className="text-slate-200" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 flex items-center justify-between">
                    <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Hoàn tất</p>
                        <h3 className="text-sm font-black text-emerald-600 font-mono italic">
                            {enrollments.filter(e => e.finalScore !== null || !isTheory).length}/{enrollments.length}
                        </h3>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-100" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 md:col-span-2 flex items-center gap-6">
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                            Công thức tính điểm ({isTheory ? "LÝ THUYẾT" : "THỰC HÀNH"})
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {isTheory ? (
                                <>
                                    <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">QT (40%)</span>
                                    <span className="text-[10px] font-black text-slate-400">+</span>
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Thi (60%)</span>
                                </>
                            ) : (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">TRUNG BÌNH CỘNG (CC + ĐKĐ)</span>
                            )}
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">
                            {isTheory 
                                ? `QT = (CC×${courseClass?.subject?.credits ?? 3} + ĐKĐ×2 + TX×1) / ${(courseClass?.subject?.credits ?? 3) + 3}`
                                : `HP = (CC×1 + ĐKĐ×${courseClass?.subject?.credits ?? 3}) / ${(courseClass?.subject?.credits ?? 3) + 1}`
                            }
                        </p>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                             {isTheory 
                                ? `Trọng số: CC(×${courseClass?.subject?.credits ?? 3}) · ĐKĐ(×2) · TX(×1)`
                                : `Trọng số: CC(×1) · ĐKĐ(×${courseClass?.subject?.credits ?? 3})`
                             }
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Alert */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                            "p-4 border flex items-center justify-between gap-4 rounded-xl",
                            message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : 
                            message.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-800" :
                            "bg-rose-50 border-rose-100 text-rose-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : 
                             message.type === 'warning' ? <Info size={16} className="animate-pulse" /> :
                             <AlertCircle size={16} />}
                            <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
                        </div>
                        <button onClick={() => setMessage({ text: "", type: "" })} className="p-1 hover:bg-black/5 rounded">
                            <X size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grade Table */}
            <div className="bg-white border border-slate-200 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bảng ghi điểm học phần</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <Info size={12} />
                            <span>Nhập điểm thang 10. Hệ thống tự động tính điểm tổng kết.</span>
                        </div>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
                                <th className="py-2.5 px-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">STT</th>
                                <th className="py-2.5 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sinh viên</th>
                                <th className="py-2.5 px-6 text-center text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/50 border-b border-blue-100" title={isTheory ? "Chuyên cần — hệ số bằng số tín chỉ" : "Chuyên cần — hệ số 1"}>
                                    CC (×{isTheory ? credits : 1})
                                </th>
                                <th className={cn(
                                    "py-2.5 px-6 text-center text-[9px] font-black uppercase tracking-widest bg-emerald-50/50 border-b border-emerald-100",
                                    isTheory ? "text-emerald-700" : "text-emerald-800"
                                )} title={isTheory ? "Kiểm tra Định kỳ — hệ số 2" : "Kiểm tra Định kỳ — hệ số 1"}>
                                    ĐKĐ (×{isTheory ? 2 : credits})
                                </th>
                                {isTheory && (
                                    <th className="py-2.5 px-6 text-center text-[9px] font-black text-teal-700 uppercase tracking-widest bg-teal-50/50 border-b border-teal-100" title="Kiểm tra Thường xuyên — hệ số 1">
                                        TX (×1)
                                    </th>
                                )}
                                <th className="py-2.5 px-6 text-center text-[9px] font-black text-amber-700 uppercase tracking-widest bg-amber-50/50 border-b border-amber-100" title={isTheory ? "Điểm Quá trình — chiếm 40%" : "Điểm Học phần — trung bình cộng"}>
                                    {isTheory ? "ĐQT (40%)" : "ĐHP"}
                                </th>
                                {isTheory && (
                                    <th className="py-2.5 px-6 text-center text-[9px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50/50 border-b border-indigo-100" title="Điểm thi kết thúc học phần — chiếm 60%">
                                        Thi (60%)
                                    </th>
                                )}
                                <th className="py-2.5 px-8 text-center text-[9px] font-black text-slate-700 uppercase tracking-widest border-b border-slate-100">Tổng kết</th>
                                <th className="py-2.5 px-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((g, idx) => {
                                const isFinalBanned = g.attendanceScore === 0 && g.attendanceAutoCalc;
                                return (
                                    <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-6 text-[10px] font-bold text-slate-300 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td className="py-4 px-4 min-w-[180px]">
                                            <div className="flex items-center gap-3">
                                                <div className="space-y-0.5">
                                                    <p className="text-[11px] font-black text-slate-800 uppercase leading-none">{g.student?.fullName}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 tabular-nums">{g.student?.studentCode}</p>
                                                </div>
                                                {isFinalBanned && (
                                                    <ShieldAlert size={14} className="text-rose-500 shrink-0" />
                                                )}
                                            </div>
                                        </td>
                                        {/* CC */}
                                        <td className="py-4 px-6 text-center bg-blue-50/5">
                                            <div className="flex flex-col items-center gap-1">
                                                <input
                                                    type="number"
                                                    readOnly={g.attendanceAutoCalc}
                                                    disabled={g.isLocked}
                                                    className={cn(
                                                        "w-14 h-9 text-center text-xs font-black rounded-lg border outline-none transition-all",
                                                        g.attendanceAutoCalc
                                                            ? "bg-blue-50 border-blue-100 text-blue-600"
                                                            : "bg-white border-slate-200 focus:ring-2 focus:ring-blue-100",
                                                        g.attendanceScore === 0 && "text-rose-600 border-rose-100 bg-rose-50"
                                                    )}
                                                    value={g.attendanceScore ?? ""}
                                                    onChange={(e) => !g.attendanceAutoCalc && handleGradeChange(g.id, 'attendanceScore', e.target.value)}
                                                />
                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Tự động</span>
                                            </div>
                                        </td>
                                        {/* ĐKĐ */}
                                        <td className="py-4 px-6 text-center bg-emerald-50/5">
                                            <input
                                                type="number"
                                                disabled={g.isLocked}
                                                placeholder="—"
                                                className="w-14 h-9 text-center text-xs font-black rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                                                value={g.regularScore1 ?? ""}
                                                onChange={(e) => handleGradeChange(g.id, 'regularScore1', e.target.value)}
                                            />
                                        </td>
                                        {/* TX */}
                                        {isTheory && (
                                            <td className="py-4 px-6 text-center bg-teal-50/5">
                                                <input
                                                    type="number"
                                                    disabled={g.isLocked}
                                                    placeholder="—"
                                                    className="w-14 h-9 text-center text-xs font-black rounded-lg border border-slate-200 focus:ring-2 focus:ring-teal-100 outline-none transition-all"
                                                    value={g.regularScore2 ?? ""}
                                                    onChange={(e) => handleGradeChange(g.id, 'regularScore2', e.target.value)}
                                                />
                                            </td>
                                        )}
                                        {/* ĐQT / ĐHP */}
                                        <td className="py-4 px-6 text-center bg-amber-50/5">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={cn(
                                                    "text-sm font-black tabular-nums",
                                                    g.totalScore10 !== null ? (isTheory ? "text-amber-600" : "text-emerald-600") : "text-slate-300"
                                                )}>
                                                    {isTheory ? (g.midtermScore?.toFixed(1) ?? "—") : (g.totalScore10?.toFixed(1) ?? "—")}
                                                </span>
                                                <span className="text-[7px] font-black text-slate-300 uppercase">Tự tính</span>
                                            </div>
                                        </td>
                                        {/* THI */}
                                        {isTheory && (
                                            <td className="py-4 px-6 text-center bg-indigo-50/5">
                                                <div className="group relative flex justify-center">
                                                    <input
                                                        type="number"
                                                        disabled={true}
                                                        placeholder={isFinalBanned ? "0" : "—"}
                                                        className={cn(
                                                            "w-14 h-9 text-center text-xs font-black rounded-lg border outline-none transition-all bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed border-dashed"
                                                        )}
                                                        value={isFinalBanned ? 0 : (g.finalScore ?? "")}
                                                        onChange={(e) => handleGradeChange(g.id, 'finalScore', e.target.value)}
                                                    />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-[8px] text-white font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                                        ĐIỂM THI DO PHÒNG ĐÀO TẠO NHẬP
                                                    </div>
                                                </div>
                                            </td>
                                        )}
                                        {/* TỔNG KẾT */}
                                        <td className="py-4 px-8 text-center border-l border-slate-100">
                                            <div className="flex flex-col items-center gap-0.5">
                                                <span className={cn(
                                                    "text-lg font-black font-mono tabular-nums leading-none tracking-tighter",
                                                    g.totalScore10 >= 4.0 ? "text-slate-800" : "text-rose-500"
                                                )}>
                                                    {g.totalScore10?.toFixed(1) || "-"}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase">{g.letterGrade || ""}</span>
                                            </div>
                                        </td>
                                        {/* GHI CHÚ */}
                                        <td className="py-4 px-6">
                                            <input
                                                type="text"
                                                placeholder="..."
                                                disabled={g.isLocked}
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-4 py-2 text-[10px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-2 focus:ring-slate-100 transition-all"
                                                value={g.note || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setEnrollments(prev => prev.map(enr => 
                                                        enr.id === g.id ? { ...enr, note: val } : enr
                                                    ));
                                                }}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-4 bg-white border-t border-slate-50 flex items-center justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest italic">
                    <span className="flex items-center gap-2"><ShieldAlert size={12} /> Dữ liệu được bảo mật bởi UNETI Academic Security</span>
                    <div className="flex items-center gap-8 not-italic">
                        <span className="flex items-center gap-2"><ArrowLeft size={12} className="text-slate-200" /> Vắng ≥ 50% tiết: Cấm thi & Điểm thi = 0</span>
                        <span className="flex items-center gap-2 text-indigo-400/60"><Calculator size={12} /> Phần mềm tự động tính toán theo QC40/60</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
