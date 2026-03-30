"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourseService } from "@/services/course.service";
import {
    BookOpen,
    Users,
    Calendar,
    MapPin,
    GraduationCap,
    ArrowLeft,
    User,
    ChevronRight,
    Search,
    Clock,
    Layers,
    Info
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function StudentClassDetailPage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [courseClass, setCourseClass] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            if (!classId) return;
            try {
                const [classData, enrollmentData] = await Promise.all([
                    CourseService.getClassDetails(classId as string),
                    CourseService.getClassEnrollments(classId as string)
                ]);
                setCourseClass(classData);
                setEnrollments(enrollmentData);
            } catch (error) {
                console.error("Failed to fetch class details:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId]);

    const filteredEnrollments = enrollments.filter(e =>
        e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    if (!courseClass) {
        return (
            <div className="flex min-h-[80vh] flex-col items-center justify-center text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <BookOpen size={32} />
                </div>
                <h2 className="text-xl font-bold text-slate-800">Không tìm thấy thông tin lớp học</h2>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 max-w-7xl mx-auto">
            {/* Header & Breadcrumb */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="cursor-pointer hover:text-blue-600" onClick={() => router.push('/portal/dashboard')}>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="cursor-pointer hover:text-blue-600" onClick={() => router.push('/portal/schedule')}>Lịch học</span>
                        <ChevronRight size={10} />
                        <span className="text-blue-600">Chi tiết lớp học</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        {courseClass.subject?.name}
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                            {courseClass.code}
                        </span>
                    </h1>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.back()}
                    className="h-10 px-4 rounded-xl border border-slate-200 bg-white shadow-sm hover:bg-slate-50 font-bold text-xs"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> Quay lại
                </Button>
            </div>

            {/* Quick Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50/50 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <GraduationCap size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảng viên phu trách</p>
                        <p className="text-sm font-extrabold text-slate-800">{courseClass.lecturer?.fullName || "Chưa cập nhật"}</p>
                        <p className="text-[9px] font-medium text-slate-400 mt-0.5">{courseClass.lecturer?.faculty?.name || "Bộ môn chuyên ngành"}</p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Users size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sĩ số lớp học</p>
                        <p className="text-sm font-extrabold text-slate-800">{enrollments.length} Sinh viên</p>
                        <div className="h-1.5 w-24 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(100, (enrollments.length / (courseClass.maxSlots || 80)) * 100)}%` }}
                            ></div>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50/50 rounded-full blur-2xl -mr-12 -mt-12"></div>
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Layers size={28} />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tín chỉ / Học kỳ</p>
                        <p className="text-sm font-extrabold text-slate-800">
                            {courseClass.subject?.credits} Tín chỉ
                        </p>
                        <p className="text-[9px] font-medium text-slate-400 mt-0.5">{courseClass.semester?.name}</p>
                    </div>
                </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: Schedule Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-8 py-5 border-b border-slate-50 bg-slate-50/50">
                            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={16} className="text-blue-500" />
                                Thời khóa biểu
                            </h2>
                        </div>
                        <div className="p-8 space-y-4">
                            {courseClass.schedules?.length > 0 ? (
                                courseClass.schedules.map((sch: any, i: number) => (
                                    <div key={i} className="group p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-md transition-all">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                                                Thứ {sch.dayOfWeek}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">Tiết {sch.startShift} - {sch.endShift}</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                                    <Clock size={14} />
                                                </div>
                                                <div className="text-[11px] font-bold">
                                                    <p className="text-slate-800">Ca {sch.startShift <= 3 ? 1 : sch.startShift <= 6 ? 2 : sch.startShift <= 9 ? 3 : 4}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase">Buổi {sch.startShift <= 6 ? "Sáng" : "Chiều"}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 text-slate-600">
                                                <div className="h-7 w-7 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-400">
                                                    <MapPin size={14} />
                                                </div>
                                                <div className="text-[11px] font-bold">
                                                    <p className="text-slate-800">Phòng {sch.room?.name || "TBA"}</p>
                                                    <p className="text-[9px] text-slate-400 uppercase">{sch.room?.building || "Cơ sở chính"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <Info className="mx-auto h-8 w-8 text-slate-200 mb-2" />
                                    <p className="text-xs text-slate-400 font-medium">Chưa cập nhật lịch học</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Class Info Box */}
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden">
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-12 -mb-12"></div>
                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <Info size={20} className="text-blue-200" />
                            Ghi chú lớp học
                        </h3>
                        <div className="space-y-4 text-xs font-medium text-blue-100 leading-relaxed">
                            <p>Đây là danh sách sinh viên chính thức đã đăng ký và được duyệt vào lớp học phần này.</p>
                            <p>Vui lòng theo dõi thông tin điểm danh và kết quả học tập tại các trang tương ứng.</p>
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                            <div>
                                <p className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Ngày cập nhật</p>
                                <p className="text-[11px] font-bold">{new Date().toLocaleDateString('vi-VN')}</p>
                            </div>
                            <BookOpen size={24} className="text-white/20" />
                        </div>
                    </div>
                </div>

                {/* Right Side: Class List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full min-h-[600px]">
                        {/* List Header */}
                        <div className="px-10 py-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Danh sách lớp học</h2>
                                <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Tổng cộng: {enrollments.length} sinh viên</p>
                            </div>

                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Tìm sinh viên..."
                                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead className="bg-slate-50/50">
                                    <tr>
                                        <th className="py-5 px-10 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">STT</th>
                                        <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã SV</th>
                                        <th className="py-5 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và Tên</th>
                                        <th className="py-5 px-10 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp hành chính</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredEnrollments.map((enr, idx) => (
                                        <tr key={enr.id} className="border-t border-slate-50 hover:bg-blue-50/30 transition-colors group">
                                            <td className="py-5 px-10 text-xs font-bold text-slate-400">{idx + 1}</td>
                                            <td className="py-5 px-6">
                                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                                    {enr.student?.studentCode}
                                                </span>
                                            </td>
                                            <td className="py-5 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-white shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                        {enr.student?.fullName?.charAt(0)}
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700">{enr.student?.fullName}</span>
                                                </div>
                                            </td>
                                            <td className="py-5 px-10 text-right">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-md">
                                                    {enr.student?.adminClass?.code || "N/A"}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredEnrollments.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center text-slate-400 font-bold uppercase text-xs">
                                                <Users className="mx-auto h-12 w-12 text-slate-200 mb-4" />
                                                Không tìm thấy sinh viên phù hợp
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
