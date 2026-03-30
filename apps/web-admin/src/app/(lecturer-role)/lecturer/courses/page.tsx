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
    ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LecturerCoursesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

        const lecturerId = user.profileId || user.lecturer?.id || user.id;
        fetch(`/api/courses/lecturer/${lecturerId}`, { headers })
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
    }, [user, TOKEN]);

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
                    <GraduationCap size={14} className="text-slate-400" />
                    <span>Giảng viên Portal</span>
                    <ChevronRight size={10} />
                    <span className="text-slate-800">Quản lý lớp học</span>
                </div>
            </div>

            {/* Title & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                    Danh sách học phần
                </h1>
                
                <div className="flex items-center gap-3 w-full md:w-80 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học..."
                        className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-bold text-slate-700 w-full focus:ring-1 focus:ring-slate-300 transition-all outline-none"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Course List Layout */}
            <div className="space-y-2">
                <AnimatePresence mode="wait">
                    {paginatedCourses.map((c, i) => {
                        return (
                            <motion.div
                                key={c.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="bg-white border border-slate-100 p-3 hover:bg-slate-50 transition-all flex items-center justify-between group rounded-xl">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="h-10 w-10 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                                            <BookOpen size={18} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-indigo-600 px-1.5 py-0.5 bg-indigo-50 rounded uppercase tracking-wider">
                                                    {c.code}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                    HK {c.semester?.name?.split(' ').pop()} • {c.subject?.credits || 0} Tín chỉ
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-tight line-clamp-1">
                                                {c.name || c.subject?.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="hidden sm:flex items-center gap-8 mr-6">
                                        <div className="flex flex-col items-end">
                                            <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Sinh viên</p>
                                            <p className="text-xs font-black text-slate-600">{c.currentSlots}/{c.maxSlots}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(`/lecturer/attendance/${c.id}`)}
                                            className="h-8 rounded-lg border-slate-100 text-[9px] font-black uppercase text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100"
                                        >
                                            Điểm danh
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => router.push(`/lecturer/grades/${c.id}`)}
                                            className="h-8 rounded-lg border-slate-100 text-[9px] font-black uppercase text-blue-600 hover:bg-blue-50 hover:border-blue-100"
                                        >
                                            Nhập điểm
                                        </Button>
                                        <Button
                                            onClick={() => router.push(`/lecturer/courses/${c.id}`)}
                                            className="h-8 w-8 p-0 rounded-lg bg-slate-800 text-white hover:bg-slate-900 border-none"
                                        >
                                            <ArrowUpRight size={14} />
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
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-2">
                        Trang {currentPage} / {totalPages} (TỔNG {filteredCourses.length} LỚP)
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200"
                        >
                            <ChevronLeft size={16} />
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="h-9 w-9 p-0 rounded-xl border-slate-200"
                        >
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {filteredCourses.length === 0 && !loading && (
                <div className="bg-white rounded-[3rem] py-24 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-50 rounded-full blur-[100px] opacity-50"></div>
                    <div className="relative z-10 scale-125 grayscale opacity-20 mb-8">
                        <BookOpen size={80} />
                    </div>
                    <h3 className="text-xl font-black text-slate-800 relative z-10">Không tìm thấy lớp học nào</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 max-w-xs relative z-10 px-4">Chúng tôi đã tìm kiếm khắp nơi nhưng không thấy kết quả khớp với "{searchQuery}".</p>
                    <Button
                        variant="ghost"
                        onClick={() => setSearchQuery("")}
                        className="mt-8 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:bg-indigo-50 relative z-10"
                    >
                        Xóa tìm kiếm
                    </Button>
                </div>
            )}
        </div>
    );
}
