"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    CheckCircle2,
    Briefcase,
    Download,
    AlertTriangle,
    Check,
    Mail,
    UserCheck,
    Filter,
    Calendar,
    Clock,
    Book,
    Building2,
    GraduationCap,
    ChevronRight,
    Loader2,
    ShieldCheck,
    Key,
    Save
} from "lucide-react";
import Modal from "@/components/modal";
import ScheduleGrid from "@/components/ScheduleGrid";
import DataTable from "@/components/DataTable";

function normalizeLecturerKey(value: any) {
    return `${value || ""}`.trim().toUpperCase();
}

function mergeLecturerSources(authLecturers: any[] = [], courseLecturers: any[] = []) {
    const courseByCode = new Map(
        courseLecturers
            .filter((lecturer) => normalizeLecturerKey(lecturer?.lectureCode))
            .map((lecturer) => [normalizeLecturerKey(lecturer.lectureCode), lecturer]),
    );
    const courseByName = new Map(
        courseLecturers
            .filter((lecturer) => normalizeLecturerKey(lecturer?.fullName))
            .map((lecturer) => [normalizeLecturerKey(lecturer.fullName), lecturer]),
    );

    return authLecturers.map((lecturer) => {
        const matchedCourseLecturer =
            courseByCode.get(normalizeLecturerKey(lecturer?.lectureCode)) ||
            courseByName.get(normalizeLecturerKey(lecturer?.fullName)) ||
            null;

        return {
            ...lecturer,
            scheduleLecturerId: matchedCourseLecturer?.id || null,
            courseLecturer: matchedCourseLecturer,
            facultyId:
                lecturer?.facultyId ||
                matchedCourseLecturer?.faculty?.name ||
                matchedCourseLecturer?.facultyId ||
                "",
        };
    });
}

function toDateInput(value: Date | string) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function getWeekRange(dateValue: string) {
    const anchor = new Date(dateValue);
    anchor.setHours(0, 0, 0, 0);
    const day = anchor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const start = new Date(anchor);
    start.setDate(anchor.getDate() + diff);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
}

function formatDateRangeVi(dateValue: string) {
    const { start, end } = getWeekRange(dateValue);
    return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
}

