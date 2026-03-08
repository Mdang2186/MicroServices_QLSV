"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    Users,
    Search,
    Plus,
    Edit2,
    Trash2,
    Filter,
    GraduationCap,
    CheckCircle2,
    Download,
    AlertTriangle,
    Check
} from "lucide-react";
import Modal from "@/components/modal";

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Form states
    const [formData, setFormData] = useState({
        studentCode: "",
        fullName: "",
        email: "",
        intake: "",
        status: "ACTIVE",
        majorId: "", // In a real app, fetch from majors
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/api/students", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            // 1. Create User first (simplified for demo, usually one endpoint)
            // For now, we assume the student service handles it or we have a composite endpoint
            // Since this is UI focused, I'll update the implementation to match existing backend if possible
            const res = await fetch("http://localhost:3000/api/auth/students", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    ...formData,
                    dob: new Date().toISOString(), // Default for now
                })
            });
            if (res.ok) {
                await fetchStudents();
                setIsAddModalOpen(false);
                setFormData({ studentCode: "", fullName: "", email: "", intake: "", status: "ACTIVE", majorId: "" });
            }
        } catch (error) {
            alert("Lỗi khi thêm sinh viên");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch(`http://localhost:3000/api/students/${selectedStudent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                await fetchStudents();
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
            const res = await fetch(`http://localhost:3000/api/students/${selectedStudent.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setStudents(students.filter(s => s.id !== selectedStudent.id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi xóa sinh viên");
        } finally {
            setFormLoading(false);
        }
    };

    const openEditModal = (student: any) => {
        setSelectedStudent(student);
        setFormData({
            studentCode: student.studentCode || "",
            fullName: student.fullName || "",
            email: student.user?.email || "",
            intake: student.intake || "",
            status: student.status || "ACTIVE",
            majorId: student.majorId || "",
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (student: any) => {
        setSelectedStudent(student);
        setIsDeleteModalOpen(true);
    };

    // Stats
    const stats = {
        total: students.length,
        active: students.filter(s => s.status === 'ACTIVE').length,
        graduated: students.filter(s => s.status === 'GRADUATED').length,
    };

    const filteredStudents = students.filter(s =>
        s.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
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
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Quản lý Sinh viên</h1>
                    <p className="text-sm font-medium text-slate-500">Hệ thống quản lý dữ liệu sinh viên tập trung</p>
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
                        Thêm sinh viên
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {[
                    { label: "Tổng sinh viên", value: stats.total, icon: Users, color: "blue" },
                    { label: "Đang học", value: stats.active, icon: CheckCircle2, color: "emerald" },
                    { label: "Đã tốt nghiệp", value: stats.graduated, icon: GraduationCap, color: "indigo" },
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
                <div className="p-5 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                    <div className="relative w-full sm:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm theo tên hoặc mã sinh viên..."
                            className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="p-2.5 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all">
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* SCROLLABLE TABLE CONTAINER */}
                <div className="overflow-x-auto max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 bg-slate-50/80 backdrop-blur-md">
                            <tr>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Sinh viên</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã số</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Khóa học</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">GPA / CPA</th>
                                <th className="py-4 px-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
                                <th className="py-4 px-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map((s) => (
                                <tr key={s.id} className="hover:bg-[#fafcff] transition-colors group">
                                    <td className="py-5 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs shadow-sm">
                                                {s.fullName?.split(' ').pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{s.fullName}</p>
                                                <p className="text-[10px] font-medium text-slate-400">{s.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                            {s.studentCode}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-sm font-bold text-slate-600">{s.intake || "N/A"}</td>
                                    <td className="py-5 px-6">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800">{s.gpa?.toFixed(1)} <span className="text-[10px] text-slate-400">/ 4.0</span></span>
                                            <span className="text-[10px] font-medium text-slate-400">CPA: {s.cpa?.toFixed(1)}</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-6">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm ${s.status === 'ACTIVE'
                                            ? 'bg-emerald-500 text-white'
                                            : s.status === 'DROPOUT' ? 'bg-rose-500 text-white'
                                                : 'bg-slate-400 text-white'
                                            }`}>
                                            {s.status === 'ACTIVE' ? 'Đang học' : s.status === 'DROPOUT' ? 'Bỏ học' : s.status}
                                        </span>
                                    </td>
                                    <td className="py-5 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(s)}
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
                title="Thêm sinh viên mới"
                footer={
                    <>
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleAddStudent}
                            disabled={formLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Lưu thông tin
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                                placeholder="SV26001"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa (Intake)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                                placeholder="2026-2030"
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
                            placeholder="Nguyễn Văn A"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="student@uneti.edu.vn"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
                        <select
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="ACTIVE">Đang học</option>
                            <option value="RESERVED">Bảo lưu</option>
                            <option value="DROPOUT">Bỏ học</option>
                            <option value="GRADUATED">Tốt nghiệp</option>
                        </select>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Chỉnh sửa sinh viên"
                footer={
                    <>
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-5 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleEditStudent}
                            disabled={formLoading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Cập nhật
                        </button>
                    </>
                }
            >
                <form className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa (Intake)</label>
                            <input
                                type="text"
                                className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
                        <select
                            className="w-full px-4 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 transition-all outline-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="ACTIVE">Đang học</option>
                            <option value="RESERVED">Bảo lưu</option>
                            <option value="DROPOUT">Bỏ học</option>
                            <option value="GRADUATED">Tốt nghiệp</option>
                        </select>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa"
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
                            Xóa sinh viên
                        </button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-4">
                    <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertTriangle size={36} />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-slate-800">Bạn có chắc chắn muốn xóa?</p>
                        <p className="text-sm text-slate-500 mt-1">
                            Hành động này sẽ xóa sinh viên <span className="font-bold text-slate-700">{selectedStudent?.fullName}</span>.
                            Dữ liệu đã xóa không thể khôi phục lại.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
