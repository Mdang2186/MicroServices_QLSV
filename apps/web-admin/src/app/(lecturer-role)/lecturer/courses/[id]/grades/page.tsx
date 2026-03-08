"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Save,
    Edit3,
    AlertCircle,
    CheckCircle2,
    Users,
    GraduationCap,
    Calculator
} from "lucide-react";

export default function LecturerGradeEntryPage() {
    const { id: classId } = useParams();
    const [user, setUser] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!classId || !TOKEN) return;

        fetch(`http://localhost:3000/api/grades/class/${classId}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setGrades(data))
            .finally(() => setLoading(false));
    }, [classId, TOKEN]);

    const handleScoreChange = (gradeId: string, field: string, value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) && value !== "") return;
        if (numValue < 0 || numValue > 10) return;

        setGrades(prev => prev.map(g => {
            if (g.id === gradeId) {
                const updated = { ...g, [field]: value === "" ? null : numValue };

                // Live preview of total score (using the same logic as backend)
                const att = updated.attendanceScore || 0;
                const mid = updated.midtermScore || 0;
                const fin = updated.finalScore || 0;
                updated.totalScore10 = Math.round((att * 0.1 + mid * 0.3 + fin * 0.6) * 10) / 10;

                return updated;
            }
            return g;
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`http://localhost:3000/api/grades/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ grades })
            });

            if (res.ok) {
                setMessage({ text: "Lưu bảng điểm thành công!", type: "success" });
                // Re-fetch to get updated letter grades from server
                const updated = await res.json();
                setGrades(updated);
            } else {
                throw new Error("Lỗi khi lưu dữ liệu");
            }
        } catch (error) {
            setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f7fe]">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Link href="/lecturer/courses" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={16} />
                        <span>Danh sách lớp</span>
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-indigo-600">Nhập điểm</span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                    Lưu bảng điểm
                </button>
            </div>

            {/* Banner Section */}
            <div className="bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[24px] p-8 border border-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">
                        Quản lý <span className="text-indigo-600">Bảng điểm</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
                        <GraduationCap size={16} className="text-indigo-400" />
                        Nhập điểm chuyên cần, giữa kỳ và cuối kỳ cho lớp học phần
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-6">
                    <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tỷ lệ tính điểm</p>
                        <p className="text-xs font-extrabold text-slate-700">10% - 30% - 60%</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200"></div>
                    <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm">
                        <Calculator size={20} className="text-indigo-500" />
                        <span className="text-sm font-bold text-slate-700">Tự động tính toán</span>
                    </div>
                </div>
            </div>

            {/* Message Alert */}
            {message.text && (
                <div className={`p-4 rounded-xl flex items-center gap-3 animate-in slide-in-from-top duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                    <span className="text-sm font-bold">{message.text}</span>
                </div>
            )}

            {/* Grade Table */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Chuyên cần</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Giữa kỳ</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Cuối kỳ</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Tổng kết</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Điểm chữ</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-32">Kết quả</th>
                        </tr>
                    </thead>
                    <tbody>
                        {grades.map((g) => (
                            <tr key={g.id} className="border-t border-slate-50 hover:bg-[#fafcff] transition-colors group">
                                <td className="py-5 px-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-slate-800">{g.student?.fullName}</span>
                                        <span className="text-[10px] font-black text-indigo-400 mt-0.5">{g.student?.studentCode}</span>
                                    </div>
                                </td>
                                <td className="py-5 px-6">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={g.attendanceScore ?? ""}
                                        onChange={(e) => handleScoreChange(g.id, 'attendanceScore', e.target.value)}
                                        className="w-full text-center py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all"
                                    />
                                </td>
                                <td className="py-5 px-6">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={g.midtermScore ?? ""}
                                        onChange={(e) => handleScoreChange(g.id, 'midtermScore', e.target.value)}
                                        className="w-full text-center py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all"
                                    />
                                </td>
                                <td className="py-5 px-6">
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="10"
                                        value={g.finalScore ?? ""}
                                        onChange={(e) => handleScoreChange(g.id, 'finalScore', e.target.value)}
                                        className="w-full text-center py-2 bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100 transition-all"
                                    />
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <span className="text-sm font-black text-slate-800">{g.totalScore10 ?? "-"}</span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${g.letterGrade?.startsWith('A') ? 'bg-emerald-50 text-emerald-600' :
                                            g.letterGrade?.startsWith('F') ? 'bg-rose-50 text-rose-600' :
                                                'bg-blue-50 text-blue-600'
                                        }`}>
                                        {g.letterGrade || "-"}
                                    </span>
                                </td>
                                <td className="py-5 px-6 text-center">
                                    {g.isPassed ? (
                                        <span className="text-[10px] font-black uppercase text-emerald-500 flex items-center justify-center gap-1">
                                            <CheckCircle2 size={12} /> Qua môn
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase text-slate-300">Chưa đạt</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {grades.length === 0 && (
                    <div className="py-20 text-center">
                        <Edit3 className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-medium font-bold uppercase tracking-tighter">Bảng điểm chưa được khởi tạo</p>
                    </div>
                )}
            </div>
        </div>
    );
}
