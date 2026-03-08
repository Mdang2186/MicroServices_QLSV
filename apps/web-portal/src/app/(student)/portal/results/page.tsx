"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    GraduationCap,
    TrendingUp,
    Award,
    BookOpen,
    Filter,
    Download,
    ChevronRight,
    Search,
    AlertCircle
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

export default function ResultsPage() {
    const [student, setStudent] = useState<any>(null);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                const [studentData, gradesData] = await Promise.all([
                    StudentService.getProfile(user.id),
                    StudentService.getGrades(studentId)
                ]);

                setStudent(studentData);
                setGrades(gradesData);
            } catch (error) {
                console.error("Failed to fetch results:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
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
                <div className="relative">
                    <div className="h-16 w-16 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600"></div>
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2.5rem] border border-white bg-white/40 p-12 shadow-2xl backdrop-blur-3xl">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-2xl font-black text-slate-900">Không tìm thấy thông tin</h2>
                <p className="mt-2 text-slate-500">Vui lòng quay lại sau.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 bg-transparent pb-20">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-900">Kết quả học tập</h1>
                        <p className="mt-1 text-sm font-medium text-slate-500">Theo dõi tiến độ và thành tích học tập của bạn</p>
                    </div>
                    <div className="flex gap-2">
                        <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 text-xs font-bold h-9">
                            <Download className="mr-2 h-3.5 w-3.5" /> Xuất bảng điểm
                        </Button>
                        <Button className="rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 text-xs font-bold h-9 px-4">
                            <Filter className="mr-2 h-3.5 w-3.5" /> Học kỳ hiện tại
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "GPA Hệ 4", value: student.gpa?.toFixed(2) || "0.00", icon: TrendingUp, color: "blue" },
                    { label: "CPA Tích lũy", value: student.cpa?.toFixed(2) || "0.00", icon: Award, color: "indigo" },
                    { label: "Số tín chỉ đạt", value: student.totalEarnedCredits || 0, icon: BookOpen, color: "emerald" },
                    { label: "Học lực", value: (student.cpa >= 3.2 ? "Giỏi" : student.cpa >= 2.5 ? "Khá" : "Trung bình"), icon: GraduationCap, color: "violet" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="rounded-[1.5rem] border border-white bg-white/60 p-5 shadow-sm backdrop-blur-2xl"
                    >
                        <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                        <h3 className="mt-0.5 text-2xl font-black text-slate-900">{stat.value}</h3>
                    </motion.div>
                ))}
            </div>

            {/* Results Table */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="rounded-[2rem] border border-white bg-white/60 p-6 shadow-2xl backdrop-blur-3xl overflow-hidden"
            >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <h2 className="text-lg font-black text-slate-900">Chi tiết bảng điểm</h2>
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm kiếm môn học..."
                            className="w-full rounded-xl border-none bg-slate-100/50 py-2 pl-10 pr-4 text-xs font-medium outline-none ring-2 ring-transparent transition-all focus:ring-blue-500/20"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent border-slate-100 h-10">
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider pl-6">Mã môn</TableHead>
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider">Tên môn học</TableHead>
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider text-center">Tín chỉ</TableHead>
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider text-center">Điểm số</TableHead>
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider text-center">Điểm chữ</TableHead>
                                <TableHead className="font-black text-slate-900 text-[10px] uppercase tracking-wider text-center">Kết quả</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredGrades.length > 0 ? (
                                filteredGrades.map((g, i) => (
                                    <TableRow key={i} className="hover:bg-slate-50/50 border-slate-50 transition-colors h-12">
                                        <TableCell className="font-bold text-blue-600 text-xs pl-6">{g.subject?.code}</TableCell>
                                        <TableCell className="font-bold text-slate-800 text-xs">{g.subject?.name}</TableCell>
                                        <TableCell className="font-bold text-slate-600 text-xs text-center">{g.subject?.credits}</TableCell>
                                        <TableCell className="font-black text-slate-900 text-center text-sm">{g.totalScore10?.toFixed(1) || "0.0"}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${g.totalScore10 >= 8.5 ? "bg-emerald-50 text-emerald-600" :
                                                g.totalScore10 >= 7.0 ? "bg-blue-50 text-blue-600" :
                                                    g.totalScore10 >= 4.0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"
                                                }`}>
                                                {g.totalScore4 >= 3.5 ? "A" : g.totalScore4 >= 3.0 ? "B+" : g.totalScore4 >= 2.5 ? "B" : g.totalScore4 >= 2.0 ? "C+" : g.totalScore4 >= 1.5 ? "C" : g.totalScore4 >= 1.0 ? "D+" : g.totalScore4 >= 0.5 ? "D" : "F"}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {g.totalScore10 >= 4.0 ? (
                                                <span className="inline-flex items-center text-emerald-600 font-bold text-[10px] uppercase tracking-tight">
                                                    Đạt <ChevronRight className="h-3 w-3 ml-0.5" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-red-500 font-bold text-[10px] uppercase tracking-tight">
                                                    Không đạt
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-slate-400 italic text-xs">
                                        Không tìm thấy dữ liệu học tập nào
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </motion.div>
        </div>
    );
}
