"use client";

import React, { useState } from "react";
import {
    X, BookOpen, Save, Loader2
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface SubjectFormModalProps {
    subject?: any;        // null = create, object = edit
    departments: any[];
    headers: any;
    onClose: () => void;
    onSaveSuccess: () => void;
}

export default function SubjectFormModal({
    subject, departments, headers, onClose, onSaveSuccess
}: SubjectFormModalProps) {
    const isEdit = !!subject;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        code: subject?.code ?? "",
        name: subject?.name ?? "",
        credits: subject?.credits ?? 3,
        theoryHours: subject?.theoryHours ?? 45,
        practiceHours: subject?.practiceHours ?? 0,
        selfStudyHours: subject?.selfStudyHours ?? 0,
        examDuration: subject?.examDuration ?? 90,
        examType: subject?.examType ?? "TU_LUAN",
        examForm: subject?.examForm ?? "Tự luận",
        departmentId: subject?.departmentId ?? "",
        description: subject?.description ?? "",
    });

    const field = (label: string, key: keyof typeof form, type = "text", opts?: any) => (
        <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">{label}</label>
            {opts?.options ? (
                <select
                    value={form[key] as string}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all"
                >
                    {opts.options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            ) : (
                <input
                    type={type}
                    value={form[key] as any}
                    onChange={e => setForm(p => ({ ...p, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                    placeholder={opts?.placeholder}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all"
                />
            )}
        </div>
    );

    const handleSave = async () => {
        if (!form.code || !form.name) { setError("Mã môn và tên môn không được trống"); return; }
        setLoading(true); setError("");
        try {
            const url = isEdit ? `/api/courses/subjects/${subject.id}` : `/api/courses/subjects`;
            const res = await fetch(url, {
                method: isEdit ? "PATCH" : "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify(form)
            });
            if (res.ok) { onSaveSuccess(); onClose(); }
            else {
                const d = await res.json();
                setError(d.message || "Lỗi khi lưu môn học");
            }
        } catch { setError("Lỗi kết nối"); } finally { setLoading(false); }
    };

    const handleDelete = async () => {
        if (!subject || !confirm(`Xóa môn "${subject.name}"? Mọi dữ liệu liên quan sẽ bị xóa.`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/courses/subjects/${subject.id}`, { method: "DELETE", headers });
            if (res.ok) { onSaveSuccess(); onClose(); }
            else setError("Không thể xóa môn học này");
        } catch { setError("Lỗi kết nối"); } finally { setLoading(false); }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-uneti-blue rounded-2xl flex items-center justify-center">
                            <BookOpen size={18} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">
                                {isEdit ? "Chỉnh sửa Môn học" : "Thêm Môn học mới"}
                            </h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                {isEdit ? `Mã: ${subject.code}` : "Nhập thông tin môn học"}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
                    {error && (
                        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold">{error}</div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        {field("Mã môn học *", "code", "text", { placeholder: "VD: IT3010" })}
                        {field("Số tín chỉ *", "credits", "number")}
                    </div>
                    {field("Tên môn học *", "name", "text", { placeholder: "VD: Lập trình hướng đối tượng" })}

                    <div className="grid grid-cols-3 gap-4">
                        {field("Giờ Lý thuyết", "theoryHours", "number")}
                        {field("Giờ Thực hành", "practiceHours", "number")}
                        {field("Giờ Tự học", "selfStudyHours", "number")}
                    </div>

                    <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl space-y-4">
                        <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest">Thông tin thi</p>
                        <div className="grid grid-cols-2 gap-4">
                            {field("Loại thi", "examType", "text", { options: [
                                { value: "TU_LUAN", label: "Tự luận" },
                                { value: "TRAC_NGHIEM", label: "Trắc nghiệm" },
                                { value: "THUC_HANH", label: "Thực hành" },
                                { value: "VAN_DAP", label: "Vấn đáp" },
                            ]})}
                            {field("Thời lượng thi (phút)", "examDuration", "number")}
                        </div>
                    </div>

                    <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Khoa phụ trách</label>
                        <select
                            value={form.departmentId}
                            onChange={e => setForm(p => ({ ...p, departmentId: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-uneti-blue/10"
                        >
                            <option value="">-- Chọn Khoa --</option>
                            {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    {field("Mô tả", "description", "text", { placeholder: "Mô tả ngắn về môn học..." })}
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
                    {isEdit ? (
                        <button onClick={handleDelete} disabled={loading}
                            className="px-5 py-2.5 rounded-xl border-2 border-dashed border-rose-200 text-rose-500 text-[10px] font-black uppercase hover:bg-rose-50 transition-all">
                            Xóa môn học
                        </button>
                    ) : <div />}
                    <div className="flex gap-3">
                        <button onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase hover:bg-slate-200 transition-all">
                            Hủy
                        </button>
                        <button onClick={handleSave} disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-uneti-blue text-white text-[10px] font-black uppercase hover:bg-uneti-blue/90 transition-all shadow-lg flex items-center gap-2">
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                            {isEdit ? "Cập nhật" : "Thêm Môn học"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
