"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import api from "@/lib/api";
import Cookies from "js-cookie";
import { Wallet, Check, AlertCircle } from "lucide-react";

export default function TuitionPage() {
    const [studentId, setStudentId] = useState("");
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSemId, setSelectedSemId] = useState("");
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [feeRecords, setFeeRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const u = JSON.parse(Cookies.get("student_user") || localStorage.getItem("student_user") || "{}");
        const sid = u.profileId || u.student?.id || u.id;
        if (sid) setStudentId(sid);
    }, []);

    useEffect(() => {
        if (!studentId) return;
        setLoading(true);
        // Step 1: Get all semesters to find the active one
        api.get("/api/enrollments/semesters").then(async (res) => {
            const sems = res.data;
            setSemesters(sems);
            
            // Find active/current semester
            const active = sems.find((s: any) => s.isRegistering) || sems.find((s: any) => s.isCurrent) || sems[0];
            if (active) setSelectedSemId(active.id);
            
            // Step 2: Fetch all data for this student
            const [feesData, enrollData] = await Promise.all([
                StudentService.getStudentFees(studentId),
                StudentService.getEnrollments(studentId)
            ]);
            setFeeRecords(feesData || []);
            setEnrollments(enrollData || []);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [studentId]);

    const currentSem = useMemo(() => semesters.find(s => s.id === selectedSemId), [semesters, selectedSemId]);

    const { items, totals, totalCredits } = useMemo(() => {
        if (!currentSem) return { items: [], totals: { total: 0, paid: 0, debt: 0 }, totalCredits: 0 };

        const semName = currentSem.name;
        
        // 1. Enrollments for SELECTED semester (deduplicated by subject)
        const semEnrs = enrollments.filter(e => e.courseClass?.semesterId === selectedSemId || e.courseClass?.semester?.name === semName);
        const subjectMap: Record<string, any> = {};
        semEnrs.forEach(e => {
            const sid = e.courseClass.subject.id;
            if (!subjectMap[sid] || e.status === "PAID") {
                subjectMap[sid] = {
                    id: e.id,
                    code: e.courseClass.subject.code,
                    name: e.courseClass.subject.name,
                    credits: e.courseClass.subject.credits,
                    amount: Number(e.tuitionFee || 0),
                    status: e.status,
                    type: 'TUITION'
                };
            }
        });

        // 2. Fixed Fees for SELECTED semester
        const hasSubjects = Object.keys(subjectMap).length > 0;
        const semFees = feeRecords.filter(f => f.semester === semName);
        
        const otherFees = semFees
            .filter(f => !hasSubjects || !f.name.includes("Học phí")) 
            .map(f => ({
                id: f.id,
                code: "—",
                name: f.name,
                credits: 0,
                amount: Number(f.totalAmount || f.finalAmount || 0),
                status: f.status,
                type: 'FIXED'
            }));

        const allItems = [...Object.values(subjectMap), ...otherFees];
        const total = allItems.reduce((acc, it) => acc + it.amount, 0);
        const paid = allItems.reduce((acc, it) => acc + (it.status === "PAID" ? it.amount : 0), 0);
        const totalCredits = Object.values(subjectMap).reduce((acc, it) => acc + (it.credits || 0), 0);
        
        return { items: allItems, totals: { total, paid, debt: total - paid }, totalCredits };
    }, [selectedSemId, currentSem, enrollments, feeRecords]);

    if (!studentId) return <div className="p-20 text-center font-bold text-red-500">Vui lòng đăng nhập lại.</div>;
    if (loading) return <div className="p-20 text-center flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-[#003366] border-t-transparent animate-spin rounded-full"></div><span className="font-bold text-[#003366] text-sm uppercase">Đang tải dữ liệu học phí...</span></div>;

    return (
        <div className="min-h-screen bg-[#f4f6f8] pb-20 font-sans">
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                
                {/* Simple Header */}
                <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Wallet className="w-6 h-6 text-[#003366]" />
                        <div>
                            <h1 className="text-xl font-black text-[#003366] uppercase tracking-tight">Tra cứu học phí</h1>
                            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">Hệ thống tài chính sinh viên - UNETI</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-md border border-slate-200 w-full md:w-auto">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest pl-2 hidden md:block">Học kỳ:</span>
                        <select 
                            value={selectedSemId} 
                            onChange={e => setSelectedSemId(e.target.value)}
                            className="bg-transparent border-none text-[13px] font-black text-[#003366] py-1.5 pl-2 pr-8 outline-none cursor-pointer w-full md:w-auto"
                        >
                            {semesters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year})</option>)}
                        </select>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tổng tín chỉ</div>
                        <div className="text-2xl font-black text-[#003366]">{totalCredits} TC</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Tổng tiền</div>
                        <div className="text-2xl font-black text-[#003366]">{totals.total.toLocaleString()} ₫</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm bg-emerald-50/20">
                        <div className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Đã nộp</div>
                        <div className="text-2xl font-black text-emerald-600">{totals.paid.toLocaleString()} ₫</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-rose-100 shadow-sm bg-rose-50/20">
                        <div className="text-[10px] text-rose-600 font-black uppercase tracking-widest mb-1">Số nợ hiện tại</div>
                        <div className="text-2xl font-black text-rose-600 font-mono italic">{totals.debt.toLocaleString()} ₫</div>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Left Panel: Table */}
                    <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-[#003366] px-5 py-3 text-white text-[11px] font-black uppercase tracking-widest">
                            Chi tiết học phí: {currentSem?.name}
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-[12px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr className="text-slate-500 font-black uppercase tracking-widest">
                                        <th className="px-5 py-3 w-10 text-center">STT</th>
                                        <th className="px-5 py-3 w-28 text-center">Mã HP</th>
                                        <th className="px-5 py-3 text-left">Nội dung thu phí</th>
                                        <th className="px-5 py-3 text-center w-20">TC</th>
                                        <th className="px-5 py-3 text-right w-32">Số tiền</th>
                                        <th className="px-5 py-3 text-center w-32">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-800">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400 font-bold italic text-[13px]">
                                                Không có dữ liệu học phí cho học kỳ này.
                                            </td>
                                        </tr>
                                    ) : items.map((it, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-5 py-3 text-center text-slate-400 font-black">{idx + 1}</td>
                                            <td className="px-5 py-3 text-center font-black text-[#003366]">{it.code}</td>
                                            <td className="px-5 py-3">
                                                <div className="font-bold text-[13px]">{it.name}</div>
                                                <div className="text-[10px] text-slate-500 font-medium italic mt-0.5">
                                                    {it.type === 'FIXED' ? 'Khoản phí cố định' : 'Phí học phần tín chỉ'}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3 text-center font-bold text-slate-600">{it.credits || "—"}</td>
                                            <td className="px-5 py-3 text-right font-black w-32">{it.amount.toLocaleString()}</td>
                                            <td className="px-5 py-3 text-center">
                                                {it.status === 'PAID' ? (
                                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-2 py-1 rounded-sm text-[10px] uppercase font-black tracking-widest"><Check className="w-3 h-3" strokeWidth={3} /> Đã đóng</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-1 rounded-sm border border-rose-100 text-[10px] uppercase font-black tracking-widest"><AlertCircle className="w-3 h-3" strokeWidth={3} /> Nợ phí</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Panel: Totals Details */}
                    <div className="w-full md:w-72 flex flex-col gap-4">
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4 sticky top-4">
                            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest border-b pb-2">Hành động Tài chính</h3>
                            
                            <div className="space-y-4 pt-2">
                                <button 
                                    disabled={totals.debt <= 0}
                                    className={`w-full font-black py-3 rounded-lg text-xs uppercase tracking-widest transition-all ${totals.debt > 0 ? "bg-[#003366] text-white hover:bg-opacity-90 shadow-lg shadow-blue-100" : "bg-slate-100 text-slate-400 cursor-not-allowed"}`}
                                >
                                    {totals.debt > 0 ? 'Thanh toán ngay' : 'Đã hoàn thành'}
                                </button>
                                
                                <button className="w-full bg-slate-50 text-slate-600 border border-slate-200 font-bold py-2.5 rounded-lg text-[11px] uppercase tracking-widest hover:bg-slate-100 transition-colors">
                                    Tải biên lai (PDF)
                                </button>
                            </div>

                            <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-3">
                                <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                                <span className="text-[10px] text-blue-700 font-medium leading-relaxed italic">
                                    Sinh viên cần hoàn thành học phí trước thời gian thi học kỳ để được tham gia dự thi (isEligibleForExam).
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
