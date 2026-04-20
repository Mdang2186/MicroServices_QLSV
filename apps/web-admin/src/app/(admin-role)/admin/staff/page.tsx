"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    UserCog,
    Search,
    Plus,
    Edit2,
    Trash2,
    ShieldCheck,
    Mail,
    Download,
    AlertTriangle,
    Check,
    UserCheck,
    Calendar,
    ChevronRight,
    Building2,
    GraduationCap,
    Filter,
    Shield
} from "lucide-react";
import Modal from "@/components/modal";

export default function AdminStaffPage() {
    const [staff, setStaff] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        role: "ACADEMIC_STAFF",
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/users", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                const filtered = data.filter((u: any) => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' || u.role === 'ACADEMIC_STAFF');
                setStaff(filtered);
            }

        } catch (error) {
            console.error("Failed to fetch staff", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch("/api/auth/register", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchStaff();
                setIsAddModalOpen(false);
                setFormData({ username: "", email: "", password: "", role: "ACADEMIC_STAFF" });
            }
        } catch (error) {
            alert("Lỗi khi tạo tài khoản");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch(`/api/auth/users/${selectedStaff.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    username: formData.username,
                    email: formData.email,
                    role: formData.role
                })
            });
            if (res.ok) {
                await fetchStaff();
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
            const res = await fetch(`/api/auth/users/${selectedStaff.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setStaff(staff.filter(s => s.id !== selectedStaff.id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi xóa");
        } finally {
            setFormLoading(false);
        }
    };

    const openEditModal = (s: any) => {
        setSelectedStaff(s);
        setFormData({
            username: s.username || "",
            email: s.email || "",
            password: "",
            role: s.role || "ACADEMIC_STAFF",
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (s: any) => {
        setSelectedStaff(s);
        setIsDeleteModalOpen(true);
    };

    const stats = {
        total: staff.length,
        admins: staff.filter(s => s.role === 'SUPER_ADMIN' || s.role === 'ADMIN').length,
        academic: staff.filter(s => s.role === 'ACADEMIC_STAFF').length,
    };


    const filteredStaff = staff.filter(s =>
        s.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">
                        <UserCog size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Nhân sự</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý nhân viên</h1>
                    <p className="text-[13px] font-medium text-slate-950 font-bold">Danh sách quản trị viên và nhân viên phòng đào tạo</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm nhân viên
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: "Quản trị viên", value: stats.admins, icon: ShieldCheck, color: "blue", trend: "Admin hệ thống" },
                    { label: "Nhân viên đào tạo", value: stats.academic, icon: UserCog, color: "emerald", trend: "Hỗ trợ học vụ" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className={`w-12 h-12 rounded-2xl bg-${s.color === 'blue' ? 'uneti-blue-light' : s.color + '-50'} flex items-center justify-center text-${s.color === 'blue' ? 'uneti-blue' : s.color + '-600'} mb-4`}>
                                <s.icon size={22} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest mb-1">{s.label}</p>
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
                            placeholder="Tìm kiếm nhân viên..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white focus:border-uneti-blue/20 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-100">Nhân viên & Tài khoản</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-100">Email hệ thống</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-100">Vai trò / Quyền hạn</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-950 uppercase tracking-widest border-b border-slate-100">Ngày gia nhập</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStaff.length > 0 ? filteredStaff.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-[14px] shadow-inner transition-all duration-300 ${s.role === 'SUPER_ADMIN' || s.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-emerald-50 text-emerald-600'
                                                }`}>
                                                {s.username?.charAt(0).toUpperCase()}
                                            </div>

                                            <div>
                                                <p className="text-[14px] font-black text-slate-950 leading-snug">{s.username}</p>
                                                <p className="text-[11px] font-medium text-slate-900 mt-1">ID: {s.id.slice(0, 8)}...</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-300" />
                                            <span className="text-[13px] font-bold text-slate-900">{s.email}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1.5 ${s.role === 'SUPER_ADMIN' || s.role === 'ADMIN' ? 'bg-slate-900 text-white' : 'bg-emerald-600 text-white'
                                            }`}>
                                            {(s.role === 'SUPER_ADMIN' || s.role === 'ADMIN') && <Shield size={10} />}
                                            {s.role === 'ACADEMIC_STAFF' && <UserCog size={10} />}
                                            {s.role === 'ADMIN' ? 'SUPER_ADMIN' : (s.role === 'ACADEMIC_STAFF' ? 'Đào tạo' : s.role)}
                                        </span>
                                    </td>

                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2 text-[12px] font-bold text-slate-900">
                                            <Calendar size={14} className="text-slate-200" />
                                            {new Date(s.createdAt).toLocaleDateString('vi-VN')}
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-2.5 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all"
                                                title="Sửa"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(s)}
                                                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Xóa"
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
                                            <p className="text-[13px] font-bold text-slate-900">Không tìm thấy dữ liệu nhân viên</p>
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
                title="Tạo tài khoản nhân viên"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleAddStaff}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            TẠO TÀI KHOẢN
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Email đào tạo</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Mật khẩu ban đầu</label>
                        <input
                            type="password"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Vai trò hệ thống</label>
                        <div className="relative">
                            <select
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none appearance-none cursor-pointer"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="ACADEMIC_STAFF">🏢 Nhân viên Đào tạo</option>
                                <option value="SUPER_ADMIN">⚡ Quản trị viên (Admin)</option>
                            </select>

                            <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật tài khoản"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleEditStaff}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            LƯU THAY ĐỔI
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Tên đăng nhập</label>
                        <input
                            type="text"
                            title="Tên đăng nhập"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Email đào tạo</label>
                        <input
                            type="email"
                            title="Email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Vai trò hệ thống</label>
                        <div className="relative">
                            <select
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none appearance-none cursor-pointer"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="ACADEMIC_STAFF">🏢 Nhân viên Đào tạo</option>
                                <option value="SUPER_ADMIN">⚡ Quản trị viên (Admin)</option>
                            </select>

                            <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận gỡ tài khoản"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-rose-600 text-white rounded-2xl text-[12px] font-black hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            XÁC NHẬN XÓA
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-6 py-10">
                    <div className="w-24 h-24 rounded-[40px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner group-hover:shake transition-all duration-500">
                        <AlertTriangle size={48} />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-slate-900 tracking-tight">Xóa tài khoản nhân viên?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[320px] leading-relaxed">
                            Tài khoản <span className="text-slate-900 font-black">{selectedStaff?.username}</span> sẽ bị gỡ bỏ.
                            Hành động này <span className="text-rose-600 font-extrabold">không thể hoàn tác</span>.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
