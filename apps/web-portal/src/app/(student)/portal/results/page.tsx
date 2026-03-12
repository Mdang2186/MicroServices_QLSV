"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
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

export default function ResultsPage() {
    const [student, setStudent] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchStudentData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const userId = user.id;

                const data = await StudentService.getProfile(userId);
                setStudent(data);

                if (data.grades) {
                    setGrades(data.grades);
                } else {
                    const gradesData = await StudentService.getGrades(data.id);
                    setGrades(gradesData || []);
                }
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
                            { label: "CPA Tích lũy", value: student?.cpa?.toFixed(2) || "0.00", icon: Award },
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
                    <Table className="border-collapse">
                        <TableHeader className="bg-sky-50/50">
                            <TableRow className="hover:bg-transparent border-slate-200">
                                <TableHead className="w-32 font-bold text-sky-800 text-xs uppercase pl-8 h-12">Mã môn</TableHead>
                                <TableHead className="font-bold text-sky-800 text-xs uppercase h-12">Tên môn học</TableHead>
                                <TableHead className="w-24 font-bold text-sky-800 text-xs uppercase text-center h-12">Số TC</TableHead>
                                <TableHead className="w-24 font-bold text-sky-800 text-xs uppercase text-center h-12">Điểm TK(10)</TableHead>
                                <TableHead className="w-24 font-bold text-sky-800 text-xs uppercase text-center h-12">Điểm TK(4)</TableHead>
                                <TableHead className="w-24 font-bold text-sky-800 text-xs uppercase text-center h-12">Điểm chữ</TableHead>
                                <TableHead className="w-32 font-bold text-sky-800 text-xs uppercase text-center h-12 pr-8">Kết quả</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGrades.length > 0 ? (
                                filteredGrades.map((g, i) => (
                                    <TableRow key={i} className="hover:bg-slate-50 border-slate-100 transition-colors h-12">
                                        <TableCell className="font-bold text-blue-600 text-xs pl-8">{g.subject?.code}</TableCell>
                                        <TableCell className="font-bold text-slate-700 text-xs">{g.subject?.name}</TableCell>
                                        <TableCell className="font-bold text-slate-600 text-xs text-center">{g.subject?.credits}</TableCell>
                                        <TableCell className="font-black text-slate-800 text-sm text-center">{g.totalScore10?.toFixed(1) || "0.0"}</TableCell>
                                        <TableCell className="font-black text-slate-800 text-sm text-center">{g.totalScore4?.toFixed(1) || "0.0"}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "px-2.5 py-1 rounded text-[11px] font-black border",
                                                g.totalScore10 >= 8.5 ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                    g.totalScore10 >= 4.0 ? "bg-blue-50 text-blue-600 border-blue-200" :
                                                        "bg-red-50 text-red-600 border-red-200"
                                            )}>
                                                {g.totalScore4 >= 3.5 ? "A" : g.totalScore4 >= 3.0 ? "B+" : g.totalScore4 >= 2.5 ? "B" : g.totalScore4 >= 2.0 ? "C+" : g.totalScore4 >= 1.5 ? "C" : g.totalScore4 >= 1.0 ? "D+" : g.totalScore4 >= 0.5 ? "D" : "F"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center pr-8">
                                            {g.totalScore10 >= 4.0 ? (
                                                <span className="inline-flex items-center text-emerald-600 font-bold text-[10px] uppercase gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                                                    Đạt
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-red-500 font-bold text-[10px] uppercase gap-1 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                                                    Học lại
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <BookOpen className="h-10 w-10 text-slate-400 mb-2" />
                                            <p className="text-sm font-bold text-slate-500">Chưa có dữ liệu học tập</p>
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
