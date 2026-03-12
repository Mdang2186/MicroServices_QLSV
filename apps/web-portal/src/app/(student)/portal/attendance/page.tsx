"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    ClipboardCheck,
    CheckCircle2,
    XCircle,
    Info,
    ChevronDown,
    Printer,
    FileCheck
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

export default function AttendancePage() {
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const userId = user.id;

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

    const calculateAttendanceRate = (attendances: any[]) => {
        if (!attendances || attendances.length === 0) return 100;
        const present = attendances.filter(a => a.status === "PRESENT" || a.status === "EXCUSED").length;
        return Math.round((present / attendances.length) * 100);
    };

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
            </div>
        );
    }

    const averageRate = enrollments.length > 0
        ? Math.round(enrollments.reduce((acc, curr) => acc + calculateAttendanceRate(curr.attendances), 0) / enrollments.length)
        : 100;

    return (
        <div className="min-h-screen space-y-4 bg-transparent pb-20">
            {/* Header Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden">
                <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center bg-emerald-50/50 border-b border-slate-200 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <ClipboardCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-700 uppercase tracking-tight">Thông tin điểm danh</h1>
                            <p className="text-xs font-semibold text-emerald-600">Giám sát tỷ lệ hiện diện trong kỳ</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Tỷ lệ chuyên cần TB</p>
                            <p className="text-xl font-black text-emerald-600">{averageRate}%</p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                            <FileCheck className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="px-8 py-4 flex flex-wrap justify-between items-center gap-4 bg-white">
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4" /> In báo cáo
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto border-t border-slate-100">
                    <Table className="border-collapse">
                        <TableHeader className="bg-emerald-50/30">
                            <TableRow className="hover:bg-transparent border-slate-200">
                                <TableHead className="w-32 font-bold text-emerald-800 text-xs uppercase pl-8 h-12">Mã lớp HP</TableHead>
                                <TableHead className="font-bold text-emerald-800 text-xs uppercase h-12">Tên môn học</TableHead>
                                <TableHead className="font-bold text-emerald-800 text-xs uppercase h-12">Giảng viên</TableHead>
                                <TableHead className="w-24 font-bold text-emerald-800 text-xs uppercase text-center h-12">Tỷ lệ</TableHead>
                                <TableHead className="w-24 font-bold text-emerald-800 text-xs uppercase text-center h-12">Vắng</TableHead>
                                <TableHead className="w-24 font-bold text-emerald-800 text-xs uppercase text-center h-12 pr-8">Chi tiết</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {enrollments.length > 0 ? (
                                enrollments.map((enr) => {
                                    const rate = calculateAttendanceRate(enr.attendances);
                                    const isExpanded = expandedClass === enr.id;

                                    return (
                                        <React.Fragment key={enr.id}>
                                            <TableRow className="hover:bg-slate-50 border-slate-100 transition-colors h-14 cursor-pointer" onClick={() => setExpandedClass(isExpanded ? null : enr.id)}>
                                                <TableCell className="font-bold text-blue-600 text-xs pl-8">{enr.courseClass?.code}</TableCell>
                                                <TableCell className="font-bold text-slate-700 text-xs">{enr.courseClass?.subject?.name}</TableCell>
                                                <TableCell className="font-medium text-slate-500 text-xs">{enr.courseClass?.lecturer?.fullName}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded text-[10px] font-black border",
                                                        rate >= 80 ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            rate >= 50 ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                                "bg-red-50 text-red-600 border-red-100"
                                                    )}>
                                                        {rate}%
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center font-bold text-red-500 text-xs">
                                                    {enr.attendances?.filter((a: any) => a.status === "ABSENT").length || 0}
                                                </TableCell>
                                                <TableCell className="text-center pr-8">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className={cn(
                                                            "h-8 w-8 p-0 rounded-lg transition-transform bg-slate-50 border border-slate-200",
                                                            isExpanded && "rotate-180 bg-emerald-50 border-emerald-200"
                                                        )}
                                                    >
                                                        <ChevronDown className={cn("h-4 w-4", isExpanded ? "text-emerald-600" : "text-slate-400")} />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <TableRow className="bg-slate-50/50">
                                                        <TableCell colSpan={6} className="p-0 border-b border-slate-200">
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: "auto", opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <div className="px-8 py-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                                                    {enr.attendances?.length > 0 ? (
                                                                        enr.attendances.map((att: any, i: number) => (
                                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                                                                                <div className={cn(
                                                                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                                                                                    att.status === "PRESENT" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                                        att.status === "EXCUSED" ? "bg-blue-50 text-blue-600 border-blue-100" :
                                                                                            "bg-red-50 text-red-500 border-red-100"
                                                                                )}>
                                                                                    {att.status === "PRESENT" ? <CheckCircle2 className="h-4 w-4" /> :
                                                                                        att.status === "EXCUSED" ? <Info className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                                                                                </div>
                                                                                <div>
                                                                                    <p className="text-xs font-bold text-slate-800">
                                                                                        {new Date(att.date).toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' })}
                                                                                    </p>
                                                                                    <p className="text-[9px] font-black uppercase text-slate-400">
                                                                                        {att.status === "PRESENT" ? "Có mặt" :
                                                                                            att.status === "EXCUSED" ? "Có phép" : "Vắng mặt"}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <div className="col-span-full py-2 text-center text-slate-400 text-xs italic">
                                                                            Chưa có nhật ký điểm danh cho học phần này
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
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <ClipboardCheck className="h-10 w-10 text-slate-400 mb-2" />
                                            <p className="text-sm font-bold text-slate-500">Không tìm thấy dữ liệu điểm danh</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}

import React from "react";
