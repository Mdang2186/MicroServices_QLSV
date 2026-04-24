"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    BookOpen,
    Search,
    GraduationCap,
    Users,
    Clock,
    UserCircle,
    ArrowRight,
    TrendingUp,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    fetchCurrentLecturerTeachingCourses,
    getLecturerFallbackRefs,
    getLecturerCourseScopeLabel,
    type SemesterOption,
} from "@/lib/lecturer-courses";

const normalizeText = (value?: string) =>
    `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

export default function LecturerCoursesPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [userLoaded, setUserLoaded] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [currentSemester, setCurrentSemester] = useState<SemesterOption | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8;

    const token = Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken");
    const lecturerFallbackRefs = useMemo(() => getLecturerFallbackRefs(user), [user]);

    useEffect(() => {
        const raw = Cookies.get("lecturer_user") || Cookies.get("admin_user");
        if (raw) {
            try {
                setUser(JSON.parse(raw));
            } catch {
                setUser(null);
            }
        }
        setUserLoaded(true);
    }, []);

    useEffect(() => {
        if (!userLoaded) return;

        if (!token) {
            setCourses([]);
            setCurrentSemester(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetchCurrentLecturerTeachingCourses(token, lecturerFallbackRefs)
            .then(({ courses: lecturerCourses, semester }) => {
                setCourses(lecturerCourses);
                setCurrentSemester(semester);
            })
            .catch(() => {
                setCourses([]);
                setCurrentSemester(null);
            })
            .finally(() => setLoading(false));
    }, [lecturerFallbackRefs, token, userLoaded]);

    const filteredCourses = useMemo(() => {
        const query = normalizeText(searchQuery);
        if (!query) return courses;
        return courses.filter((course) =>
            [
                course.name,
                course.subject?.name,
                course.code,
                course.subject?.code,
                course.semester?.name,
                course.sessions?.[0]?.room?.name,
                course.adminClasses?.map((adminClass: any) => adminClass.code).join(", "),
            ].some((value) => normalizeText(value).includes(query)),
        );
    }, [courses, searchQuery]);

    const totalCredits = courses.reduce((acc, course) => acc + (course.subject?.credits || 0), 0);
    const totalStudents = courses.reduce((acc, course) => acc + (course.currentSlots || 0), 0);
    const semesterLabel = getLecturerCourseScopeLabel(courses, currentSemester);

    const getAdminClassLabel = (course: any) =>
        course.adminClasses?.map((adminClass: any) => adminClass.code).join(", ") || "Chưa gắn lớp";

    const getMajorLabel = (course: any) =>
        course.subject?.major?.name ||
        course.adminClasses?.[0]?.major?.name ||
        "Chưa rõ ngành";

    const getRoomLabel = (course: any) => {
        const room = course.sessions?.[0]?.room;
        if (!room) return "Chưa xếp phòng";
        return room.building ? `${room.name} - ${room.building}` : room.name;
    };

    const paginatedCourses = filteredCourses.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );
    const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    if (loading && courses.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20 p-4 md:p-6 w-full max-w-full">


            <div className="flex flex-wrap items-center gap-4 px-1">
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                        <BookOpen size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Tổng học phần</span>
                        <span className="text-sm font-black text-slate-800">{courses.length} Lớp</span>
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

                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Học kỳ</span>
                        <span className="text-sm font-black text-slate-800">{semesterLabel}</span>
                    </div>
                </div>

                <div className="ml-auto w-full md:w-80 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm lớp học phần..."
                        className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 w-full focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all outline-none shadow-sm"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <BookOpen size={18} className="text-uneti-blue" />
                        Danh mục học phần ({filteredCourses.length})
                    </h2>
                </div>

                <div className="space-y-3">
                    <AnimatePresence mode="wait">
                        {paginatedCourses.map((course, index) => {
                            const progress = Math.min(100, Math.round(((course.currentSlots || 0) / (course.maxSlots || 1)) * 100));
                            return (
                                <motion.div
                                    key={course.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <div className="flex flex-col lg:flex-row items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-uneti-blue hover:bg-slate-50/50 transition-all group">
                                        <div className="flex-1 min-w-0 space-y-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-uneti-blue uppercase bg-white px-2 py-0.5 rounded-md border border-uneti-blue/10 shadow-sm">{course.code}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">TC: {course.subject?.credits} • {course.semester?.name || "Chưa rõ học kỳ"}</span>
                                            </div>
                                            <h3 className="font-bold text-slate-800 text-[13px] truncate uppercase group-hover:text-uneti-blue transition-colors tracking-tight">
                                                {course.name || course.subject?.name}
                                            </h3>
                                            <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-tight italic">
                                                <div className="flex items-center gap-1">
                                                    <Clock size={10} className="text-slate-300" />
                                                    <span>{course.sessions?.length > 0 ? Array.from(new Set(course.sessions.map((session: any) => new Date(session.date).getDay() === 0 ? 8 : new Date(session.date).getDay() + 1))).map((day) => `T${day}`).join(", ") : "Chưa xếp lịch"}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <UserCircle size={10} className="text-slate-300" />
                                                    <span>Lớp: {getAdminClassLabel(course)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <GraduationCap size={10} className="text-slate-300" />
                                                    <span>Ngành: {getMajorLabel(course)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <BookOpen size={10} className="text-slate-300" />
                                                    <span>Phòng: {getRoomLabel(course)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 w-full lg:w-auto">
                                            <div className="flex flex-col gap-1 w-24">
                                                <div className="flex justify-between text-[9px] font-black text-slate-500 uppercase tracking-widest pl-0.5">
                                                    <span>SV: {course.currentSlots}</span>
                                                    <span className="text-slate-300">/ {course.maxSlots}</span>
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
                                                    onClick={() => router.push(`/lecturer/attendance/${course.id}`)}
                                                    className="h-9 px-4 rounded-xl border-slate-100 text-[10px] font-black uppercase text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100 transition-all shadow-sm"
                                                >
                                                    Điểm danh
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    onClick={() => router.push(`/lecturer/courses/${course.id}/grades`)}
                                                    className="h-9 px-4 rounded-xl border-slate-100 text-[10px] font-black uppercase text-uneti-blue hover:bg-uneti-blue-light/50 hover:border-uneti-blue/30 transition-all shadow-sm"
                                                >
                                                    Nhập điểm
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    onClick={() => router.push(`/lecturer/courses/${course.id}`)}
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

                {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-6 mt-4 border-t border-slate-50">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            Trang {currentPage} <span className="text-slate-200 mx-2">|</span> {totalPages} (TỔNG {filteredCourses.length} HỌC PHẦN)
                        </p>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                className="h-10 w-10 p-0 rounded-2xl border-slate-100 text-slate-400 hover:text-uneti-blue hover:border-uneti-blue shadow-sm"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
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
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Không có dữ liệu giảng dạy</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2 max-w-xs uppercase tracking-widest leading-relaxed">
                            Không tìm thấy học phần nào khớp với từ khóa tìm kiếm.
                        </p>
                        <Button
                            variant="ghost"
                            onClick={() => setSearchQuery("")}
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
