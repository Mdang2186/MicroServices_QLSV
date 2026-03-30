"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronRight,
    Save,
    Users,
    Search,
    AlertCircle,
    CheckCircle2,
    Calculator,
    Info,
    GraduationCap,
    Lock,
    ShieldAlert,
    FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LecturerGradeEntryPage() {
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
                    let gradeData = await gradeRes.json();
                    const classData = await classRes.json();
                    const enrollmentData = await enrollmentRes.json();
                    
                    setCourseClass(classData);

                    // If no grades but students enrolled, initialize
                    if (gradeData.length === 0 && enrollmentData.length > 0) {
                        const initRes = await fetch(`/api/grades/initialize`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${TOKEN}`
                            },
                            body: JSON.stringify({
                                classId: classId,
                                subjectId: classData.subjectId,
                                studentIds: enrollmentData.map((e: any) => e.studentId)
                            })
                        });
                        if (initRes.ok) {
                            gradeData = await initRes.json();
                        }
                    }

                    // Merge attendance info into grades
                    const merged = gradeData.map((g: any) => {
                        const enr = enrollmentData.find((e: any) => e.studentId === g.studentId);
                        const attendances = enr?.attendances || [];
                        const unexcusedAbsences = attendances.filter((a: any) => a.status === 'ABSENT_UNEXCUSED').length;
                        // Rule: Ineligible if > 3 unexcused absences
                        const isIneligible = unexcusedAbsences > 3;
                        return { 
                            ...g, 
                            isIneligible, 
                            unexcusedAbsences,
                            isLocked: g.status !== 'DRAFT' // Locked if not in DRAFT
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

    const handleGradeChange = (gradeId: string, field: string, value: string) => {
        const numValue = value === "" ? null : parseFloat(value);
        if (numValue !== null && (numValue < 0 || numValue > 10)) return;

        setEnrollments(prev => prev.map(g => {
            if (g.id === gradeId) {
                if (g.isLocked) return g;
                const updated = { ...g, [field]: numValue };
                
                // UNETI Standard Weighting:
                // RegularAvg = (Att + Reg1 + 2*Reg2) / 4
                // FinalTotal = RegularAvg * 0.4 + FinalScore * 0.6
                const att = updated.attendanceScore ?? 0;
                const tx1 = updated.regularScore1 ?? 0;
                const tx2 = updated.regularScore2 ?? 0;
                const fin = updated.finalScore ?? 0;
                
                const regularAvg = Math.round(((att + tx1 + 2 * tx2) / 4) * 10) / 10;
                const total10 = Math.round((regularAvg * 0.4 + fin * 0.6) * 10) / 10;
                
                updated.midtermScore = regularAvg;
                updated.totalScore10 = total10;

                // Letter grade mapping
                let letter = 'F';
                if (total10 >= 8.5) letter = 'A';
                else if (total10 >= 8.0) letter = 'B+';
                else if (total10 >= 7.0) letter = 'B';
                else if (total10 >= 6.5) letter = 'C+';
                else if (total10 >= 5.5) letter = 'C';
                else if (total10 >= 5.0) letter = 'D+';
                else if (total10 >= 4.0) letter = 'D';
                updated.letterGrade = letter;

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
        if (!confirm("Sau khi 'Gửi điểm', bạn sẽ không thể chỉnh sửa trừ khi có yêu cầu mở khóa. Trạng thái sẽ chuyển thành 'Chờ phê duyệt'. Bạn có chắc chắn?")) return;
        
        const saved = await handleSave(false);
        if (!saved) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/grades/submit/${classId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });

            if (res.ok) {
                setMessage({ text: "Bảng điểm đã được gửi và đang chờ phê duyệt", type: "success" });
                setEnrollments(prev => prev.map(e => ({ 
                    ...e, 
                    isLocked: true, 
                    status: 'PENDING_APPROVAL' 
                })));
            }
        } catch (error) {
            setMessage({ text: "Lỗi khi gửi bảng điểm", type: "error" });
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
                    <Link href="/lecturer/grades" className="hover:text-blue-600 transition-colors">Lớp học phần</Link>
                    <ChevronRight size={12} />
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Nhập điểm</span>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => handleSave()}
                        disabled={saving || enrollments.some(e => e.isLocked)}
                        className="h-10 px-4 text-xs font-bold text-slate-600 hover:bg-slate-100"
                    >
                        <Save className="mr-2 h-4 w-4" /> Lưu nháp
                    </Button>
                    <Button
                        onClick={handleLock}
                        disabled={saving || enrollments.some(e => e.isLocked)}
                        className="h-10 px-6 text-xs font-black text-white bg-[#4338ca] hover:bg-[#3730a3] shadow-lg shadow-[#4338ca]/20 rounded-lg uppercase tracking-wider transition-all active:scale-95"
                    >
                        {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                        Gửi điểm & Khóa
                    </Button>
                </div>
            </div>

            {/* Title Block */}
            <div className="flex items-center justify-between">
                 <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3 uppercase">
                    Cổng thông tin giảng viên
                    <span className="text-blue-600">/ Nhập điểm</span>
                </h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Sinh viên</p>
                        <h3 className="text-2xl font-black text-slate-800 tabular-nums">
                            {enrollments.length} <span className="text-xs text-slate-400 font-bold ml-1">Người</span>
                        </h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-200">
                        <Users size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Đã nhập</p>
                        <h3 className="text-2xl font-black text-emerald-600 tabular-nums">
                            {enrollments.filter(e => e.finalScore !== null).length} <span className="text-xs text-slate-400 font-bold ml-1">Hoàn thiện</span>
                        </h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-300">
                        <CheckCircle2 size={24} />
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-100 p-6 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Cơ cấu điểm</p>
                        <h3 className="text-2xl font-black text-blue-600 tabular-nums">
                            40% - 60% <span className="text-xs text-slate-400 font-bold ml-1">(Thường kỳ - Thi)</span>
                        </h3>
                    </div>
                    <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-300">
                        <FileText size={24} />
                    </div>
                </div>
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Bảng ghi điểm học phần</h2>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <Info size={12} className="text-blue-500" />
                            <span>Trọng số Thường kỳ: CC (x1), TX1 (x1), TX2 (x2). Tổng kết = TK*0.4 + Thi*0.6</span>
                        </div>
                    </div>
                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">STT</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Sinh viên</th>
                                <th className="py-4 px-2 text-center text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50/30">CC (10%)</th>
                                <th className="py-4 px-2 text-center text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/30">TX1 (10%)</th>
                                <th className="py-4 px-2 text-center text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50/30">TX2 (10%)</th>
                                <th className="py-4 px-2 text-center text-[9px] font-black text-amber-600 uppercase tracking-widest bg-amber-50/30">GK (20%)</th>
                                <th className="py-4 px-2 text-center text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50/30">Thi (50%)</th>
                                <th className="py-4 px-8 text-center text-[10px] font-black text-slate-800 uppercase tracking-widest border-l border-slate-100">Tổng kết</th>
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((g, idx) => (
                                <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                    <td className="py-5 px-8">
                                        <span className="text-[11px] font-black text-slate-300 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </td>
                                    <td className="py-5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-9 w-9 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                {g.student?.fullName?.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-800 leading-none">{g.student?.fullName}</p>
                                                <p className="text-[9px] font-bold text-blue-600 uppercase">{g.student?.studentCode}</p>
                                            </div>
                                            {g.isIneligible && (
                                                <div className="bg-rose-50 text-rose-600 p-1 rounded-md border border-rose-100" title={`VẮNG ${g.unexcusedAbsences} BUỔI - KHÔNG ĐỦ ĐK THI`}>
                                                    <ShieldAlert size={14} className="animate-pulse" />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-5 px-2 bg-blue-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-14 mx-auto bg-white border border-slate-200 rounded-lg text-center text-xs font-black py-1.5 focus:ring-2 focus:ring-blue-400 outline-none transition-all shadow-sm",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed shadow-none"
                                            )}
                                            value={g.attendanceScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'attendanceScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-5 px-2 bg-emerald-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-14 mx-auto bg-white border border-slate-200 rounded-lg text-center text-xs font-black py-1.5 focus:ring-2 focus:ring-emerald-400 outline-none transition-all shadow-sm",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed shadow-none"
                                            )}
                                            value={g.regularScore1 ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'regularScore1', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-5 px-2 bg-emerald-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-14 mx-auto bg-white border border-slate-200 rounded-lg text-center text-xs font-black py-1.5 focus:ring-2 focus:ring-emerald-400 outline-none transition-all shadow-sm",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed shadow-none"
                                            )}
                                            value={g.regularScore2 ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'regularScore2', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-5 px-2 bg-amber-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-14 mx-auto bg-white border border-slate-200 rounded-lg text-center text-xs font-black py-1.5 focus:ring-2 focus:ring-amber-400 outline-none transition-all shadow-sm",
                                                g.isLocked && "bg-slate-50 text-slate-400 border-dashed shadow-none"
                                            )}
                                            value={g.midtermScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'midtermScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-5 px-2 bg-indigo-50/10">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isLocked || g.isIneligible}
                                            className={cn(
                                                "w-14 mx-auto bg-white border border-slate-200 rounded-lg text-center text-xs font-black py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none transition-all shadow-sm",
                                                (g.isLocked || g.isIneligible) && "bg-slate-50 text-slate-400 border-dashed shadow-none"
                                            )}
                                            value={g.finalScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'finalScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-5 px-8 text-center border-l border-slate-100">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={cn(
                                                "text-[13px] font-black tracking-tight",
                                                g.totalScore10 >= 4.0 ? "text-slate-900" : "text-rose-600"
                                            )}>
                                                {g.totalScore10?.toFixed(1) || "-"}
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{g.letterGrade || ""}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <input
                                            type="text"
                                            placeholder="..."
                                            disabled={g.isLocked}
                                            className={cn(
                                                "w-full bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-2 text-[10px] font-bold text-slate-600 outline-none focus:bg-white focus:ring-1 focus:ring-slate-300 transition-all",
                                                g.isLocked && "opacity-50 border-dashed"
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

                {/* Footer Info */}
                <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Cổng thông tin giảng viên UNETI</span>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                             <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                             Hệ số: 1 - 1 - 1 - 2 - 5
                        </div>
                        <div className="flex items-center gap-2">
                             <TrendingUp size={14} className="text-emerald-500" />
                             Tự động tính điểm tổng kết
                        </div>
                    </div>
                </div>
            </div>

            {/* Notification Toast (Absolute) */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className={cn(
                            "fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 rounded-3xl shadow-2xl border flex items-center gap-4 z-[100] min-w-[320px]",
                            message.type === 'success' ? "bg-emerald-600 border-emerald-500 text-white shadow-emerald-600/20" : "bg-rose-600 border-rose-500 text-white shadow-rose-600/20"
                        )}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                        <p className="text-sm font-black uppercase tracking-wider">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function TrendingUp(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