export default function AdminLecturersPage() {
    const router = useRouter();
    const [lecturers, setLecturers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLecturer, setSelectedLecturer] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Schedule states
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [lecturerSchedule, setLecturerSchedule] = useState<any[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [createAccount, setCreateAccount] = useState(true);

    // Form states
    const [formData, setFormData] = useState({
        lectureCode: "",
        fullName: "",
        email: "",
        facultyId: "",
        degree: "",
        phone: "",
        isActive: true
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchLecturers();
    }, []);

    const fetchLecturers = async () => {
        setLoading(true);
        try {
            const [authRes, courseRes] = await Promise.all([
                fetch("/api/auth/lecturers", {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                }),
                fetch("/api/lecturers", {
                    headers: { Authorization: `Bearer ${TOKEN}` }
                })
            ]);

            const [authLecturers, courseLecturers] = await Promise.all([
                authRes.ok ? authRes.json() : Promise.resolve([]),
                courseRes.ok ? courseRes.json() : Promise.resolve([])
            ]);

            setLecturers(mergeLecturerSources(authLecturers, courseLecturers));
        } catch (error) {
            console.error("Failed to fetch lecturers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddLecturer = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const endpoint = createAccount ? "/api/auth/lecturers" : "/api/lecturers";
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchLecturers();
                setIsAddModalOpen(false);
                setFormData({ lectureCode: "", fullName: "", email: "", facultyId: "", degree: "", phone: "", isActive: true });
                setCreateAccount(true);
            } else {
                const err = await res.json();
                alert(err.message || "Lỗi khi thêm giảng viên");
            }
        } catch (error) {
            console.error("Lỗi khi thêm giảng viên", error);
        } finally {
            setFormLoading(false);
        }
    };

    const handleGrantAccount = async (lecturerId: string) => {
        const lecturer = lecturers.find(l => l.id === lecturerId);
        if (!lecturer || !confirm(`Bạn có chắc muốn cấp tài khoản cho giảng viên ${lecturer.fullName}?`)) return;
        
        setLoading(true);
        try {
            const res = await fetch(`/api/auth/lecturers/${lecturerId}/grant-account`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    email: lecturer.user?.email || null,
                    username: lecturer.lectureCode
                })
            });
            
            if (res.ok) {
                alert("Cấp tài khoản thành công! Mật khẩu mặc định: 123456");
                await fetchLecturers();
            } else {
                const err = await res.json();
                alert(err.message || "Lỗi khi cấp tài khoản");
            }
        } catch (error) {
            console.error("Lỗi cấp tài khoản", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditLecturer = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch(`/api/auth/lecturers/${selectedLecturer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    ...formData,
                    isActive: formData.isActive
                })
            });
            if (res.ok) {
                await fetchLecturers();
                setIsEditModalOpen(false);
            }
        } catch (error) {
            console.error("Lỗi cập nhật", error);
        } finally {
            setFormLoading(false);
        }
    };

    const confirmDelete = async () => {
        setFormLoading(true);
        try {
            const res = await fetch(`/api/auth/lecturers/${selectedLecturer.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setLecturers(lecturers.filter(l => l.id !== selectedLecturer.id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            console.error("Lỗi khi xóa", error);
        } finally {
            setFormLoading(false);
        }
    };

    const openEditModal = (lecturer: any) => {
        setSelectedLecturer(lecturer);
        setFormData({
            lectureCode: lecturer.lectureCode || "",
            fullName: lecturer.fullName || "",
            email: lecturer.user?.email || "",
            facultyId: lecturer.facultyId || "",
            degree: lecturer.degree || "",
            phone: lecturer.phone || "",
            isActive: lecturer.user?.isActive !== false
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (lecturer: any) => {
        setSelectedLecturer(lecturer);
        setIsDeleteModalOpen(true);
    };

    const stats = useMemo(() => ({
        total: lecturers.length,
        faculties: new Set(lecturers.map(l => l.facultyId)).size,
        withDegree: lecturers.filter(l => l.degree).length,
    }), [lecturers]);

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
    };

    const handleOpenCourseClass = (courseClassId: string) => {
        setIsScheduleModalOpen(false);
        router.push(`/staff/courses/${courseClassId}`);
    };

    const handleViewSchedule = async (lecturer: any) => {
        setSelectedLecturer(lecturer);
        setIsScheduleModalOpen(true);
        setScheduleLoading(true);
        try {
            const scheduleLecturerId = lecturer.scheduleLecturerId || lecturer.id;
            const { start, end } = getWeekRange(selectedDate);

            if (!scheduleLecturerId) {
                setLecturerSchedule([]);
                return;
            }

            const params = new URLSearchParams({
                startDate: toDateInput(start),
                endDate: toDateInput(end),
            });

            const res = await fetch(`/api/courses/sessions/lecturer/${scheduleLecturerId}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });

            const data = res.ok ? await res.json() : [];
            setLecturerSchedule(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch schedule", error);
            setLecturerSchedule([]);
        } finally {
            setScheduleLoading(false);
        }
    };

    // Re-fetch schedule if selected date changes while modal is open
    useEffect(() => {
        if (isScheduleModalOpen && selectedLecturer) {
            handleViewSchedule(selectedLecturer);
        }
    }, [selectedDate]);

    const columns = [
        {
            header: "Hồ sơ Giảng viên",
            accessorKey: "fullName",
            cell: (l: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-uneti-blue/5 flex items-center justify-center text-uneti-blue font-black text-[14px]">
                        {l.fullName?.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[14px] font-black text-slate-950 leading-snug">{l.fullName}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] font-medium text-slate-900 uppercase tracking-tight">{l.user?.email || "---"}</p>
                            {!l.scheduleLecturerId && (
                                <span className="rounded-lg bg-amber-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-amber-600 border border-amber-100">
                                    Chưa map lịch
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: "Mã cán bộ",
            accessorKey: "lectureCode",
            cell: (l: any) => (
                <span className="text-[11px] font-black text-uneti-blue bg-uneti-blue-light px-3 py-1.5 rounded-lg tracking-wider">
                    {l.lectureCode}
                </span>
            )
        },
        {
            header: "Đơn vị & Khoa",
            accessorKey: "facultyId",
            cell: (l: any) => (
                <div className="flex items-center gap-2.5">
                    <Building2 size={14} className="text-slate-900" />
                    <span className="text-[13px] font-bold text-slate-950 uppercase tracking-tight">{l.facultyId || "---"}</span>
                </div>
            )
        },
        {
            header: "Học vị",
            accessorKey: "degree",
            cell: (l: any) => (
                <div className="inline-flex items-center px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100">
                    <GraduationCap size={13} className="text-indigo-600 mr-2" />
                    <span className="text-[10px] font-black text-slate-950 uppercase tracking-widest">
                        {l.degree || "Thạc sĩ"}
                    </span>
                </div>
            )
        },
        {
            header: "Tài khoản",
            accessorKey: "userId",
            cell: (l: any) => l.userId ? (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                    <ShieldCheck size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Đã cấp</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5 text-slate-900 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                    <Key size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Chưa có</span>
                </div>
            )
        }
    ];

    const tableActions = (l: any) => (
        <div className="flex items-center justify-end gap-1">
            {!l.userId && (
                <button
                    onClick={() => handleGrantAccount(l.id)}
                    className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-all border border-emerald-100"
                    title="Cấp tài khoản"
                >
                    <UserCheck size={16} />
                </button>
            )}
            <button
                onClick={() => handleViewSchedule(l)}
                className="p-2 text-amber-500 hover:bg-amber-50 rounded-xl transition-all"
                title="Xem lịch dạy"
            >
                <Calendar size={16} />
            </button>
            <button
                onClick={() => openEditModal(l)}
                className="p-2 text-uneti-blue hover:bg-uneti-blue/5 rounded-xl transition-all"
                title="Sửa thông tin"
            >
                <Edit2 size={16} />
            </button>
            <button
                onClick={() => openDeleteModal(l)}
                className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                title="Xóa nhân sự"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className="flex min-h-[400px] items-center justify-center bg-white rounded-[32px] border border-slate-100">
                <div className="flex flex-col items-center gap-3 text-center p-8">
                    <div className="relative">
                        <div className="w-12 h-12 border-4 border-uneti-blue/5 border-t-uneti-blue rounded-full animate-spin"></div>
                    </div>
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Hệ thống đang tải dữ liệu...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                        <Users size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Giảng viên</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đội ngũ giảng viên</h1>
                    <p className="text-[13px] font-medium text-slate-900 font-bold">Thông tin nhân sự và trình độ chuyên môn</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="bg-uneti-blue/5 text-uneti-blue text-[10px] font-black px-3 py-1 rounded-lg border border-uneti-blue/10 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-uneti-blue animate-pulse"></div>
                        {stats.total} Nhân sự
                    </span>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        THÊM MỚI
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Tổng giảng viên", value: stats.total, icon: Users, color: "blue", trend: "Nhân sự cốt lõi" },
                    { label: "Học vị / Học hàm", value: stats.withDegree, icon: GraduationCap, color: "indigo", trend: "Trình độ cao" },
                    { label: "Số lượng Khoa", value: stats.faculties, icon: Building2, color: "emerald", trend: "Kinh tế - Kỹ thuật" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className={`w-12 h-12 rounded-2xl ${s.color === 'blue' ? 'bg-uneti-blue/5 text-uneti-blue' : s.color === 'indigo' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'} flex items-center justify-center mb-4`}>
                                <s.icon size={22} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{s.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black text-slate-900 leading-tight tracking-tight">{s.value}</p>
                                    <span className={`text-[10px] font-bold ${s.color === 'blue' ? 'text-uneti-blue' : s.color === 'indigo' ? 'text-indigo-500' : 'text-emerald-500'}`}>{s.trend}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Standardized DataTable */}
            <div className="h-[calc(100vh-320px)]">
                <DataTable
                    data={lecturers}
                    columns={columns}
                    searchKey="fullName"
                    searchPlaceholder="Tìm theo tên hoặc mã giảng viên..."
                    actions={tableActions}
                />
            </div>

            {/* ADDD MODAL */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Hồ sơ nhân sự Giảng viên"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-900 uppercase tracking-widest">Đóng</button>
                        <button
                            onClick={handleAddLecturer}
                            disabled={formLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[22px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-widest"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Thêm Nhân sự
                        </button>
                    </div>
                }
            >
                <div className="space-y-8 py-4 px-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-1.5 h-6 bg-uneti-blue rounded-full"></span>
                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Thông tin cơ bản</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mã giảng viên</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.lectureCode}
                                    onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Họ và tên</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Chuyên môn & Liên hệ</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Khoa / Bộ môn</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.facultyId}
                                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Học vị</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.degree}
                                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Email đào tạo</label>
                                <input
                                    type="email"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Số điện thoại</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4 pt-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Tài khoản & Truy cập</h3>
                        </div>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-[28px] flex items-center justify-between group/toggle">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all ${createAccount ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-slate-400 border border-slate-200'}`}>
                                    <ShieldCheck size={20} />
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-slate-950 uppercase tracking-widest">Tạo tài khoản hệ thống</p>
                                    <p className="text-[10px] font-bold text-slate-600 mt-1">Cấp quyền truy cập portal giảng viên ngay lập tức</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCreateAccount(!createAccount)}
                                type="button"
                                className={`w-14 h-8 rounded-full transition-all relative p-1 ${createAccount ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200 shadow-inner'}`}
                            >
                                <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${createAccount ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật hồ sơ Nhân sự"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-widest">Đóng</button>
                        <button
                            onClick={handleEditLecturer}
                            disabled={formLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[22px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-widest"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Save size={18} />}
                            Lưu Thay đổi
                        </button>
                    </div>
                }
            >
                <div className="space-y-8 py-4 px-2">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-1.5 h-6 bg-uneti-blue rounded-full"></span>
                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Thông tin cơ bản</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Mã giảng viên</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.lectureCode}
                                    onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Họ và tên</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Chuyên môn & Liên hệ</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Khoa / Bộ môn</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.facultyId}
                                    onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Học vị</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.degree}
                                    onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Email đào tạo</label>
                                <input
                                    type="email"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Số điện thoại</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 transition-all"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    {selectedLecturer?.userId && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
                                <h3 className="text-[12px] font-black text-slate-950 uppercase tracking-wider">Trạng thái tài khoản</h3>
                            </div>
                            <div className="p-4 bg-slate-50 border border-slate-100 rounded-[28px] flex items-center justify-between group/toggle">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-[20px] flex items-center justify-center transition-all ${formData.isActive ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-rose-500 text-white shadow-lg shadow-rose-200'}`}>
                                        <ShieldCheck size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-slate-950 uppercase tracking-widest">
                                            {formData.isActive ? 'Tài khoản đang hoạt động' : 'Tài khoản đang khóa'}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-600 mt-1">
                                            {formData.isActive ? 'Người dùng có thể đăng nhập bình thường' : 'Người dùng bị từ chối truy cập hệ thống'}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                                    type="button"
                                    className={`w-14 h-8 rounded-full transition-all relative p-1 ${formData.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-slate-200 shadow-inner'}`}
                                >
                                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-all transform ${formData.isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Gỡ bỏ hồ sơ Giảng viên"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-widest">Hủy</button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-8 py-3 bg-rose-600 text-white rounded-[22px] text-[12px] font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 uppercase tracking-widest"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            Xóa hồ sơ
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-8 py-12 px-2">
                    <div className="w-28 h-28 rounded-[40px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner overflow-hidden relative group/del">
                        <AlertTriangle size={56} strokeWidth={1.5} className="relative z-10" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">Xóa hồ sơ cán bộ?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[340px] leading-relaxed">
                            Dữ liệu liên quan đến <span className="text-slate-900 font-black">{selectedLecturer?.fullName}</span> sẽ bị gỡ bỏ vĩnh viễn khỏi hệ thống quản lý học vụ.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* SCHEDULE MODAL */}
            <Modal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                title={`Lịch giảng dạy: ${selectedLecturer?.fullName}`}
                maxWidth="7xl"
                footer={
                    <div className="flex items-center justify-end w-full px-2">
                        <button onClick={() => setIsScheduleModalOpen(false)} className="px-8 py-3 bg-slate-900 text-white rounded-[22px] text-[12px] font-black hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">Đóng</button>
                    </div>
                }
            >
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm border border-amber-100">
                                <Clock size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none mb-1">Thời khóa biểu</p>
                                <p className="text-[14px] font-black text-slate-900 tracking-tight">
                                    Tuần hiển thị: {formatDateRangeVi(selectedDate)}
                                </p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-900">
                                    Nhấp vào từng buổi để mở lớp học phần và quản lý
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                                <Calendar size={14} className="text-uneti-blue" />
                                <input 
                                    type="date" 
                                    className="bg-transparent text-[11px] font-black outline-none text-slate-600 uppercase tracking-wider cursor-pointer"
                                    value={selectedDate}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                />
                            </div>
                            <span className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-900">
                                {lecturerSchedule.length} buổi trong tuần
                            </span>
                        </div>
                        
                        {scheduleLoading && (
                            <div className="flex items-center gap-2 text-uneti-blue">
                                <Loader2 size={16} className="animate-spin" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đang cập nhật...</span>
                            </div>
                        )}
                    </div>

                    {!selectedLecturer?.scheduleLecturerId && !scheduleLoading && (
                        <div className="rounded-[24px] border border-amber-100 bg-amber-50 p-4">
                            <p className="text-[11px] font-black uppercase tracking-widest text-amber-600">
                                Hồ sơ giảng viên chưa đồng bộ sang phân hệ học vụ
                            </p>
                            <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-600">
                                Modal lịch dạy lấy dữ liệu từ phân hệ học vụ. Tôi đã map theo mã giảng viên; nếu vẫn không ra lịch thì hồ sơ học vụ của giảng viên này chưa tồn tại hoặc mã đang lệch.
                            </p>
                        </div>
                    )}

                    {lecturerSchedule.length > 0 ? (
                        <div className="space-y-3">
                            <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Bảng thời khóa biểu trong tuần đang xem
                            </p>
                            <div className="rounded-[32px] border border-slate-100 bg-slate-50 p-6">
                                <ScheduleGrid
                                    schedules={lecturerSchedule}
                                    color="indigo"
                                    anchorDate={selectedDate}
                                    onOpenCourseClass={handleOpenCourseClass}
                                />
                            </div>
                            <p className="ml-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Nhấp vào ô môn học để chuyển sang trang quản lý lớp học phần
                            </p>
                        </div>
                    ) : !scheduleLoading && (
                        <div className="rounded-[28px] border border-dashed border-slate-200 bg-white py-12 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                                <Calendar size={24} />
                            </div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Không có lịch dạy trong tuần chứa ngày đã chọn</p>
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
}
