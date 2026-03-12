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
    Check,
    ChevronRight
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
        majorId: "",
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/students", {
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
            const res = await fetch("/api/auth/students", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    ...formData,
                    dob: new Date().toISOString(),
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
            const res = await fetch(`/api/students/${selectedStudent.id}`, {
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
            const res = await fetch(`/api/students/${selectedStudent.id}`, {
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
                        <GraduationCap size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Sinh viên</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hồ sơ sinh viên</h1>
                    <p className="text-[13px] font-medium text-slate-500">Quản lý và tra cứu thông tin sinh viên toàn hệ thống</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <Download size={16} />
                        Xuất file
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
                    { label: "Tổng sinh viên", value: stats.total, icon: Users, color: "blue", trend: "+12% tháng này" },
                    { label: "Đang học tập", value: stats.active, icon: CheckCircle2, color: "emerald", trend: "Ổn định" },
                    { label: "Đã tốt nghiệp", value: stats.graduated, icon: GraduationCap, color: "indigo", trend: "150 sinh viên mới" },
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
                            placeholder="Tìm theo tên hoặc mã sinh viên..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-[13px] font-bold focus:ring-2 focus:ring-uneti-blue/10 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-[11px] font-black uppercase tracking-widest">
                            <Filter size={18} />
                            Lọc dữ liệu
                        </button>
                        <div className="h-8 w-px bg-slate-100 mx-2"></div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{filteredStudents.length} Sinh viên</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thông tin chi tiết</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã sinh viên</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Khóa / Ngành</th>
                                <th className="py-4 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Trạng thái</th>
                                <th className="py-4 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors group">
                                    <td className="py-5 px-8">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-uneti-blue/5 flex items-center justify-center text-uneti-blue font-black text-[14px] shadow-inner group-hover:bg-uneti-blue group-hover:text-white transition-all duration-300">
                                                {s.fullName?.split(' ').pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-black text-slate-800 leading-snug">{s.fullName}</p>
                                                <p className="text-[11px] font-medium text-slate-400 mt-1">{s.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className="text-[11px] font-black text-uneti-blue bg-uneti-blue-light px-3 py-1.5 rounded-lg tracking-wider">
                                            {s.studentCode}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[13px] font-bold text-slate-700">{s.intake || "K20"}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Công nghệ Thông tin</span>
                                        </div>
                                    </td>
                                    <td className="py-5 px-8">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center gap-2 w-fit ${s.status === 'ACTIVE'
                                                ? 'bg-emerald-500 text-white'
                                                : s.status === 'DROPOUT' ? 'bg-rose-500 text-white'
                                                    : 'bg-slate-900 text-white'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-white ${s.status === 'ACTIVE' ? 'animate-pulse' : ''}`}></div>
                                            {s.status === 'ACTIVE' ? 'Đang học' : s.status === 'DROPOUT' ? 'Bỏ học' : s.status}
                                        </span>
                                    </td>
                                    <td className="py-5 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-2.5 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all hover:shadow-sm"
                                                title="Sửa hồ sơ"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(s)}
                                                className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all hover:shadow-sm"
                                                title="Xóa hồ sơ"
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
                                            <p className="text-[13px] font-bold text-slate-400">Không tìm thấy dữ liệu sinh viên</p>
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
                title="Thêm hồ sơ sinh viên mới"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleAddStudent}
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                                placeholder="SV26001"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa đào tạo</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                                placeholder="K20 (2026-2030)"
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
                            placeholder="Nguyễn Văn A"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email sinh viên</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="sv26001@uneti.edu.vn"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái hiện tại</label>
                        <div className="relative">
                            <select
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">⚡ Đang học tập</option>
                                <option value="RESERVED">⏸️ Bảo lưu kết quả</option>
                                <option value="DROPOUT">❌ Đã thôi học</option>
                                <option value="GRADUATED">🎓 Đã tốt nghiệp</option>
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
                title="Cập nhật thông tin sinh viên"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy bỏ
                        </button>
                        <button
                            onClick={handleEditStudent}
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
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa đào tạo</label>
                            <input
                                type="text"
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái</label>
                        <div className="relative">
                            <select
                                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transition-all outline-none appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">⚡ Đang học tập</option>
                                <option value="RESERVED">⏸️ Bảo lưu kết quả</option>
                                <option value="DROPOUT">❌ Đã thôi học</option>
                                <option value="GRADUATED">🎓 Đã tốt nghiệp</option>
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
                title="Xác nhận gỡ bỏ hồ sơ"
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
                        <p className="text-xl font-black text-slate-900 tracking-tight">Xóa hồ sơ sinh viên?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[320px] leading-relaxed">
                            Bạn đang chuẩn bị gỡ bỏ thông tin của <span className="text-slate-900 font-black">{selectedStudent?.fullName}</span>.
                            Hành động này <span className="text-rose-600 font-extrabold">không thể hoàn tác</span> và sẽ ảnh hưởng đến dữ liệu điểm/lịch học.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
