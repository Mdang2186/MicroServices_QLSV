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
    ShieldAlert
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

                    // Merge attendance info into grades
                    const merged = gradeData.map((g: any) => {
                        const enr = enrollmentData.find((e: any) => e.studentId === g.studentId);
                        const attendances = enr?.attendances || [];
                        const unexcusedAbsences = attendances.filter((a: any) => a.status === 'ABSENT').length;
                        // Rule: Ineligible if > 3 unexcused absences
                        const isIneligible = unexcusedAbsences > 3;
                        return { ...g, isIneligible, unexcusedAbsences };
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

    const handleGradeChange = (gradeId: string, field: string, value: string) => {
        const numValue = value === "" ? null : parseFloat(value);
        if (numValue !== null && (numValue < 0 || numValue > 10)) return;

        setEnrollments(prev => prev.map(g => {
            if (g.id === gradeId) {
                if (g.isLocked) return g; // Protection
                const updated = { ...g, [field]: numValue };
                // Refined UNETI Calculation Logic
                const isTheory = courseClass?.subject?.theoryHours > 0 || !courseClass?.subject?.practiceHours;

                const cc = updated.attendanceScore ?? 0;
                const tx1 = updated.regularScore1 ?? 0;
                const tx2 = updated.regularScore2 ?? 0;
                const fin = updated.finalScore ?? 0;
                const prac = updated.practiceScore ?? 0;
                
                let total10 = 0;
                let processAvg = 0;

                if (isTheory) {
                    processAvg = (cc + 2 * tx1 + tx2) / 4;
                    total10 = Math.round((processAvg * 0.4 + fin * 0.6) * 10) / 10;
                } else {
                    const components = [cc, prac, fin].filter(v => v !== null);
                    total10 = components.length > 0 
                        ? Math.round((components.reduce((a, b) => a + b, 0) / components.length) * 10) / 10 
                        : 0;
                }

                updated.totalScore10 = total10;
                updated.midtermScore = Math.round(processAvg * 10) / 10;

                // Letter grade mapping (New rules)
                let letter = 'F';
                if (total10 >= 8.5) letter = 'A';
                else if (total10 >= 7.8) letter = 'B+';
                else if (total10 >= 7.0) letter = 'B';
                else if (total10 >= 6.3) letter = 'C+';
                else if (total10 >= 5.5) letter = 'C';
                else if (total10 >= 4.8) letter = 'D+';
                else if (total10 >= 4.0) letter = 'D';
                else if (total10 >= 3.0) letter = 'F+';
                updated.letterGrade = letter;

                updated.isPassed = total10 >= 5.5;

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
                        disabled={saving || enrollments.some(e => e.isLocked)}
                        className="h-12 rounded-xl px-6 text-xs font-bold text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm"
                    >
                        <Save className="mr-2 h-4 w-4" /> Lưu nháp
                    </Button>
                    <Button
                        onClick={handleLock}
                        disabled={saving || enrollments.some(e => e.isLocked)}
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
                            {enrollments.filter(e => e.finalScore !== null).length}/{enrollments.length}
                        </h3>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-100" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 md:col-span-2 flex items-center gap-6">
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Công thức tính điểm</p>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">Quá trình (40%)</span>
                            <span className="text-[10px] font-black text-slate-400">+</span>
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">Thi (60%)</span>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phân bổ quá trình (1:2:1)</p>
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500">
                             CC(1) · TX1(2) · TX2(1)
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
                            "p-4 border flex items-center justify-between gap-4",
                            message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                        )}
                    >
                        <div className="flex items-center gap-3">
                            {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                            <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
                        </div>
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
                                <th className="py-2.5 px-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">STT</th>
                                <th className="py-2.5 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                                <th className="py-2.5 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-blue-50/30">CC (1)</th>
                                <th className="py-2.5 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50/30">TX1 (2)</th>
                                <th className="py-2.5 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-emerald-50/30">TX2 (1)</th>
                                <th className="py-2.5 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 border-x border-slate-100">TBQT (40%)</th>
                                <th className="py-2.5 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-indigo-50/30">Thi (60%)</th>
                                <th className="py-2.5 px-6 text-center text-[9px] font-black text-slate-700 uppercase tracking-widest border-l border-slate-100">Tổng kết</th>
                                <th className="py-2.5 px-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((g, idx) => (
                                <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-4 px-6 text-[10px] font-bold text-slate-300 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="space-y-0.5">
                                                <p className="text-[11px] font-black text-slate-800">{g.student?.fullName}</p>
                                                <p className="text-[9px] font-bold text-indigo-600">{g.student?.studentCode}</p>
                                            </div>
                                            {g.isIneligible && (
                                                <div className="group relative">
                                                    <ShieldAlert size={14} className="text-rose-500 animate-pulse" />
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-rose-600 text-[8px] text-white font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                                                        VẮNG {g.unexcusedAbsences} BUỔI - KHÔNG ĐỦ ĐK THI
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 bg-blue-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-12 mx-auto bg-white border border-slate-200 text-center text-[11px] font-black p-1 focus:ring-1 focus:ring-blue-400 outline-none",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed"
                                            )}
                                            value={g.attendanceScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'attendanceScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-2 bg-emerald-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-12 mx-auto bg-white border border-slate-200 text-center text-[11px] font-black p-1 focus:ring-1 focus:ring-emerald-400 outline-none",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed"
                                            )}
                                            value={g.regularScore1 ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'regularScore1', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-2 bg-emerald-50/10 border-l border-white/50">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-12 mx-auto bg-white border border-slate-200 text-center text-[11px] font-black p-1 focus:ring-1 focus:ring-emerald-400 outline-none",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed"
                                            )}
                                            value={g.regularScore2 ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'regularScore2', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-2 bg-amber-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-12 mx-auto bg-white border border-slate-200 text-center text-[11px] font-black p-1 focus:ring-1 focus:ring-amber-400 outline-none",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed"
                                            )}
                                            value={g.midtermScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'midtermScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-2 bg-indigo-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked || g.isIneligible}
                                            readOnly={true}
                                            className={cn(
                                                "w-12 mx-auto bg-slate-50 border border-slate-200 text-center text-[11px] font-black p-1 text-slate-400 outline-none cursor-not-allowed",
                                                (g.isLocked || g.isIneligible) && "bg-slate-50 text-slate-400 border-dashed"
                                            )}
                                            value={g.finalScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'finalScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-6 text-center border-l border-slate-100 bg-slate-50/10">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={cn(
                                                "text-[13px] font-black font-mono tabular-nums leading-none",
                                                g.totalScore10 >= 5.5 ? "text-slate-800" : "text-rose-600"
                                            )}>
                                                {g.totalScore10?.toFixed(1) || "-"}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{g.letterGrade || ""}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <input
                                            type="text"
                                            placeholder="..."
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-full bg-slate-50/50 border border-slate-200 rounded-md px-3 py-1 text-[10px] font-bold text-slate-600 focus:bg-white outline-none",
                                                g.isLocked && "opacity-50"
                                            )}
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
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-1.5"><ShieldAlert size={10} /> Dữ liệu được bảo vệ bởi Hệ thống Quản trị Đào tạo UNETI</span>
                    <div className="flex items-center gap-6">
                        <span className="flex items-center gap-1.5"><GraduationCap size={10} /> Hệ 1:2:1 (CC:TX1:TX2)</span>
                        <span className="flex items-center gap-1.5 text-indigo-400"><Calculator size={10} /> Trình bày: Lưới mật độ cao</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
