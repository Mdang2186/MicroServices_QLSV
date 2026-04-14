"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import { useRouter } from "next/navigation";
import {
    ClipboardCheck,
    ChevronDown,
    Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import React from "react";
import { getStudentUserId, readStudentSessionUser } from "@/lib/student-session";

export default function AttendancePage() {
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = readStudentSessionUser();
                const userId = getStudentUserId(user);
                if (!userId) return;

                const studentData = await StudentService.getProfile(userId);
                setStudent(studentData);

                if (studentData.enrollments) {
                    setEnrollments(studentData.enrollments);
                } else {
                    const enrollmentData = await StudentService.getEnrollments(studentData.id);
                    setEnrollments(enrollmentData || []);
                }
            } catch (error) {
                console.error("Failed to fetch attendance data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getPeriodsForAttendance = (date: string, schedules: any[]) => {
        if (!schedules || schedules.length === 0) return 0;
        const d = new Date(date);
        const jsDay = d.getDay();
        const prismaDay = jsDay === 0 ? 8 : jsDay + 1;
        const matchingSchedules = schedules.filter(s => s.dayOfWeek === prismaDay);
        return matchingSchedules.reduce((acc, s) => acc + (s.endShift - s.startShift + 1), 0);
    };

    const calculateAttendanceRate = (enrollment: any) => {
        const attendances = enrollment.attendances;
        if (!attendances || attendances.length === 0) return 100;
        
        // Count total periods scheduled for matching attendance dates
        const totalPeriods = attendances.reduce((acc: number, a: any) => 
            acc + getPeriodsForAttendance(a.date, enrollment.courseClass?.schedules || []), 0);
            
        if (totalPeriods === 0) return 100;

        // Count attended periods (PRESENT or EXCUSED)
        const attendedPeriods = attendances
            .filter((a: any) => a.status === "PRESENT" || a.status === "EXCUSED" || a.status === "ABSENT_EXCUSED")
            .reduce((acc: number, a: any) => acc + getPeriodsForAttendance(a.date, enrollment.courseClass?.schedules || []), 0);

        return Math.round((attendedPeriods / totalPeriods) * 100);
    };

    const averageRate = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, curr) => acc + calculateAttendanceRate(curr), 0) / enrollments.length)
        : 100;

    const groupedEnrollments = enrollments.reduce((acc: any, enr: any) => {
        const sem = enr.courseClass?.semester;
        const key = sem ? `${sem.name} (${sem.year} - ${sem.year + 1})` : "Khác";
        if (!acc[key]) acc = { [key]: [], ...acc }; // Prepend new semester to keep order
        acc[key].push(enr);
        return acc;
    }, {});

    const sortedSemesterKeys = Object.keys(groupedEnrollments).sort((a, b) => b.localeCompare(a));

    const toggleSemester = (key: string) => {
        setExpandedSemesters(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Auto-expand the most recent semester
    useEffect(() => {
        if (sortedSemesterKeys.length > 0 && Object.keys(expandedSemesters).length === 0) {
            setExpandedSemesters({ [sortedSemesterKeys[0]]: true });
        }
    }, [sortedSemesterKeys]);

    const calculateTermAbsences = (enr: any, type: 'EXCUSED' | 'UNEXCUSED') => {
        const statuses = type === 'EXCUSED' 
            ? ["EXCUSED", "ABSENT_EXCUSED"] 
            : ["ABSENT", "ABSENT_UNEXCUSED"];
            
        return enr.attendances?.filter((a: any) => statuses.includes(a.status))
            .reduce((acc: number, a: any) => acc + getPeriodsForAttendance(a.date, enr.courseClass?.schedules || []), 0) || 0;
    };

    const totalExcused = enrollments.reduce((acc, enr) => acc + calculateTermAbsences(enr, 'EXCUSED'), 0);
    const totalUnexcused = enrollments.reduce((acc, enr) => acc + calculateTermAbsences(enr, 'UNEXCUSED'), 0);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 bg-transparent pb-20">
            {/* Header Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <div className="px-6 py-5 flex flex-col md:flex-row justify-between items-center bg-slate-50/50 border-b border-slate-200 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                            <ClipboardCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Thông tin điểm danh</h1>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giám sát chuyên cần học tập</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest">Tỷ lệ chuyên cần TB</p>
                            <p className="text-lg font-black text-indigo-600">{averageRate}%</p>
                        </div>
                        <div className="h-10 w-px bg-slate-200"></div>
                        <Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4" /> In báo cáo
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-slate-200 h-10 text-center">
                                <TableHead className="w-12 text-center font-bold text-slate-500 text-[10px] uppercase">STT</TableHead>
                                <TableHead className="w-32 text-left font-bold text-slate-500 text-[10px] uppercase">Mã lớp HP</TableHead>
                                <TableHead className="text-left font-bold text-slate-500 text-[10px] uppercase">Tên môn học/học phần</TableHead>
                                <TableHead className="w-16 text-center font-bold text-slate-500 text-[10px] uppercase">TC</TableHead>
                                <TableHead className="w-32 text-center font-bold text-blue-600 text-[10px] uppercase bg-blue-50/30">Số tiết nghỉ có phép</TableHead>
                                <TableHead className="w-32 text-center font-bold text-rose-600 text-[10px] uppercase bg-rose-50/30">Số tiết nghỉ không phép</TableHead>
                                <TableHead className="w-20 text-center font-bold text-slate-500 text-[10px] uppercase pr-6">Chi tiết</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedSemesterKeys.length > 0 ? (
                                sortedSemesterKeys.map((semesterKey) => {
                                    const isOpen = expandedSemesters[semesterKey];
                                    return (
                                        <React.Fragment key={semesterKey}>
                                            <TableRow
                                                className="bg-slate-50/80 hover:bg-slate-100 cursor-pointer border-slate-200"
                                                onClick={() => toggleSemester(semesterKey)}
                                            >
                                                <TableCell colSpan={7} className="py-2.5 px-6">
                                                    <div className="flex items-center gap-2">
                                                        <div className={cn("transition-transform", isOpen && "rotate-90")}>
                                                            <ChevronDown size={14} className="text-slate-400" />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{semesterKey}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 ml-auto uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                                                            {groupedEnrollments[semesterKey].length} Lớp học phần
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>

                                            <AnimatePresence>
                                                {isOpen && groupedEnrollments[semesterKey].map((enr: any, index: number) => {
                                                    const excused = calculateTermAbsences(enr, 'EXCUSED');
                                                    const unexcused = calculateTermAbsences(enr, 'UNEXCUSED');
                                                    const isExpanded = expandedClass === enr.id;

                                                    return (
                                                        <React.Fragment key={enr.id}>
                                                            <motion.tr
                                                                initial={{ opacity: 0, y: -4 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                className="hover:bg-slate-50/80 border-slate-100 h-14 group transition-colors cursor-pointer"
                                                                onClick={() => setExpandedClass(isExpanded ? null : enr.id)}
                                                            >
                                                                <TableCell className="text-center font-medium text-slate-400 text-[10px] border-b border-slate-50">{index + 1}</TableCell>
                                                                <TableCell className="font-bold text-indigo-600 text-[10px] border-b border-slate-50">{enr.courseClass?.code}</TableCell>
                                                                <TableCell className="font-bold text-slate-700 text-[11px] border-b border-slate-50">{enr.courseClass?.subject?.name}</TableCell>
                                                                <TableCell className="text-center font-bold text-slate-600 text-[10px] border-b border-slate-50">{enr.courseClass?.subject?.credits || 0}</TableCell>
                                                                <TableCell className="text-center font-black text-blue-600 text-[12px] border-b border-slate-50 bg-blue-50/10">{excused}</TableCell>
                                                                <TableCell className="text-center font-black text-rose-500 text-[12px] border-b border-slate-50 bg-rose-50/10">{unexcused}</TableCell>
                                                                <TableCell className="text-center pr-6 border-b border-slate-50">
                                                                    <div className={cn(
                                                                        "h-6 w-6 inline-flex items-center justify-center rounded transition-transform bg-slate-100 border border-slate-200",
                                                                        isExpanded && "rotate-180 bg-indigo-50 border-indigo-200"
                                                                    )}>
                                                                        <ChevronDown size={12} className={cn(isExpanded ? "text-indigo-600" : "text-slate-400")} />
                                                                    </div>
                                                                </TableCell>
                                                            </motion.tr>

                                                            {/* Expanded Logs */}
                                                            <AnimatePresence>
                                                                {isExpanded && (
                                                                    <TableRow className="bg-slate-50/50 border-none">
                                                                        <TableCell colSpan={7} className="p-0">
                                                                            <motion.div
                                                                                initial={{ height: 0, opacity: 0 }}
                                                                                animate={{ height: "auto", opacity: 1 }}
                                                                                exit={{ height: 0, opacity: 0 }}
                                                                                className="overflow-hidden border-x border-slate-100 mx-10 my-2 rounded-lg bg-white shadow-sm border border-slate-200"
                                                                            >
                                                                                <div className="p-4 flex flex-wrap gap-2">
                                                                                    {enr.attendances?.length > 0 ? (
                                                                                        enr.attendances.map((att: any, i: number) => {
                                                                                            const periods = getPeriodsForAttendance(att.date, enr.courseClass?.schedules || []);
                                                                                            return (
                                                                                                <div key={i} className={cn(
                                                                                                    "flex items-center gap-2.5 px-3 py-1.5 rounded-md border text-[10px] font-bold",
                                                                                                    att.status === "PRESENT" ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" :
                                                                                                    (att.status === "EXCUSED" || att.status === "ABSENT_EXCUSED") ? "bg-blue-50 text-blue-700 border-blue-100/50" :
                                                                                                    "bg-rose-50 text-rose-700 border-rose-100/50"
                                                                                                )}>
                                                                                                    <span className="opacity-60">{new Date(att.date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}</span>
                                                                                                    <div className="h-3 w-px bg-current opacity-20"></div>
                                                                                                    <span>
                                                                                                        {att.status === "PRESENT" ? "Đã điểm danh" : 
                                                                                                         (att.status === "EXCUSED" || att.status === "ABSENT_EXCUSED") ? "Nghỉ có phép" : "Nghỉ không phép"}
                                                                                                    </span>
                                                                                                    <div className="h-3 w-px bg-current opacity-20"></div>
                                                                                                    <span className="text-slate-400">{periods} Tiết</span>
                                                                                                </div>
                                                                                            );
                                                                                        })
                                                                                    ) : (
                                                                                        <div className="w-full py-2 text-center text-slate-400 text-[10px] font-medium italic">
                                                                                            Chưa có dữ liệu chi tiết
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </motion.div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                )}
                                                            </AnimatePresence>
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <ClipboardCheck className="h-8 w-8 text-slate-300 mb-2" />
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Không tìm thấy dữ liệu điểm danh</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        {enrollments.length > 0 && (
                            <tfoot className="bg-slate-50/80 border-t-2 border-slate-200 relative z-10">
                                <TableRow className="h-14">
                                    <TableCell colSpan={4} className="text-right py-3 pr-6 font-black text-slate-700 text-[11px] uppercase tracking-widest">Tổng cộng tiết nghỉ:</TableCell>
                                    <TableCell className="text-center font-black text-blue-700 text-sm bg-blue-50/20">{totalExcused}</TableCell>
                                    <TableCell className="text-center font-black text-rose-600 text-sm bg-rose-50/20">{totalUnexcused}</TableCell>
                                    <TableCell></TableCell>
                                </TableRow>
                            </tfoot>
                        )}
                    </Table>
                </div>
            </div>
        </div>
    );
}
