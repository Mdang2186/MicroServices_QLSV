"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
    GraduationCap,
    Search,
    ChevronRight,
    Users,
    BookOpen,
    ArrowLeft,
    CheckCircle2
} from "lucide-react";

export default function LecturerGradeSelectionPage() {
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
        <div className="min-h-screen p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header Toolbar */}
            <div className="flex items-center justify-between pl-1">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-800">
                    <Link href="/lecturer/dashboard" className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={16} />
                        <span className="hidden sm:inline">Quay lại Dashboard</span>
                    </Link>
                    <span className="text-slate-300">/</span>
                    <span className="text-indigo-600">Chọn lớp nhập điểm</span>
                </div>
            </div>

            {/* Title Section */}
            <div className="bg-gradient-to-br from-[#eff3ff] to-[#f4f7fe] rounded-[24px] p-8 sm:p-10 border border-white shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-40 -mr-20 -mt-20"></div>

                <div className="relative z-10 space-y-2">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight">
                        Quản lý <span className="text-indigo-600">Bảng điểm</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm flex items-center gap-2">
                        <GraduationCap size={16} className="text-indigo-400" />
                        Chọn một lớp học bên dưới để bắt đầu nhập điểm sinh viên
                    </p>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
                    {filteredCourses.length} Kết quả
                </p>
            </div>

            {/* Selection Grid */}
            {filteredCourses.length === 0 ? (
                <div className="bg-white rounded-[24px] p-20 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm">
                    <BookOpen className="text-slate-200 mb-4" size={48} />
                    <h3 className="text-lg font-bold text-slate-800">Không tìm thấy lớp học</h3>
                    <p className="text-slate-400 text-sm mt-1">Vui lòng kiểm tra lại từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCourses.map((c, i) => (
                        <div key={i} className="bg-white rounded-[24px] border border-slate-100 p-6 flex flex-col justify-between hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none group-hover:bg-indigo-100/50 transition-colors"></div>

                            <div className="relative z-10">
                                <span className="bg-indigo-50 text-indigo-700 font-bold text-[10px] px-3 py-1.5 rounded-lg tracking-widest uppercase ring-1 ring-indigo-100 shadow-sm mb-4 inline-block">
                                    {c.code}
                                </span>
                                <h3 className="text-lg font-extrabold text-[#111827] leading-snug mb-4 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[56px]">
                                    {c.name || c.subject?.name}
                                </h3>

                                <div className="flex items-center gap-4 text-slate-500 mb-6 font-bold uppercase tracking-tighter text-[10px]">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={14} className="text-slate-300" />
                                        <span>{c.currentSlots} Sinh viên</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                        <CheckCircle2 size={14} />
                                        <span>Sẵn sàng nhập điểm</span>
                                    </div>
                                </div>

                                <Link
                                    href={`/lecturer/grades/${c.id}`}
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#f8fafc] text-indigo-600 text-sm font-extrabold rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm group-hover:shadow-indigo-100"
                                >
                                    Bắt đầu nhập điểm
                                    <ChevronRight size={16} />
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
