"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import {
    GraduationCap,
    TrendingUp,
    Award,
    BookOpen,
    Download,
    Search,
    Printer,
    FileText
} from "lucide-react";
import { motion } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStudentUserId, readStudentSessionUser } from "@/lib/student-session";

export default function ResultsPage() {
    const [student, setStudent] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [cpa, setCpa] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const user = readStudentSessionUser();
                const userId = getStudentUserId(user);
                if (!userId) return;

                const data = await StudentService.getProfile(userId);
                setStudent(data);

                if (data.grades) {
                    setGrades(data.grades);
                } else {
                    const gradesData = await StudentService.getGrades(data.id);
                    setGrades(gradesData || []);
                }

                const cpaData = await StudentService.getCPA(data.id);
                setCpa(cpaData || 0);
            } catch (error) {
                console.error("Failed to fetch student data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStudentData();
    }, []);

    const filteredGrades = useMemo(() => {
        return grades.filter(g =>
            g.subject?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            g.subject?.code?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [grades, searchTerm]);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-4 bg-transparent pb-20">
            {/* Main Stats Header */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden">
                <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center bg-sky-50 border-b border-slate-200 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-sky-200 flex items-center justify-center text-blue-600 shadow-sm">
                            <GraduationCap className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-700 uppercase tracking-tight">Kết quả học tập</h1>
                            <p className="text-xs font-semibold text-sky-600">Tổng hợp điểm số các học kỳ</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full md:w-auto">
                        {[
                            { label: "GPA Hệ 4", value: student?.gpa?.toFixed(2) || "0.00", icon: TrendingUp },
                            { label: "CPA Tích lũy", value: cpa.toFixed(2), icon: Award },
                            { label: "Tín chỉ đạt", value: student?.totalEarnedCredits || 0, icon: BookOpen },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col px-4 py-2 bg-white border border-sky-100 rounded-xl shadow-sm">
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{stat.label}</span>
                                <span className="text-lg font-black text-blue-600">{stat.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="px-8 py-4 flex flex-wrap justify-between items-center gap-4 bg-white">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm môn học..."
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4" /> In bảng điểm
                        </Button>
                        <Button className="h-9 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-sm">
                            <FileText className="mr-2 h-4 w-4" /> Xuất PDF
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto border-t border-slate-100">
                    <Table className="border-collapse min-w-[1200px]">
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent border-slate-200">
                                <TableHead className="w-24 font-black text-slate-800 text-[10px] uppercase pl-6 h-12">Mã HP</TableHead>
                                <TableHead className="min-w-[200px] font-black text-slate-800 text-[10px] uppercase h-12 text-left">Tên học phần</TableHead>
                                <TableHead className="w-16 font-black text-slate-800 text-[10px] uppercase text-center h-12">TC</TableHead>
                                <TableHead className="w-20 font-black text-blue-700 text-[10px] uppercase text-center h-12 bg-blue-50/30">CC (10%)</TableHead>
                                <TableHead className="w-20 font-black text-blue-700 text-[10px] uppercase text-center h-12 bg-blue-50/30">TX1 (20%)</TableHead>
                                <TableHead className="w-20 font-black text-blue-700 text-[10px] uppercase text-center h-12 bg-blue-50/30">TX2 (10%)</TableHead>
                                <TableHead className="w-24 font-black text-indigo-700 text-[10px] uppercase text-center h-12 bg-indigo-50/30 font-bold underline decoration-indigo-200 underline-offset-4">TBHP (40%)</TableHead>
                                <TableHead className="w-24 font-black text-amber-700 text-[10px] uppercase text-center h-12 bg-amber-50/30">Thi (60%)</TableHead>
                                <TableHead className="w-24 font-black text-slate-900 text-[10px] uppercase text-center h-12">Tổng (10)</TableHead>
                                <TableHead className="w-20 font-black text-slate-900 text-[10px] uppercase text-center h-12">Tổng (4)</TableHead>
                                <TableHead className="w-20 font-black text-slate-900 text-[10px] uppercase text-center h-12">Chữ</TableHead>
                                <TableHead className="w-28 font-black text-slate-900 text-[10px] uppercase text-center h-12 pr-6">Kết quả</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGrades.length > 0 ? (
                                filteredGrades.map((g, i) => {
                                    // Calculate TBHP if not directly available (simulated as midtermScore or average)
                                    const tbhp = g.midtermScore || (
                                        ((g.attendanceScore || 0) * 1 + (g.regularScore1 || 0) * 2 + (g.regularScore2 || 0) * 1) / 4
                                    );
                                    
                                    return (
                                        <TableRow key={i} className="hover:bg-slate-50 border-slate-100 transition-colors h-14 group">
                                            <TableCell className="font-bold text-slate-400 text-[11px] pl-6 tracking-tighter uppercase">{g.subject?.code}</TableCell>
                                            <TableCell className="font-black text-slate-700 text-[11px] uppercase tracking-tight">{g.subject?.name}</TableCell>
                                            <TableCell className="font-bold text-slate-500 text-[11px] text-center">{g.subject?.credits}</TableCell>
                                            <TableCell className="font-bold text-blue-600 text-xs text-center tabular-nums bg-blue-50/10">{g.attendanceScore?.toFixed(1) || "-"}</TableCell>
                                            <TableCell className="font-bold text-blue-600 text-xs text-center tabular-nums bg-blue-50/10">{g.regularScore1?.toFixed(1) || "-"}</TableCell>
                                            <TableCell className="font-bold text-blue-600 text-xs text-center tabular-nums bg-blue-50/10">{g.regularScore2?.toFixed(1) || "-"}</TableCell>
                                            <TableCell className="font-black text-indigo-600 text-xs text-center tabular-nums bg-indigo-50/10">
                                                {tbhp > 0 ? tbhp.toFixed(1) : "-"}
                                            </TableCell>
                                            <TableCell className="font-black text-amber-600 text-xs text-center tabular-nums bg-amber-50/10">{g.finalScore?.toFixed(1) || "-"}</TableCell>
                                            <TableCell className="font-black text-slate-900 text-sm text-center tabular-nums bg-slate-50/30">{g.totalScore10?.toFixed(1) || "0.0"}</TableCell>
                                            <TableCell className="font-black text-slate-900 text-sm text-center tabular-nums">{g.totalScore4?.toFixed(2) || "0.00"}</TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "px-2 py-0.5 rounded-lg text-[10px] font-black border",
                                                    g.totalScore10 >= 8.5 ? "bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm shadow-emerald-100" :
                                                    g.totalScore10 >= 4.0 ? "bg-indigo-50 text-indigo-600 border-indigo-200" :
                                                    "bg-rose-50 text-rose-600 border-rose-200 shadow-sm shadow-rose-100 animate-pulse"
                                                )}>
                                                    {g.totalScore4 >= 3.5 ? "A" : g.totalScore4 >= 3.0 ? "B+" : g.totalScore4 >= 2.5 ? "B" : g.totalScore4 >= 2.0 ? "C+" : g.totalScore4 >= 1.5 ? "C" : g.totalScore4 >= 1.0 ? "D+" : g.totalScore4 >= 0.5 ? "D" : "F"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center pr-6">
                                                {g.totalScore10 >= 4.0 ? (
                                                    <div className="inline-flex items-center text-emerald-600 font-black text-[9px] uppercase gap-1.5 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                        Đạt HP
                                                    </div>
                                                ) : (
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 px-4 bg-rose-500 hover:bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-200 active:scale-95 transition-all"
                                                        onClick={() => window.location.href = `/portal/enroll?subjectId=${g.subjectId}`}
                                                    >
                                                        Thi lại
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={12} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-30 gap-4">
                                            <div className="h-20 w-20 rounded-full border-2 border-dashed border-slate-300 flex items-center justify-center">
                                                <BookOpen className="h-10 w-10 text-slate-400" />
                                            </div>
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest px-4">Hệ thống chưa ghi nhận dữ liệu điểm cho bạn</p>
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
