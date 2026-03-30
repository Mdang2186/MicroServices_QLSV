"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar,
    ChevronRight,
    ArrowLeft,
    Clock,
    MapPin,
    GraduationCap,
    Users,
    Search,
    Info,
    BookOpen,
    ClipboardCheck,
    FileText,
    TrendingUp,
    MoreVertical,
    CheckCircle2,
    XCircle,
    UserCircle,
    Mail,
    Phone,
    ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LecturerCourseDetailPage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!classId || !TOKEN) return;

        const fetchData = async () => {
            try {
                const [classRes, enrollmentRes] = await Promise.all([
                    fetch(`/api/courses/classes/${classId}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    }),
                    fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    })
                ]);

                if (classRes.ok && enrollmentRes.ok) {
                    const classData = await classRes.json();
                    const enrollmentData = await enrollmentRes.json();
                    setCourseClass(classData);
                    setEnrollments(enrollmentData);
                }
            } catch (error) {
                console.error("Failed to fetch course details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId, TOKEN]);

    const calculateAttendanceRate = (attendances: any[]) => {
        if (!attendances || attendances.length === 0) return 100;
        const present = attendances.filter(a => a.status === "PRESENT" || a.status === "EXCUSED").length;
        return Math.round((present / attendances.length) * 100);
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

    const avgAttendance = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, curr) => acc + calculateAttendanceRate(curr.attendances), 0) / enrollments.length)
        : 100;

    return (
        <div className="min-h-screen space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6">
            {/* Nav & Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Link href="/lecturer/courses" className="hover:text-indigo-600">Lớp học phần</Link>
                        <ChevronRight size={10} />
                        <span className="text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded-lg">Chi tiết quản lý</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight mt-2">
                        Dashboard Lớp học
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/lecturer/courses')}
                        className="h-12 rounded-2xl px-6 text-xs font-bold text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-100"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                    </Button>
                    <div className="h-8 w-px bg-slate-100 mx-1"></div>
                    <Button
                        onClick={() => router.push(`/lecturer/courses/${classId}/attendance`)}
                        className="h-12 rounded-2xl px-8 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all uppercase tracking-widest"
                    >
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Điểm danh ngay
                    </Button>
                </div>
            </div>

            {/* Main Stats & Course Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Course Card */}
                <div className="lg:col-span-2 bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[320px]">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-50/50 rounded-full blur-3xl -mr-40 -mt-40"></div>

                    <div className="relative z-10 space-y-6">
                        <div className="space-y-2">
                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-[0.2em]">
                                {courseClass?.code}
                            </span>
                            <h2 className="text-4xl font-black text-slate-800 leading-tight tracking-tighter">
                                {courseClass?.subject?.name}
                            </h2>
                        </div>

                        <div className="flex flex-wrap gap-8">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Học kỳ</p>
                                <p className="text-sm font-extrabold text-slate-700 uppercase">{courseClass?.semester?.name}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tín chỉ</p>
                                <p className="text-sm font-extrabold text-slate-700">{courseClass?.subject?.credits} TC</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Loại HP</p>
                                <p className="text-sm font-extrabold text-indigo-600 uppercase">Bắt buộc</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 pt-10 border-t border-slate-50 flex flex-wrap items-center gap-6">
                        {courseClass?.schedules?.map((s: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100">
                                <Calendar size={16} className="text-indigo-400" />
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lịch học</p>
                                    <p className="text-xs font-black text-slate-700">Thứ {s.dayOfWeek}: Tiết {s.startShift}-{s.endShift} (P. {s.room?.name})</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Performance Card */}
                <div className="bg-white rounded-[3rem] p-10 border border-slate-100 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative z-10 space-y-1">
                        <TrendingUp size={24} className="text-emerald-500 mb-4" />
                        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Tỷ lệ chuyên cần lớp</h4>
                        <div className="flex items-end gap-2">
                            <span className="text-6xl font-black text-slate-800 tracking-tighter">{avgAttendance}%</span>
                            <span className="text-xs font-bold text-emerald-600 pb-2">+2.4% vs tuần trước</span>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-4 pt-8">
                        <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${avgAttendance}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
                            />
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                            <span>Mục tiêu: 85%</span>
                            <Link href={`/lecturer/courses/${classId}/attendance`} className="text-emerald-600 hover:underline">Chi tiết báo cáo</Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions & Search */}
            <div className="bg-white rounded-[2.5rem] p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 pl-4">
                    <Users size={20} className="text-indigo-400" />
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Danh sách sinh viên ({enrollments.length})</h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="bg-slate-50 border-none rounded-xl pl-10 pr-4 py-2 text-[10px] font-black text-slate-700 tracking-widest focus:ring-2 focus:ring-indigo-100 w-full transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => router.push(`/lecturer/courses/${classId}/grades`)}
                        className="h-10 rounded-xl px-4 text-[10px] font-black text-indigo-600 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest"
                    >
                        <FileText size={16} className="mr-2" /> Nhập điểm học phần
                    </Button>
                </div>
            </div>

            {/* Student List Table */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-6 px-10 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                                <th className="py-6 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã SV</th>
                                <th className="py-6 px-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp HC</th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên cần</th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Điểm TK</th>
                                <th className="py-6 px-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                <th className="py-6 px-10 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((enr, idx) => {
                                const rate = calculateAttendanceRate(enr.attendances);
                                return (
                                    <tr key={enr.id} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-6 px-10">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-2xl bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400 font-bold shadow-sm transition-all group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-105">
                                                    {enr.student?.fullName?.charAt(0)}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-black text-slate-800 tracking-tight">{enr.student?.fullName}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{enr.student?.email || 'Chưa cung cấp email'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6">
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-1 rounded-md">
                                                {enr.student?.studentCode}
                                            </span>
                                        </td>
                                        <td className="py-6 px-6 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                            {enr.student?.adminClass?.code || "N/A"}
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <span className={cn(
                                                    "text-[11px] font-black tabular-nums",
                                                    rate >= 80 ? "text-emerald-500" : rate >= 50 ? "text-amber-500" : "text-rose-500"
                                                )}>
                                                    {rate}%
                                                </span>
                                                <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500"
                                                        )}
                                                        style={{ width: `${rate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-6 px-6 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                                                <CheckCircle2 size={12} /> Đang học
                                            </span>
                                        </td>
                                        <td className="py-6 px-10 text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-10 w-10 rounded-xl hover:bg-white hover:shadow-md transition-all text-slate-300 hover:text-indigo-600"
                                            >
                                                <MoreVertical size={18} />
                                            </Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-32 flex flex-col items-center justify-center grayscale opacity-30">
                            <Users size={64} className="text-slate-200 mb-6" />
                            <p className="text-sm font-black uppercase tracking-widest text-slate-400">Không tìm thấy sinh viên</p>
                        </div>
                    )}
                </div>

                {/* Footer Legend */}
                <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                            <span>Tốt ({'>'}80%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                            <span>Cảnh báo (50-80%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                            <span>Nguy cơ học lại ({'<'}50%)</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Info size={14} className="text-indigo-400" />
                        <span>Dữ liệu cập nhật thời gian thực</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
