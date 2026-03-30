"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    Users as UsersIcon,
    Search,
    Edit2,
    Trash2,
    Shield,
    Key,
    UserCheck,
    Filter,
    ShieldCheck,
    ShieldAlert,
    AlertTriangle,
    Check,
    Mail,
    UserCircle,
    ChevronRight,
    Building2,
    GraduationCap,
    Info,
    UserCog
} from "lucide-react";
import Modal from "@/components/modal";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [roleFilter, setRoleFilter] = useState("ALL");


    // Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        role: "",
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/auth/users", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchUsers();
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
            const res = await fetch(`/api/auth/users/${selectedUser.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== selectedUser.id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi xóa tài khoản");
        } finally {
            setFormLoading(false);
        }
    };

    const handleResetPassword = async () => {
        setFormLoading(true);
        // Placeholder for password reset logic
        setTimeout(() => {
            alert("Đã gửi yêu cầu đặt lại mật khẩu!");
            setFormLoading(false);
            setIsResetModalOpen(false);
        }, 1000);
    };

    const openEditModal = (u: any) => {
        setSelectedUser(u);
        setFormData({
            username: u.username || "",
            email: u.email || "",
            role: u.role || "",
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (u: any) => {
        setSelectedUser(u);
        setIsDeleteModalOpen(true);
    };

    const openResetModal = (u: any) => {
        setSelectedUser(u);
        setIsResetModalOpen(true);
    };

    const stats = {
        total: users.length,
        admins: users.filter(u => u.role === 'SUPER_ADMIN' || u.role === 'ADMIN').length,
        lecturers: users.filter(u => u.role === 'LECTURER').length,
        staff: users.filter(u => u.role === 'ACADEMIC_STAFF').length,
        students: users.filter(u => u.role === 'STUDENT').length,
    };

    const filteredUsers = users.filter(u => {
        const matchesSearch = u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });


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
                        <UsersIcon size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Tài khoản</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Tra cứu tài khoản</h1>
                    <p className="text-[13px] font-medium text-slate-500">Quản lý và kiểm soát toàn bộ người dùng trong hệ thống</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: "Tổng số", value: stats.total, icon: UsersIcon, color: "blue", trend: "Người dùng" },
                    { label: "Quản trị viên", value: stats.admins, icon: ShieldCheck, color: "uneti", trend: "Toàn quyền" },
                    { label: "Nhân viên", value: stats.staff, icon: Building2, color: "emerald", trend: "Đào tạo" },
                    { label: "Giảng viên", value: stats.lecturers, icon: GraduationCap, color: "indigo", trend: "Hệ thống LMS" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-full -mr-10 -mt-10 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10">
                            <div className={`w-10 h-10 rounded-xl ${s.color === 'uneti' || s.color === 'blue' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${s.color}-50 text-${s.color}-600`} flex items-center justify-center mb-3`}>
                                <s.icon size={20} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-black text-slate-900">{s.value}</p>
                                <span className="text-[9px] font-bold text-slate-400">{s.trend}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Content Table Section */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
                <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md">
                    <div className="relative w-full sm:w-80 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài khoản..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white focus:border-uneti-blue/20 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100/50 p-1 rounded-2xl border border-slate-100">
                            {[
                                { id: "ALL", label: "Tất cả" },
                                { id: "SUPER_ADMIN", label: "Admin" },
                                { id: "ACADEMIC_STAFF", label: "Nhân viên" },
                                { id: "LECTURER", label: "Giảng viên" },
                                { id: "STUDENT", label: "Sinh viên" },
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setRoleFilter(r.id)}
                                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase transition-all ${roleFilter === r.id
                                            ? "bg-white text-uneti-blue shadow-sm"
                                            : "text-slate-400 hover:text-slate-600"
                                        }`}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Username</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Email hệ thống</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vai trò</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.length > 0 ? filteredUsers.map((u) => (u && (
                                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-uneti-blue-light group-hover:text-uneti-blue transition-all shadow-inner">
                                                <UserCircle size={20} />
                                            </div>
                                            <span className="text-[13px] font-black text-slate-800">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2">
                                            <Mail size={14} className="text-slate-300" />
                                            <span className="text-[13px] font-bold text-slate-500 lowercase">{u.email}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-wrap gap-2">
                                            <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center gap-1.5 ${u.role === 'SUPER_ADMIN' || u.role === 'ADMIN' ? 'bg-slate-900 text-white' :
                                                    u.role === 'LECTURER' ? 'bg-indigo-600 text-white' :
                                                        u.role === 'ACADEMIC_STAFF' ? 'bg-emerald-600 text-white' :
                                                            'bg-slate-100 text-slate-500 border border-slate-200'
                                                }`}>
                                                {(u.role === 'SUPER_ADMIN' || u.role === 'ADMIN') && <Shield size={10} />}
                                                {u.role === 'LECTURER' && <GraduationCap size={10} />}
                                                {u.role === 'ACADEMIC_STAFF' && <UserCog size={10} />}
                                                {u.role === 'STUDENT' && <UserCheck size={10} />}
                                                {u.role === 'ADMIN' ? 'SUPER_ADMIN' : u.role}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Hoạt động</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <button
                                                onClick={() => openResetModal(u)}
                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                                title="Reset Password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-2 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all"
                                                title="Sửa"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(u)}
                                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                title="Xóa"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))) : (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-300">
                                            <UsersIcon size={48} strokeWidth={1} />
                                            <p className="text-[13px] font-bold">Không tìm thấy tài khoản người dùng</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Sửa thông tin tài khoản"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleEditUser}
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
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vai trò hệ thống</label>
                        <div className="relative">
                            <select
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none appearance-none cursor-pointer"
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="STUDENT">📚 Sinh viên (Truy cập Portal)</option>
                                <option value="LECTURER">👨‍🏫 Giảng viên (QL Lớp & Điểm)</option>
                                <option value="ACADEMIC_STAFF">🏢 Nhân viên Đào tạo (QL Học vụ)</option>
                                <option value="SUPER_ADMIN">⚡ Quản trị viên (Toàn quyền)</option>
                            </select>

                            <ChevronRight size={16} className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* RESET PASSWORD MODAL */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Khôi phục mật khẩu"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleResetPassword}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-indigo-600 text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Key size={18} />}
                            GỬI YÊU CẦU
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-6 py-10">
                    <div className="w-24 h-24 rounded-[40px] bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-inner group">
                        <ShieldAlert size={48} className="group-hover:rotate-12 transition-transform" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                            Đặt lại mật khẩu cho <br /><span className="text-uneti-blue">{selectedUser?.username}</span>?
                        </p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[320px] leading-relaxed">
                            Hệ thống sẽ gửi mã xác thực khôi phục mật khẩu mới tới email của người dùng.
                        </p>
                    </div>
                </div>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa tài khoản"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy
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
                    <div className="w-24 h-24 rounded-[40px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner group">
                        <AlertTriangle size={48} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <div className="space-y-2">
                        <p className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest">Cảnh báo hệ thống</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[320px] leading-relaxed">
                            Tài khoản <span className="text-slate-900 font-black">{selectedUser?.username}</span> sẽ bị gỡ vĩnh viễn.
                            Hành động này <span className="text-rose-600 font-extrabold underline underline-offset-4 decoration-2">không thể hoàn tác</span>.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
