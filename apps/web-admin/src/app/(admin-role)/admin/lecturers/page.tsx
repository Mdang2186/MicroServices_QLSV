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
    Filter,
    ShieldCheck,
    Key
} from "lucide-react";
import Modal from "@/components/modal";

export default function AdminLecturersPage() {
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

    const handleGrantAccount = async (lecturer: any) => {
    if (!confirm(`Bạn có chắc muốn cấp tài khoản cho giảng viên ${lecturer.fullName}?`)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/auth/lecturers/${lecturer.id}/grant-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          email: lecturer.email || null, // Backend will use default if null
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
      alert("Lỗi kết nối server");
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
        withCode: lecturers.filter(l => l.lectureCode).length,
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
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Giảng viên</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Đội ngũ giảng viên</h1>
                    <p className="text-[13px] font-medium text-slate-500">Thông tin nhân sự và trình độ chuyên môn</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <UserCheck size={16} />
                        Phân quyền
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm mới
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Tổng giảng viên", value: stats.total, icon: Users, color: "blue", trend: "Nhân sự cốt lõi" },
                    { label: "Học vị / Học hàm", value: stats.withCode, icon: GraduationCap, color: "indigo", trend: "Trình độ cao" },
                    { label: "Số lượng Khoa", value: stats.faculties || 1, icon: Building2, color: "emerald", trend: "Kinh tế - Kỹ thuật" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className={`w-12 h-12 rounded-2xl bg-${s.color === 'blue' ? 'uneti-blue-light' : s.color + '-50'} flex items-center justify-center text-${s.color === 'blue' ? 'uneti-blue' : s.color + '-600'} mb-4`}>
                                <s.icon size={22} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-3xl font-black text-slate-900">{s.value}</p>
                                    <span className={`text-[10px] font-bold text-${s.color === 'blue' ? 'uneti-blue' : s.color + '-500'}`}>{s.trend}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Table Section */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên hoặc mã giảng viên..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-uneti-blue/10 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-[11px] font-black uppercase tracking-widest">
                            <Filter size={18} />
                            Bộ lọc Khoa
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Họ tên & Email</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã giảng viên</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Khoa / Bộ môn</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trình độ</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tài khoản</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLecturers.length > 0 ? filteredLecturers.map((l) => (
                                <tr key={l.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-uneti-blue/5 flex items-center justify-center text-uneti-blue font-black text-[14px] shadow-inner group-hover:bg-uneti-blue group-hover:text-white transition-all duration-300">
                                                {l.fullName?.split(' ').pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-black text-slate-800 leading-snug">{l.fullName}</p>
                                                <p className="text-[11px] font-medium text-slate-400 mt-1">{l.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-[11px] font-black text-uneti-blue bg-uneti-blue-light px-3 py-1.5 rounded-lg tracking-wider">
                                            {l.lectureCode}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={12} className="text-uneti-blue" />
                                            <span className="text-[13px] font-bold text-slate-700">{l.facultyId || "K. CNTT"}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="inline-flex items-center px-4 py-1.5 rounded-xl border border-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white shadow-sm">
                                            {l.degree || "Thạc sĩ"}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        {l.userId ? (
                                            <div className="flex items-center gap-1.5 text-emerald-600">
                                                <ShieldCheck size={14} />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Đã cấp</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-slate-400">
                                                <Key size={14} />
                                                <span className="text-[11px] font-black uppercase tracking-wider">Chưa có</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            {!l.userId && (
                                                <button
                                                    onClick={() => handleGrantAccount(l)}
                                                    className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                                    title="Cấp tài khoản"
                                                >
                                                    <Key size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(l)}
                                                className="p-2.5 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all"
                                                title="Sửa hồ sơ"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(l)}
                                                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Gỡ hồ sơ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-300">
                                                <Search size={32} />
                                            </div>
                                            <p className="text-[13px] font-bold text-slate-400">Không tìm thấy dữ liệu giảng viên</p>
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
                title="Thêm giảng viên mới"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleAddLecturer}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            LƯU DỮ LIỆU
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã giảng viên</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                                placeholder="GV1001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoa / Bộ môn</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                placeholder="Khoa CNTT"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên đầy đủ</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email đào tạo</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học vị</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                placeholder="Thạc sĩ"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                                <input
                                    type="text"
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật hồ sơ giảng viên"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleEditLecturer}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            CẬP NHẬT
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4">
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã giảng viên</label>
                            <input
                                type="text"
                                title="Mã giảng viên"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoa / Bộ môn</label>
                            <input
                                type="text"
                                title="Khoa / Bộ môn"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input
                            type="text"
                            title="Họ và tên"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học vị</label>
                            <input
                                type="text"
                                title="Học vị"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                            <input
                                type="text"
                                title="Số điện thoại"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
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
                title="Xác nhận gỡ thông tin nhân sự"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-800 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-rose-600 text-white rounded-2xl text-[12px] font-black hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            XÓA VĨNH VIỄN
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-6 py-10">
                    <div className="w-24 h-24 rounded-[40px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner group-hover:shake transition-all duration-500">
                        <AlertTriangle size={48} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-slate-900 tracking-tight">Xóa hồ sơ giảng viên?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[320px] leading-relaxed">
                            Toàn bộ dữ liệu của <span className="text-slate-900 font-black">{selectedLecturer?.fullName}</span> sẽ bị gỡ bỏ.
                            Hành động này <span className="text-rose-600 font-extrabold">không thể hoàn tác</span>.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
