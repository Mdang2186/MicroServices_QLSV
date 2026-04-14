import { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Modal from "@/components/modal";

interface SubjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSubject?: any;
    majors: any[];
    departments: any[];
    headers: any;
    onSuccess: (message: string) => void;
}

export function SubjectFormModal({ isOpen, onClose, editingSubject, majors, departments, headers, onSuccess }: SubjectFormModalProps) {
    const [form, setForm] = useState({
        name: "",
        code: "",
        majorId: "",
        credits: 3,
        theoryHours: 30,
        practiceHours: 15,
        selfStudyHours: 0,
        theoryPeriods: 3,
        practicePeriods: 3,
        departmentId: "",
        description: ""
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (editingSubject) {
                setForm({
                    name: editingSubject.name,
                    code: editingSubject.code,
                    majorId: editingSubject.majorId,
                    credits: editingSubject.credits,
                    theoryHours: editingSubject.theoryHours,
                    practiceHours: editingSubject.practiceHours,
                    selfStudyHours: editingSubject.selfStudyHours,
                    theoryPeriods: editingSubject.theoryPeriods || 3,
                    practicePeriods: editingSubject.practicePeriods || 3,
                    departmentId: editingSubject.departmentId || "",
                    description: editingSubject.description || ""
                });
            } else {
                setForm({
                    name: "", code: "", majorId: majors[0]?.id || "",
                    credits: 3, theoryHours: 30, practiceHours: 15,
                    selfStudyHours: 0, theoryPeriods: 3, practicePeriods: 3,
                    departmentId: "", description: ""
                });
            }
            setErrorMsg(null);
        }
    }, [isOpen, editingSubject, majors]);

    const handleSubmit = async () => {
        setActionLoading(true);
        setErrorMsg(null);
        try {
            const url = editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects";
            const method = editingSubject ? "PUT" : "POST";
            
            const payload = { ...form };
            if (payload.departmentId === "") payload.departmentId = null as any;

            const res = await fetch(url, {
                method,
                headers: {
                    ...headers,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                onSuccess(editingSubject ? "Cập nhật Môn học thành công!" : "Thêm Môn học mới thành công!");
                onClose();
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

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingSubject ? "Cập nhật Môn học" : "Thêm Môn học mới"}
            footer={
                <div className="flex items-center justify-end gap-3 w-full px-2">
                    <button onClick={onClose} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
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
            <div className="space-y-6">
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
                        {majors.map((m: any) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tín chỉ</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[18px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            value={form.credits}
                            onChange={e => setForm(f => ({ ...f, credits: parseInt(e.target.value) }))}
                        />
                    </div>
                    <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiết LT</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[18px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            value={form.theoryHours}
                            onChange={e => setForm(f => ({ ...f, theoryHours: parseInt(e.target.value) }))}
                        />
                    </div>
                    <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiết TH</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[18px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" 
                            value={form.practiceHours}
                            onChange={e => setForm(f => ({ ...f, practiceHours: parseInt(e.target.value) }))}
                        />
                    </div>
                    <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Tiết / Buổi LT</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-3.5 bg-emerald-50 border-emerald-100 rounded-[18px] text-[13px] font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/5 outline-none" 
                            value={form.theoryPeriods}
                            onChange={e => setForm(f => ({ ...f, theoryPeriods: parseInt(e.target.value) }))}
                        />
                    </div>
                    <div className="col-span-1 space-y-2">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Tiết / Buổi TH</label>
                        <input 
                            type="number" 
                            className="w-full px-5 py-3.5 bg-indigo-50 border-indigo-100 rounded-[18px] text-[13px] font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/5 outline-none" 
                            value={form.practicePeriods}
                            onChange={e => setForm(f => ({ ...f, practicePeriods: parseInt(e.target.value) }))}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Bộ môn phụ trách</label>
                    <select 
                        className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none appearance-none cursor-pointer"
                        value={form.departmentId}
                        onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                    >
                        <option value="">-- Chọn bộ môn --</option>
                        {departments.map((d: any) => (
                            <option key={d.id} value={d.id}>{d.name} ({d.faculty?.code})</option>
                        ))}
                    </select>
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
    );
}
