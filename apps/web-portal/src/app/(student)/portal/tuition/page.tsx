"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    Wallet,
    Receipt,
    CreditCard,
    History,
    Printer,
    Download,
    Search,
    Info,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    Filter
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { useSearchParams, useRouter } from "next/navigation";

import { Suspense } from "react";

function TuitionContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeTab = searchParams.get("tab") || "fees";

    const [student, setStudent] = useState<any>(null);
    const [fees, setFees] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;
                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                const [profile, feesData, transData] = await Promise.all([
                    StudentService.getProfile(user.id),
                    StudentService.getStudentFees(studentId),
                    StudentService.getFeeTransactions(studentId)
                ]);

                setStudent(profile);
                setFees(feesData || []);
                setTransactions(transData || []);
            } catch (error) {
                console.error("Failed to fetch tuition data:", error);
                // Fallback mock data
                setFees([
                    { name: "Học phí Học kỳ II (2023-2024)", semester: "HK2 (2023-2024)", totalAmount: 12500000, paidAmount: 0, status: "DEBT", dueDate: "2024-03-30" },
                    { name: "Bảo hiểm y tế (2024)", semester: "Cả năm", totalAmount: 850000, paidAmount: 850000, status: "PAID", dueDate: "2024-01-15" },
                    { name: "Lệ phí thi chuẩn đầu ra", semester: "Tự do", totalAmount: 450000, paidAmount: 450000, status: "PAID", dueDate: "2023-12-20" }
                ]);
                setTransactions([
                    { code: "PT20240115001", date: "2024-01-15", amount: 850000, method: "Banking", description: "Nộp BHYT 2024" },
                    { code: "PT20231220054", date: "2023-12-20", amount: 450000, method: "Banking", description: "Lệ phí thi chuẩn đầu ra" }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const totals = useMemo(() => {
        const total = fees.reduce((acc, f) => acc + (Number(f.finalAmount || f.totalAmount) || 0), 0);
        const paid = fees.reduce((acc, f) => acc + (Number(f.paidAmount) || 0), 0);
        return { total, paid, debt: total - paid };
    }, [fees]);

    const filteredFees = useMemo(() => {
        return fees.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [fees, searchTerm]);

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => t.code.toLowerCase().includes(searchTerm.toLowerCase()) || t.description?.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [transactions, searchTerm]);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-4 bg-transparent pb-20">
            {/* Summary Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: "Tổng nợ hiện tại", value: totals.debt, color: "text-red-600", bg: "bg-red-50", border: "border-red-100", icon: Wallet },
                    { label: "Đã thanh toán", value: totals.paid, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100", icon: CheckCircle2 },
                    { label: "Số dư ví (Mô phỏng)", value: 0, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100", icon: CreditCard },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className={cn("p-6 rounded-[1.5rem] border bg-white flex items-center justify-between shadow-sm", stat.border)}
                    >
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
                            <p className={cn("text-2xl font-black tracking-tight", stat.color)}>
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stat.value)}
                            </p>
                        </div>
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner", stat.bg, stat.color)}>
                            <stat.icon className="h-6 w-6" />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Main Content Area */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden">
                {/* Header & Tabs */}
                <div className="px-8 py-6 flex flex-col items-center justify-between bg-emerald-50/50 border-b border-slate-200 gap-6 md:flex-row">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-white border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                            <Receipt className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-700 uppercase tracking-tight">Quản lý học phí</h1>
                            <p className="text-xs font-semibold text-emerald-600">Tra cứu công nợ & Lịch sử thanh toán</p>
                        </div>
                    </div>

                    <div className="flex p-1 bg-white rounded-xl border border-emerald-100 shadow-sm">
                        <button
                            onClick={() => router.push("/portal/tuition?tab=fees")}
                            className={cn(
                                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === "fees" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-slate-500 hover:text-emerald-600"
                            )}
                        >
                            Danh sách phí
                        </button>
                        <button
                            onClick={() => router.push("/portal/tuition?tab=history")}
                            className={cn(
                                "px-6 py-2 text-xs font-bold rounded-lg transition-all",
                                activeTab === "history" || activeTab === "payment" ? "bg-emerald-600 text-white shadow-md shadow-emerald-100" : "text-slate-500 hover:text-emerald-600"
                            )}
                        >
                            Lịch sử thanh toán
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="px-8 py-4 flex flex-wrap justify-between items-center gap-4 bg-white border-b border-slate-50">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder={activeTab === "fees" ? "Tìm kiếm khoản phí..." : "Tìm mã phiếu, nội dung..."}
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="h-9 rounded-lg border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50">
                            <Printer className="mr-2 h-4 w-4" /> In bảng nợ
                        </Button>
                        <Button className="h-9 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold shadow-sm">
                            <CreditCard className="mr-2 h-4 w-4" /> Thanh toán ngay
                        </Button>
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    {activeTab === "fees" ? (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-12 h-12 pl-8 font-bold text-slate-400 text-[10px] uppercase text-center">#</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase h-12">Tên khoản phí</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700 text-xs uppercase text-center h-12">Học kỳ</TableHead>
                                    <TableHead className="w-40 font-bold text-slate-700 text-xs uppercase text-center h-12">Số tiền</TableHead>
                                    <TableHead className="w-40 font-bold text-slate-700 text-xs uppercase text-center h-12">Đã nộp</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700 text-xs uppercase text-center h-12">Trạng thái</TableHead>
                                    <TableHead className="w-40 font-bold text-slate-700 text-xs uppercase text-center h-12 pr-8">Hạn nộp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredFees.length > 0 ? (
                                    filteredFees.map((fee, i) => (
                                        <TableRow key={i} className="hover:bg-emerald-50/30 border-slate-100 transition-colors h-14">
                                            <TableCell className="text-center pl-8 text-[11px] font-bold text-slate-400">{i + 1}</TableCell>
                                            <TableCell>
                                                <p className="font-bold text-slate-700 text-xs leading-none mb-1">{fee.name}</p>
                                                <p className="text-[10px] font-medium text-slate-400 italic">Mã phí: {fee.id?.split('-')[0] || "---"}</p>
                                            </TableCell>
                                            <TableCell className="text-center font-bold text-slate-600 text-[11px]">{fee.semester}</TableCell>
                                            <TableCell className="text-center font-black text-slate-800 text-xs">
                                                {new Intl.NumberFormat('vi-VN').format(fee.finalAmount || fee.totalAmount)}
                                            </TableCell>
                                            <TableCell className="text-center font-black text-emerald-600 text-xs">
                                                {new Intl.NumberFormat('vi-VN').format(fee.paidAmount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={cn(
                                                    "px-2.5 py-1 rounded text-[10px] font-black border uppercase tracking-tight",
                                                    fee.status === "PAID" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                        fee.status === "PARTIAL" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                            "bg-red-50 text-red-600 border-red-200"
                                                )}>
                                                    {fee.status === "PAID" ? "Hoàn thành" : fee.status === "PARTIAL" ? "Có nợ" : "Chưa đóng"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center pr-8 text-[11px] font-bold text-slate-400">
                                                {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('vi-VN') : '---'}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <Receipt className="h-10 w-10 text-slate-400 mb-2" />
                                                <p className="text-sm font-bold text-slate-500">Không tìm thấy khoản phí nào</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-12 h-12 pl-8 font-bold text-slate-400 text-[10px] uppercase text-center">#</TableHead>
                                    <TableHead className="w-48 font-bold text-slate-700 text-xs uppercase h-12">Số phiếu/Mã giao dịch</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700 text-xs uppercase text-center h-12">Ngày nộp</TableHead>
                                    <TableHead className="w-40 font-bold text-slate-700 text-xs uppercase text-center h-12">Số tiền</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700 text-xs uppercase text-center h-12">Phương thức</TableHead>
                                    <TableHead className="font-bold text-slate-700 text-xs uppercase h-12">Nội dung thanh toán</TableHead>
                                    <TableHead className="w-32 font-bold text-slate-700 text-xs uppercase text-center h-12 pr-8">Phiếu thu</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.length > 0 ? (
                                    filteredTransactions.map((t, i) => (
                                        <TableRow key={i} className="hover:bg-emerald-50/30 border-slate-100 transition-colors h-14">
                                            <TableCell className="text-center pl-8 text-[11px] font-bold text-slate-400">{i + 1}</TableCell>
                                            <TableCell className="font-bold text-blue-600 text-xs">{t.code || t.transactionCode}</TableCell>
                                            <TableCell className="text-center font-bold text-slate-600 text-[11px] whitespace-nowrap">
                                                {new Date(t.date || t.transactionDate).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="text-center font-black text-emerald-600 text-xs">
                                                {new Intl.NumberFormat('vi-VN').format(t.amount)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 uppercase">
                                                    {t.method || t.paymentMethod}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-600 truncate max-w-[200px]">
                                                {t.description || 'Thanh toán học phí'}
                                            </TableCell>
                                            <TableCell className="text-center pr-8">
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-48 text-center bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed">
                                            <div className="flex flex-col items-center justify-center opacity-40">
                                                <History className="h-10 w-10 text-slate-400 mb-2" />
                                                <p className="text-sm font-bold text-slate-500">Chưa có lịch sử giao dịch</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>

            {/* Note Section */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-[1.5rem] p-6 flex items-start gap-4 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-white border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                    <Info className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 mb-1 leading-none uppercase tracking-tight">Quy định nộp học phí</h3>
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-4xl">
                        Sinh viên cần hoàn thành nghĩa vụ học phí đúng thời hạn quy định của Nhà trường. Quá thời hạn, sinh viên sẽ bị khóa cổng đăng ký học phần, không được dự thi kết thúc học phần và xử lý theo quy chế.
                        Mọi thắc mắc vui lòng liên hệ trực tiếp phòng Kế hoạch - Tài chính tại các cơ sở.
                    </p>
                    <div className="flex gap-4 mt-3">
                        <button className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Hướng dẫn thanh toán online</button>
                        <button className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Phúc tra học phí</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function TuitionPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600"></div>
            </div>
        }>
            <TuitionContent />
        </Suspense>
    );
}
