"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    CheckCircle2,
    Search,
    Filter,
    MoreHorizontal,
    ExternalLink,
    AlertTriangle,
    CheckCircle,
    Clock,
    UserCheck,
    BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DataTable from "@/components/DataTable";

export default function AcademicReviewPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("PENDING_APPROVAL");
    const [searchQuery, setSearchQuery] = useState("");
    const [processing, setProcessing] = useState<string | null>(null);

    const TOKEN = Cookies.get("admin_accessToken");

    const fetchClasses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/courses/classes", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                // For each class, fetch grade status summary
                const classesWithStatus = await Promise.all(data.map(async (c: any) => {
                    const gradeRes = await fetch(`/api/grades/class/${c.id}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    });
                    if (gradeRes.ok) {
                        const grades = await gradeRes.json();
                        const statusCounts = grades.reduce((acc: any, g: any) => {
                            acc[g.status] = (acc[g.status] || 0) + 1;
                            return acc;
                        }, {});
                        
                        let overallStatus = "EMPTY";
                        if (grades.length > 0) {
                            if (statusCounts["PENDING_APPROVAL"] > 0) overallStatus = "PENDING_APPROVAL";
                            else if (statusCounts["DRAFT"] > 0) overallStatus = "DRAFT";
                            else if (statusCounts["APPROVED"] === grades.length) overallStatus = "APPROVED";
                        }

                        return { ...c, overallStatus, gradeCount: grades.length };
                    }
                    return { ...c, overallStatus: "UNKNOWN", gradeCount: 0 };
                }));
                setClasses(classesWithStatus);
            }
        } catch (error) {
            console.error("Failed to fetch classes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (TOKEN) fetchClasses();
    }, [TOKEN]);

    const handleApprove = async (classId: string) => {
        setProcessing(classId);
        try {
            const res = await fetch(`/api/grades/approve/${classId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setClasses(prev => prev.map(c => 
                    c.id === classId ? { ...c, overallStatus: 'APPROVED' } : c
                ));
            }
        } catch (error) {
            console.error("Approval failed:", error);
        } finally {
            setProcessing(null);
        }
    };

    const filtered = classes.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             c.code.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || c.overallStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const handleUnlock = async (classId: string) => {
        if (!confirm("Xác nhận mở khóa để giảng viên có thể chỉnh sửa lại điểm?")) return;
        setProcessing(classId);
        try {
            const res = await fetch(`/api/grades/unlock/${classId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setClasses(prev => prev.map(c => 
                    c.id === classId ? { ...c, overallStatus: 'DRAFT' } : c
                ));
            }
        } catch (error) {
            console.error("Unlock failed:", error);
        } finally {
            setProcessing(null);
        }
    };

    const columns = [
        {
            header: "Học phần / Lớp",
            accessorKey: "name",
            cell: (row: any) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs uppercase">{row.name}</span>
                    <span className="text-[10px] text-blue-600 font-black">{row.code}</span>
                </div>
            )
        },
        {
            header: "Giảng viên",
            accessorKey: "lecturer",
            cell: (row: any) => row.lecturer?.fullName || "Chưa phân công"
        },
        {
            header: "Số lượng SV",
            accessorKey: "gradeCount",
            cell: (row: any) => <span className="tabular-nums font-bold">{row.gradeCount}</span>
        },
        {
            header: "Trạng thái",
            accessorKey: "overallStatus",
            cell: (row: any) => (
                <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                    row.overallStatus === "APPROVED" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                    row.overallStatus === "PENDING_APPROVAL" ? "bg-amber-50 text-amber-600 border border-amber-100 animate-pulse" :
                    row.overallStatus === "DRAFT" ? "bg-slate-50 text-slate-400 border border-slate-100" :
                    "bg-rose-50 text-rose-500 border border-rose-100"
                )}>
                    {row.overallStatus === "APPROVED" ? <CheckCircle size={10} /> :
                     row.overallStatus === "PENDING_APPROVAL" ? <Clock size={10} /> :
                     row.overallStatus === "DRAFT" ? <Filter size={10} /> : null}
                    {row.overallStatus === "APPROVED" ? "Đã phê duyệt" :
                     row.overallStatus === "PENDING_APPROVAL" ? "Chờ phê duyệt" :
                     row.overallStatus === "DRAFT" ? "Đang nhập" : "Trống"}
                </div>
            )
        },
        {
            header: "Thao tác",
            accessorKey: "id",
            cell: (row: any) => (
                <div className="flex items-center gap-2">
                    {row.overallStatus === "PENDING_APPROVAL" && (
                        <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); handleApprove(row.id); }}
                            disabled={processing === row.id}
                            className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-600/20"
                        >
                            {processing === row.id ? "..." : "Phê duyệt"}
                        </Button>
                    )}
                    {(row.overallStatus === "PENDING_APPROVAL" || row.overallStatus === "APPROVED") && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={(e) => { e.stopPropagation(); handleUnlock(row.id); }}
                            disabled={processing === row.id}
                            className="h-8 px-4 border-rose-200 text-rose-600 hover:bg-rose-50 text-[10px] font-black uppercase tracking-widest rounded-lg"
                        >
                            {processing === row.id ? "..." : "Mở khóa"}
                        </Button>
                    )}
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 w-8 p-0 rounded-lg border-slate-200"
                        onClick={(e) => { e.stopPropagation(); window.open(`/staff/grades/${row.id}`, '_blank'); }}
                    >
                        <ExternalLink size={14} className="text-slate-400" />
                    </Button>
                </div>
            )
        }
    ];

    return (
        <div className="min-h-screen p-8 space-y-8 bg-slate-50/30">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                     <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                        Quản lý <span className="text-blue-600">điểm & Học vụ</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Phê duyệt kết quả học tập và xét học vụ sinh viên</p>
                </div>
                <div className="flex items-center gap-4">
                     <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
                        {[
                            { id: "ALL", label: "Tất cả", icon: BarChart3 },
                            { id: "PENDING_APPROVAL", label: "Chờ phê duyệt", icon: Clock },
                            { id: "APPROVED", label: "Đã xong", icon: UserCheck }
                        ].map(opt => (
                            <Button
                                key={opt.id}
                                variant={filterStatus === opt.id ? "default" : "ghost"}
                                onClick={() => setFilterStatus(opt.id)}
                                className={cn(
                                    "h-10 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    filterStatus === opt.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-400"
                                )}
                            >
                                <opt.icon size={14} className="mr-2" />
                                {opt.label}
                            </Button>
                        ))}
                     </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-gradient-to-r from-white to-slate-50/50">
                    <div className="space-y-1">
                        <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                             <Filter size={16} className="text-blue-600" />
                             Bảng tổng hợp học phần
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hiển thị danh sách các lớp học phần cần phê duyệt điểm</p>
                    </div>
                    <div className="relative w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Mã lớp / Tên học phần..."
                            className="w-full pl-14 pr-6 py-3.5 bg-slate-100/50 border-none rounded-2xl text-[11px] font-bold text-slate-700 outline-none ring-2 ring-transparent focus:ring-blue-100 focus:bg-white transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-0">
                    <DataTable 
                        data={filtered}
                        columns={columns}
                        searchKey="name"
                    />
                </div>
            </div>

            {/* Bottom Section: Academic Warning */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6 shadow-lg shadow-slate-200/20 group hover:border-amber-200 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-inner group-hover:scale-110 transition-transform">
                                <AlertTriangle size={28} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Cảnh báo học vụ</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sinh viên có GPA &lt; 1.0 (Học kỳ hiện tại)</p>
                            </div>
                        </div>
                        <Button className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">
                            Xem danh sách
                        </Button>
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 space-y-6 shadow-lg shadow-slate-200/20 group hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-inner group-hover:scale-110 transition-transform">
                                <BarChart3 size={28} />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Thống kê kết quả</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tỉ lệ đạt / trượt theo học kỳ</p>
                            </div>
                        </div>
                        <Button className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                            Tải báo cáo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
