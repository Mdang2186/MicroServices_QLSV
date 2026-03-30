"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
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
    UserCircle,
    ChevronRight,
    MapPin,
    Phone,
    Building2,
    GraduationCap,
    UserCheck,
    Filter
} from "lucide-react";
import Modal from "@/components/modal";

export default function StaffLecturersPage() {
    const [lecturers, setLecturers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLecturer, setSelectedLecturer] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        lectureCode: "",
        fullName: "",
        email: "",
        facultyId: "",
        degree: "",
        phone: ""
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchLecturers();
    }, []);

    const fetchLecturers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/lecturers", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLecturers(data);
            }
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
            const res = await fetch("/api/auth/lecturers", {
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
                setFormData({ lectureCode: "", fullName: "", email: "", facultyId: "", degree: "", phone: "" });
            }
        } catch (error) {
            alert("Lỗi khi thêm giảng viên");
        } finally {
            setFormLoading(false);
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
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchLecturers();
                setIsEditModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi cập nhật");
        } finally {
            setFormLoading(false);
        }
    };

    const handleGrantAccount = async (id: string) => {
        try {
            setFormLoading(true);
            const res = await fetch(`/api/auth/lecturers/${id}/grant-account`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${TOKEN}`
                }
            });
            if (res.ok) {
                alert("Cấp tài khoản thành công! Mật khẩu mặc định: 123456");
                await fetchLecturers();
            } else {
                const data = await res.json();
                alert(data.message || "Lỗi khi cấp tài khoản");
            }
        } catch (error) {
            alert("Lỗi kết nối server");
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
            alert("Lỗi khi xóa");
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
            phone: lecturer.phone || ""
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (lecturer: any) => {
        setSelectedLecturer(lecturer);
        setIsDeleteModalOpen(true);
    };

    const stats = {
        total: lecturers.length,
        faculties: new Set(lecturers.map(l => l.facultyId)).size,
        withDegree: lecturers.filter(l => l.degree).length,
    };

    const filteredLecturers = lecturers.filter(l =>
        l.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.lectureCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header & Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Users size={14} className="text-uneti-blue" />
                        <span>Hồ sơ nhân sự</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Giảng viên</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đội ngũ Giảng viên</h1>
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black px-3 py-1 rounded-lg border border-emerald-100 uppercase tracking-widest flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            {stats.total} nhân sự
                        </span>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic">"Quản lý thông tin giảng dạy và trình độ chuyên môn của giảng viên"</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <Download size={16} />
                        Xuất danh sách
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm Giảng viên
                    </button>
                </div>
            </div>

            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng số", value: stats.total, icon: Users, color: "blue" },
                    { label: "Số Khoa", value: stats.faculties, icon: Building2, color: "indigo" },
                    { label: "Học vị cao", value: stats.withDegree, icon: GraduationCap, color: "emerald" },
                    { label: "Đang giảng dạy", value: "85%", icon: UserCheck, color: "blue" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-uneti-blue group-hover:text-white transition-all">
                            <s.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-lg font-black text-slate-900 leading-tight">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Table Section */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm giảng viên theo tên hoặc mã..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-[20px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/10">
                                <th className="py-6 px-10 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Hồ sơ Giảng viên</th>
                                <th className="py-6 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã cán bộ</th>
                                <th className="py-6 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Đơn vị & Khoa</th>
                                <th className="py-6 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Học vị</th>
                                <th className="py-6 px-10 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLecturers.length > 0 ? filteredLecturers.map((l) => (
                                <tr key={l.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="py-6 px-10">
                                        <div className="flex items-center gap-5">
                                            <div className="relative">
                                                <div className="w-14 h-14 rounded-[22px] bg-uneti-blue text-white flex items-center justify-center font-black text-[18px] shadow-lg shadow-uneti-blue/20 group-hover:scale-105 transition-all">
                                                    {l.fullName?.split(' ').pop()?.charAt(0)}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-black text-slate-800 leading-tight tracking-tight">{l.fullName}</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{l.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <span className="text-[11px] font-black text-uneti-blue bg-uneti-blue-light px-3.5 py-1.5 rounded-xl border border-uneti-blue/5 tracking-wider">
                                            {l.lectureCode}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-2.5">
                                            <Building2 size={16} className="text-uneti-blue" />
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-black text-slate-700">{l.facultyId || "K. CNTT"}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="inline-flex items-center px-4 py-2 rounded-2xl bg-white border border-slate-100 shadow-sm">
                                            <GraduationCap size={14} className="text-slate-400 mr-2" />
                                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">
                                                {l.degree || "Thạc sĩ"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-10 text-right">
                                        <div className="flex items-center justify-end gap-2 transition-all duration-300">
                                            {!l.userId && (
                                                <button
                                                    onClick={() => handleGrantAccount(l.id)}
                                                    className="p-3 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all"
                                                    title="Cấp tài khoản"
                                                    disabled={formLoading}
                                                >
                                                    <CheckCircle2 size={18} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(l)}
                                                className="p-3 text-uneti-blue hover:bg-uneti-blue-light rounded-2xl transition-all"
                                                title="Sửa thông tin"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(l)}
                                                className="p-3 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                                title="Xóa nhân sự"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-32 text-center bg-slate-50/30">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-20 h-20 rounded-[32px] bg-white shadow-sm flex items-center justify-center text-slate-200 border border-slate-100">
                                                <Users size={40} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Không có dữ liệu</p>
                                                <p className="text-[11px] font-bold text-slate-400">Danh sách giảng viên đang trống hoặc lỗi kết nối</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ADDD MODAL */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Hồ sơ nhân sự Giảng viên"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-widest">Đóng</button>
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
                <form className="space-y-8 py-6 px-2">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã giảng viên</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                                placeholder="GV..."
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoa / Đơn vị</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                placeholder="Khoa..."
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ tên đầy đủ</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email điện tử</label>
                        <input
                            type="email"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học vị / Học hàm</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                placeholder="Thạc sĩ, Tiến sĩ..."
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Liên lạc (Phone)</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật thông tin cán bộ"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase tracking-widest">Hủy</button>
                        <button
                            onClick={handleEditLecturer}
                            disabled={formLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[22px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-widest"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Lưu dữ liệu
                        </button>
                    </div>
                }
            >
                <form className="space-y-8 py-6 px-2">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã cán bộ</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đơn vị</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên giảng viên</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học hàm / Học vị</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SĐT</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>
                </form>
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
        </div>
    );
}
