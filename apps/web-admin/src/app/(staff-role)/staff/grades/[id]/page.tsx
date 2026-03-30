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
    Info,
    GraduationCap,
    Lock,
    Unlock,
    ShieldAlert,
    Bell,
    Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StaffGradesDetailPage() {
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

                    const merged = gradeData.map((g: any) => {
                        const enr = enrollmentData.find((e: any) => e.studentId === g.studentId);
                        const attendances = enr?.attendances || [];
                        const unexcusedAbsences = attendances.filter((a: any) => a.status === 'ABSENT').length;
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
                const updated = { ...g, [field]: numValue };
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

    const handleSave = async (showMsg = true, extraGrades: any[] = []) => {
        setSaving(true);
        if (showMsg) setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`/api/grades/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ grades: extraGrades.length ? extraGrades : enrollments })
            });

            if (res.ok) {
                if (showMsg) {
                    setMessage({ text: "Đã cập nhật bảng điểm", type: "success" });
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

    const lockAllGrades = async () => {
        if (!confirm("Bạn có chắc chắn muốn KHÓA bảng điểm này? Sau khi khóa, giảng viên sẽ không thể chỉnh sửa điểm thành phần.")) return;
        
        const lockedGrades = enrollments.map(e => ({ ...e, isLocked: true, status: "FINAL" }));
        const success = await handleSave(false, lockedGrades);
        
        if (success) {
            setEnrollments(lockedGrades);
            setMessage({ text: "Bảng điểm đã được khóa vĩnh viễn", type: "success" });
            
            // Send notification to lecturer
            if (courseClass?.lecturer?.userId) {
                await fetch(`/api/auth/notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                    body: JSON.stringify({
                        userId: courseClass.lecturer.userId,
                        title: `Bảng điểm đã bị khóa: ${courseClass.subject.name}`,
                        content: `Phòng Đào tạo đã thẩm định và khóa bảng điểm lớp ${courseClass.code}. Bạn không thể chỉnh sửa thêm.`,
                        type: "WARNING"
                    })
                });
            }
        }
    };

    const sendReminder = async () => {
        if (!courseClass?.lecturer?.userId) {
            alert("Giảng viên chưa có tài khoản người dùng để nhận thông báo.");
            return;
        }

        try {
            const res = await fetch(`/api/auth/notifications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    userId: courseClass.lecturer.userId,
                    title: `Nhắc nhở nhập điểm: ${courseClass.subject.name}`,
                    content: `Phòng Đào tạo nhắc nhở bạn hoàn tất việc nhập điểm thành phần cho lớp ${courseClass.code}. Vui lòng thực hiện sớm để đảm bảo tiến độ.`,
                    type: "REMINDER"
                })
            });

            if (res.ok) {
                setMessage({ text: "Đã gửi thông báo nhắc nhở tới giảng viên", type: "success" });
                setTimeout(() => setMessage({ text: "", type: "" }), 3000);
            }
        } catch (error) {
            console.error("Failed to send reminder:", error);
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
                        <Link href="/staff/grades" className="hover:text-indigo-600">Quản lý Điểm</Link>
                        <ChevronRight size={10} />
                        <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-lg">Cập nhật Điểm thi</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3 mt-2">
                        {courseClass?.subject?.name}
                        <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded-lg">{courseClass?.code}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={lockAllGrades}
                        className="h-12 rounded-xl px-4 text-xs font-bold text-rose-600 hover:bg-rose-50"
                    >
                        <Lock className="mr-2 h-4 w-4" /> Khóa bảng điểm
                    </Button>
                    <Button
                        variant="outline"
                        onClick={sendReminder}
                        className="h-12 rounded-xl px-6 text-xs font-bold text-amber-600 bg-white border-amber-200 hover:bg-amber-50 shadow-sm"
                    >
                        <Bell className="mr-2 h-4 w-4" /> Nhắc GV
                    </Button>
                    <Button
                        onClick={() => handleSave()}
                        disabled={saving}
                        className="h-12 rounded-xl px-8 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all uppercase tracking-widest"
                    >
                        {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full"></div> : <Save className="mr-2 h-4 w-4" />}
                        Lưu & Cập nhật
                    </Button>
                </div>
            </div>

            {/* Quick Stats */}
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
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Điểm thi đã nhập</p>
                        <h3 className="text-sm font-black text-indigo-600">
                            {enrollments.filter(e => e.finalScore !== null).length}/{enrollments.length}
                        </h3>
                    </div>
                    <Calculator size={16} className="text-indigo-100" />
                </div>
                <div className="bg-white border border-slate-200 px-4 py-3 md:col-span-2 flex items-center gap-6">
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Giảng viên phụ trách</p>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{courseClass?.lecturer?.fullName || "Chưa xác định"}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-100" />
                    <div className="flex-1">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Quyền hạn</p>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase tracking-tighter border border-emerald-100 italic">
                            FULL ACCESS (STAFF)
                        </span>
                    </div>
                </div>
            </div>

            {/* Notification Alert */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                            "p-4 border flex items-center gap-3",
                            message.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800"
                        )}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <p className="text-[10px] font-black uppercase tracking-widest font-mono">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Grade Table */}
            <div className="bg-white border border-slate-200 overflow-hidden flex flex-col shadow-sm rounded-xl">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cập nhật Điểm thi & Tổng kết</h2>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-[10px] font-bold outline-none focus:ring-1 focus:ring-indigo-300"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-3 px-6 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">STT</th>
                                <th className="py-3 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                                <th className="py-3 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">CC</th>
                                <th className="py-3 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">TX1</th>
                                <th className="py-3 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">TX2</th>
                                <th className="py-3 px-2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/50">TBQT</th>
                                <th className="py-3 px-2 text-center text-[9px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50/50">ĐIỂM THI</th>
                                <th className="py-3 px-6 text-center text-[9px] font-black text-slate-800 uppercase tracking-widest border-l border-slate-100">TỔNG KẾT</th>
                                <th className="py-3 px-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">KẾT QUẢ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((g, idx) => (
                                <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-4 px-6 text-[10px] font-bold text-slate-300">{(idx + 1).toString().padStart(2, '0')}</td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-0.5">
                                            <p className="text-[11px] font-black text-slate-800">{g.student?.fullName}</p>
                                            <p className="text-[9px] font-bold text-indigo-600">{g.student?.studentCode}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 px-2 text-center text-[10px] text-slate-400 font-bold">{g.attendanceScore ?? "-"}</td>
                                    <td className="py-4 px-2 text-center text-[10px] text-slate-400 font-bold">{g.regularScore1 ?? "-"}</td>
                                    <td className="py-4 px-2 text-center text-[10px] text-slate-400 font-bold">{g.regularScore2 ?? "-"}</td>
                                    <td className="py-4 px-2 text-center bg-slate-50/50">
                                        <span className="text-[10px] font-black text-slate-600">{g.midtermScore?.toFixed(1) || "-"}</span>
                                    </td>
                                    <td className="py-4 px-2 bg-indigo-50/30">
                                        <input
                                            type="number"
                                            step="0.1"
                                            disabled={g.isIneligible}
                                            className={cn(
                                                "w-12 mx-auto bg-white border border-indigo-200 text-center text-[11px] font-black p-1 focus:ring-1 focus:ring-indigo-500 outline-none shadow-sm rounded",
                                                g.isIneligible && "bg-rose-50 border-rose-100 text-rose-400 cursor-not-allowed"
                                            )}
                                            value={g.finalScore ?? ""}
                                            onChange={(e) => handleGradeChange(g.id, 'finalScore', e.target.value)}
                                        />
                                    </td>
                                    <td className="py-4 px-6 text-center border-l border-slate-100 bg-slate-50/10">
                                        <div className="flex flex-col items-center gap-0.5">
                                            <span className={cn(
                                                "text-[13px] font-black font-mono leading-none",
                                                g.totalScore10 >= 5.5 ? "text-indigo-600" : "text-rose-600"
                                            )}>
                                                {g.totalScore10?.toFixed(1) || "-"}
                                            </span>
                                            <span className="text-[8px] font-black text-slate-400">{g.letterGrade || ""}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-center">
                                        <span className={cn(
                                            "text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter border",
                                            g.isPassed ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                        )}>
                                            {g.isPassed ? "ĐẠT" : "HỎNG"}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
