"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    Award,
    ChevronRight,
    TrendingUp,
    Download,
    Info,
    Printer,
    Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export default function TrainingResultsPage() {
    const [trainingData, setTrainingData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                const data = await StudentService.getTrainingResults(studentId);
                if (data && data.length > 0) {
                    setTrainingData(data);
                } else {
                    // Fallback mock data if API returns empty
                    setTrainingData([
                        { semester: "Học kỳ 1 - 2023-2024", score: 85, rating: "Tốt" },
                        { semester: "Học kỳ 2 - 2023-2024", score: 92, rating: "Xuất sắc" }
                    ]);
                }
            } catch (error) {
                console.error("Failed to fetch training results:", error);
                setTrainingData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-4 bg-transparent pb-20">
            {/* Header Section */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden">
                <div className="px-8 py-6 flex flex-col md:flex-row justify-between items-center bg-purple-50/50 border-b border-slate-200 gap-6">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-purple-200 flex items-center justify-center text-purple-600 shadow-sm">
                            <Award className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-700 uppercase tracking-tight">Kết quả rèn luyện</h1>
                            <p className="text-xs font-semibold text-purple-600">Ghi nhận nỗ lực hoạt động và đạo đức</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-purple-100 shadow-sm">
                        <div className="text-right">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Xếp loại chủ đạo</p>
                            <p className="text-xl font-black text-purple-600">Xuất sắc</p>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                            <Trophy className="h-5 w-5" />
                        </div>
                    </div>
                </div>

                <div className="px-8 py-4 flex flex-wrap justify-between items-center gap-4 bg-white">
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4" /> In minh chứng
                        </Button>
                        <Button className="h-9 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Download className="mr-2 h-4 w-4" /> Tải bảng điểm RL
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto border-t border-slate-100">
                    <Table className="border-collapse">
                        <TableHeader className="bg-purple-50/30">
                            <TableRow className="hover:bg-transparent border-slate-200">
                                <TableHead className="font-bold text-purple-800 text-xs uppercase pl-8 h-12">Học kỳ</TableHead>
                                <TableHead className="w-48 font-bold text-purple-800 text-xs uppercase h-12 text-center">Xếp loại</TableHead>
                                <TableHead className="w-48 font-bold text-purple-800 text-xs uppercase text-center h-12">Tổng điểm</TableHead>
                                <TableHead className="w-32 font-bold text-purple-800 text-xs uppercase text-center h-12 pr-8">Chi tiết</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {trainingData.length > 0 ? (
                                trainingData.map((data: any, idx: number) => (
                                    <TableRow key={idx} className="hover:bg-slate-50 border-slate-100 transition-colors h-14">
                                        <TableCell className="font-bold text-slate-700 text-xs pl-8">{data.semester}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "px-3 py-1 rounded text-[10px] font-black border uppercase tracking-tight",
                                                data.rating === "Xuất sắc" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                    data.rating === "Tốt" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        "bg-blue-50 text-blue-600 border-blue-200"
                                            )}>
                                                {data.rating}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-center font-black text-slate-800 text-sm">{data.score}</TableCell>
                                        <TableCell className="text-center pr-8">
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg bg-slate-50 border border-slate-200 hover:bg-purple-50 hover:border-purple-200 group">
                                                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-purple-600" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-32 text-center bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <Award className="h-10 w-10 text-slate-400 mb-2" />
                                            <p className="text-sm font-bold text-slate-500">Chưa có dữ liệu rèn luyện</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* Info Section */}
            <div className="grid md:grid-cols-1 gap-4">
                <div className="bg-white border border-slate-200 rounded-[1.5rem] p-6 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Info className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800 mb-1 leading-none">Lưu ý về Điểm rèn luyện</h3>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-2xl">
                            Điểm rèn luyện là cơ sở để xét học bổng, khen thưởng và các chế độ ưu tiên khác.
                            Sinh viên cần tích cực tham gia các hoạt động ngoại khóa, đoàn hội để cải thiện kết quả này.
                        </p>
                        <Button variant="link" className="px-0 h-auto mt-2 text-blue-600 text-xs font-bold hover:no-underline">
                            Xem quy định chi tiết <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
