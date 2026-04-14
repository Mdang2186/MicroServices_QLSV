"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Search,
    GraduationCap,
    ChevronRight,
    Filter,
    Users,
    Calendar,
    ArrowLeft,
    BookMarked,
    Edit3,
    UserCheck,
    LayoutGrid,
    MoreHorizontal,
    ArrowUpRight,
    TrendingUp,
    ChevronLeft,
    Activity,
    Clock,
    UserCircle,
    ArrowRight,
    BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

export default function StaffAcademicManagementPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

        const query = selectedSemesterId ? `?semesterId=${selectedSemesterId}` : "";
        fetch(`/api/courses${query}`, { headers })
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
    }, [user, TOKEN, selectedSemesterId]);

    useEffect(() => {
        const query = searchQuery.toLowerCase();
        const filtered = courses.filter(c =>
            (c.name?.toLowerCase().includes(query)) ||
            (c.subject?.name?.toLowerCase().includes(query)) ||
            (c.code?.toLowerCase().includes(query))
        );
        setFilteredCourses(filtered);
        setCurrentPage(1);
    }, [searchQuery, courses]);

    const totalCredits = filteredCourses.reduce((acc, c) => acc + (c.subject?.credits || 0), 0);
    const totalStudents = filteredCourses.reduce((acc, c) => acc + (c.currentSlots || 0), 0);

    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

    if (loading && courses.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20 px-1 max-w-7xl mx-auto">
            <CompactLecturerHeader 
                userName={`${user?.fullName || "Cán bộ Đào tạo"}`} 
                userId={`CB-${user?.username || "UNETI"}`}
                minimal={true}
                title="Danh mục học phần"
                onSemesterChange={setSelectedSemesterId}
            />

            {/* Summary Statistics Bar */}
            <div className="flex flex-wrap items-center gap-4 px-1">
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <BookMarked size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng học phần</span>
                        <span className="text-sm font-black text-slate-800">{filteredCourses.length} Lớp</span>
                    </div>
                </div>

                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue">
                        <TrendingUp size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng tín chỉ</span>
                        <span className="text-sm font-black text-slate-800">{totalCredits} Tín chỉ</span>
                    </div>
                </div>

                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                        <Users size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng sinh viên</span>
                        <span className="text-sm font-black text-slate-800">{totalStudents} SV</span>
                    </div>
                </div>

                <Button
                    onClick={async () => {
                        if (!selectedSemesterId) {
                            alert("Vui lòng chọn học kỳ để gửi nhắc nhở.");
                            return;
                        }
                        if (!confirm("Hệ thống sẽ gửi thông báo nhắc nhở nộp điểm tới TẤT CẢ giảng viên chưa hoàn tất nhập điểm trong học kỳ này. Bạn có chắc chắn?")) return;
                        
                        try {
                            const res = await fetch(`/api/grades/admin/remind-all`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    Authorization: `Bearer ${TOKEN}`
                                },
                                body: JSON.stringify({ semesterId: selectedSemesterId })
                            });
                            const data = await res.json();
                            if (res.ok) {
                                alert(`Đã gửi thông báo tới ${data.notifiedLecturers} giảng viên của ${data.totalPendingClasses} lớp học phần.`);
                            }
                        } catch (err) {
                            alert("Lỗi khi gửi thông báo nhắc nhở.");
                        }
                    }}
                    className="h-11 rounded-xl px-5 text-[10px] font-black uppercase text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-100 transition-all ml-2"
                >
                    <BellRing size={16} className="mr-2" />
                    Nhắc nộp điểm (Toàn bộ)
                </Button>

                <div className="ml-auto w-full md:w-80 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học phần..."
                        className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 w-full focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all outline-none shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Course List Layout - High Density Rows */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <LayoutGrid size={18} className="text-uneti-blue" />
                        Danh sách quản lý lớp học phần ({filteredCourses.length})
                    </h2>
                </div>

                <div className="space-y-3">
                    <AnimatePresence mode="wait">
                        {paginatedCourses.map((c, i) => {
                            const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                            return (
                                <motion.div
                                    key={c.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3, delay: i * 0.05 }}
                                >
                                    <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-uneti-blue hover:bg-slate-50/50 transition-all group">
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-uneti-blue uppercase bg-white px-2 py-0.5 rounded-md border border-uneti-blue/10 shadow-sm">{c.code}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TC: {c.subject?.credits} • Học kỳ {c.semester?.name?.split(' ').pop()}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-[13px] truncate uppercase group-hover:text-uneti-blue transition-colors tracking-tight">
                                                {c.name || c.subject?.name}
                                            </h3>
                                            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-tight italic">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} className="text-slate-300" />
                                                    <span>{c.sessions?.length > 0 ? Array.from(new Set(c.sessions.map((s:any)=> new Date(s.date).getDay() === 0 ? 8 : new Date(s.date).getDay() + 1))).map(d => `T${d}`).join(", ") : "Chưa xếp lịch"}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <UserCircle size={10} className="text-slate-300" />
                                                    <span>Lớp chính quy: {(c.adminClasses || []).map((ac: any) => ac.code).join(", ") || "Đang xếp"}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 w-full lg:w-auto">
                                            <div className="flex flex-col gap-1 w-24">
                                                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest pl-0.5">
                                                    <span>SV: {c.currentSlots}</span>
                                                    <span className="text-slate-300">/ {c.maxSlots}</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        progress > 90 ? "bg-red-500" : progress > 70 ? "bg-orange-500" : "bg-uneti-blue"
                                                    )} style={{ width: `${progress}%` }}></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 grow lg:grow-0">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => router.push(`/staff/attendance/${c.id}`)}
                                                    className="h-9 px-4 rounded-xl border-slate-100 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm"
                                                >
                                                    <UserCheck size={14} className="mr-2" />
                                                    Điểm danh
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => router.push(`/staff/grades/${c.id}`)}
                                                    className="h-9 px-4 rounded-xl border-slate-100 text-[10px] font-black uppercase text-uneti-blue hover:bg-uneti-blue-light/50 hover:border-uneti-blue/30 transition-all shadow-sm"
                                                >
                                                    <Edit3 size={14} className="mr-2" />
                                                    Nhập điểm
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    onClick={() => router.push(`/staff/courses/${c.id}`)}
                                                    className="h-9 w-9 rounded-xl bg-slate-800 text-white hover:bg-slate-900 border-none shadow-sm group-hover:scale-105 transition-transform"
                                                >
                                                    <ArrowRight size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>

                {/* Pagination UI */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Trang {currentPage} <span className="text-slate-200 mx-2">|</span> {totalPages} (TỔNG {filteredCourses.length} HỌC PHẦN)
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="h-10 w-10 p-0 rounded-2xl border-slate-100 text-slate-400 hover:text-uneti-blue hover:border-uneti-blue shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="h-10 w-10 p-0 rounded-2xl border-slate-100 text-slate-400 hover:text-uneti-blue hover:border-uneti-blue shadow-sm"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                )}

                {filteredCourses.length === 0 && !loading && (
                    <div className="py-32 flex flex-col items-center justify-center text-center">
                        <div className="p-6 rounded-full bg-slate-50 text-slate-200 mb-6 border border-slate-100 border-dashed">
                            <BookOpen size={64} strokeWidth={1} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Không có dữ liệu</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 max-w-xs uppercase tracking-widest leading-relaxed">
                            Không tìm thấy dữ liệu nào khớp với bộ lọc <br/> trong học kỳ hiện tại.
                        </p>
                        <Button
                            variant="ghost"
                            onClick={() => { setSearchQuery(""); setSelectedSemesterId(""); }}
                            className="mt-8 text-[10px] font-black text-uneti-blue uppercase tracking-widest hover:bg-uneti-blue-light/50"
                        >
                            Đặt lại bộ lọc
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
