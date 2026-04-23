"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    GraduationCap,
    Search,
    Users,
    BookOpen,
    Filter,
    ArrowRight,
    CheckCircle
} from "lucide-react";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

const normalizeText = (value?: string) =>
    `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();

const getLecturerProfileId = (user: any) =>
    user?.profileId || user?.lecturerId || user?.lecturer?.id || "";

export default function LecturerGradeSelectionPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    const token = Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken");
    const lecturerProfileId = getLecturerProfileId(user);

    useEffect(() => {
        const raw = Cookies.get("lecturer_user") || Cookies.get("admin_user");
        if (raw) {
            try {
                setUser(JSON.parse(raw));
            } catch {
                setUser(null);
            }
        }
    }, []);

    useEffect(() => {
        if (!lecturerProfileId || !token) {
            setCourses([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        fetch(`/api/courses/lecturer/${lecturerProfileId}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => (response.ok ? response.json() : []))
            .then((data) => setCourses(Array.isArray(data) ? data : data?.data || []))
            .catch(() => setCourses([]))
            .finally(() => setLoading(false));
    }, [lecturerProfileId, token]);

    const filteredCourses = useMemo(() => {
        const keyword = normalizeText(searchQuery);
        if (!keyword) return courses;
        return courses.filter((course) =>
            [
                course.name,
                course.subject?.name,
                course.code,
                course.subject?.code,
            ].some((value) => normalizeText(value).includes(keyword)),
        );
    }, [courses, searchQuery]);

    if (loading && courses.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fbfcfd]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-[#fbfcfd] min-h-screen pb-20 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in duration-700">
            <CompactLecturerHeader
                userName={`${user?.degree || "Giảng viên"} ${user?.fullName || "Cao cấp"}`}
                userId={`GV-${user?.username || "UNETI"}`}
                minimal={true}
                title="Quản lý bảng điểm"
                onSemesterChange={() => {}}
                hideSemester={true}
            />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="p-2.5 rounded-xl bg-uneti-blue-light text-uneti-blue">
                         <Filter size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Bộ lọc nhanh</span>
                        <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                            {filteredCourses.length} Lớp đang mở
                        </h2>
                    </div>
                </div>

                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Tìm mã hoặc tên lớp học phần..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:bg-white focus:border-uneti-blue transition-all"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                    />
                </div>
            </div>

            {filteredCourses.length === 0 && !loading ? (
                <div className="bg-white rounded-[2rem] p-32 flex flex-col items-center justify-center text-center border border-slate-100 border-dashed">
                    <div className="p-6 rounded-full bg-slate-50 text-slate-200 mb-6">
                         <BookOpen size={64} strokeWidth={1} />
                    </div>
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Không tìm thấy lớp học</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Vui lòng kiểm tra lại từ khóa tìm kiếm.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredCourses.map((course, index) => (
                        <div key={index} className="bg-white rounded-[2rem] border border-slate-100 p-6 flex flex-col group relative overflow-hidden transition-all hover:border-uneti-blue/30 hover:shadow-xl hover:shadow-uneti-blue/5">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-uneti-blue/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-uneti-blue/10 transition-colors"></div>

                            <div className="relative z-10 flex flex-col flex-1">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="bg-white ring-1 ring-uneti-blue/10 shadow-sm text-uneti-blue font-black text-[9px] px-3 py-1.5 rounded-lg tracking-widest uppercase">
                                        {course.code}
                                    </span>
                                    <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                        <CheckCircle size={12} strokeWidth={3} />
                                        <span className="text-[9px] font-black uppercase">Sẵn sàng</span>
                                    </div>
                                </div>

                                <h3 className="text-[14px] font-black text-slate-800 leading-snug group-hover:text-uneti-blue transition-colors line-clamp-2 min-h-[40px] uppercase tracking-tight mb-4">
                                    {course.name || course.subject?.name}
                                </h3>

                                <div className="flex items-center gap-6 mt-auto pb-6 border-b border-slate-50">
                                    <div className="flex flex-col">
                                        <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Sinh viên</p>
                                        <div className="flex items-center gap-1.5">
                                            <Users size={12} className="text-slate-400" />
                                            <span className="text-xs font-black text-slate-600">{course.currentSlots || 0}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Tín chỉ</p>
                                        <div className="flex items-center gap-1.5">
                                            <GraduationCap size={12} className="text-slate-400" />
                                            <span className="text-xs font-black text-slate-600">{course.subject?.credits || 0} TC</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(`/lecturer/grades/${course.id}`)}
                                    className="mt-6 flex items-center justify-center gap-2 py-3.5 bg-slate-50 text-uneti-blue text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-uneti-blue hover:text-white transition-all shadow-sm active:scale-95 group-hover:bg-uneti-blue group-hover:text-white"
                                >
                                    Bắt đầu nhập điểm
                                    <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
