"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import {
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    X,
    Filter
} from "lucide-react";
import Modal from "@/components/modal";
import DataTable from "@/components/DataTable";

export default function StaffSubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    
    // Form states
    const [form, setForm] = useState({
        name: "",
        code: "",
        majorId: "",
        credits: 3,
        theoryHours: 30,
        practiceHours: 15,
        selfStudyHours: 0,
        department: "",
        description: ""
    });
    
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    const TOKEN = Cookies.get("admin_accessToken");
    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`
    }), [TOKEN]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, majRes] = await Promise.all([
                fetch("/api/subjects", { headers }),
                fetch("/api/majors", { headers })
            ]);
            if (subRes.ok) setSubjects(await subRes.json());
            if (majRes.ok) setMajors(await majRes.json());
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        setActionLoading(true);
        setErrorMsg(null);
        try {
            const url = editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects";
            const method = editingSubject ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(form)
            });
            if (res.ok) {
                setSuccessMsg(editingSubject ? "Cập nhật Môn học thành công!" : "Thêm Môn học mới thành công!");
                setIsModalOpen(false);
                fetchData();
            } else {
                const data = await res.json();
                setErrorMsg(data.message || "Có lỗi xảy ra");
            }
        } catch (error) {
            setErrorMsg("Lỗi kết nối");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa môn học này?")) return;
        try {
            const res = await fetch(`/api/subjects/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                setSuccessMsg("Đã xóa môn học thành công!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || "Không thể xóa môn học");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        }
    };

    const columns = [
        { header: "Mã môn", accessorKey: "code" },
        { header: "Tên môn học", accessorKey: "name" },
        { 
            header: "Ngành", 
            accessorKey: "majorId", 
            cell: (item: any) => majors.find(m => m.id === item.majorId)?.name || "N/A"
        },
        { header: "Tín chỉ", accessorKey: "credits" },
        { 
            header: "Thời lượng (LT/TH)", 
            accessorKey: "theoryHours",
            cell: (item: any) => `${item.theoryHours}/${item.practiceHours}`
        },
    ];

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <BookOpen size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Danh mục môn học</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Môn học</h1>
                    <p className="text-[13px] font-medium text-slate-500">Quản lý chương trình học và định mức tín chỉ</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setForm({
                                name: "", code: "", majorId: majors[0]?.id || "",
                                credits: 3, theoryHours: 30, practiceHours: 15,
                                selfStudyHours: 0, department: "", description: ""
                            });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm môn học mới
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={18} />
                    <p className="text-xs font-bold">{successMsg}</p>
                    <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* List */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DataTable
                    data={subjects}
                    columns={columns}
                    searchKey="name"
                    searchPlaceholder="Tìm kiếm tên môn học hoặc mã môn..."
                    actions={(item) => (
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setEditingSubject(item);
                                    setForm({
                                        name: item.name,
                                        code: item.code,
                                        majorId: item.majorId,
                                        credits: item.credits,
                                        theoryHours: item.theoryHours,
                                        practiceHours: item.practiceHours,
                                        selfStudyHours: item.selfStudyHours,
                                        department: item.department || "",
                                        description: item.description || ""
                                    });
                                    setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-uneti-blue transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />
            </div>

            {/* Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingSubject ? "Cập nhật Môn học" : "Thêm Môn học mới"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                        <button 
                            onClick={handleSubmit}
                            disabled={actionLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 disabled:opacity-50"
                        >
                            {actionLoading ? "ĐANG XỬ LÝ..." : "LƯU THÔNG TIN"}
                        </button>
                    </div>
                }
            >
                <div className="py-6 space-y-6 px-2 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {errorMsg && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                            <AlertCircle size={18} />
                            <p className="text-xs font-bold">{errorMsg}</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã môn học</label>
                            <input 
                                type="text" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none font-mono" 
                                placeholder="Ví dụ: IT101" 
                                value={form.code}
                                onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tín chỉ</label>
                            <input 
                                type="number" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                                value={form.credits}
                                onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên môn học</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Ví dụ: Lập trình C++" 
                            value={form.name}
                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ngành học</label>
                        <select 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none appearance-none cursor-pointer"
                            value={form.majorId}
                            onChange={e => setForm(f => ({ ...f, majorId: e.target.value }))}
                        >
                            <option value="">-- Chọn ngành chủ quản --</option>
                            {majors.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tiết LT</label>
                            <input 
                                type="number" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                                value={form.theoryHours}
                                onChange={e => setForm(f => ({ ...f, theoryHours: parseInt(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tiết TH</label>
                            <input 
                                type="number" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                                value={form.practiceHours}
                                onChange={e => setForm(f => ({ ...f, practiceHours: parseInt(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tiết TH</label>
                            <input 
                                type="number" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                                value={form.selfStudyHours}
                                onChange={e => setForm(f => ({ ...f, selfStudyHours: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bộ môn phụ trách</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Ví dụ: Kỹ thuật phần mềm" 
                            value={form.department}
                            onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả học phần</label>
                        <textarea 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none h-32 resize-none" 
                            placeholder="Nhập mô tả tóm tắt về môn học..."
                            value={form.description}
                            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
