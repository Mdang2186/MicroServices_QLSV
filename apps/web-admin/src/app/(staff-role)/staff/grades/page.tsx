"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Search,
    GraduationCap,
    ChevronRight,
    Users,
    Calculator,
    ArrowUpRight,
    ChevronLeft,
    Bell
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StaffGradesListPage() {
    const router = useRouter();
    const [courses, setCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        if (!TOKEN) return;
        
        fetch(`/api/courses`, { 
            headers: { Authorization: `Bearer ${TOKEN}` } 
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                const fetched = Array.isArray(data) ? data : data?.data || [];
                setCourses(fetched);
                setFilteredCourses(fetched);
            })
            .catch(() => {
                setCourses([]);
                setFilteredCourses([]);
            })
            .finally(() => setLoading(false));
    }, [TOKEN]);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = courses.filter(c =>
            (c.name?.toLowerCase().includes(query)) ||
            (c.subject?.name?.toLowerCase().includes(query)) ||
            (c.code?.toLowerCase().includes(query)) ||
            (c.lecturer?.fullName?.toLowerCase().includes(query))
        );
        setFilteredCourses(filtered);
        setCurrentPage(1);
    }, [searchQuery, courses]);

    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 max-w-7xl mx-auto px-4 sm:px-6 animate-in fade-in duration-700">
            {/* Nav & Action Header */}
            <div className="flex border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calculator size={14} className="text-slate-400" />
                    <span>Phòng Đào tạo</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-800">Quản lý Điểm thi</span>
                </div>
            </div>

            {/* Title & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                        QUẢN LÝ ĐIỂM THI KẾT THÚC
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                        Danh sách các lớp học phần cần nhập điểm thi và quản lý
                    </p>
                </div>
                
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={async () => {
                            if (!confirm("Gửi thông báo nhắc nhở nhập điểm cho TẤT CẢ giảng viên?")) return;
                            try {
                                const res = await fetch(`/api/notifications/broadcast`, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        Authorization: `Bearer ${TOKEN}`
                                    },
                                    body: JSON.stringify({
                                        role: "LECTURER",
                                        title: "Thông báo hối thúc nhập điểm",
                                        content: "Phòng Đào tạo yêu cầu tất cả giảng viên rà soát và hoàn tất việc nhập điểm thành phần đúng kỳ hạn.",
                                        type: "REMINDER"
                                    })
                                });
                                if (res.ok) alert("Đã gửi thông báo tới tất cả giảng viên.");
                            } catch (e) {
                                alert("Có lỗi xảy ra khi gửi thông báo.");
                            }
                        }}
                        className="h-12 rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 text-[10px] font-black uppercase tracking-widest px-6"
                    >
                        <Bell size={14} className="mr-2" /> Nhắc nhở toàn bộ GV
                    </Button>
                    
                    <div className="flex items-center gap-3 w-full md:w-96 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input
                            type="text"
                            placeholder="Tìm lớp học, mã học phần hoặc giảng viên..."
                            className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-slate-700 w-full focus:ring-1 focus:ring-slate-300 transition-all outline-none shadow-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Course List Layout */}
            <div className="space-y-3">
                <AnimatePresence mode="wait">
                    {paginatedCourses.map((c, i) => {
                        return (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.03 }}
                            >
                                <div className="bg-white border border-slate-100 p-4 hover:border-indigo-200 transition-all flex items-center justify-between group rounded-2xl shadow-sm hover:shadow-md">
                                    <div className="flex items-center gap-5 flex-1 text-slate-800">
                                        <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-[10px] font-black text-indigo-600 px-2 py-0.5 bg-indigo-50 rounded uppercase tracking-wider border border-indigo-100/50">
                                                    {c.code}
                                                </span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                                    HK {c.semester?.name?.split(' ').pop()} · {c.subject?.credits || 0} TC · {c.subject?.name}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-slate-800 text-sm uppercase tracking-tight line-clamp-1">
                                                {c.name || c.subject?.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 italic">
                                                <Users size={12} className="text-slate-300" />
                                                GV: {c.lecturer?.fullName || "Chưa phân công"}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="hidden lg:flex items-center gap-12 mr-10 relative">
                                        <div className="flex flex-col items-center">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Trạng thái</p>
                                            <span className={cn(
                                                "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                                c.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-50 text-slate-400"
                                            )}>
                                                {c.status === 'ACTIVE' ? "Đang mở" : "Kết thúc"}
                                            </span>
                                        </div>
                                        <div className="w-px h-8 bg-slate-100" />
                                        <div className="flex flex-col items-center">
                                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1.5">Sĩ số</p>
                                            <p className="text-xs font-black text-slate-600 tabular-nums">{c.currentSlots}/{c.maxSlots}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(`/staff/grades/${c.id}`)}
                                            className="h-10 rounded-xl border-slate-200 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 px-5 shadow-sm active:scale-95 transition-all"
                                        >
                                            <Calculator size={14} className="mr-2" /> Quản lý Điểm
                                        </Button>
                                        
                                        <Button
                                            variant="ghost"
                                            className="h-10 w-10 p-0 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                            title="Gửi thông báo hối thúc"
                                        >
                                            <Bell size={16} />
                                        </Button>

                                        <Button
                                            onClick={() => router.push(`/staff/courses/${c.id}`)}
                                            className="h-10 w-10 p-0 rounded-xl bg-slate-800 text-white hover:bg-slate-900 border-none shadow-lg shadow-slate-100 transition-all active:scale-90"
                                        >
                                            <ArrowUpRight size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-2">
                        CHƯƠNG TRÌNH ĐÀO TẠO UNETI · TRANG {currentPage} / {totalPages}
                    </p>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-11 rounded-2xl border-slate-200 px-4 hover:bg-slate-50"
                        >
                            <ChevronLeft size={18} className="mr-2" /> Trước
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-11 rounded-2xl border-slate-200 px-4 hover:bg-slate-50"
                        >
                            Sau <ChevronRight size={18} className="ml-2" />
                        </Button>
                    </div>
                </div>
            )}

            {filteredCourses.length === 0 && !loading && (
                <div className="bg-white rounded-[3rem] py-32 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm relative overflow-hidden mt-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-slate-50 rounded-full blur-[120px] opacity-60"></div>
                    <div className="relative z-10 opacity-20 mb-8 grayscale">
                        <Calculator size={100} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 relative z-10 uppercase tracking-tighter">Không tìm thấy dữ liệu lớp học</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 max-w-xs relative z-10 px-4 leading-relaxed uppercase">
                        Vui lòng kiểm tra lại từ khóa tìm kiếm hoặc lọc theo kỳ học khác.
                    </p>
                    <Button
                        variant="ghost"
                        onClick={() => setSearchQuery("")}
                        className="mt-10 text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] bg-indigo-50/50 hover:bg-indigo-100 px-8 py-6 rounded-2xl relative z-10"
                    >
                        Xóa tìm kiếm
                    </Button>
                </div>
            )}
        </div>
    );
}
