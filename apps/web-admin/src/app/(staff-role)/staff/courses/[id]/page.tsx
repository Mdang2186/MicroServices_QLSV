"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar,
    ChevronRight,
    ArrowLeft,
    Activity,
    BookMarked,
    MapPin,
    Users,
    Search,
    ClipboardCheck,
    FileText,
    TrendingUp,
    Zap,
    Users2,
    CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StaffCourseDetailPage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [courseClass, setCourseClass] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const TOKEN = Cookies.get("admin_accessToken");

    const fetchData = async () => {
        if (!classId || !TOKEN) return;
        setLoading(true);
        try {
            const [classRes, enrollmentRes, gradeRes] = await Promise.all([
                fetch(`/api/courses/classes/${classId}`, {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                }),
                fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                }),
                fetch(`/api/grades/class/${classId}`, {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                })
            ]);

            if (classRes.ok && enrollmentRes.ok) {
                const classData = await classRes.json();
                const enrollmentData = await enrollmentRes.json();
                setCourseClass(classData);
                setEnrollments(enrollmentData);
            }
            if (gradeRes.ok) {
                setGrades(await gradeRes.json());
            }
        } catch (error) {
            console.error("Failed to fetch course details:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [classId, TOKEN]);

    const calculateAttendanceRate = (attendances: any[]) => {
        const subject = courseClass?.subject || {};
        const totalPlannedHours = (subject.theoryHours ?? 30) + (subject.practiceHours ?? 15);
        const totalEstimatedSessions = Math.ceil(totalPlannedHours / 3);
        const total = totalEstimatedSessions > 0 ? totalEstimatedSessions : (courseClass?.sessions?.length || 15);

        if (!attendances || attendances.length === 0) return 0;
        const absent = attendances.filter(a => a.status === "ABSENT" || a.status === "ABSENT_UNEXCUSED").length;
        const presentRate = ((total - absent) / total) * 100;
        return Math.max(0, Math.min(100, Math.round(presentRate)));
    };

    const filtered = enrollments.filter(e =>
        e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center bg-[#fbfcfd]">
                <div className="w-10 h-10 border-[4px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    const avgAttendance = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, curr) => acc + calculateAttendanceRate(curr.attendances), 0) / enrollments.length)
        : 100;

    const gradeMap = new Map(grades.map(g => [g.studentId, g]));

    const nominalName = courseClass?.name?.includes(" - ") 
        ? courseClass?.name?.split(" - ")[1] 
        : courseClass?.name;
    const subjectName = courseClass?.name?.includes(" - ")
        ? courseClass?.name?.split(" - ")[0]
        : courseClass?.subject?.name;

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto px-4 md:px-8 py-6 animate-in fade-in duration-700 bg-[#fbfcfd]">
            
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-100 pb-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Link href="/staff/courses" className="hover:text-uneti-blue transition-colors">Quản lý lớp học</Link>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">{courseClass?.code}</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-800 tracking-tighter uppercase leading-none">
                        {nominalName}
                    </h1>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                        {subjectName} • {courseClass?.semester?.name}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => router.push(`/staff/attendance/${classId}`)}
                        className="h-11 rounded-xl px-8 text-[10px] font-black text-white bg-uneti-blue hover:bg-uneti-blue/90 shadow-lg shadow-uneti-blue/10 transition-all uppercase tracking-widest"
                    >
                        <ClipboardCheck className="mr-2 h-4 w-4" /> Xem Điểm danh
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/staff/grades/${classId}`)}
                        className="h-11 rounded-xl px-6 text-[10px] font-black text-slate-600 border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest"
                    >
                        <FileText size={16} className="mr-2" /> Xem Điểm số
                    </Button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Sĩ số lớp", value: `${enrollments.length} SV`, sub: "Hiện tại", icon: Users },
                    { label: "Chuyên cần", value: `${avgAttendance}%`, sub: "Trung bình", icon: Activity },
                    { label: "Tín chỉ", value: courseClass?.subject?.credits, sub: "Định mức", icon: BookMarked },
                    { label: "Phòng học", value: courseClass?.schedules?.[0]?.room?.name || "TBA", sub: "Cố định", icon: MapPin },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-slate-50 text-uneti-blue/60">
                            <s.icon size={20} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{s.label}</p>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Section */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <Users2 size={18} className="text-uneti-blue" />
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">Danh sách Sinh viên ({enrollments.length})</h2>
                        </div>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={12} />
                        <input
                            type="text"
                            placeholder="Tìm sinh viên..."
                            className="bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[10px] font-bold text-slate-800 w-full outline-none focus:ring-2 focus:ring-uneti-blue/5 transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="text-left bg-white">
                                <th className="py-4 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">#</th>
                                <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Sinh viên</th>
                                <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Mã SV</th>
                                <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Chuyên cần</th>
                                <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-center">Điểm TK</th>
                                <th className="py-4 px-8 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Chi tiết</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filtered.map((enr, idx) => {
                                const rate = calculateAttendanceRate(enr.attendances);
                                const studentGrade = gradeMap.get(enr.studentId);
                                const isBanned = studentGrade && !studentGrade.isEligibleForExam;

                                return (
                                    <tr key={enr.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="py-4 px-8 text-[10px] font-bold text-slate-300">{(idx + 1).toString().padStart(2, '0')}</td>
                                        <td className="py-4 px-4">
                                            <p className="text-xs font-black text-slate-700 uppercase group-hover:text-uneti-blue transition-colors flex items-center gap-2">
                                                {enr.student?.fullName}
                                                {isBanned && (
                                                    <span className="px-1.5 py-0.5 rounded-md bg-rose-50 text-[7px] text-rose-500 border border-rose-100 tracking-tighter">CẤM THI</span>
                                                )}
                                            </p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase opacity-60">{enr.student?.adminClass?.code}</p>
                                        </td>
                                        <td className="py-4 px-4 text-[10px] font-black text-slate-500">{enr.student?.studentCode}</td>
                                        <td className="py-4 px-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={cn(
                                                    "text-[11px] font-black tabular-nums",
                                                    rate >= 80 ? "text-emerald-500" : rate >= 50 ? "text-amber-500" : "text-rose-500"
                                                )}>{rate}%</span>
                                                <div className="w-12 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn("h-full", rate >= 80 ? "bg-emerald-500" : rate >= 50 ? "bg-amber-500" : "bg-rose-500")} style={{ width: `${rate}%` }} />
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-center">
                                            <span className="text-[11px] font-black text-slate-700 tabular-nums">
                                                {studentGrade?.totalScore10 !== null && studentGrade?.totalScore10 !== undefined ? studentGrade?.totalScore10 : ""}
                                            </span>
                                        </td>
                                        <td className="py-4 px-8 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    title="Chi tiết điểm"
                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-uneti-blue hover:bg-white border border-transparent hover:border-slate-100"
                                                >
                                                    <TrendingUp size={14} />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    title="Lịch sử điểm danh"
                                                    onClick={() => router.push(`/staff/attendance/${classId}`)}
                                                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-uneti-blue hover:bg-white border border-transparent hover:border-slate-100"
                                                >
                                                    <CalendarDays size={14} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
