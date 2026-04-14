"use client";
import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, Trash2, Edit2, Calendar, Zap, ChevronDown, ChevronRight, Check, Users } from "lucide-react";
import Modal from "@/components/modal";

interface SemesterManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    headers: any;
    onSuccess: (message: string) => void;
}

// ── Helper: generate structure ─────────────────────────
function getExpectedSemesters(cohortCode: string, startYear: number) {
    const years = [];
    for (let i = 0; i < 4; i++) {
        const yStart = startYear + i;
        const yEnd = yStart + 1;
        const yearRange = `${yStart}-${yEnd}`;
        years.push({
            label: `Năm ${i + 1} (${yearRange})`,
            semesters: [
                { 
                    num: i * 2 + 1, 
                    code: `${cohortCode}_HK${i * 2 + 1}`,
                    name: `HK${i * 2 + 1} - Năm ${i + 1} (${yearRange})`
                },
                { 
                    num: i * 2 + 2, 
                    code: `${cohortCode}_HK${i * 2 + 2}`,
                    name: `HK${i * 2 + 2} - Năm ${i + 1} (${yearRange})`
                }
            ]
        });
    }
    return years;
}

export default function SemesterManagerModal({ isOpen, onClose, headers, onSuccess }: SemesterManagerModalProps) {
    const [semesters, setSemesters] = useState<any[]>([]);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [expandedCohorts, setExpandedCohorts] = useState<Record<string, boolean>>({});
    const [expandedYears, setExpandedYears] = useState<Record<string, boolean>>({});

    const [form, setForm] = useState({
        name: "",
        code: "",
        year: new Date().getFullYear(),
        startDate: "",
        endDate: "",
        isCurrent: false,
    });
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Auto-generate state
    const [selectedCohortCode, setSelectedCohortCode] = useState("");
    const [generating, setGenerating] = useState(false);
    const [showAutoPanel, setShowAutoPanel] = useState(false);

    const fetchSemesters = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/semesters", { headers });
            if (res.ok) setSemesters(await res.json());
            
            const cohortRes = await fetch("/api/cohorts", { headers });
            if (cohortRes.ok) {
                const cData = await cohortRes.json();
                setCohorts(cData);
                if (cData.length > 0 && !selectedCohortCode) setSelectedCohortCode(cData[0].code);
                
                // Expand first cohort by default
                if (cData.length > 0) {
                    setExpandedCohorts((prev: Record<string, boolean>) => ({ ...prev, [cData[0].code]: true }));
                }
            }
        } finally { setIsLoading(false); }
    };

    useEffect(() => {
        if (isOpen) { fetchSemesters(); resetForm(); }
    }, [isOpen]);

    const resetForm = () => {
        setForm({ name: "", code: "", year: new Date().getFullYear(), startDate: "", endDate: "", isCurrent: false });
        setIsEditing(null);
        setErrorMsg(null);
    };

    const handleEdit = (s: any) => {
        setIsEditing(s.id);
        setForm({
            name: s.name,
            code: s.code || "",
            year: s.year,
            startDate: s.startDate ? new Date(s.startDate).toISOString().split("T")[0] : "",
            endDate: s.endDate ? new Date(s.endDate).toISOString().split("T")[0] : "",
            isCurrent: s.isCurrent,
        });
    };

    const handleSubmit = async () => {
        setErrorMsg(null);
        try {
            const url = isEditing ? `/api/semesters/${isEditing}` : "/api/semesters";
            const method = isEditing ? "PATCH" : "POST";
            const res = await fetch(url, {
                method,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                onSuccess(isEditing ? "Cập nhật học kỳ thành công!" : "Tạo học kỳ mới thành công!");
                fetchSemesters();
                resetForm();
            } else {
                const data = await res.json();
                setErrorMsg(data.message || "Có lỗi xảy ra");
            }
        } catch { setErrorMsg("Lỗi kết nối"); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xác nhận xóa học kỳ này? Đảm bảo không có dữ liệu lớp học liên quan.")) return;
        try {
            const res = await fetch(`/api/semesters/${id}`, { method: "DELETE", headers });
            if (res.ok) { onSuccess("Xóa học kỳ thành công!"); fetchSemesters(); }
            else { const d = await res.json(); alert(d.message || "Không thể xóa!"); }
        } catch { alert("Lỗi kết nối"); }
    };

    const handleAddSummerSemester = (cohort: any) => {
        const yearStart = cohort.startYear;
        const yearEnd = yearStart + 1;
        setForm({
            name: `HK Phụ - Năm 1 (${yearStart}-${yearEnd})`,
            code: `${cohort.code}_HKP1`,
            year: yearEnd,
            startDate: `${yearEnd}-07-01`,
            endDate: `${yearEnd}-08-15`,
            isCurrent: false,
        });
        setShowAutoPanel(false);
    };

    const handleAutoGenerate = async () => {
        const cohort = cohorts.find((c: any) => c.code === selectedCohortCode);
        if (!cohort) return;
        setGenerating(true);
        const toCreate = [];
        for (let i = 0; i < 4; i++) {
            const yStart = cohort.startYear + i;
            const yEnd = yStart + 1;
            const yearRange = `${yStart}-${yEnd}`;
            toCreate.push({ 
                name: `HK${i*2+1} - Năm ${i+1} (${yearRange})`, 
                code: `${cohort.code}_HK${i*2+1}`, 
                year: yStart, 
                startDate: `${yStart}-09-01`, 
                endDate: `${yEnd}-01-20` 
            });
            toCreate.push({ 
                name: `HK${i*2+2} - Năm ${i+1} (${yearRange})`, 
                code: `${cohort.code}_HK${i*2+2}`, 
                year: yEnd, 
                startDate: `${yEnd}-02-01`, 
                endDate: `${yEnd}-06-30` 
            });
        }
        let created = 0, skipped = 0;
        for (const sem of toCreate) {
            try {
                const res = await fetch("/api/semesters", {
                    method: "POST",
                    headers: { ...headers, "Content-Type": "application/json" },
                    body: JSON.stringify(sem),
                });
                if (res.ok) created++; else skipped++;
            } catch { skipped++; }
        }
        setGenerating(false);
        fetchSemesters();
        onSuccess(`Tạo tự động thành công: ${created} học kỳ cho Khóa ${selectedCohortCode}${skipped > 0 ? ` (${skipped} bỏ qua)` : ""}`);
    };

    const toggleCohort = (code: string) => setExpandedCohorts((p: Record<string, boolean>) => ({ ...p, [code]: !p[code] }));
    const toggleYear = (key: string) => setExpandedYears((p: Record<string, boolean>) => ({ ...p, [key]: !p[key] }));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Quản lý học kỳ" maxWidth="5xl">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[75vh]">

                {/* LEFT: FORM & AUTO */}
                <div className="lg:col-span-5 space-y-4 overflow-y-auto pr-2 scrollbar-hide">
                    <div className="bg-gradient-to-br from-blue-700 to-violet-700 rounded-2xl p-5 text-white shadow-xl">
                        <button onClick={() => setShowAutoPanel(!showAutoPanel)} className="w-full flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap size={16} fill="currentColor" className="text-amber-300" />
                                <span className="font-black text-sm uppercase tracking-wider">Tạo nhanh theo mẫu</span>
                            </div>
                            <ChevronDown size={16} className={`transition-transform ${showAutoPanel ? "rotate-180" : ""}`} />
                        </button>
                        {showAutoPanel && (
                            <div className="mt-4 space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {cohorts.map((c: any) => (
                                        <button key={c.code} onClick={() => setSelectedCohortCode(c.code)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${selectedCohortCode === c.code ? "bg-white text-[#004ea1] shadow-md" : "bg-white/10 text-white hover:bg-white/20"}`}>
                                            {c.code}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handleAutoGenerate} disabled={generating || !selectedCohortCode} 
                                        className="col-span-2 py-3 bg-white text-[#004ea1] rounded-xl font-black text-[10px] uppercase hover:bg-blue-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                                        {generating ? <div className="animate-spin border-2 border-blue-800/20 border-t-[#004ea1] rounded-full w-4 h-4"/> : <Zap size={13} fill="currentColor"/>}
                                        Khởi tạo 8 HK chính quy
                                    </button>
                                    <button onClick={() => handleAddSummerSemester(cohorts.find((x: any) => x.code === selectedCohortCode))} disabled={!selectedCohortCode}
                                        className="col-span-2 py-2.5 bg-amber-400 text-amber-900 rounded-xl font-black text-[10px] uppercase hover:bg-amber-300 transition-all flex items-center justify-center gap-2">
                                        + Thêm Học kỳ hè (Phụ)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-5 bg-white rounded-2xl border-2 border-slate-100 space-y-4">
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            {isEditing ? <Edit2 size={13}/> : <Plus size={13}/>} {isEditing ? "Chỉnh sửa học kỳ" : "Thêm / Tùy chỉnh học kỳ"}
                        </h3>
                        {errorMsg && <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[10px] font-bold flex items-center gap-2"><AlertCircle size={13}/> {errorMsg}</div>}
                        <div className="space-y-3">
                            <input type="text" placeholder="Tên học kỳ (VD: HK1 - Năm 1 (2024-2025))" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[13px] font-bold border-2 border-transparent focus:border-blue-100 outline-none" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                            <input type="text" placeholder="Mã học kỳ (VD: K18_HK1)" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[13px] font-bold border-2 border-transparent focus:border-blue-100 outline-none" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <input type="date" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] font-bold" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                <input type="date" className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[12px] font-bold" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                            </div>
                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-all">
                                <input type="checkbox" className="w-4 h-4 rounded accent-[#004ea1]" checked={form.isCurrent} onChange={e => setForm(f => ({ ...f, isCurrent: e.target.checked }))} />
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Đặt làm học kỳ hiện tại</span>
                            </label>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && <button onClick={resetForm} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase">Hủy</button>}
                            <button onClick={handleSubmit} className="flex-[2] py-3 bg-[#004ea1] text-white rounded-xl text-[10px] font-black uppercase hover:bg-[#003a7a] shadow-lg shadow-blue-100">
                                {isEditing ? "Cập nhật" : "Lưu dữ liệu"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* RIGHT: TREE LIST */}
                <div className="lg:col-span-7 flex flex-col overflow-hidden bg-slate-50/50 rounded-3xl border-2 border-slate-100">
                    <div className="p-6 border-b border-slate-100 bg-white flex items-center justify-between">
                        <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar size={14} /> Có {semesters.length} học kỳ
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                        {cohorts.map(cohort => {
                            const isCohortExpanded = expandedCohorts[cohort.code];
                            const yearData = getExpectedSemesters(cohort.code, cohort.startYear);
                            
                            return (
                                <div key={cohort.code} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                    <button onClick={() => toggleCohort(cohort.code)} 
                                        className={`w-full flex items-center justify-between px-5 py-4 transition-all ${isCohortExpanded ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-[#004ea1] text-white flex items-center justify-center shadow-md shadow-blue-100">
                                                <Users size={14} />
                                            </div>
                                            <div className="text-left">
                                                <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight">KHÓA {cohort.code}</h4>
                                                <p className="text-[10px] font-bold text-slate-400">Niên khóa {cohort.startYear} - {cohort.endYear}</p>
                                            </div>
                                        </div>
                                        {isCohortExpanded ? <ChevronDown size={18} className="text-[#004ea1]" /> : <ChevronRight size={18} className="text-slate-300" />}
                                    </button>

                                    {isCohortExpanded && (
                                        <div className="px-3 pb-4 space-y-2 translate-y-[-2px]">
                                            {yearData.map((y, yIdx) => {
                                                const yearKey = `${cohort.code}-Y${yIdx+1}`;
                                                const isYearExpanded = expandedYears[yearKey];
                                                
                                                return (
                                                    <div key={yearKey} className="ml-4 border-l-2 border-slate-100">
                                                        <button onClick={() => toggleYear(yearKey)}
                                                            className="flex items-center gap-2 px-3 py-2 text-[11px] font-black text-slate-500 hover:text-[#004ea1] transition-colors uppercase tracking-wider">
                                                            {isYearExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            {y.label}
                                                        </button>

                                                        {isYearExpanded && (
                                                            <div className="ml-6 space-y-1 mt-1">
                                                                {y.semesters.map((sInfo: any) => {
                                                                    const realSem = semesters.find((rs: any) => rs.code === sInfo.code);
                                                                    return (
                                                                        <div key={sInfo.code} 
                                                                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${realSem?.isCurrent ? "bg-emerald-50 border-emerald-100" : "bg-white border-slate-50 hover:border-[#004ea1]/20"}`}>
                                                                            <div className="flex items-center gap-2">
                                                                                <div className={`w-2 h-2 rounded-full ${realSem ? "bg-[#004ea1]" : "bg-slate-200"}`} />
                                                                                <div>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="text-[12px] font-black text-slate-700">HK{sInfo.num}</span>
                                                                                        {realSem?.isCurrent && <span className="text-[8px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full uppercase">Hiện tại</span>}
                                                                                    </div>
                                                                                    {realSem ? (
                                                                                        <p className="text-[9px] font-bold text-slate-400">
                                                                                            {new Date(realSem.startDate).toLocaleDateString("vi-VN")} → {new Date(realSem.endDate).toLocaleDateString("vi-VN")}
                                                                                        </p>
                                                                                    ) : <p className="text-[9px] font-bold text-slate-300 italic">Chưa thiết lập</p>}
                                                                                </div>
                                                                            </div>
                                                                            <div className="flex items-center gap-1">
                                                                                {realSem && (
                                                                                    <>
                                                                                        <button onClick={() => handleEdit(realSem)} className="p-1.5 text-slate-400 hover:text-[#004ea1] hover:bg-slate-50 rounded-lg"><Edit2 size={12} /></button>
                                                                                        <button onClick={() => handleDelete(realSem.id)} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-50 rounded-lg"><Trash2 size={12} /></button>
                                                                                    </>
                                                                                )}
                                                                                {!realSem && (
                                                                                    <button onClick={() => {
                                                                                        setForm({
                                                                                            name: sInfo.name,
                                                                                            code: sInfo.code,
                                                                                            year: sInfo.num % 2 !== 0 ? parseInt(y.label.match(/\((\d+)-(\d+)\)/)![1]) : parseInt(y.label.match(/\((\d+)-(\d+)\)/)![2]),
                                                                                            startDate: sInfo.num % 2 !== 0 ? `${y.label.match(/\((\d+)-(\d+)\)/)![1]}-09-01` : `${y.label.match(/\((\d+)-(\d+)\)/)![2]}-02-01`,
                                                                                            endDate: sInfo.num % 2 !== 0 ? `${y.label.match(/\((\d+)-(\d+)\)/)![2]}-01-20` : `${y.label.match(/\((\d+)-(\d+)\)/)![2]}-06-30`,
                                                                                            isCurrent: false
                                                                                        });
                                                                                    }} className="p-1.5 text-[#004ea1] hover:bg-blue-50 rounded-lg transition-all" title="Thiết lập nhanh">
                                                                                        <Plus size={14} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}

                                            {/* Show extra semesters (like Summer) that don't fit the 8-main pattern */}
                                            {(() => {
                                                const extra = semesters.filter((rs: any) => rs.code.startsWith(cohort.code) && !yearData.some((y: any) => y.semesters.some((s: any) => s.code === rs.code)));
                                                if (extra.length === 0) return null;
                                                return (
                                                    <div className="ml-4 border-l-2 border-slate-100">
                                                        <p className="px-3 py-2 text-[10px] font-black text-amber-500 uppercase tracking-wider">Học kỳ bổ sung</p>
                                                        <div className="ml-6 space-y-1">
                                                            {extra.map((rs: any) => (
                                                                <div key={rs.code} className="flex items-center justify-between p-3 rounded-xl border-2 bg-amber-50/30 border-amber-100/50">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                                                                        <div>
                                                                            <span className="text-[12px] font-black text-slate-700">{rs.name}</span>
                                                                            <p className="text-[9px] font-bold text-slate-400">
                                                                                {new Date(rs.startDate).toLocaleDateString("vi-VN")} → {new Date(rs.endDate).toLocaleDateString("vi-VN")}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <button onClick={() => handleEdit(rs)} className="p-1.5 text-slate-400 hover:text-blue-700 rounded-lg"><Edit2 size={12} /></button>
                                                                        <button onClick={() => handleDelete(rs.id)} className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"><Trash2 size={12} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </Modal>
    );
}
