"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    BookOpen,
    Search,
    GraduationCap,
    ChevronRight,
    Filter,
    Users,
    Calendar,
    ArrowLeft,
    Edit3,
    UserCheck
} from "lucide-react";

export default function LecturerCoursesPage() {
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [filteredCourses, setFilteredCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!user?.id) return;
        const headers: any = TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {};

        fetch("http://localhost:3000/api/courses/my-classes", { headers })
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
    }, [searchQuery, courses]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f7fe]">
                <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Link href="/lecturer/dashboard" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Quay lại Dashboard</span>
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-indigo-600">Lớp học phần</span>
                </div>
            </div>

            {/* Title Section */}
            <div className="bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[24px] p-8 sm:p-10 border border-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>

                <div className="relative z-10 space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                        Danh sách <span className="text-indigo-600">Lớp học phần</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                        <BookOpen size={16} className="text-indigo-400" />
                        Quản lý {courses.length} lớp học đang phụ trách giảng dạy
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm theo mã hoặc tên lớp..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Filter size={18} />
                        Bộ lọc
                    </button>
                    <div className="hidden sm:block h-8 w-px bg-slate-100 mx-2"></div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                        {filteredCourses.length} Kết quả
                    </p>
                </div>
            </div>

            {/* Course Grid */}
            {filteredCourses.length === 0 ? (
                <div className="bg-white rounded-[24px] p-20 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm">
                    <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center mb-6">
                        <Search size={40} className="text-slate-200" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800">Không tìm thấy lớp học</h3>
                    <p className="text-slate-500 mt-2 max-w-xs">Hãy thử thay đổi từ khóa tìm kiếm hoặc kiểm tra lại bộ lọc.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((c, i) => {
                        const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                        return (
                            <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col justify-between hover:shadow-xl hover:border-indigo-100 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-100/50 transition-colors"></div>

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase ring-1 ring-indigo-100 shadow-sm">
                                            {c.code}
                                        </span>
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                            <div className="w-2 h-2 rounded-full bg-emerald-500/30"></div>
                                        </div>
                                    </div>

                                    <h3 className="text-lg font-extrabold text-[#111827] leading-snug mb-2 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[56px]">
                                        {c.name || c.subject?.name}
                                    </h3>

                                    <div className="flex flex-wrap gap-4 mt-4">
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Users size={16} className="text-slate-300" />
                                            <span className="text-xs font-bold">{c.currentSlots}/{c.maxSlots} SV</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-slate-500">
                                            <Calendar size={16} className="text-slate-300" />
                                            <span className="text-xs font-bold">{c.subject?.credits || 3} Tín chỉ</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-3 relative z-10">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                            <span>Tiến độ ghi danh</span>
                                            <span className="text-indigo-600">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 group-hover:bg-indigo-600 transition-colors rounded-full"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <Link
                                            href={`/lecturer/courses/${c.id}/attendance`}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-[#f8fafc] text-indigo-600 text-[11px] font-extrabold rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <UserCheck size={14} /> Điểm danh
                                        </Link>
                                        <Link
                                            href={`/lecturer/courses/${c.id}/grades`}
                                            className="flex items-center justify-center gap-2 py-2.5 bg-[#f8fafc] text-indigo-600 text-[11px] font-extrabold rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit3 size={14} /> Nhập điểm
                                        </Link>
                                    </div>
                                    <Link
                                        href={`/lecturer/courses/${c.id}`}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#111827] text-white text-[11px] font-extrabold rounded-xl hover:bg-indigo-600 transition-all shadow-md"
                                    >
                                        Chi tiết lớp học
                                        <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
