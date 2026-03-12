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
    BookMarked,
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

        fetch("/api/courses/my-classes", { headers })
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        <GraduationCap size={14} className="text-uneti-blue" />
                        <span>Giảng viên Portal</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Lớp học phần</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Danh sách lớp học</h1>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/lecturer/dashboard" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm">
                        <ArrowLeft size={16} />
                        Quay lại
                    </Link>
                </div>
            </div>

            {/* Welcome / Stats Banner - Compact */}
            <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-uneti-blue/5 rounded-full blur-2xl -mr-16 -mt-16"></div>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-uneti-blue-light text-uneti-blue flex items-center justify-center">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Đang phụ trách</p>
                        <p className="text-xl font-black text-slate-900">{courses.length} Lớp học phần</p>
                    </div>
                </div>

                {/* Filter & Search Bar - Integrated */}
                <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl relative z-10">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm mã hoặc tên lớp..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-uneti-blue/20 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:border-uneti-blue/30 transition-all shadow-sm">
                        <Filter size={16} />
                        BỘ LỌC
                    </button>
                    <div className="flex items-center px-4 bg-slate-50 rounded-xl">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredCourses.length} Kết quả</span>
                    </div>
                </div>
            </div>

            {/* Course Grid - Compact Cards */}
            {filteredCourses.length === 0 ? (
                <div className="bg-white rounded-[24px] py-16 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-slate-200">
                        <Search size={32} />
                    </div>
                    <h3 className="font-bold text-slate-800">Không tìm thấy lớp học</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">Hãy thử thay đổi từ khóa hoặc loại bỏ bộ lọc.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredCourses.map((c, i) => {
                        const progress = Math.min(100, Math.round(((c.currentSlots || 0) / (c.maxSlots || 1)) * 100));
                        return (
                            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-uneti-blue/20 hover:shadow-lg transition-all flex flex-col group border-t-4 border-t-uneti-blue relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-uneti-blue/5 rounded-full blur-xl -mr-12 -mt-12 pointer-events-none"></div>

                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <span className="bg-uneti-blue-light text-uneti-blue font-black text-[9px] px-2.5 py-1.5 rounded-lg tracking-widest uppercase">
                                        {c.code}
                                    </span>
                                    <div className="flex h-1.5 w-6 gap-1">
                                        <div className="h-full flex-1 rounded-full bg-emerald-400"></div>
                                        <div className="h-full flex-1 rounded-full bg-slate-100"></div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-slate-800 text-sm mb-4 line-clamp-2 min-h-[40px] leading-snug group-hover:text-uneti-blue transition-colors">
                                    {c.name || c.subject?.name}
                                </h3>

                                <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 rounded-lg">
                                        <Users size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">{c.currentSlots}/{c.maxSlots} SV</span>
                                    </div>
                                    <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-50 rounded-lg">
                                        <BookMarked size={14} className="text-slate-400" />
                                        <span className="text-[10px] font-bold text-slate-600">{c.subject?.credits || 3} TÍN CHỈ</span>
                                    </div>
                                </div>

                                <div className="space-y-4 relative z-10 pb-2">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <span>Sĩ số lớp</span>
                                            <span className="text-uneti-blue">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-uneti-blue rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                        <Link
                                            href={`/lecturer/courses/${c.id}/attendance`}
                                            className="flex items-center justify-center gap-2 py-2 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-lg hover:bg-emerald-600 hover:text-white transition-all"
                                        >
                                            <UserCheck size={14} /> ĐIỂM DANH
                                        </Link>
                                        <Link
                                            href={`/lecturer/courses/${c.id}/grades`}
                                            className="flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg hover:bg-blue-600 hover:text-white transition-all"
                                        >
                                            <Edit3 size={14} /> NHẬP ĐIỂM
                                        </Link>
                                    </div>

                                    <Link
                                        href={`/lecturer/courses/${c.id}`}
                                        className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 text-white text-[10px] font-black rounded-lg hover:bg-uneti-blue transition-all group/btn"
                                    >
                                        CHI TIẾT LỚP HỌC
                                        <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
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
