"use client";

import { useState, useEffect, useMemo } from "react";
import api from "@/lib/api";
import { 
    BookOpen, 
    AlertCircle, 
    ChevronRight, 
    Layers, 
    X, 
    Plus, 
    ArrowRightLeft, 
    Check, 
    Search, 
    Info, 
    Lock,
    MoreVertical,
    Calendar,
    Trash2,
    Eye
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getStudentProfileId, getStudentUserId, readStudentSessionUser } from "@/lib/student-session";
import { Button } from "@/components/ui/button";

// --- Types ---
interface CourseClass {
    id: string; 
    code: string; 
    maxSlots: number; 
    currentSlots: number; 
    status: 'OPEN' | 'LOCKED' | 'CLOSED';
    subject: { id: string; code: string; name: string; credits: number };
    lecturer?: { fullName: string };
    adminClasses: { code: string }[];
    schedules: { dayOfWeek: number; startShift: number; endShift: number; room?: { name: string } }[];
}

interface Enrollment { 
    id: string; 
    tuitionFee: number; 
    status?: string; 
    registeredAt: string;
    courseClass: CourseClass; 
}

interface Semester { 
    id: string; 
    name: string; 
    year: string; 
    isCurrent: boolean; 
    isRegistering: boolean; 
    code?: string; 
}

interface WaitlistSubject {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    isRequired: boolean;
    isEnrolled: boolean;
    isEligible: boolean;
    missingPrereqs: string[];
}

