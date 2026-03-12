"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    Calendar as CalendarIcon,
    ArrowLeft,
    Save,
    UserCheck,
    UserX,
    AlertCircle,
    CheckCircle2,
    Users
} from "lucide-react";

export default function LecturerAttendancePage() {
    const { id: classId } = useParams();
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!classId || !TOKEN) return;

        fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                // Transform enrollments to include today's attendance status if it exists
                const transformed = data.map((e: any) => {
                    const existingAtt = e.attendances?.find((a: any) => a.date.startsWith(date));
                    return {
                        ...e,
                        currentStatus: existingAtt?.status || "PRESENT",
                        note: existingAtt?.note || ""
                    };
                });
                setEnrollments(transformed);
            })
            .finally(() => setLoading(false));
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
                setMessage({ text: "Lưu điểm danh thành công!", type: "success" });
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
                    <span className="text-indigo-600">Điểm danh</span>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-indigo-600 px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                >
                    {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                    Lưu điểm danh
                </button>
            </div>

            {/* Banner Section */}
            <div className="bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[24px] p-8 border border-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-extrabold text-[#111827] tracking-tight">
                        Điểm danh <span className="text-indigo-600">Sinh viên</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2 mt-1">
                        <Users size={16} className="text-indigo-400" />
                        {enrollments.length} sinh viên đăng ký trong lớp học này
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <CalendarIcon size={20} className="text-indigo-500 ml-2" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="border-none bg-transparent text-sm font-bold text-slate-700 focus:ring-0 pr-4"
                    />
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

            {/* Student List Table */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">STT</th>
                            <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Sinh viên</th>
                            <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                            <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp Hành chính</th>
                            <th className="py-5 px-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enrollments.map((e, i) => (
                            <tr key={e.id} className="border-t border-slate-50 hover:bg-[#fafcff] transition-colors group">
                                <td className="py-5 px-6 text-sm font-bold text-slate-400">{i + 1}</td>
                                <td className="py-5 px-6">
                                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                        {e.student?.studentCode}
                                    </span>
                                </td>
                                <td className="py-5 px-6 text-sm font-bold text-slate-800">{e.student?.fullName}</td>
                                <td className="py-5 px-6 text-xs font-semibold text-slate-500">{e.student?.adminClass?.code || "N/A"}</td>
                                <td className="py-5 px-6">
                                    <div className="flex items-center justify-center gap-2">
                                        <button
                                            onClick={() => handleStatusChange(e.id, "PRESENT")}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${e.currentStatus === 'PRESENT'
                                                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
                                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                }`}
                                        >
                                            <UserCheck size={14} /> Có mặt
                                        </button>
                                        <button
                                            onClick={() => handleStatusChange(e.id, "ABSENT")}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${e.currentStatus === 'ABSENT'
                                                    ? 'bg-rose-500 text-white shadow-md shadow-rose-100'
                                                    : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                                }`}
                                        >
                                            <UserX size={14} /> Vắng mặt
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {enrollments.length === 0 && (
                    <div className="py-20 text-center">
                        <Users className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-400 font-medium font-bold uppercase tracking-tighter">Chưa có sinh viên nào đăng ký</p>
                    </div>
                )}
            </div>
        </div>
    );
}
