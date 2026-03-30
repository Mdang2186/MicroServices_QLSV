"use client";

import { useState, useEffect, useMemo } from "react";
import { CreditCard, CheckCircle2, AlertCircle, X, Save, RefreshCw } from "lucide-react";
import DataTable from "@/components/DataTable";
import { cn } from "@/lib/utils";

export default function TuitionManagementPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [activeSemesters, setActiveSemesters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [faculties, setFaculties] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [classes, setClasses] = useState<any[]>([]);
    
    const [selectedFacultyId, setSelectedFacultyId] = useState("");
    const [selectedMajorId, setSelectedMajorId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");

    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetch("/api/enrollments/semesters")
            .then(r => r.json())
            .then(data => {
                setActiveSemesters(data || []);
                const current = (data || []).find((s: any) => s.isRegistering || s.isCurrent) || data?.[0];
                if (current) setSelectedSemesterId(current.id);
            });

        fetch('/api/students/tuition/faculties').then(r => r.json()).then(setFaculties);
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

    const loadData = () => {
        if (!selectedSemesterId) return;
        setLoading(true);
        const params = new URLSearchParams();
        params.append("semesterId", selectedSemesterId);
        if (selectedFacultyId) params.append("facultyId", selectedFacultyId);
        if (selectedMajorId) params.append("majorId", selectedMajorId);
        if (selectedClassId) params.append("classId", selectedClassId);
        params.append("page", "1");
        params.append("limit", "1000");

        fetch(`/api/students/tuition/list?${params.toString()}`)
            .then(r => r.json())
            .then(res => setStudents(res.items || []))
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadData(); }, [selectedSemesterId, selectedFacultyId, selectedMajorId, selectedClassId]);

    const handleSavePayment = async () => {
        if (!selectedStudent || isSaving) return;
        setIsSaving(true);
        
        const enrollmentIds = Object.keys(pendingChanges).filter(id => pendingChanges[id] === 'PAID');
        const revertIds = Object.keys(pendingChanges).filter(id => pendingChanges[id] === 'REGISTERED');

        try {
            const reqs = [];
            if (enrollmentIds.length) reqs.push(fetch('/api/students/tuition/confirm-payment', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollmentIds, status: 'PAID' }) }));
            if (revertIds.length) reqs.push(fetch('/api/students/tuition/confirm-payment', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enrollmentIds: revertIds, status: 'REGISTERED' }) }));
            await Promise.all(reqs);
            
            setPendingChanges({});
            setSelectedStudent(null);
            loadData();
        } catch (e) {} finally { setIsSaving(false); }
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
        )}
    ];

    const { modalTotal, modalPaid, modalDebt } = useMemo(() => {
        if (!selectedStudent) return { modalTotal: 0, modalPaid: 0, modalDebt: 0 };
        const fee = selectedStudent.totalFee || 0;
        const paid = selectedStudent.enrollments.reduce((sum: number, e: any) => {
            const s = pendingChanges[e.id] || e.status;
            return sum + (s === 'PAID' ? e.fee : 0);
        }, 0);
        return { modalTotal: fee, modalPaid: paid, modalDebt: fee - paid };
    }, [selectedStudent, pendingChanges]);

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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3 uppercase">
                        Đối soát <span className="text-blue-600">Tài chính sinh viên</span>
                    </h1>
                    <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Nghiệp vụ thu học phí & lệ phí cố định</p>
                </div>
                <div className="flex items-center gap-4">
                    <select 
                        value={selectedSemesterId}
                        onChange={e => setSelectedSemesterId(e.target.value)}
                        className="bg-white border border-slate-200 text-xs font-bold text-slate-700 px-4 py-2.5 rounded-xl outline-none shadow-sm"
                    >
                        {activeSemesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
                    </select>
                    <button className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-[11px] uppercase tracking-widest font-black rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors">
                        <CreditCard size={14} /> Phiếu Thu / Báo Cáo
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
            {loading ? (
                <div className="p-20 text-center font-bold text-slate-400">Đang tải biểu mẫu dữ liệu...</div>
            ) : (
                <DataTable 
                    data={students}
                    columns={columns}
                    searchKey="studentCode"
                    searchPlaceholder="Tìm mã sinh viên..."
                    pageSize={15}
                    onRowClick={setSelectedStudent}
                    toolbar={
                        <div className="flex gap-2">
                            <select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px]">
                                <option value="">Khoa / Viện</option>
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select value={selectedMajorId} onChange={e => setSelectedMajorId(e.target.value)} disabled={!selectedFacultyId} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px] disabled:opacity-50">
                                <option value="">Ngành</option>
                                {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} disabled={!selectedMajorId} className="bg-slate-50 border-none text-[11px] font-black uppercase tracking-widest text-slate-600 rounded-xl px-4 py-3 outline-none hover:bg-slate-100 transition-colors cursor-pointer w-[120px] disabled:opacity-50">
                                <option value="">Lớp học</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    }
                />
            )}

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
                            <button onClick={() => { setSelectedStudent(null); setPendingChanges({}); }} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm border border-slate-100"><X size={20} /></button>
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
                                                    <td className="py-4 px-5 text-right font-black text-slate-800 text-[13px]">{e.fee.toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="px-8 py-5 bg-white border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> Chọn các khoản phí để hệ thống đối soát
                            </span>
                            <div className="flex gap-4">
                                <button onClick={() => { setSelectedStudent(null); setPendingChanges({}); }} className="px-6 py-2.5 rounded-xl font-black text-slate-500 text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">Đóng</button>
                                <button 
                                    disabled={Object.keys(pendingChanges).length === 0 || isSaving}
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
        </div>
    );
}
