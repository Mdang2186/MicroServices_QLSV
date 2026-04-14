"use client";
import React, { useState } from "react";
import { Copy, X, Check, Search, Users, Loader2 } from "lucide-react";
import Modal from "./modal";
import { toast } from "react-hot-toast";

interface CopyPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentCohort: string;
    currentMajorId: string;
    cohorts: any[];
    onCopy: (targetCohorts: string[]) => Promise<void>;
}

export default function CopyPlanModal({ isOpen, onClose, currentCohort, cohorts, onCopy }: CopyPlanModalProps) {
    const [selectedTargets, setSelectedTargets] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [search, setSearch] = useState("");

    const filteredCohorts = cohorts.filter(c => 
        c.code !== currentCohort && 
        c.code.toLowerCase().includes(search.toLowerCase())
    );

    const toggleTarget = (code: string) => {
        setSelectedTargets(prev => 
            prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
        );
    };

    const handleConfirm = async () => {
        if (selectedTargets.length === 0) {
            toast.error("Vui lòng chọn ít nhất một khóa đích");
            return;
        }
        setIsProcessing(true);
        try {
            await onCopy(selectedTargets);
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sao chép kế hoạch khung" maxWidth="md">
            <div className="space-y-6 py-2">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">Nguồn sao chép</p>
                    <div className="flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        <span className="text-sm font-black text-blue-900">KHÓA {currentCohort}</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chọn các khóa đích</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm khóa..." 
                            className="w-full pl-9 pr-4 py-3 bg-slate-50 rounded-xl text-sm font-bold border-2 border-transparent focus:border-blue-100 outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-hide">
                        {filteredCohorts.length > 0 ? (
                            filteredCohorts.map(cohort => (
                                <button 
                                    key={cohort.code}
                                    onClick={() => toggleTarget(cohort.code)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${
                                        selectedTargets.includes(cohort.code) 
                                            ? "bg-blue-50 border-blue-200" 
                                            : "bg-white border-slate-100 hover:border-blue-100"
                                    }`}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        <div className={`p-2 rounded-lg ${selectedTargets.includes(cohort.code) ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>
                                            <Users size={14} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-700">KHÓA {cohort.code}</p>
                                            <p className="text-[10px] font-bold text-slate-400">{cohort.startYear} - {cohort.endYear}</p>
                                        </div>
                                    </div>
                                    {selectedTargets.includes(cohort.code) && <Check size={16} className="text-blue-600" />}
                                </button>
                            ))
                        ) : (
                            <p className="text-center py-8 text-xs font-bold text-slate-400">Không tìm thấy khóa sinh viên nào khác</p>
                        )}
                    </div>
                </div>

                <div className="flex gap-3 pt-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-3 text-[11px] font-black text-slate-400 uppercase hover:text-slate-600 transition-colors"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isProcessing || selectedTargets.length === 0}
                        className="flex-[2] py-3 bg-[#004ea1] text-white rounded-xl text-[11px] font-black uppercase hover:bg-[#003a7a] shadow-lg shadow-blue-100 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Copy size={14} />}
                        Xác nhận sao chép ({selectedTargets.length})
                    </button>
                </div>
            </div>
        </Modal>
    );
}
