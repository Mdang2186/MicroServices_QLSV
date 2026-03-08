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
    UserCircle
} from "lucide-react";
import Modal from "@/components/modal";

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

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
            const res = await fetch("http://localhost:3000/api/auth/users", {
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
            const res = await fetch(`http://localhost:3000/api/auth/users/${selectedUser.id}`, {
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
            const res = await fetch(`http://localhost:3000/api/auth/users/${selectedUser.id}`, {
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
        admins: users.filter(u => u.role === 'ADMIN').length,
        lecturers: users.filter(u => u.role === 'LECTURER').length,
        students: users.filter(u => u.role === 'STUDENT').length,
    };

    const filteredUsers = users.filter(u =>
        u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f4f7fe]">
                <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight uppercase">Tra cứu Tài khoản</h1>
                    <p className="text-xs font-medium text-slate-400">Quản lý và kiểm soát toàn bộ người dùng trong hệ thống</p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: "Tổng số", value: stats.total, icon: UsersIcon, color: "uneti" },
                    { label: "Admin", value: stats.admins, icon: ShieldCheck, color: "uneti" },
                    { label: "Giảng viên", value: stats.lecturers, icon: Shield, color: "indigo" },
                    { label: "Sinh viên", value: stats.students, icon: UserCheck, color: "amber" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className={`w-9 h-9 rounded-xl ${s.color === 'uneti' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${s.color}-50 text-${s.color}-600`} flex items-center justify-center mb-3`}>
                            <s.icon size={18} />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-lg font-black text-slate-800">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tài khoản..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-xs font-medium focus:ring-2 focus:ring-uneti-blue-light transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* SCROLLABLE TABLE CONTAINER */}
                <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md">
                            <tr>
                                <th className="py-3 px-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Username</th>
                                <th className="py-3 px-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Email</th>
                                <th className="py-3 px-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Vai trò</th>
                                <th className="py-3 px-5 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
                                <th className="py-3 px-5 text-right text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredUsers.map((u) => (u && (
                                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-uneti-blue transition-all">
                                                <UserCircle size={18} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{u.username}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 lowercase">
                                            <Mail size={12} className="text-slate-300" />
                                            {u.email}
                                        </div>
                                    </td>
                                    <td className="py-4 px-5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-wider uppercase shadow-sm ${u.role === 'ADMIN' ? 'bg-uneti-blue text-white' :
                                            u.role === 'LECTURER' ? 'bg-indigo-500 text-white' :
                                                u.role === 'ACADEMIC_STAFF' ? 'bg-emerald-500 text-white' :
                                                    'bg-slate-100 text-slate-500'
                                            }`}>
                                            {u.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-1 rounded-full bg-emerald-400"></div>
                                            <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Hoạt động</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-5 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openResetModal(u)}
                                                className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Reset Password"
                                            >
                                                <Key size={14} />
                                            </button>
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="p-1.5 text-uneti-blue hover:bg-uneti-blue-light rounded-lg transition-all"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(u)}
                                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )))}
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
                    <>
                        <button onClick={() => setIsEditModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Hủy</button>
                        <button onClick={handleEditUser} disabled={formLoading} className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2">
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Cập nhật
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input type="email" className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vai trò</label>
                        <select className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                            <option value="STUDENT">Sinh viên</option>
                            <option value="LECTURER">Giảng viên</option>
                            <option value="ACADEMIC_STAFF">Nhân viên Đào tạo</option>
                            <option value="ADMIN">Quản trị viên</option>
                        </select>
                    </div>
                </form>
            </Modal>

            {/* RESET PASSWORD MODAL */}
            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Khôi phục mật khẩu"
                footer={
                    <>
                        <button onClick={() => setIsResetModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Hủy</button>
                        <button onClick={handleResetPassword} disabled={formLoading} className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Key size={18} />}
                            Gửi yêu cầu
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <ShieldAlert size={36} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">Đặt lại mật khẩu cho {selectedUser?.username}?</p>
                        <p className="text-sm text-slate-500 mt-1">Hệ thống sẽ gửi yêu cầu đặt lại mật khẩu mới tới hộp thư của người dùng.</p>
                    </div>
                </div>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa tài khoản"
                footer={
                    <>
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all">Hủy</button>
                        <button onClick={confirmDelete} disabled={formLoading} className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100">
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            Xóa tài khoản
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertTriangle size={36} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">Cảnh báo: Xóa vĩnh viễn?</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-[300px]">Tài khoản <span className="font-bold text-slate-700">{selectedUser?.username}</span> sẽ bị gỡ vĩnh viễn khỏi toàn bộ hệ thống.</p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
