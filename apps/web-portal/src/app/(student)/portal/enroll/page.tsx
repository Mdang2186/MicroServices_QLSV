"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import Cookies from "js-cookie";
import { BookOpen, AlertCircle, ChevronRight, Layers, X, Plus, ArrowRightLeft, Check, Search, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface CourseClass {
    id: string; code: string; maxSlots: number; currentSlots: number; status: 'OPEN' | 'LOCKED' | 'CLOSED';
    subject: { id: string; code: string; name: string; credits: number };
    lecturer?: { fullName: string };
    adminClasses: { code: string }[];
    schedules: { dayOfWeek: number; startShift: number; endShift: number; room?: { name: string } }[];
}
interface Enrollment { id: string; tuitionFee: number; courseClass: CourseClass; }
interface Semester { id: string; name: string; year: string; isCurrent: boolean; isRegistering: boolean; }

// --- Reusable Slim UI Components ---
const Table = ({ headers, children, footer }: any) => (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden text-[11px] font-medium text-gray-700">
        <table className="w-full border-collapse">
            <thead className="bg-[#f8f9fa] text-gray-500 font-bold uppercase border-b italic">
                <tr>{headers.map((h: string, i: number) => <th key={i} className="px-4 py-3 border text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y">{children}</tbody>
            {footer && <tfoot className="bg-blue-50/20 border-t-2">{footer}</tfoot>}
        </table>
    </div>
);

const Schedule = ({ list }: { list: any[] }) => (
    <div className="flex flex-col gap-0.5 text-[10px] text-gray-400">
        {list.map((s, i) => <span key={i}>T{s.dayOfWeek}({s.startShift}-{s.endShift}) {s.room?.name}</span>)}
    </div>
);

export default function EnrollPage() {
    const [studentId, setStudentId] = useState("");
    const [sems, setSems] = useState<Semester[]>([]);
    const [semId, setSemId] = useState("");
    const [status, setStatus] = useState<any[]>([]);
    const [enrolls, setEnrolls] = useState<Enrollment[]>([]);
    const [selSub, setSelSub] = useState<any>(null);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [swTarget, setSwTarget] = useState<Enrollment | null>(null);
    const [swClasses, setSwClasses] = useState<CourseClass[]>([]);
    const [load, setLoad] = useState(false);
    const [reg, setReg] = useState("");
    const [msg, setMsg] = useState<any>(null);

    // Deduplicate enrollments by subjectId so we don't show or sum the same subject multiple times
    const uniqueEnrolls = useMemo(() => {
        const grouped: Record<string, Enrollment> = {};
        enrolls.forEach(e => {
            const sid = e.courseClass.subject.id;
            // Always prefer the PAID one if multiple exist, else just take the first
            if (!grouped[sid] || e.status === "PAID") {
                grouped[sid] = e;
            }
        });
        return Object.values(grouped);
    }, [enrolls]);

    const totals = useMemo(() => ({
        cr: uniqueEnrolls.reduce((s, e) => s + (e.courseClass?.subject?.credits || 0), 0),
        fee: uniqueEnrolls.reduce((s, e) => s + Number(e.tuitionFee || 0), 0)
    }), [uniqueEnrolls]);

    useEffect(() => {
        const u = JSON.parse(localStorage.getItem("student_user") || Cookies.get("student_user") || "{}");
        if (u.id || u.profileId) setStudentId(u.profileId || u.id);
    }, []);

    useEffect(() => {
        if (studentId) api.get("/api/enrollments/semesters").then(r => {
            setSems(r.data);
            const a = r.data.find((s: any) => s.isRegistering) || r.data.find((s: any) => s.isCurrent) || r.data[0];
            if (a) setSemId(a.id);
        });
    }, [studentId]);

    const refresh = async () => {
        if (!studentId || !semId) return;
        const [a, b] = await Promise.all([
            api.get(`/api/enrollments/registration-status/${studentId}?semesterId=${semId}`),
            api.get(`/api/enrollments/student/${studentId}?semesterId=${semId}`)
        ]);
        setStatus(a.data); setEnrolls(b.data);
    };

    useEffect(() => { refresh(); }, [studentId, semId]);

    const handle = async (cid: string, isSw = false) => {
        setReg(cid);
        try {
            if (isSw && swTarget) {
                await api.post("/api/enrollments/switch", { studentId, oldClassId: swTarget.courseClass.id, newClassId: cid });
                setSwTarget(null);
            } else {
                await api.post("/api/enrollments", { studentId, classId: cid });
                setSelSub(null);
            }
            setMsg({ type: 'success', text: "Thao tác thành công!" }); refresh();
        } catch (e: any) { setMsg({ type: 'error', text: e.response?.data?.message || "Thất bại" }); }
        setReg("");
    };

    const isBlk = !sems.find(s => s.id === semId)?.isRegistering;

    return (
        <div className="min-h-screen bg-gray-50 pb-10 font-sans p-6 space-y-6">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-5 rounded-2xl border shadow-sm">
                <div>
                    <h1 className="text-xl font-black text-[#003366] uppercase tracking-tighter">Đăng ký học phần</h1>
                    <p className="text-[10px] text-gray-400 font-bold italic uppercase tracking-widest">Portal UNETI - Hệ thống đồng bộ (Optimized)</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <select className="bg-gray-50 border rounded-lg px-3 py-1.5 font-black text-[#003366] outline-none" value={semId} onChange={(e) => setSemId(e.target.value)}>
                        {sems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year}) {s.isRegistering ? "• ĐANG MỞ" : "• ĐÓNG"}</option>)}
                    </select>
                    {isBlk && <div className="text-[10px] font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase border border-amber-200 shadow-sm animate-pulse">Chỉ xem & đổi lịch (Đã khóa đăng ký mới)</div>}
                </div>
            </div>

            {msg && <div className={`p-4 rounded-xl font-bold flex justify-between border-l-8 shadow-sm ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-red-50 text-red-800 border-red-500'}`}>{msg.text}<X className="w-5 h-5 cursor-pointer opacity-30" onClick={() => setMsg(null)} /></div>}

            <Table headers={["STT", "Học phần/Mã HP", "Tín chỉ", "Bắt buộc", "Đăng ký"]}>
                {status.map((it, i) => (
                    <tr key={it.subjectId} className={`hover:bg-blue-50/40 ${selSub?.subjectId === it.subjectId ? "bg-blue-50/60" : ""}`}>
                        <td className="p-3 text-center border text-gray-400 w-12">{i + 1}</td>
                        <td className="p-3 border">
                            <div className="font-black text-blue-900">{it.subjectName}</div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase">{it.subjectCode} {it.isEnrolled && <span className="bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm text-[8px] ml-2">ĐÃ ĐK</span>}</div>
                        </td>
                        <td className="p-3 border text-center font-black w-20">{it.credits}</td>
                        <td className="p-3 border text-center w-20">{it.isMandatory ? <Check className="w-4 h-4 text-emerald-500 mx-auto" /> : "—"}</td>
                        <td className="p-3 border text-center w-24">
                            {!it.isEnrolled && !isBlk && <button onClick={() => { setSelSub(it); setLoad(true); api.get(`/api/enrollments/subject/${it.subjectId}/classes?semesterId=${semId}`).then(r => { setClasses(r.data); setLoad(false); }); }} className="bg-blue-600 text-white rounded-full p-1.5 shadow-lg active:scale-95"><Plus className="w-5 h-5" /></button>}
                        </td>
                    </tr>
                ))}
            </Table>

            <AnimatePresence>
                {selSub && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-2xl">
                        <div className="bg-white rounded-xl overflow-hidden">
                            <div className="bg-[#003366] px-5 py-3 flex text-white font-black text-xs uppercase italic tracking-widest justify-between"><div className="flex gap-2"><Search className="w-4 h-4" /> Lớp học phần khả dụng: {selSub.subjectName}</div><X className="w-5 h-5 cursor-pointer" onClick={() => setSelSub(null)} /></div>
                            <Table headers={["Lớp HP", "Lớp dự kiến", "Giảng viên", "Sĩ số", "Lịch học", "Thao tác"]}>
                                {classes.map(c => (
                                    <tr key={c.id} className="hover:bg-emerald-50/40">
                                        <td className="p-3 border font-black text-blue-900">{c.code}</td>
                                        <td className="p-3 border italic text-gray-400">{c.adminClasses.map(ac => ac.code).join(", ")}</td>
                                        <td className="p-3 border">{c.lecturer?.fullName || "—"}</td>
                                        <td className="p-3 border text-center"><span className={c.currentSlots >= c.maxSlots ? "text-red-500" : "text-emerald-700 font-bold"}>{c.currentSlots}/{c.maxSlots}</span></td>
                                        <td className="p-3 border"><Schedule list={c.schedules} /></td>
                                        <td className="p-3 border"><button disabled={reg === c.id || c.currentSlots >= c.maxSlots} onClick={() => handle(c.id)} className="w-full bg-emerald-600 text-white py-1.5 rounded-lg px-4 font-black text-[10px] uppercase shadow-sm active:scale-95">Đăng ký</button></td>
                                    </tr>
                                ))}
                            </Table>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <Table headers={["Mã lớp", "Môn học đã đăng ký", "TC", "Học phí", "Lịch học", "Đổi lịch"]} footer={<tr className="font-black text-blue-900 h-14 uppercase text-sm italic"><td colSpan={2} className="px-5 text-right tracking-widest">Tổng kết đăng ký</td><td className="text-center text-xl bg-white/50">{totals.cr}</td><td className="px-5 text-right text-emerald-700 bg-emerald-50">{totals.fee.toLocaleString()} đ</td><td colSpan={2}></td></tr>}>
                {uniqueEnrolls.map((e: any) => (
                    <tr key={e.id} className="hover:bg-gray-100 transition-colors">
                        <td className="p-3 border font-black text-[#003366] bg-gray-50/30">{e.courseClass.code}</td>
                        <td className="p-3 border">
                            <div className="font-black italic uppercase leading-tight text-gray-800">{e.courseClass.subject.name}</div>
                            <div className="text-[9px] text-gray-400 font-black italic tracking-tighter">Dự kiến: {e.courseClass.adminClasses.map(ac => ac.code).join(", ")}</div>
                        </td>
                        <td className="p-3 border text-center font-black text-gray-600">{e.courseClass.subject.credits}</td>
                        <td className="p-3 border text-right font-black text-emerald-600">{(Number(e.tuitionFee)).toLocaleString()}</td>
                        <td className="p-3 border"><Schedule list={e.courseClass.schedules} /></td>
                        <td className="p-3 border text-center"><button onClick={() => { setSwTarget(e); api.get(`/api/enrollments/subject/${e.courseClass.subject.id}/classes?semesterId=${semId}`).then(r => setSwClasses(r.data.filter((x: any) => x.id !== e.courseClass.id))); }} className="p-2.5 bg-amber-50 rounded-full text-amber-600 shadow-sm border border-amber-100 active:rotate-180 transition-all"><ArrowRightLeft className="w-4 h-4" /></button></td>
                    </tr>
                ))}
            </Table>

            <AnimatePresence>
                {swTarget && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-[#003366]/40 backdrop-blur-md" onClick={() => setSwTarget(null)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-5xl rounded-3xl shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-[#003366] p-6 flex justify-between text-white items-center"><div className="space-y-1"><h2 className="font-black text-sm uppercase italic tracking-widest">Trung tâm điều chuyển lịch học</h2><p className="text-[9px] font-bold text-gray-300 uppercase leading-none">Phân tích chéo dữ liệu danh nghĩa & học phần</p></div><X className="w-6 h-6 cursor-pointer" onClick={() => setSwTarget(null)} /></div>
                            <div className="p-4 bg-gray-50 flex gap-4 text-[10px] font-black uppercase text-blue-900 border-b shadow-inner italic"><div>Môn: {swTarget.courseClass.subject.name}</div><div className="h-4 w-px bg-gray-300" /><div>Hiện tại: <span className="bg-[#003366] text-white px-2 py-0.5 rounded ml-1">{swTarget.courseClass.code}</span></div></div>
                            <div className="p-6 overflow-y-auto"><Table headers={["Thao tác", "Mã lớp HP", "Lớp dự kiến", "Giảng viên", "Sĩ số", "Lịch học chi tiết"]}>{swClasses.map(c => (
                                <tr key={c.id} className="hover:bg-blue-50/40">
                                    <td className="p-3 border w-24 align-middle"><button onClick={() => handle(c.id, true)} disabled={reg === c.id || c.status !== 'OPEN'} className={`w-full py-2 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm transition-all ${c.status === 'OPEN' ? 'bg-[#003366] text-white hover:bg-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{c.status === 'OPEN' ? "Đổi" : "Bị khóa"}</button></td>
                                    <td className="p-3 border font-black text-blue-900 bg-gray-50/10 text-center">{c.code}</td>
                                    <td className="p-3 border italic font-black text-gray-300">{c.adminClasses.map(ac => ac.code).join(", ")}</td>
                                    <td className="p-3 border font-black uppercase">{c.lecturer?.fullName || "—"}</td>
                                    <td className="p-3 border text-center font-bold tracking-widest">{c.currentSlots}/{c.maxSlots}</td>
                                    <td className="p-3 border"><Schedule list={c.schedules} /></td>
                                </tr>
                            ))}</Table></div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
