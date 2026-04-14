"use client";

import React, { useState, useEffect } from "react";
import { X, CheckSquare, Square, Save, Loader2, Info } from "lucide-react";
import { toast } from "react-hot-toast";

interface CopyCurriculumModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    semesterId: string;
    majorId: string;
    cohort: string;
}

export default function CopyCurriculumModal({ isOpen, onClose, onSuccess, semesterId, majorId, cohort }: CopyCurriculumModalProps) {
    const [curriculum, setCurriculum] = useState<any[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);

    useEffect(() => {
        if (isOpen && majorId && cohort) {
            fetchCurriculum();
        }
    }, [isOpen, majorId, cohort]);

    const fetchCurriculum = async () => {
        setFetching(true);
        try {
            const res = await fetch(`http://localhost:3000/api/semester-plan/curriculum?majorId=${majorId}&cohort=${cohort}`);
            const data = await res.json();
            setCurriculum(Array.isArray(data) ? data : []);
            // Auto-select everything by default
            setSelectedIds(Array.isArray(data) ? data.map(item => item.subjectId) : []);
        } catch (error) {
            toast.error("Lỗi khi tải khung chương trình");
        } finally {
            setFetching(false);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const handleCopy = async () => {
        if (selectedIds.length === 0) {
            toast.error("Vui lòng chọn ít nhất một môn học");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/api/semester-plan/copy-curriculum", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    semesterId,
                    majorId,
                    cohort,
                    subjectIds: selectedIds
                })
            });
            if (res.ok) {
                const result = await res.json();
                toast.success(`Đã sao chép ${result.count} môn học vào kế hoạch!`);
                onSuccess();
                onClose();
            } else {
                toast.error("Lỗi khi sao chép");
            }
        } catch (error) {
            toast.error("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            Sao chép môn học từ Khung chương trình
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
                            {cohort} • {majorId.split('-')[0]}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {fetching ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="animate-spin text-uneti-blue" size={40} />
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Đang tải khung chương trình...</p>
                        </div>
                    ) : curriculum.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 mb-4 p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
                                <Info size={20} />
                                <p className="text-xs font-bold leading-relaxed">
                                    Hệ thống sẽ tạo lớp học phần cho các môn học được chọn. Nếu lớp đã tồn tại, hệ thống sẽ bỏ qua.
                                </p>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2">
                                {curriculum.map((item) => (
                                    <div 
                                        key={item.id}
                                        onClick={() => toggleSelect(item.subjectId)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                                            selectedIds.includes(item.subjectId) 
                                            ? 'bg-uneti-blue/5 border-uneti-blue/20 ring-1 ring-uneti-blue/10' 
                                            : 'bg-slate-50 border-transparent hover:border-slate-200'
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-uneti-blue">
                                                {selectedIds.includes(item.subjectId) ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                                            </div>
                                            <div>
                                                <p className={`text-sm font-bold ${selectedIds.includes(item.subjectId) ? 'text-slate-800' : 'text-slate-500'}`}>
                                                    {item.subject.name}
                                                </p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                                    Mã: {item.subject.code} • {item.subject.credits} Tín chỉ • Kỳ {item.suggestedSemester}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-20 text-slate-300">
                            <Info size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-sm font-bold">Không tìm thấy khung chương trình cho khóa này</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400">
                        Đã chọn <span className="text-uneti-blue">{selectedIds.length}</span> môn học
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 bg-white text-slate-500 rounded-xl font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={handleCopy}
                            disabled={loading || curriculum.length === 0}
                            className="flex items-center gap-2 px-8 py-3 bg-uneti-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-uneti-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Đẩy dữ liệu vào kế hoạch
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
