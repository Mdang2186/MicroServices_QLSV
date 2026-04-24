"use client";

import { useState, useEffect, useMemo } from "react";
import { CreditCard, CheckCircle2, AlertCircle, X, Save, RefreshCw, Ban, UserCheck, Download, Settings, Plus, Trash2, Users } from "lucide-react";
import DataTable from "@/components/DataTable";
import FixedFeeConfigDialog from "@/components/tuition/FixedFeeConfigDialog";
import BulkFeeAssignDialog from "@/components/tuition/BulkFeeAssignDialog";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export default function TuitionManagementPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [activeSemesters, setActiveSemesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [faculties, setFaculties] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    const [intakes, setIntakes] = useState<any[]>([]);
    
    const [selectedFacultyId, setSelectedFacultyId] = useState("");
    const [selectedMajorId, setSelectedMajorId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");
    const [selectedIntake, setSelectedIntake] = useState("");
    const [debtOnly, setDebtOnly] = useState(false);

    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
    const [pendingFees, setPendingFees] = useState<Record<string, number>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [showConfigDialog, setShowConfigDialog] = useState(false);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [feeConfigs, setFeeConfigs] = useState<any[]>([]);
    const [manualFeeForm, setManualFeeForm] = useState({ name: "", amount: 0, configId: "" });
    const [isAddingManual, setIsAddingManual] = useState(false);

    const availableSemesters = useMemo(() => {
        if (!selectedDate || activeSemesters.length === 0) return activeSemesters;
        const target = new Date(selectedDate);
        const dateOnly = new Date(target.getFullYear(), target.getMonth(), target.getDate());

        return activeSemesters.filter(s => {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            return dateOnly >= startOnly && dateOnly <= endOnly;
        });
    }, [selectedDate, activeSemesters]);

    useEffect(() => {
        fetch("/api/enrollments/semesters")
            .then(r => r.json())
            .then(data => {
                const list = data || [];
                setActiveSemesters(list);
                
                // Prioritize matching the current selectedDate
                const target = new Date(selectedDate);
                const matched = list.find((s: any) => {
                    const start = new Date(s.startDate);
                    const end = new Date(s.endDate);
                    return target >= start && target <= end;
                });

                const initial = matched || list.find((s: any) => s.isRegistering || s.isCurrent) || list[0];
                if (initial) setSelectedSemesterId(initial.id);
            });

        fetch('/api/students/tuition/faculties').then(r => r.json()).then(setFaculties);
        fetch('/api/students/tuition/intakes').then(r => r.json()).then(setIntakes);
        fetch('/api/students/tuition/fixed-fee-configs').then(r => r.json()).then(setFeeConfigs);
    }, []);

    useEffect(() => {
        if (selectedFacultyId) {
            fetch(`/api/students/tuition/majors?facultyId=${selectedFacultyId}`)
                .then(r => r.json())
                .then(setMajors);
            setSelectedMajorId(""); setSelectedClassId("");
        } else setMajors([]);
    }, [selectedFacultyId]);

    useEffect(() => {
        if (selectedMajorId) {
            fetch(`/api/students/tuition/classes?majorId=${selectedMajorId}`)
                .then(r => r.json())
                .then(setClasses);
            setSelectedClassId("");
        } else setClasses([]);
    }, [selectedMajorId]);
    
    // Auto-resolve semester when date changes
    useEffect(() => {
        if (!selectedDate || activeSemesters.length === 0) return;

        const targetDate = new Date(selectedDate);
        const matched = activeSemesters.find(s => {
            const start = new Date(s.startDate);
            const end = new Date(s.endDate);
            // Set time to midnight for accurate comparison
            const dateOnly = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
            const startOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
            
            return dateOnly >= startOnly && dateOnly <= endOnly;
        });

        if (matched && matched.id !== selectedSemesterId) {
            setSelectedSemesterId(matched.id);
        }
    }, [selectedDate, activeSemesters]);

    const loadData = () => {
        setLoading(true);
        const params = new URLSearchParams();
        if (selectedSemesterId) params.append("semesterId", selectedSemesterId);
        if (selectedDate) params.append("date", selectedDate);
        if (selectedFacultyId) params.append("facultyId", selectedFacultyId);
        if (selectedMajorId) params.append("majorId", selectedMajorId);
        if (selectedClassId) params.append("classId", selectedClassId);
        if (selectedIntake) params.append("intake", selectedIntake);
        if (debtOnly) params.append("status", "DEBT");
        params.append("page", "1");
        params.append("limit", "1000");

        fetch(`/api/students/tuition/list?${params.toString()}`)
            .then(r => r.json())
            .then(res => setStudents(res.items || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [selectedSemesterId, selectedDate, selectedFacultyId, selectedMajorId, selectedClassId, selectedIntake, debtOnly]);

    const handleExportExcel = () => {
        const sem = activeSemesters.find(s => s.id === selectedSemesterId)?.name || 'Học kỳ';
        const data = students.map(s => ({
            "Mã Sinh Viên": s.studentCode,
            "Họ Tên": s.fullName,
            "Lớp": s.className,
            "Ngành": s.majorName,
            "Tổng Học Phí": s.totalFee,
            "Đã Thu": s.totalFee - s.debt,
            "Còn Nợ": s.debt,
            "Trạng Thái": s.status === 'PAID' ? "Hoàn tất" : "Nợ phí"
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tuition");
        XLSX.writeFile(wb, `Danh_Sach_Hoc_Phi_${sem}.xlsx`);
    };

    const handleToggleExamEligibility = async (studentId: string, currentStatus: boolean) => {
        try {
            await fetch(`/api/students/tuition/toggle-exam-eligibility?studentId=${studentId}&semesterId=${selectedSemesterId}&isEligible=${!currentStatus}`, { method: 'PATCH' });
            loadData();
        } catch (e) {
            console.error("Không thể thực hiện thao tác");
        }
    };

    const handleSavePayment = async () => {
        if (!selectedStudent || isSaving) return;
        setIsSaving(true);
        
        const enrollmentIds = Object.keys(pendingChanges).filter(id => pendingChanges[id] === 'PAID');
        const revertIds = Object.keys(pendingChanges).filter(id => pendingChanges[id] === 'REGISTERED');
        const feeUpdates = Object.keys(pendingFees).map(id => ({ enrollmentId: id, customFee: pendingFees[id] }));

        try {
            if (enrollmentIds.length) {
                await fetch('/api/students/tuition/confirm-payment', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollmentIds, status: 'PAID' }) });
            }
            if (revertIds.length) {
                await fetch('/api/students/tuition/confirm-payment', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollmentIds: revertIds, status: 'REGISTERED' }) });
            }
            for (const update of feeUpdates) {
                await fetch('/api/students/tuition/update-fee', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) });
            }
            
            setPendingChanges({});
            setPendingFees({});
            setSelectedStudent(null);
            loadData();
        } catch (e) {
            console.error(e);
        } finally { setIsSaving(false); }
    };

    const refreshSelectedStudent = async () => {
        if (!selectedStudent || !selectedSemesterId) return;
        const params = new URLSearchParams({
            semesterId: selectedSemesterId,
            query: selectedStudent.studentCode,
            page: "1",
            limit: "5",
        });
        const res = await fetch(`/api/students/tuition/list?${params.toString()}`);
        const data = await res.json();
        const refreshed = (data.items || []).find((item: any) => item.id === selectedStudent.id) || data.items?.[0];
        if (refreshed) setSelectedStudent(refreshed);
    };

    const handleAddManualFee = async () => {
        if (!selectedStudent || !manualFeeForm.name || !manualFeeForm.amount || isAddingManual) return;
        setIsAddingManual(true);
        try {
            await fetch('/api/students/tuition/individual-fee', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentId: selectedStudent.id,
                    semesterId: selectedSemesterId,
                    name: manualFeeForm.name,
                    amount: manualFeeForm.amount,
                })
            });
            await refreshSelectedStudent();
            setManualFeeForm({ name: "", amount: 0, configId: "" });
            loadData();
        } catch (e) {
            console.error(e);
        } finally {
            setIsAddingManual(false);
        }
    };

    const handleDeleteFee = async (feeId: string) => {
        if (!confirm("Bạn có chắc muốn xóa khoản thu này?")) return;
        try {
            const res = await fetch(`/api/students/tuition/student-fee/${feeId}`, { method: 'DELETE' });
            if (!res.ok) {
                const err = await res.json();
                alert(err.message || "Không thể xóa");
                return;
            }
            await refreshSelectedStudent();
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const columns = [
        { header: "Mã SV", accessorKey: "studentCode", cell: (r: any) => <span className="font-black text-blue-600">{r.studentCode}</span> },
        { header: "Họ Tên", accessorKey: "fullName", cell: (r: any) => <span className="font-bold">{r.fullName}</span> },
        { header: "Lớp & Ngành", accessorKey: "className", cell: (r: any) => (
            <div className="flex flex-col">
                <span className="font-bold text-slate-700">{r.className}</span>
                <span className="text-[10px] text-slate-500 line-clamp-1">{r.majorName}</span>
            </div>
        )},
        { header: "Tiến độ", accessorKey: "paidCount", cell: (r: any) => <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded">{r.paidCount}/{r.totalSubjects} Khoản</span> },
        { header: "Tổng học phí", accessorKey: "totalFee", cell: (r: any) => <span className="font-black">{r.totalFee.toLocaleString()}</span> },
        { header: "Còn Nợ", accessorKey: "debt", cell: (r: any) => <span className="font-black text-rose-600">{r.debt > 0 ? r.debt.toLocaleString() : '—'}</span> },
        { header: "Trạng thái", accessorKey: "status", cell: (r: any) => (
            r.status === 'PAID' ? 
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 px-2 py-1 uppercase text-[9px] font-black tracking-widest rounded-lg">Hoàn Tất</span> :
                <span className="bg-rose-50 border border-rose-200 text-rose-600 px-2 py-1 uppercase text-[9px] font-black tracking-widest rounded-lg">Nợ Phí</span>
        )},
        { header: "Hành động", accessorKey: "id", cell: (r: any) => (
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button 
                    onClick={() => handleToggleExamEligibility(r.id, r.isEligibleForExam ?? true)}
                    className={cn(
                        "p-2 rounded-lg transition-all border",
                        (r.isEligibleForExam ?? true) ? "text-slate-400 border-slate-100 hover:text-rose-600 hover:bg-rose-50" : "text-rose-600 border-rose-200 bg-rose-50 hover:bg-rose-100"
                    )}
                    title={r.isEligibleForExam ? "Cấm thi" : "Hủy cấm thi"}
                >
                    {r.isEligibleForExam ? <Ban size={14} /> : <UserCheck size={14} />}
                </button>
            </div>
        )}
    ];

    const resetFilters = () => {
        setSelectedFacultyId("");
        setSelectedMajorId("");
        setSelectedClassId("");
        setSelectedIntake("");
        setDebtOnly(false);
    };

    const activeFilterCount = [selectedFacultyId, selectedMajorId, selectedClassId, selectedIntake].filter(Boolean).length + (debtOnly ? 1 : 0);


    const { modalTotal, modalPaid, modalDebt } = useMemo(() => {
        if (!selectedStudent) return { modalTotal: 0, modalPaid: 0, modalDebt: 0 };
        
        let total = 0;
        let paid = 0;

        selectedStudent.enrollments.forEach((e: any) => {
            const fee = pendingFees[e.id] !== undefined ? pendingFees[e.id] : e.fee;
            const status = pendingChanges[e.id] || e.status;
            total += fee;
            if (status === 'PAID') paid += fee;
        });

        return { modalTotal: total, modalPaid: paid, modalDebt: Math.max(total - paid, 0) };
    }, [selectedStudent, pendingChanges, pendingFees]);

    const quickStats = useMemo(() => {
        let t = 0; let c = 0; let d = 0;
        students.forEach(s => {
            t += s.totalFee;
            d += s.debt;
            c += (s.totalFee - s.debt);
        });
        return { totalExpected: t, totalCollected: c, totalDebt: d };
    }, [students]);

    return (
        <div className="min-h-screen p-8 space-y-8 bg-slate-50/30 font-sans">
            {/* Standard Header matching Academic Review */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                        Đối soát <span className="text-uneti-blue">Tài chính sinh viên</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Nghiệp vụ thu học phí & lệ phí cố định</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lọc Ngày:</span>
                        <input 
                            type="date"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="text-xs font-black text-slate-700 outline-none cursor-pointer"
                        />
                    </div>
                    <select 
                        value={selectedSemesterId}
                        onChange={e => setSelectedSemesterId(e.target.value)}
                        className="bg-white border border-slate-100 text-[11px] font-black text-slate-600 px-4 py-2.5 rounded-xl outline-none shadow-sm uppercase tracking-widest"
                    >
                        {availableSemesters.length === 0 && <option value="">-- Không có học kỳ phù hợp --</option>}
                        {availableSemesters.length > 0 && <option value="">-- Học kỳ tự động --</option>}
                        {availableSemesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
                    </select>
                    <button 
                        onClick={() => setShowBulkModal(true)}
                        disabled={!selectedSemesterId}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-[10px] uppercase tracking-widest font-black rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                        <Users size={14} /> Cấp phí hàng loạt
                    </button>
                    <button 
                        onClick={() => setShowConfigDialog(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-white border border-slate-100 text-slate-600 text-[10px] uppercase tracking-widest font-black rounded-xl shadow-md hover:bg-slate-50 transition-all"
                    >
                        <Settings size={14} /> Cấu Hình Phí
                    </button>
                    <button 
                        onClick={handleExportExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white text-[10px] uppercase tracking-widest font-black rounded-xl shadow-lg hover:bg-uneti-blue transition-all"
                    >
                        <Download size={14} /> Xuất Báo Cáo
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
                <div className="flex flex-col border-r border-slate-100 pr-6">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dự kiến Thu kỳ này</span>
                    <span className="text-2xl font-black text-blue-600">{quickStats.totalExpected.toLocaleString()} đ</span>
                </div>
                <div className="flex flex-col border-r border-slate-100 px-6">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Đã Quyết toán</span>
                    <span className="text-2xl font-black text-emerald-600">{quickStats.totalCollected.toLocaleString()} đ</span>
                </div>
                <div className="flex flex-col pl-6">
                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Thống kê Còn Nợ</span>
                    <span className="text-2xl font-black text-rose-600">{quickStats.totalDebt.toLocaleString()} đ</span>
                </div>
            </div>

            {/* Standard DataTable Container */}
            <div className="flex flex-col gap-4">
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap items-center gap-2 px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">Đang lọc:</span>
                        {selectedFacultyId && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100 flex items-center gap-2">{faculties.find(f => f.id === selectedFacultyId)?.name} <X size={12} className="cursor-pointer" onClick={() => setSelectedFacultyId("")} /></span>}
                        {selectedMajorId && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100 flex items-center gap-2">{majors.find(m => m.id === selectedMajorId)?.name} <X size={12} className="cursor-pointer" onClick={() => setSelectedMajorId("")} /></span>}
                        {selectedIntake && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-rose-100 flex items-center gap-2">Khóa {selectedIntake} <X size={12} className="cursor-pointer" onClick={() => setSelectedIntake("")} /></span>}
                        {selectedClassId && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-blue-100 flex items-center gap-2">{classes.find(c => c.id === selectedClassId)?.name} <X size={12} className="cursor-pointer" onClick={() => setSelectedClassId("")} /></span>}
                        {debtOnly && <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-rose-100 flex items-center gap-2">Chỉ nợ phí <X size={12} className="cursor-pointer" onClick={() => setDebtOnly(false)} /></span>}
                        <button onClick={resetFilters} className="text-[10px] font-black text-slate-400 hover:text-rose-600 uppercase underline ml-2 transition-colors">Xóa tất cả</button>
                    </div>
                )}

                <DataTable 
                    data={students}
                    columns={columns}
                    loading={loading}
                    searchKey="studentCode"
                    searchPlaceholder="Tìm mã sinh viên..."
                    pageSize={15}
                    onRowClick={setSelectedStudent}
                    toolbar={
                        <div className="flex flex-wrap gap-2">
                            <select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px]">
                                <option value="">Khoa / Viện</option>
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select value={selectedMajorId} onChange={e => setSelectedMajorId(e.target.value)} disabled={!selectedFacultyId} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px] disabled:opacity-50">
                                <option value="">Ngành</option>
                                {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <select value={selectedIntake} onChange={e => setSelectedIntake(e.target.value)} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[100px]">
                                <option value="">Khóa</option>
                                {intakes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedMajorId} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px] disabled:opacity-50">
                                <option value="">Lớp học</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <div className="flex items-center gap-2 ml-2 px-4 py-2 bg-rose-50 rounded-xl border border-rose-100">
                                <input 
                                    type="checkbox" 
                                    id="debtOnly" 
                                    checked={debtOnly} 
                                    onChange={e => setDebtOnly(e.target.checked)}
                                    className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-600 cursor-pointer"
                                />
                                <label htmlFor="debtOnly" className="text-[10px] font-black text-rose-600 uppercase tracking-widest cursor-pointer">Chỉ nợ phí</label>
                            </div>
                        </div>
                    }
                />
            </div>

            {/* Flat Minimalist Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white w-full max-w-4xl shadow-2xl flex flex-col max-h-[85vh] rounded-[24px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 mb-1">Cập nhật hồ sơ phí</div>
                                <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">{selectedStudent.fullName}</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">{selectedStudent.studentCode} • {selectedStudent.className}</p>
                            </div>
                            <button onClick={() => { setSelectedStudent(null); setPendingChanges({}); setPendingFees({}); }} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm border border-slate-100"><X size={20} /></button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1">
                            <div className="flex gap-4 mb-8">
                                <div className="flex-1 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng cộng</div>
                                    <div className="text-2xl font-black text-slate-800">{modalTotal.toLocaleString()} đ</div>
                                </div>
                                <div className="flex-1 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 shadow-sm">
                                    <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Đã thanh toán</div>
                                    <div className="text-2xl font-black text-emerald-700">{modalPaid.toLocaleString()} đ</div>
                                </div>
                                <div className={cn("flex-1 p-5 rounded-2xl border shadow-sm", modalDebt > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100')}>
                                    <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1", modalDebt > 0 ? 'text-rose-600' : 'text-slate-400')}>Còn nợ</div>
                                    <div className={cn("text-2xl font-black", modalDebt > 0 ? 'text-rose-700' : 'text-slate-700')}>{modalDebt.toLocaleString()} đ</div>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                                <table className="w-full text-left text-[12px]">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="py-4 px-5 w-12 text-center"><CheckCircle2 size={16} className="text-slate-400" /></th>
                                            <th className="py-4 px-5 font-black uppercase tracking-widest text-[10px] text-slate-400">Mã / Nội dung</th>
                                            <th className="py-4 px-5 text-center font-black uppercase tracking-widest text-[10px] text-slate-400">Tín chỉ</th>
                                            <th className="py-4 px-5 text-right font-black uppercase tracking-widest text-[10px] text-slate-400">Số tiền</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {selectedStudent.enrollments.map((e: any) => {
                                            const isPaid = (pendingChanges[e.id] || e.status) === 'PAID';
                                            return (
                                                <tr key={e.id} onClick={() => setPendingChanges(p => ({ ...p, [e.id]: isPaid ? 'REGISTERED' : 'PAID' }))} className="hover:bg-slate-50 cursor-pointer select-none">
                                                    <td className="py-4 px-5 text-center">
                                                        <input type="checkbox" checked={isPaid} readOnly className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                                                    </td>
                                                    <td className="py-4 px-5">
                                                        <div className="font-black text-slate-800 uppercase text-[11px]">{e.subjectName}</div>
                                                        <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{e.subjectCode} • {e.type === 'FIXED_FEE' ? 'Khoản cố định' : 'Học phí môn'}</div>
                                                    </td>
                                                    <td className="py-4 px-5 text-center font-bold text-slate-500">{e.credits > 0 ? e.credits : "—"}</td>
                                                    <td className="py-4 px-5 text-right font-black text-slate-800 text-[13px] flex items-center justify-end gap-2">
                                                         <input 
                                                            type="number"
                                                            value={pendingFees[e.id] !== undefined ? pendingFees[e.id] : e.fee}
                                                            onChange={(evt) => {
                                                                evt.stopPropagation();
                                                                setPendingFees(prev => ({ ...prev, [e.id]: Number(evt.target.value) }));
                                                            }}
                                                            onClick={(evt) => evt.stopPropagation()}
                                                            className="w-[120px] text-right font-black text-slate-800 text-[13px] bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 outline-none focus:bg-white focus:ring-2 focus:ring-blue-400 transition-all appearance-none"
                                                         />
                                                         <span className="text-[10px] text-slate-400 uppercase font-bold">đ</span>
                                                         {e.type !== 'ENROLLMENT' && (
                                                             <button 
                                                                onClick={(evt) => {
                                                                    evt.stopPropagation();
                                                                    handleDeleteFee(e.id);
                                                                }}
                                                                className="ml-3 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                             >
                                                                <Trash2 size={12} />
                                                             </button>
                                                         )}
                                                     </td>
                                                 </tr>
                                             );
                                         })}
                                         {/* Row Thêm mới */}
                                         <tr className="bg-slate-50/30">
                                            <td className="py-4 px-5 text-center">
                                                <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300" />
                                            </td>
                                            <td className="py-4 px-5 flex gap-2">
                                                <select 
                                                    value={manualFeeForm.configId}
                                                    onChange={e => {
                                                        const conf = feeConfigs.find(c => c.id === e.target.value);
                                                        if (conf) {
                                                            setManualFeeForm({ ...manualFeeForm, configId: conf.id, name: conf.feeName, amount: conf.amount });
                                                        } else {
                                                            setManualFeeForm({ ...manualFeeForm, configId: "", name: "" });
                                                        }
                                                    }}
                                                    className="w-[120px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-400"
                                                >
                                                    <option value="">-- Mẫu phí --</option>
                                                    {feeConfigs.map(c => <option key={c.id} value={c.id}>{c.feeName}</option>)}
                                                </select>
                                                <input 
                                                    placeholder="Hoặc tự nhập tên khoản thu..."
                                                    value={manualFeeForm.name}
                                                    onChange={e => setManualFeeForm({...manualFeeForm, name: e.target.value, configId: ""})}
                                                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-400"
                                                />
                                            </td>
                                            <td className="py-4 px-5 text-center">—</td>
                                            <td className="py-4 px-5 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <input 
                                                        type="number"
                                                        value={manualFeeForm.amount}
                                                        onChange={e => setManualFeeForm({...manualFeeForm, amount: Number(e.target.value)})}
                                                        placeholder="Số tiền..."
                                                        className="w-[120px] bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] font-black outline-none focus:ring-2 focus:ring-blue-400"
                                                    />
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleAddManualFee(); }}
                                                        disabled={!manualFeeForm.name || !manualFeeForm.amount || isAddingManual}
                                                        className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-slate-900 transition-all disabled:opacity-50"
                                                    >
                                                        {isAddingManual ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                                                    </button>
                                                </div>
                                            </td>
                                         </tr>
                                     </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Chọn các khoản phí để hệ thống đối soát
                            </span>
                            <div className="flex gap-4">
                                <button onClick={() => { setSelectedStudent(null); setPendingChanges({}); setPendingFees({}); }} className="px-6 py-2.5 rounded-xl font-black text-slate-500 text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Đóng</button>
                                <button 
                                    disabled={Object.keys(pendingChanges).length === 0 && Object.keys(pendingFees).length === 0 || isSaving}
                                    onClick={handleSavePayment}
                                    className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 disabled:opacity-50 hover:bg-emerald-700 transition-colors flex items-center gap-2"
                                >
                                    {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} 
                                    Xác Nhận Lưu
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showConfigDialog && (
                <FixedFeeConfigDialog 
                    onClose={() => setShowConfigDialog(false)} 
                    academicYear={availableSemesters.find(s => s.id === selectedSemesterId)?.year}
                />
            )}
            {showBulkModal && (
                <BulkFeeAssignDialog 
                    onClose={() => setShowBulkModal(false)}
                    semesterId={selectedSemesterId}
                    onSuccess={loadData}
                />
            )}
        </div>
    );
}