// --- Reusable UI Components ---
const SlimTable = ({ headers, children, footer }: any) => (
    <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden text-[11px] font-medium text-slate-700">
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead className="bg-slate-50/80 text-blue-900/60 font-black uppercase text-[10px] tracking-widest border-b border-slate-200">
                    <tr>{headers.map((h: string, i: number) => <th key={i} className="px-5 py-4 text-left font-black">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">{children}</tbody>
                {footer && <tfoot className="bg-blue-50/20 border-t-2 border-blue-100">{footer}</tfoot>}
            </table>
        </div>
    </div>
);

const Schedule = ({ list }: { list: any[] }) => (
    <div className="flex flex-col gap-1 text-[10px] font-bold text-slate-400 leading-tight">
        {list.map((s, i) => <span key={i}>T{s.dayOfWeek}({s.startShift}-{s.endShift}) - {s.room?.name || '---'}</span>)}
    </div>
);

export default function EnrollPage() {
    const [studentId, setStudentId] = useState("");
    const [sems, setSems] = useState<Semester[]>([]);
    const [semId, setSemId] = useState("");
    const [waitlist, setWaitlist] = useState<WaitlistSubject[]>([]);
    const [enrolls, setEnrolls] = useState<Enrollment[]>([]);
    const [selSub, setSelSub] = useState<any>(null);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [loadClasses, setLoadClasses] = useState(false);
    const [regId, setRegId] = useState("");
    const [msg, setMsg] = useState<any>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Deduplicate enrollments by subjectId
    const uniqueEnrolls = useMemo(() => {
        const grouped: Record<string, Enrollment> = {};
        enrolls.forEach(e => {
            const sid = e.courseClass.subject.id;
            if (!grouped[sid]) grouped[sid] = e;
        });
        return Object.values(grouped);
    }, [enrolls]);

    const totals = useMemo(() => ({
        cr: uniqueEnrolls.reduce((s, e) => s + (e.courseClass?.subject?.credits || 0), 0),
        fee: uniqueEnrolls.reduce((s, e) => s + Number(e.tuitionFee || 0), 0)
    }), [uniqueEnrolls]);

    useEffect(() => {
        const resolve = async () => {
            const user = readStudentSessionUser();
            const sid = getStudentProfileId(user) || (await api.get(`/api/students/user/${getStudentUserId(user)}`)).data?.id;
            if (sid) setStudentId(sid);
        };
        resolve();
    }, []);

    useEffect(() => {
        if (!studentId) return;
        api.get(`/api/enrollments/semesters/student/${studentId}`).then(r => {
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
        setWaitlist(a.data); setEnrolls(b.data);
    };

    useEffect(() => { refresh(); }, [studentId, semId]);

    const handleEnroll = async (cid: string) => {
        setRegId(cid);
        try {
            await api.post("/api/enrollments", { studentId, classId: cid });
            setMsg({ type: 'success', text: "Đăng ký thành công!" });
            setSelSub(null);
            refresh();
        } catch (e: any) {
            setMsg({ type: 'error', text: e.response?.data?.message || "Thất bại" });
        }
        setRegId("");
    };

    const handleDrop = async (enrollId: string) => {
        if (!confirm("Bạn có chắc chắn muốn hủy đăng ký lớp này?")) return;
        try {
            await api.delete(`/api/enrollments/${enrollId}`);
            setMsg({ type: 'success', text: "Đã hủy đăng ký thành công!" });
            refresh();
        } catch (e: any) {
            setMsg({ type: 'error', text: e.response?.data?.message || "Lỗi khi hủy" });
        }
    };

    const isLocked = !sems.find(s => s.id === semId)?.isRegistering;

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20 p-6 md:p-8 space-y-8 font-sans">
            {/* Page Header */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 ring-4 ring-blue-50">
                        <BookOpen className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Đăng ký học phần</h1>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest italic flex items-center gap-2">
                             Portal UNETI - Hệ thống Điều phối Đào tạo
                             {isLocked && <span className="text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full ring-1 ring-amber-200 font-black ml-2 shadow-sm animate-pulse">Đã khóa cổng đăng ký mới</span>}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                    <select className="bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2 font-black text-slate-700 outline-none hover:border-blue-300 transition-colors cursor-pointer text-sm shadow-sm" value={semId} onChange={(e) => setSemId(e.target.value)}>
                        {sems.map(s => <option key={s.id} value={s.id}>{s.name} ({s.year}) {s.isRegistering ? '• Đang mở ĐK' : ''}</option>)}
                    </select>
                    {sems.length > 0 && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase italic">Hiển thị {sems.length} học kỳ thuộc khóa của bạn</p>
                    )}
                </div>
            </div>

            {msg && (
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={`p-5 rounded-2xl font-bold flex justify-between items-center border-l-8 shadow-xl ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-500' : 'bg-red-50 text-red-800 border-red-500'}`}>
                    <div className="flex items-center gap-3">
                        {msg.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                        {msg.text}
                    </div>
                    <X className="w-5 h-5 cursor-pointer opacity-30 hover:opacity-100" onClick={() => setMsg(null)} />
                </motion.div>
            )}

            {/* SECTION 1: WAITLIST */}
            <div className="space-y-4">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Layers className="h-4 w-4" /> Môn học / Học phần đang chờ đăng ký
                </h2>
                <SlimTable headers={["STT", "Mã Học phần", "Tên môn học", "TC", "Bắt buộc", "Học phần: HP Trước, Tiên quyết, Song hành", "Đăng ký"]}>
                    {waitlist.length > 0 ? waitlist.map((it, i) => (
                        <tr key={it.subjectId} className={`hover:bg-blue-50/40 transition-colors ${it.isEnrolled ? 'bg-slate-50/50' : ''}`}>
                            <td className="px-5 py-5 text-center text-slate-400 font-bold border-r border-slate-100 w-16">{i + 1}</td>
                            <td className="px-5 py-5 text-slate-500 font-mono font-bold uppercase text-[10px] tracking-tighter">{it.subjectCode}</td>
                            <td className="px-5 py-5">
                                <div className="font-black text-slate-800">{it.subjectName}</div>
                                {it.isEnrolled && <span className="bg-blue-600 text-white px-2 py-0.5 rounded shadow-sm text-[8px] font-black uppercase mt-1 inline-block">ĐÃ ĐK</span>}
                            </td>
                            <td className="px-5 py-5 text-center font-black text-slate-600 text-sm">{it.credits}</td>
                            <td className="px-5 py-5 text-center">
                                {it.isRequired ? <AlertCircle className="w-4 h-4 text-blue-400 mx-auto" /> : <div className="text-slate-200">---</div>}
                            </td>
                            <td className="px-5 py-5 text-[10px] font-bold text-slate-400 italic">
                                {it.missingPrereqs.length > 0 ? (
                                    <span className="text-red-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Tiên quyết: {it.missingPrereqs.join(", ")}</span>
                                ) : "Sẵn sàng"}
                            </td>
                            <td className="px-5 py-5 text-center">
                                {!it.isEnrolled && !isLocked && (
                                    <Button 
                                        disabled={!it.isEligible}
                                        onClick={() => { 
                                            setSelSub(it); 
                                            setLoadClasses(true); 
                                            api.get(`/api/enrollments/subject/${it.subjectId}/classes?semesterId=${semId}`)
                                               .then(r => { setClasses(r.data); setLoadClasses(false); }); 
                                        }} 
                                        className="h-9 w-9 p-0 rounded-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 ring-2 ring-white active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        <Plus className="w-5 h-5 text-white" />
                                    </Button>
                                )}
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-400 italic font-medium bg-slate-50/30">Không có học phần nào trong danh sách chờ đăng ký.</td></tr>
                    )}
                </SlimTable>
            </div>

            {/* CLASS SELECTION MODAL */}
            <AnimatePresence>
                {selSub && (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelSub(null)} />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-white w-full max-w-6xl rounded-[3rem] shadow-3xl relative overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="bg-blue-600 px-10 py-8 flex justify-between items-center text-white">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 mb-1">Dành cho học phần:</p>
                                    <h2 className="text-2xl font-black uppercase tracking-tight">{selSub.subjectName}</h2>
                                    <div className="flex gap-4 mt-2">
                                        <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase italic border border-white/10">{selSub.subjectCode}</span>
                                        <span className="text-[10px] font-black bg-white/20 px-3 py-1 rounded-full uppercase italic border border-white/10">{selSub.credits} Tín chỉ</span>
                                    </div>
                                </div>
                                <Button variant="ghost" className="h-10 w-10 p-0 rounded-full hover:bg-white/10 text-white" onClick={() => setSelSub(null)}><X className="w-6 h-6" /></Button>
                            </div>
                            
                            <div className="p-8 overflow-y-auto">
                                <SlimTable headers={["Lớp HP", "Lớp dự kiến", "Giảng viên", "Sĩ số", "Lịch học", "Đăng ký"]}>
                                    {loadClasses ? (
                                         <tr><td colSpan={6} className="h-32 text-center text-slate-400 font-bold">Đang tải danh sách lớp...</td></tr>
                                    ) : classes.length > 0 ? classes.map(c => {
                                        const isFull = c.currentSlots >= (c.maxSlots || 80);
                                        const isClipped = c.status !== 'OPEN';
                                        return (
                                            <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-5 py-4 font-black text-blue-900 border-r border-slate-100">{c.code}</td>
                                                <td className="px-5 py-4 italic text-slate-400 text-[10px]">{c.adminClasses.map(ac => ac.code).join(", ")}</td>
                                                <td className="px-5 py-4 font-bold text-slate-700">{c.lecturer?.fullName || "Chưa phân công"}</td>
                                                <td className="px-5 py-4 text-center">
                                                    <span className={`text-xs font-black ${isFull ? 'text-red-500' : 'text-emerald-600'}`}>
                                                        {c.currentSlots}/{c.maxSlots || 80}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4"><Schedule list={c.schedules} /></td>
                                                <td className="px-5 py-4 text-center">
                                                    {isClipped ? (
                                                        <div className="text-[10px] font-black text-slate-300 uppercase italic">Đã khóa</div>
                                                    ) : isFull ? (
                                                        <div className="text-[10px] font-black text-red-400 uppercase italic">Hết chỗ</div>
                                                    ) : (
                                                        <Button disabled={regId === c.id} onClick={() => handleEnroll(c.id)} className="h-9 px-6 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100">Chọn lớp</Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    }) : (
                                        <tr><td colSpan={6} className="h-32 text-center text-slate-400 font-bold">Hiện không có lớp học phần nào đang mở cho môn này.</td></tr>
                                    )}
                                </SlimTable>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* SECTION 2: REGISTERED */}
            <div className="space-y-4 pt-10 border-t-4 border-slate-100">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Lớp học phần đã đăng ký trong học kỳ này
                </h2>
                <SlimTable 
                    headers={["Thao tác", "STT", "Mã lớp HP", "Tên môn học/HP", "Lớp dự kiến", "TC", "Học phí", "Hạn nộp", "Thu", "Trạng thái ĐK", "Ngày ĐK", "TT Lớp HP"]}
                    footer={
                        <tr className="font-black text-blue-900 transition-colors h-16">
                            <td colSpan={5} className="px-10 text-right tracking-widest text-sm uppercase italic">Tổng số tín chỉ và học phí tạm tính:</td>
                            <td className="px-5 text-center text-xl bg-white/50">{totals.cr}</td>
                            <td className="px-5 text-right text-emerald-700 bg-emerald-50/50 text-base">{totals.fee.toLocaleString()} đ</td>
                            <td colSpan={5} className="bg-slate-50/30"></td>
                        </tr>
                    }
                >
                    {uniqueEnrolls.length > 0 ? uniqueEnrolls.map((e, i) => (
                        <tr key={e.id} className="hover:bg-slate-50 transition-colors border-l-4 border-l-emerald-500">
                            <td className="px-5 py-4 w-16 text-center relative">
                                <Button variant="ghost" className="h-8 w-8 p-0 rounded-full hover:bg-slate-200" onClick={() => setActiveMenu(activeMenu === e.id ? null : e.id)}>
                                    <MoreVertical className="w-4 h-4 text-slate-500" />
                                </Button>
                                {activeMenu === e.id && (
                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2 flex flex-col gap-1 w-40 min-w-max ring-4 ring-slate-100">
                                        <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors" onClick={() => { setActiveMenu(null); alert("Xem lịch chi tiết..."); }}>
                                            <Calendar className="w-3.5 h-3.5" /> Xem lịch học
                                        </button>
                                        <button className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-50 rounded-xl transition-colors" onClick={() => { setActiveMenu(null); handleDrop(e.id); }}>
                                            <Trash2 className="w-3.5 h-3.5" /> Hủy đăng ký
                                        </button>
                                    </motion.div>
                                )}
                            </td>
                            <td className="px-5 py-4 text-center font-bold text-slate-400">{i + 1}</td>
                            <td className="px-5 py-4 font-black text-blue-900/40 uppercase text-[10px]">{e.courseClass.code}</td>
                            <td className="px-5 py-4 font-black text-slate-700 text-xs">{e.courseClass.subject.name}</td>
                            <td className="px-5 py-4 italic text-slate-400 text-[10px]">{e.courseClass.adminClasses.map((ac: any) => ac.code).join(", ")}</td>
                            <td className="px-5 py-4 text-center font-black text-slate-600">{e.courseClass.subject.credits}</td>
                            <td className="px-5 py-4 text-right font-black text-emerald-600 italic">{(Number(e.tuitionFee)).toLocaleString()} đ</td>
                            <td className="px-5 py-4 text-center text-[9px] font-bold text-slate-400 uppercase italic">--/--/--</td>
                            <td className="px-5 py-4 text-center text-emerald-500"><Check className="w-4 h-4 mx-auto opacity-50" /></td>
                            <td className="px-5 py-4 text-center"><span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase italic ring-1 ring-blue-100 shadow-sm">Đăng ký mới</span></td>
                            <td className="px-5 py-4 text-center text-[10px] font-bold text-slate-500 italic">{new Date(e.registeredAt).toLocaleDateString()}</td>
                            <td className="px-5 py-4 text-center"><span className="text-[10px] font-bold text-slate-400 italic">Mở</span></td>
                        </tr>
                    )) : (
                        <tr><td colSpan={12} className="px-5 py-12 text-center text-slate-400 italic font-medium bg-slate-50/10">Bạn chưa đăng ký lớp học phần nào trong học kỳ này.</td></tr>
                    )}
                </SlimTable>
            </div>
        </div>
    );
}

function CheckCircle2(props: any) {
    return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
}
