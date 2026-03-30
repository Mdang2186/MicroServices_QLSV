"use client";

import { useState, useEffect } from "react";
import { 
    Search, 
    Filter, 
    Download, 
    CheckCircle2, 
    AlertCircle, 
    Clock,
    MoreHorizontal,
    FileText,
    CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TuitionRecord {
    id: string;
    studentCode: string;
    studentName: string;
    faculty: string;
    subject: string;
    credits: number;
    fee: number;
    status: string;
    isPaid: boolean;
    debt: number;
}

interface TuitionControlTableProps {
    semesterId?: string;
}

export function TuitionControlTable({ semesterId }: TuitionControlTableProps) {
    const [data, setData] = useState<TuitionRecord[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selectedRecord, setSelectedRecord] = useState<TuitionRecord | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (semesterId) params.append("semesterId", semesterId);
        if (search) params.append("query", search);
        params.append("page", page.toString());
        params.append("limit", "10");

        fetch(`/api/students/dashboard/tuition?${params.toString()}`)
            .then(r => r.json())
            .then(res => {
                setData(res.items || []);
                setTotal(res.total || 0);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [semesterId, search, page]);

    const handleUpdateStatus = async (id: string, updates: { isPaid?: boolean, deduction?: number }) => {
        setIsUpdating(true);
        try {
            await fetch(`/api/students/dashboard/tuition/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            // Refresh data
            setPage(p => p); // Trigger effect
        } catch (e) {
            console.error(e);
        } finally {
            setIsUpdating(false);
            setSelectedRecord(null);
        }
    };

    return (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden group">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/20">
                <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <CreditCard size={18} className="text-uneti-blue" />
                        Bảng Kiểm soát Học phí & Dữ liệu
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight italic">Danh sách tính toán chi tiết theo học kỳ</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group/search">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-uneti-blue transition-colors" size={16} />
                        <input 
                            type="text" 
                            placeholder="Mã SV, Họ tên..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            className="pl-12 pr-6 py-3 rounded-2xl bg-white border border-slate-100 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all w-64 shadow-inner"
                        />
                    </div>
                    <button className="p-3 rounded-2xl bg-white border border-slate-100 text-slate-400 hover:text-uneti-blue hover:shadow-md transition-all">
                        <Download size={18} />
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] w-[280px]">Sinh viên</th>
                            <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Học phần</th>
                            <th className="py-5 px-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">TC</th>
                            <th className="py-5 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Học phí</th>
                            <th className="py-5 px-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Trạng thái</th>
                            <th className="py-5 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan={6} className="py-8 px-8"><div className="h-10 bg-slate-50 rounded-2xl w-full"></div></td>
                                </tr>
                            ))
                        ) : data.length > 0 ? (
                            data.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/50 transition-all group/row">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-uneti-blue-light text-uneti-blue flex items-center justify-center font-black text-[12px] group-hover/row:bg-uneti-blue group-hover/row:text-white transition-all">
                                                {item.studentName.charAt(0)}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-800 text-[13px] tracking-tight">{item.studentName}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.studentCode}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-700 text-[11px] uppercase tracking-tighter line-clamp-1">{item.subject}</span>
                                            <span className="text-[9px] font-bold text-slate-400">{item.faculty}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <span className="px-2.5 py-1 rounded-lg bg-slate-50 text-slate-600 font-bold text-[10px]">{item.credits}</span>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-slate-900 text-[13px]">{item.fee.toLocaleString()} </span>
                                            {item.debt > 0 && <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter">Nợ: {item.debt.toLocaleString()}</span>}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-center">
                                        <div className={cn(
                                            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm",
                                            item.isPaid ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                        )}>
                                            {item.isPaid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                            {item.isPaid ? "Đã đóng" : "Còn nợ"}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <button 
                                            onClick={() => setSelectedRecord(item)}
                                            className="p-2 rounded-xl hover:bg-white hover:shadow-md text-slate-300 hover:text-uneti-blue transition-all"
                                        >
                                            <MoreHorizontal size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="py-20 text-center">
                                    <Clock size={48} className="mx-auto text-slate-100 mb-4" />
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Không tìm thấy dữ liệu học phí</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Trang {page} / {Math.ceil(total / 10) || 1} - Tổng cộng {total} bản ghi</span>
                <div className="flex gap-2">
                    <button 
                        disabled={page === 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:enabled:text-uneti-blue transition-all disabled:opacity-50"
                    >
                        Trước
                    </button>
                    <button 
                        disabled={page >= Math.ceil(total / 10)}
                        onClick={() => setPage(p => p + 1)}
                        className="px-4 py-2 rounded-xl bg-white border border-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:enabled:text-uneti-blue transition-all disabled:opacity-50"
                    >
                        Sau
                    </button>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedRecord && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[40px] w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-uneti-blue text-white flex items-center justify-center font-black text-lg">
                                    {selectedRecord.studentName.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <h4 className="text-[15px] font-black text-slate-900 tracking-tight">{selectedRecord.studentName}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{selectedRecord.studentCode}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRecord(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <MoreHorizontal size={20} className="rotate-45" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Môn học</p>
                                    <p className="font-bold text-slate-800 text-sm leading-tight">{selectedRecord.subject}</p>
                                </div>
                                <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Học phí</p>
                                    <p className="font-black text-uneti-blue text-sm">{selectedRecord.fee.toLocaleString()} VND</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Thao tác Quản trị</h5>
                                <div className="grid grid-cols-2 gap-4">
                                    <button 
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateStatus(selectedRecord.id, { isPaid: !selectedRecord.isPaid })}
                                        className={cn(
                                            "flex items-center justify-center gap-2 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all",
                                            selectedRecord.isPaid 
                                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100" 
                                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100"
                                        )}
                                    >
                                        <CreditCard size={16} />
                                        {selectedRecord.isPaid ? "Hủy Đã đóng" : "Xác nhận Đã đóng"}
                                    </button>
                                    <button 
                                        disabled={isUpdating}
                                        onClick={() => handleUpdateStatus(selectedRecord.id, { deduction: selectedRecord.fee })}
                                        className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-white border border-slate-200 text-slate-600 text-[11px] font-black uppercase tracking-widest hover:border-uneti-blue hover:text-uneti-blue transition-all"
                                    >
                                        <FileText size={16} />
                                        Khấu trừ Học phí
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setSelectedRecord(null)} className="px-6 py-2 rounded-xl text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
