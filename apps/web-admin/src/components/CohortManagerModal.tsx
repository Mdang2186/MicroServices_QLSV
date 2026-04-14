"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Users, AlertCircle } from "lucide-react";
import Modal from "@/components/modal";

interface CohortManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    headers: any;
    onSuccess: (message: string) => void;
}

export default function CohortManagerModal({ isOpen, onClose, headers, onSuccess }: CohortManagerModalProps) {
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [form, setForm] = useState({
        code: "",
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear() + 4,
        isActive: true,
        autoGenerateSemesters: true
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const fetchCohorts = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/cohorts", { headers });
            if (res.ok) {
                const data = await res.json();
                setCohorts(Array.isArray(data) ? data : []);
            }
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (isOpen) { fetchCohorts(); resetForm(); }
    }, [isOpen]);

    const resetForm = () => {
        setForm({
            code: "",
            startYear: new Date().getFullYear(),
            endYear: new Date().getFullYear() + 4,
            isActive: true,
            autoGenerateSemesters: true
        });
        setIsEditing(null);
        setErrorMsg(null);
    };

    const handleEdit = (c: any) => {
        setIsEditing(c.code);
        setForm({
            code: c.code,
            startYear: c.startYear,
            endYear: c.endYear,
            isActive: c.isActive,
            autoGenerateSemesters: false // Don't re-generate when editing
        });
    };

    const handleSubmit = async () => {
        setErrorMsg(null);
        try {
            const url = isEditing ? `/api/cohorts/${isEditing}` : "/api/cohorts";
            const method = isEditing ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                onSuccess(isEditing ? "Cập nhật khóa thành công!" : "Tạo khóa mới và 8 học kỳ thành công!");
                fetchCohorts();
                resetForm();
            } else {
                const data = await res.json();
                setErrorMsg(data.message || "Có lỗi xảy ra");
            }
        } catch { setErrorMsg("Lỗi kết nối"); }
    };

    const handleDelete = async (code: string) => {
        if (!confirm(`Xác nhận xóa khóa ${code}? Các dữ liệu kế hoạch liên quan có thể bị ảnh hưởng.`)) return;
        try {
            const res = await fetch(`/api/cohorts/${code}`, { method: "DELETE", headers });
            if (res.ok) { onSuccess("Xóa khóa thành công!"); fetchCohorts(); }
            else { const d = await res.json(); alert(d.message || "Không thể xóa!"); }
        } catch { alert("Lỗi kết nối"); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quản lý Khóa sinh viên" maxWidth="4xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* LEFT: FORM */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="p-5 bg-slate-50 rounded-2xl space-y-4">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            {isEditing ? <Edit2 size={13} /> : <Plus size={13} />}
                            {isEditing ? "Chỉnh sửa khóa" : "Thêm khóa mới"}
                        </h3>

                        {errorMsg && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-[11px] font-bold">
                                <AlertCircle size={13} /> {errorMsg}
                            </div>
                        )}

                        <div className="space-y-3">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mã khóa (VD: K18)</label>
                                <input type="text" placeholder="VD: K18" disabled={!!isEditing}
                                    className="w-full px-4 py-3 bg-white rounded-xl text-[13px] font-bold outline-none focus:ring-2 ring-indigo-200 disabled:opacity-50"
                                    value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Năm bắt đầu</label>
                                    <input type="number" className="w-full px-4 py-3 bg-white rounded-xl text-[13px] font-bold outline-none focus:ring-2 ring-indigo-200"
                                        value={form.startYear} onChange={e => setForm(f => ({ ...f, startYear: parseInt(e.target.value), endYear: parseInt(e.target.value) + 4 }))} />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Năm kết thúc</label>
                                    <input type="number" className="w-full px-4 py-3 bg-white rounded-xl text-[13px] font-bold outline-none focus:ring-2 ring-indigo-200"
                                        value={form.endYear} onChange={e => setForm(f => ({ ...f, endYear: parseInt(e.target.value) }))} />
                                </div>
                            </div>
                            
                            {!isEditing && (
                                <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl cursor-pointer hover:ring-2 ring-indigo-100 transition-all">
                                    <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                                        checked={form.autoGenerateSemesters} onChange={e => setForm(f => ({ ...f, autoGenerateSemesters: e.target.checked }))} />
                                    <span className="text-[12px] font-bold text-slate-600">Tự động tạo 8 học kỳ mẫu</span>
                                </label>
                            )}

                            <label className="flex items-center gap-3 p-3.5 bg-white rounded-xl cursor-pointer hover:ring-2 ring-indigo-100 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded accent-indigo-600"
                                    checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                                <span className="text-[12px] font-bold text-slate-600">Khóa đang hoạt động</span>
                            </label>
                        </div>

                        <div className="flex gap-2 pt-1">
                            {isEditing && (
                                <button onClick={resetForm}
                                    className="flex-1 py-2.5 text-[11px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">
                                    Hủy
                                </button>
                            )}
                            <button onClick={handleSubmit}
                                className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 uppercase tracking-widest">
                                {isEditing ? "Cập nhật" : "Tạo khóa"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: LIST */}
                <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Users size={13} /> {cohorts.length} khóa sinh viên
                    </h3>

                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                        {isLoading ? (
                             <div className="py-10 text-center animate-pulse">
                                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-widest">Đang tải...</p>
                            </div>
                        ) : cohorts.map(c => (
                            <div key={c.code} className="flex items-center justify-between p-4 bg-white border-2 border-slate-100 rounded-2xl hover:border-indigo-100 transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center">
                                        <Users size={16} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-[13px] font-black text-slate-800">{c.code}</h4>
                                            {!c.isActive && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[8px] font-black rounded uppercase">Ngừng</span>}
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                            Niên khóa: {c.startYear} - {c.endYear} ({(c.endYear - c.startYear)} năm)
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => handleEdit(c)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                        <Edit2 size={14} />
                                    </button>
                                    <button onClick={() => handleDelete(c.code)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
