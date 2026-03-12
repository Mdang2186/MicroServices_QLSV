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
    ChevronRight,
    Building2
} from "lucide-react";
import Modal from "@/components/modal";

export default function StaffStudentsPage() {
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
                        <Building2 size={14} className="text-uneti-blue" />
                        <span>Giáo vụ</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Quản lý Sinh viên</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hồ sơ Sinh viên</h1>
                        <div className="bg-uneti-blue-light px-3 py-1 rounded-lg border border-uneti-blue/10">
                            <span className="text-[10px] font-black text-uneti-blue uppercase tracking-widest">{stats.total} Bản ghi</span>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic">"Cập nhật và quản lý thông tin học vụ của sinh viên"</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <Download size={16} />
                        Xuất báo cáo
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Tiếp nhận SV mới
                    </button>
                </div>
            </div>

            {/* Content Table Section */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6 bg-white/50 backdrop-blur-md">
                    <div className="relative w-full sm:w-96 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm nhanh theo tên/mã sinh viên..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-transparent rounded-[20px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-600 rounded-[18px] hover:bg-slate-100 transition-all text-[11px] font-black uppercase tracking-widest border border-slate-100">
                            <Filter size={18} />
                            Bộ lọc nâng cao
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Hồ sơ Sinh viên</th>
                                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Mã định danh</th>
                                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Khóa / Ngành</th>
                                <th className="py-5 px-8 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Tình trạng</th>
                                <th className="py-5 px-8 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Nghiệp vụ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.length > 0 ? filteredStudents.map((s) => (
                                <tr key={s.id} className="hover:bg-slate-50/80 transition-all group">
                                    <td className="py-6 px-8">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-[18px] bg-uneti-blue text-white flex items-center justify-center font-black text-[16px] shadow-lg shadow-uneti-blue/20 group-hover:rotate-6 transition-all duration-300">
                                                {s.fullName?.split(' ').pop()?.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-black text-slate-800 leading-snug tracking-tight">{s.fullName}</p>
                                                <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tight">{s.user?.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-100 rounded-xl shadow-sm">
                                            <span className="text-[11px] font-black text-uneti-blue tracking-[0.05em]">
                                                {s.studentCode}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[13px] font-black text-slate-700">{s.intake || "K20"}</span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khoa CNTT</span>
                                        </div>
                                    </td>
                                    <td className="py-6 px-8">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-[0.1em] uppercase shadow-sm flex items-center gap-2 w-fit ${s.status === 'ACTIVE'
                                            ? 'bg-emerald-500 text-white shadow-emerald-200'
                                            : s.status === 'DROPOUT' ? 'bg-rose-500 text-white shadow-rose-200'
                                                : 'bg-slate-900 text-white shadow-slate-200'
                                            }`}>
                                            <div className={`w-1.5 h-1.5 rounded-full bg-white ${s.status === 'ACTIVE' ? 'animate-pulse' : ''}`}></div>
                                            {s.status === 'ACTIVE' ? 'Học tập' : s.status === 'DROPOUT' ? 'Bỏ học' : s.status}
                                        </span>
                                    </td>
                                    <td className="py-6 px-8 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                                            <button
                                                onClick={() => openEditModal(s)}
                                                className="p-3 text-uneti-blue hover:bg-uneti-blue-light rounded-2xl transition-all"
                                                title="Điều chỉnh hồ sơ"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                            <button
                                                onClick={() => openDeleteModal(s)}
                                                className="p-3 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
                                                title="Gỡ hồ sơ"
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
                                                <Search size={40} strokeWidth={1.5} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-[14px] font-black text-slate-900 uppercase tracking-tight">Cơ sở dữ liệu trống</p>
                                                <p className="text-[11px] font-bold text-slate-400">Không tìm thấy sinh viên nào khớp với tìm kiếm</p>
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
                title="Tiếp nhận hồ sơ sinh viên"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full px-2">
                        <button
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Đóng lại
                        </button>
                        <button
                            onClick={handleAddStudent}
                            disabled={formLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Xác nhận tiếp nhận
                        </button>
                    </div>
                }
            >
                <form className="space-y-8 py-6 px-2">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên định danh</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                                placeholder="SV26001"
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa học & Niên khóa</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                                placeholder="K20 (2026-2030)"
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ tên sinh viên</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Nhập đầy đủ tên"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email liên lạc chính thức</label>
                        <input
                            type="email"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="username@uneti.edu.vn"
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái hồ sơ</label>
                        <div className="relative">
                            <select
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">⚡ Đang học tập</option>
                                <option value="RESERVED">⏸️ Bảo lưu kết quả</option>
                                <option value="DROPOUT">❌ Thôi học</option>
                                <option value="GRADUATED">🎓 Đã tốt nghiệp</option>
                            </select>
                            <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật hồ sơ học lý"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full px-2">
                        <button
                            onClick={() => setIsEditModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleEditStudent}
                            disabled={formLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2 shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            Lưu thay đổi
                        </button>
                    </div>
                }
            >
                <form className="space-y-8 py-6 px-2">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã sinh viên</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                                value={formData.studentCode}
                                onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Khóa học</label>
                            <input
                                type="text"
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                                value={formData.intake}
                                onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Họ và tên</label>
                        <input
                            type="text"
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận trạng thái</label>
                        <div className="relative">
                            <select
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="ACTIVE">⚡ Đang học tập</option>
                                <option value="RESERVED">⏸️ Bảo lưu kết quả</option>
                                <option value="DROPOUT">❌ Thôi học</option>
                                <option value="GRADUATED">🎓 Đã tốt nghiệp</option>
                            </select>
                            <ChevronRight size={18} className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Yêu cầu gỡ bỏ hồ sơ"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full px-2">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                        >
                            Hủy lệnh
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-8 py-3 bg-rose-600 text-white rounded-[20px] text-[12px] font-black hover:bg-rose-700 transition-all flex items-center gap-2 shadow-lg shadow-rose-100 uppercase tracking-wider"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            Thực hiện gỡ
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-8 py-12 px-2">
                    <div className="w-28 h-28 rounded-[40px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner overflow-hidden relative group/del">
                        <div className="absolute inset-0 bg-rose-500/0 group-hover/del:bg-rose-500/5 transition-colors duration-500"></div>
                        <AlertTriangle size={56} strokeWidth={1.5} className="relative z-10" />
                    </div>
                    <div className="space-y-3">
                        <p className="text-2xl font-black text-slate-900 tracking-tight">Xác nhận xóa hồ sơ?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[340px] leading-relaxed">
                            Bạn đang yêu cầu gỡ bỏ vĩnh viễn hồ sơ của <span className="text-slate-900 font-black">{selectedStudent?.fullName}</span>.
                            Dữ liệu liên quan đến <span className="text-rose-600 font-extrabold uppercase tracking-widest">điểm & học phí</span> sẽ bị mất.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
