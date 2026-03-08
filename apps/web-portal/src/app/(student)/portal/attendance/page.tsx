"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    ClipboardCheck,
    Calendar,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Info,
    ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function AttendancePage() {
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                const data = await StudentService.getEnrollments(studentId);
                setEnrollments(data || []);
                if (data && data.length > 0) setExpandedClass(data[0].id);
            } catch (error) {
                console.error("Failed to fetch attendance:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const calculateAttendanceRate = (attendances: any[]) => {
        if (!attendances || attendances.length === 0) return 100;
        const present = attendances.filter(a => a.status === "PRESENT" || a.status === "EXCUSED").length;
        return Math.round((present / attendances.length) * 100);
    };

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
                </div>
            </div>
        );
    }

    const averageRate = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, curr) => acc + calculateAttendanceRate(curr.attendances), 0) / enrollments.length)
        : 100;

    return (
        <div className="min-h-screen space-y-6 bg-transparent pb-20">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Thông tin điểm danh</h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Giám sát tỷ lệ hiện diện trong các lớp học phần</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/90 px-4 py-2.5 rounded-2xl shadow-inner ring-1 ring-slate-200">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400">Tỷ lệ TB</p>
                            <p className="text-lg font-bold text-slate-900">{averageRate}%</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Attendance List */}
            <div className="grid gap-4">
                {enrollments.length > 0 ? (
                    enrollments.map((enr, idx) => {
                        const rate = calculateAttendanceRate(enr.attendances);
                        const isExpanded = expandedClass === enr.id;

                        return (
                            <motion.div
                                key={enr.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * idx }}
                                className="group rounded-[1.5rem] border border-white bg-white/60 shadow-sm backdrop-blur-2xl overflow-hidden transition-all hover:shadow-xl"
                            >
                                <div
                                    className="p-5 cursor-pointer flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/30 transition-colors"
                                    onClick={() => setExpandedClass(isExpanded ? null : enr.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-xl shadow-inner",
                                            rate >= 80 ? "bg-emerald-50 text-emerald-600" : rate >= 50 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                        )}>
                                            <span className="text-base font-black">{rate}%</span>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">{enr.courseClass?.code}</span>
                                                <div className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                                                <span className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{enr.courseClass?.lecturer?.fullName}</span>
                                            </div>
                                            <h3 className="text-base font-black text-slate-900">{enr.courseClass?.subject?.name}</h3>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                                        <div className="flex flex-col items-end">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Vắng mặt</p>
                                            <p className="text-base font-bold text-red-500">
                                                {enr.attendances?.filter((a: any) => a.status === "ABSENT").length || 0} buổi
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "p-1.5 rounded-lg transition-transform",
                                            isExpanded && "rotate-180 bg-slate-100"
                                        )}>
                                            <ChevronDown className="h-5 w-5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-slate-100 bg-white/40"
                                        >
                                            <div className="p-6">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                                    <Calendar className="h-3.5 w-3.5" /> Nhật ký điểm danh
                                                </h4>

                                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                                    {enr.attendances?.length > 0 ? (
                                                        enr.attendances.map((att: any, i: number) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                                                                <div className={cn(
                                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                                    att.status === "PRESENT" ? "bg-emerald-50 text-emerald-600" :
                                                                        att.status === "EXCUSED" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-500"
                                                                )}>
                                                                    {att.status === "PRESENT" ? <CheckCircle2 className="h-4 w-4" /> :
                                                                        att.status === "EXCUSED" ? <Info className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-800">
                                                                        {new Date(att.date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                    </p>
                                                                    <p className="text-[9px] font-black uppercase text-slate-400">
                                                                        {att.status === "PRESENT" ? "Có mặt" :
                                                                            att.status === "EXCUSED" ? "Có phép" : "Vắng mặt"}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="col-span-full py-8 text-center text-slate-400 text-xs italic">
                                                            Chưa có nhật ký học tập nào
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="mt-6 p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex items-start gap-3">
                                                    <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                                                    <p className="text-xs text-blue-700 font-medium leading-relaxed">
                                                        Lưu ý: Sinh viên vắng mặt quá 20% số buổi học sẽ không đủ điều kiện dự thi kết thúc học phần.
                                                    </p>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-16 bg-white/60 rounded-[2rem] border border-white">
                        <AlertCircle className="h-10 w-10 text-slate-300 mb-3" />
                        <h3 className="text-lg font-black text-slate-800">Không có dữ liệu điểm danh</h3>
                        <p className="text-xs text-slate-500 font-medium">Bạn chưa đăng ký học phần nào trong học kỳ này.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
