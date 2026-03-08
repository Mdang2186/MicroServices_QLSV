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
    UserCircle
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
            const res = await fetch("http://localhost:3000/api/auth/lecturers", {
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
            const res = await fetch("http://localhost:3000/api/auth/lecturers", {
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
            const res = await fetch(`http://localhost:3000/api/auth/lecturers/${selectedLecturer.id}`, {
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
            const res = await fetch(`http://localhost:3000/api/auth/lecturers/${selectedLecturer.id}`, {
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

    // Stats
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
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý Giảng viên</h1>
                    <p className="text-sm font-medium text-slate-500">Hồ sơ chuyên môn và danh sách đội ngũ giảng viên</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={18} />
                        Xuất Excel
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        <Plus size={18} />
                        Thêm giảng viên
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: "Tổng giảng viên", value: stats.total, icon: Users, color: "blue" },
                    { label: "Khoa / Bộ môn", value: stats.faculties || "N/A", icon: Briefcase, color: "emerald" },
                    { label: "Hồ sơ hoàn tất", value: stats.withCode, icon: CheckCircle2, color: "indigo" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-2xl font-black text-slate-800">{s.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-2xl bg-${s.color}-50 flex items-center justify-center text-${s.color}-600`}>
                            <s.icon size={24} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Table Section */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-50 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm giảng viên..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
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
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Giảng viên</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã GV</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Khoa / Bộ môn</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Học vị</th>
                                <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLecturers.map((l) => (
                                <tr key={l.id} className="hover:bg-[#fafcff] transition-colors group">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs shadow-sm">
                                                {l.fullName?.split(' ').pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{l.fullName}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <Mail size={10} className="text-slate-300" />
                                                    <p className="text-[10px] font-medium text-slate-400">{l.user?.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                            {l.lectureCode}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-sm font-bold text-slate-600">{l.facultyId || "IT"}</span>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                            {l.degree || "Thạc sĩ"}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(l)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(l)}
                                                className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                    <>
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleAddLecturer}
                            disabled={formLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Lưu hồ sơ
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã giảng viên</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                                placeholder="GV1001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoa / Bộ môn</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                                placeholder="Khoa CNTT"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email (Tài khoản)</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học vị</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                                placeholder="Tiến sĩ"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
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
                title="Cập nhật hồ sơ giảng viên"
                footer={
                    <>
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleEditLecturer}
                            disabled={formLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Lưu thay đổi
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã giảng viên</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.lectureCode}
                                onChange={(e) => setFormData({ ...formData, lectureCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khoa / Bộ môn</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.facultyId}
                                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học vị</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.degree}
                                onChange={(e) => setFormData({ ...formData, degree: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
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
                title="Xác nhận gỡ hồ sơ"
                footer={
                    <>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-6 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            Xóa giảng viên
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertTriangle size={36} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">Xóa hồ sơ giảng viên?</p>
                        <p className="text-sm text-slate-500 mt-1 max-w-[300px]">
                            Bạn đang chuẩn bị xóa thông tin của <span className="font-bold text-slate-700">{selectedLecturer?.fullName}</span>.
                            Các lớp học đang phụ trách có thể bị ảnh hưởng.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
