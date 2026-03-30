"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import {
    Building2,
    Plus,
    Edit2,
    Trash2,
    Layers,
    ChevronRight,
    CheckCircle2,
    AlertCircle,
    X
} from "lucide-react";
import Modal from "@/components/modal";
import DataTable from "@/components/DataTable";

export default function StaffDepartmentsPage() {
    const [activeTab, setActiveTab] = useState<"faculties" | "majors">("faculties");
    const [faculties, setFaculties] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isFacultyModalOpen, setIsFacultyModalOpen] = useState(false);
    const [isMajorModalOpen, setIsMajorModalOpen] = useState(false);
    const [editingFaculty, setEditingFaculty] = useState<any>(null);
    const [editingMajor, setEditingMajor] = useState<any>(null);
    
    // Form states
    const [facultyForm, setFacultyForm] = useState({ name: "", code: "", deanName: "" });
    const [majorForm, setMajorForm] = useState({ name: "", code: "", facultyId: "", totalCreditsRequired: 120 });
    
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
            const [facRes, majRes] = await Promise.all([
                fetch("/api/faculties", { headers }),
                fetch("/api/majors", { headers })
            ]);
            if (facRes.ok) setFaculties(await facRes.json());
            if (majRes.ok) setMajors(await majRes.json());
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    // Faculty Handlers
    const handleFacultySubmit = async () => {
        setActionLoading(true);
        setErrorMsg(null);
        try {
            const url = editingFaculty ? `/api/faculties/${editingFaculty.id}` : "/api/faculties";
            const method = editingFaculty ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(facultyForm)
            });
            if (res.ok) {
                setSuccessMsg(editingFaculty ? "Cập nhật Khoa thành công!" : "Thêm Khoa mới thành công!");
                setIsFacultyModalOpen(false);
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

    const handleFacultyDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa Khoa này?")) return;
        try {
            const res = await fetch(`/api/faculties/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                setSuccessMsg("Đã xóa Khoa thành công!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || "Không thể xóa Khoa");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        }
    };

    // Major Handlers
    const handleMajorSubmit = async () => {
        setActionLoading(true);
        setErrorMsg(null);
        try {
            const url = editingMajor ? `/api/majors/${editingMajor.id}` : "/api/majors";
            const method = editingMajor ? "PUT" : "POST";
            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(majorForm)
            });
            if (res.ok) {
                setSuccessMsg(editingMajor ? "Cập nhật Ngành thành công!" : "Thêm Ngành mới thành công!");
                setIsMajorModalOpen(false);
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

    const handleMajorDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa Ngành này?")) return;
        try {
            const res = await fetch(`/api/majors/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                setSuccessMsg("Đã xóa Ngành thành công!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || "Không thể xóa Ngành");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        }
    };

    const facultyColumns = [
        { header: "Mã Khoa", accessorKey: "code" },
        { header: "Tên Khoa", accessorKey: "name" },
        { header: "Trưởng Khoa", accessorKey: "deanName" },
        { 
            header: "Số Ngành", 
            accessorKey: "_count", 
            cell: (item: any) => item._count?.majors || 0 
        },
    ];

    const majorColumns = [
        { header: "Mã Ngành", accessorKey: "code" },
        { header: "Tên Ngành", accessorKey: "name" },
        { 
            header: "Thuộc Khoa", 
            accessorKey: "facultyId", 
            cell: (item: any) => faculties.find(f => f.id === item.facultyId)?.name || "N/A"
        },
        { header: "Số tín chỉ", accessorKey: "totalCreditsRequired" },
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
                        <Building2 size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Cơ cấu tổ chức</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Khoa - Ngành</h1>
                    <p className="text-[13px] font-medium text-slate-500">Thiết lập bộ máy tổ chức và các ngành đào tạo của Nhà trường</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            if (activeTab === "faculties") {
                                setEditingFaculty(null);
                                setFacultyForm({ name: "", code: "", deanName: "" });
                                setIsFacultyModalOpen(true);
                            } else {
                                setEditingMajor(null);
                                setMajorForm({ name: "", code: "", facultyId: faculties[0]?.id || "", totalCreditsRequired: 120 });
                                setIsMajorModalOpen(true);
                            }
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm {activeTab === "faculties" ? "Khoa" : "Ngành"} mới
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

            {/* Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-100/50 w-fit rounded-2xl border border-slate-100">
                <button
                    onClick={() => setActiveTab("faculties")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "faculties" ? "bg-white text-uneti-blue shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                    <Building2 size={14} />
                    Danh sách Khoa
                </button>
                <button
                    onClick={() => setActiveTab("majors")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "majors" ? "bg-white text-uneti-blue shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                >
                    <Layers size={14} />
                    Danh sách Ngành
                </button>
            </div>

            {/* Main Content */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {activeTab === "faculties" ? (
                    <DataTable
                        data={faculties}
                        columns={facultyColumns}
                        searchKey="name"
                        searchPlaceholder="Tìm kiếm tên khoa..."
                        actions={(item) => (
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setEditingFaculty(item);
                                        setFacultyForm({ name: item.name, code: item.code, deanName: item.deanName || "" });
                                        setIsFacultyModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-uneti-blue transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleFacultyDelete(item.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    />
                ) : (
                    <DataTable
                        data={majors}
                        columns={majorColumns}
                        searchKey="name"
                        searchPlaceholder="Tìm kiếm tên ngành..."
                        actions={(item) => (
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setEditingMajor(item);
                                        setMajorForm({ 
                                            name: item.name, 
                                            code: item.code, 
                                            facultyId: item.facultyId, 
                                            totalCreditsRequired: item.totalCreditsRequired 
                                        });
                                        setIsMajorModalOpen(true);
                                    }}
                                    className="p-2 text-slate-400 hover:text-uneti-blue transition-colors"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={() => handleMajorDelete(item.id)}
                                    className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    />
                )}
            </div>

            {/* Faculty Modal */}
            <Modal
                isOpen={isFacultyModalOpen}
                onClose={() => setIsFacultyModalOpen(false)}
                title={editingFaculty ? "Cập nhật Khoa" : "Thêm Khoa mới"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsFacultyModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                        <button 
                            onClick={handleFacultySubmit}
                            disabled={actionLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 disabled:opacity-50"
                        >
                            {actionLoading ? "ĐANG XỬ LÝ..." : "LƯU THÔNG TIN"}
                        </button>
                    </div>
                }
            >
                <div className="py-6 space-y-6 px-2">
                    {errorMsg && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                            <AlertCircle size={18} />
                            <p className="text-xs font-bold">{errorMsg}</p>
                        </div>
                    )}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã Khoa</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Ví dụ: FIT" 
                            value={facultyForm.code}
                            onChange={e => setFacultyForm(f => ({ ...f, code: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Khoa</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Ví dụ: Công nghệ Thông tin" 
                            value={facultyForm.name}
                            onChange={e => setFacultyForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trưởng Khoa</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Tên giảng viên..." 
                            value={facultyForm.deanName}
                            onChange={e => setFacultyForm(f => ({ ...f, deanName: e.target.value }))}
                        />
                    </div>
                </div>
            </Modal>

            {/* Major Modal */}
            <Modal
                isOpen={isMajorModalOpen}
                onClose={() => setIsMajorModalOpen(false)}
                title={editingMajor ? "Cập nhật Ngành" : "Thêm Ngành mới"}
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsMajorModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                        <button 
                            onClick={handleMajorSubmit}
                            disabled={actionLoading}
                            className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 disabled:opacity-50"
                        >
                            {actionLoading ? "ĐANG XỬ LÝ..." : "LƯU THÔNG TIN"}
                        </button>
                    </div>
                }
            >
                <div className="py-6 space-y-6 px-2">
                    {errorMsg && (
                        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                            <AlertCircle size={18} />
                            <p className="text-xs font-bold">{errorMsg}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã Ngành</label>
                            <input 
                                type="text" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none font-mono" 
                                placeholder="CNTT01" 
                                value={majorForm.code}
                                onChange={e => setMajorForm(f => ({ ...f, code: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Số tín chỉ BC</label>
                            <input 
                                type="number" 
                                className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                                value={majorForm.totalCreditsRequired}
                                onChange={e => setMajorForm(f => ({ ...f, totalCreditsRequired: parseInt(e.target.value) }))}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Ngành đào tạo</label>
                        <input 
                            type="text" 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            placeholder="Ví dụ: Công nghệ thông tin" 
                            value={majorForm.name}
                            onChange={e => setMajorForm(f => ({ ...f, name: e.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thuộc Khoa</label>
                        <select 
                            className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none appearance-none cursor-pointer"
                            value={majorForm.facultyId}
                            onChange={e => setMajorForm(f => ({ ...f, facultyId: e.target.value }))}
                        >
                            <option value="">-- Chọn Khoa chủ quản --</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
