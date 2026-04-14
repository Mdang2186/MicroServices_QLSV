"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import {
    ClipboardList, Search, Filter, Calendar, Users, BookOpen,
    Building, ChevronRight, ChevronLeft, Plus, RefreshCw,
    CheckCircle2, AlertCircle, XCircle, Clock, MapPin,
    FileText, LayoutGrid, ShieldAlert, UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";

// ===== Types =====
interface ExamEntry {
    courseClassId: string;
    courseClass?: {
        code: string;
        subject?: { name: string; credits: number; examType: string; examDuration: number };
        lecturer?: { fullName: string };
        semester?: { name: string };
        adminClasses?: { code: string }[];
    };
    eligibleCount: number;
    totalEnrolled: number;
    hasExamSchedule: boolean;
    examDate?: string;
    examRoom?: string;
    examShift?: string;
    status: "PENDING" | "SCHEDULED" | "DONE";
}

interface ResitEntry {
    studentId: string;
    student?: { fullName: string; studentCode: string };
    courseClassId: string;
    subjectName: string;
    credits: number;
    finalScore1?: number;
    isAbsent: boolean;
    status: "RESIT_PENDING" | "RESIT_SCHEDULED";
}

// ===== MAIN PAGE =====
export default function StaffExamsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"schedule" | "rooms" | "resit">("schedule");
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState<any[]>([]);
    const [message, setMessage] = useState({ text: "", type: "" });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!selectedSemesterId) return;
        setLoading(true);
        fetch(`/api/courses?semesterId=${selectedSemesterId}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        })
            .then(r => r.ok ? r.json() : [])
            .then(data => setCourses(Array.isArray(data) ? data : data?.data || []))
            .finally(() => setLoading(false));
    }, [selectedSemesterId]);

    const filtered = courses.filter(c =>
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.subject?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Thống kê tổng quan
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((a: number, c: any) => a + (c.currentSlots || 0), 0);

    // ===== TAB CONTENT =====
    const tabConfig = [
        { id: "schedule", label: "Kế Hoạch Lịch Thi", icon: Calendar },
        { id: "rooms", label: "Phân Phòng Thi", icon: Building },
        { id: "resit", label: "Danh Sách Thi Lại", icon: ShieldAlert },
    ] as const;

    return (
        <div className="space-y-6 animate-in fade-in duration-700 bg-[#fbfcfd] min-h-screen pb-20 px-1 max-w-[1400px] mx-auto">
            {/* ===== TOP HEADER ===== */}
            <CompactLecturerHeader
                userName={`${user?.fullName || "Cán bộ Đào tạo"}`}
                userId={`CB-${user?.username || "UNETI"}`}
                minimal={true}
                title="Tổ Chức Kỳ Thi"
                onSemesterChange={setSelectedSemesterId}
            />

            {/* ===== STATS BAR ===== */}
            <div className="flex flex-wrap items-center gap-3 px-1">
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-600"><ClipboardList size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Lớp Học Phần</span>
                        <span className="text-sm font-black text-slate-800">{totalCourses} Lớp</span>
                    </div>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue"><Users size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Tổng SV Thi</span>
                        <span className="text-sm font-black text-slate-800">{totalStudents} SV</span>
                    </div>
                </div>
                <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><CheckCircle2 size={16} /></div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Học Kỳ</span>
                        <span className="text-sm font-black text-slate-800">{selectedSemesterId ? "Đã chọn" : "Chưa chọn"}</span>
                    </div>
                </div>

                {/* Search */}
                <div className="ml-auto w-full md:w-72 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input type="text" placeholder="Tìm lớp học phần, môn học..."
                        className="bg-white border border-slate-100 rounded-xl pl-10 pr-4 py-2.5 text-[11px] font-bold text-slate-700 w-full focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all outline-none shadow-sm"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
            </div>

            {/* ===== NOTIFICATION ===== */}
            <AnimatePresence>
                {message.text && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className={cn("mx-1 p-3 rounded-xl border flex items-center gap-3",
                            message.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" : "bg-rose-50 border-rose-100 text-rose-800")}>
                        {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        <p className="text-[10px] font-black uppercase tracking-wider">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ===== TABS ===== */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-slate-100 bg-slate-50/60">
                    {tabConfig.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                                activeTab === tab.id
                                    ? "border-uneti-blue text-uneti-blue bg-white"
                                    : "border-transparent text-slate-400 hover:text-slate-600"
                            )}>
                            <tab.icon size={15} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== TAB: KẾ HOẠCH LỊCH THI ===== */}
                {activeTab === "schedule" && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={16} className="text-uneti-blue" />
                                Kế Hoạch Thi Theo Học Kỳ ({filtered.length} Lớp Học Phần)
                            </h2>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">
                                {selectedSemesterId ? "Công thức: Điểm TK = TB Thường Kỳ × 40% + Điểm Thi × 60%" : ""}
                            </p>
                        </div>

                        {!selectedSemesterId ? (
                            <div className="py-24 flex flex-col items-center justify-center text-center">
                                <div className="p-8 rounded-full bg-slate-50 mb-6 border border-dashed border-slate-200">
                                    <Calendar size={48} className="text-slate-200" strokeWidth={1} />
                                </div>
                                <h3 className="text-sm font-black text-slate-600 uppercase tracking-tight">Chọn Học Kỳ</h3>
                                <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-widest">Vui lòng chọn học kỳ từ bộ lọc phía trên để hiển thị kế hoạch thi</p>
                            </div>
                        ) : loading ? (
                            <div className="py-20 flex justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-100 border-t-uneti-blue" /></div>
                        ) : (
                            <div className="space-y-3">
                                {filtered.map((c, i) => {
                                    const examType = c.subject?.examType || "TRAC_NGHIEM";
                                    const examDuration = c.subject?.examDuration || 90;
                                    const currentSlots = c.currentSlots || 0;
                                    const roomsNeeded = Math.ceil(currentSlots / 30); // 30 SV/phòng

                                    return (
                                        <motion.div key={c.id}
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            className="flex flex-col lg:flex-row items-start lg:items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-uneti-blue/30 hover:bg-slate-50/40 transition-all group">

                                            {/* Left: Course Info */}
                                            <div className="flex-1 min-w-0 space-y-1.5">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[9px] font-black text-uneti-blue bg-white px-2 py-0.5 rounded-md border border-uneti-blue/10 shadow-sm">{c.code}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                                                        {c.subject?.credits} TC • {(c.adminClasses || []).map((ac: any) => ac.code).join(", ")}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                                                        examType === "THUC_HANH"
                                                            ? "text-teal-600 bg-teal-50 border-teal-100"
                                                            : "text-indigo-600 bg-indigo-50 border-indigo-100"
                                                    )}>
                                                        {examType === "THUC_HANH" ? "Thi Thực Hành" : "Thi Tự Luận"}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{examDuration} phút</span>
                                                </div>
                                                <h3 className="font-bold text-slate-800 text-[13px] uppercase tracking-tight group-hover:text-uneti-blue transition-colors truncate">
                                                    {c.name || c.subject?.name}
                                                </h3>
                                                <div className="flex items-center gap-4 text-[9px] font-black text-slate-400 uppercase tracking-tight">
                                                    <span className="flex items-center gap-1"><Users size={10} />{currentSlots} SV đăng ký</span>
                                                    <span className="flex items-center gap-1 text-amber-600"><Building size={10} />Cần ~{roomsNeeded} phòng thi</span>
                                                    <span className="flex items-center gap-1"><Clock size={10} />GV: {c.lecturer?.fullName || "Chưa xác định"}</span>
                                                </div>
                                            </div>

                                            {/* Right: Actions */}
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button variant="outline" size="sm"
                                                    onClick={() => router.push(`/staff/grades/${c.id}`)}
                                                    className="h-9 px-4 rounded-xl border-slate-100 text-[10px] font-black uppercase text-uneti-blue hover:bg-blue-50 hover:border-blue-100 shadow-sm">
                                                    <FileText size={13} className="mr-1.5" /> Bảng Điểm
                                                </Button>
                                                <Button size="sm"
                                                    className="h-9 px-4 rounded-xl text-[10px] font-black uppercase text-white bg-rose-500 hover:bg-rose-600 shadow-sm shadow-rose-100">
                                                    <Calendar size={13} className="mr-1.5" /> Xếp Lịch Thi
                                                </Button>
                                            </div>
                                        </motion.div>
                                    );
                                })}

                                {filtered.length === 0 && (
                                    <div className="py-20 text-center">
                                        <BookOpen size={48} className="text-slate-200 mx-auto mb-4" strokeWidth={1} />
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Không có lớp học phần nào</p>
                                        <Button variant="ghost" onClick={() => setSearchQuery("")}
                                            className="mt-4 text-[10px] font-black text-uneti-blue uppercase">Đặt lại bộ lọc</Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ===== TAB: PHÂN PHÒNG THI ===== */}
                {activeTab === "rooms" && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <Building size={16} className="text-uneti-blue" />
                                Phân Phòng Thi Tự Động
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            {/* Rules Panel */}
                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5 space-y-3">
                                <h3 className="text-[10px] font-black text-indigo-800 uppercase tracking-widest flex items-center gap-2">
                                    <ShieldAlert size={14} /> Quy Tắc Phân Phòng UNETI
                                </h3>
                                <ul className="space-y-2 text-[10px] font-bold text-indigo-700">
                                    <li className="flex items-start gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0" />Thi Tự Luận → Dùng phòng lý thuyết (Theory Room)</li>
                                    <li className="flex items-start gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0" />Thi Thực Hành → Dùng phòng thực hành (Lab Room)</li>
                                    <li className="flex items-start gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0" />Tối đa 30 SV/phòng thi tự luận, 25 SV/phòng thực hành</li>
                                    <li className="flex items-start gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0" />Không thi 2 môn trong 1 ngày với cùng sinh viên (chống gian lận)</li>
                                    <li className="flex items-start gap-2"><ChevronRight size={12} className="mt-0.5 shrink-0" />Kiểm tra xung đột phòng / lịch tự động</li>
                                </ul>
                            </div>

                            {/* Action Panel */}
                            <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Tạo Lịch Thi Hàng Loạt</h3>
                                <div className="space-y-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngày Thi</label>
                                        <input type="date"
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-uneti-blue/10 outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ca thi</label>
                                        <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-[11px] font-bold text-slate-700 focus:ring-2 focus:ring-uneti-blue/10 outline-none bg-white">
                                            <option value="1">Ca 1: 7:00 - 9:00</option>
                                            <option value="2">Ca 2: 9:30 - 11:30</option>
                                            <option value="3">Ca 3: 13:00 - 15:00</option>
                                            <option value="4">Ca 4: 15:30 - 17:30</option>
                                        </select>
                                    </div>
                                    <Button className="w-full h-10 rounded-xl text-[10px] font-black uppercase bg-uneti-blue hover:bg-uneti-blue/90 text-white shadow-lg tracking-widest">
                                        <RefreshCw size={13} className="mr-2" /> Phân Phòng Tự Động
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Placeholder Table */}
                        <div className="bg-white border border-slate-100 rounded-2xl p-6">
                            <div className="py-16 flex flex-col items-center text-center">
                                <div className="p-6 rounded-full bg-slate-50 border border-dashed border-slate-200 mb-4">
                                    <Building size={40} className="text-slate-200" strokeWidth={1} />
                                </div>
                                <p className="text-sm font-black text-slate-400 uppercase tracking-wider">Chọn ngày thi và bấm Phân Phòng Tự Động</p>
                                <p className="text-[10px] text-slate-300 font-bold uppercase mt-2 max-w-sm tracking-widest leading-relaxed">Hệ thống sẽ tự động phân chia sinh viên vào các phòng theo capacity và loại thi</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* ===== TAB: THI LẠI ===== */}
                {activeTab === "resit" && (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert size={16} className="text-rose-500" />
                                Danh Sách Sinh Viên Thi Lại
                            </h2>
                        </div>

                        {/* Logic Info */}
                        <div className="grid md:grid-cols-3 gap-3">
                            {[
                                { label: "Vắng thi cuối kỳ", desc: "Điểm thi 1 = 0, xếp vào danh sách thi lại", color: "amber", icon: XCircle },
                                { label: "Điểm cuối kỳ < 5.0", desc: "TK1 không đạt, được thi lại lần 2 (examScore2)", color: "rose", icon: AlertCircle },
                                { label: "Thi lại vẫn < 5.0", desc: "Học lại học phần kỳ tiếp theo hoặc nợ tín chỉ", color: "purple", icon: ShieldAlert },
                            ].map((item, i) => (
                                <div key={i} className={cn(
                                    "p-4 rounded-xl border space-y-2",
                                    item.color === "amber" ? "bg-amber-50 border-amber-100" :
                                    item.color === "rose" ? "bg-rose-50 border-rose-100" : "bg-purple-50 border-purple-100"
                                )}>
                                    <div className={cn("flex items-center gap-2 font-black text-[10px] uppercase tracking-wider",
                                        item.color === "amber" ? "text-amber-700" :
                                        item.color === "rose" ? "text-rose-700" : "text-purple-700")}>
                                        <item.icon size={13} /> {item.label}
                                    </div>
                                    <p className={cn("text-[10px] font-bold",
                                        item.color === "amber" ? "text-amber-600" :
                                        item.color === "rose" ? "text-rose-600" : "text-purple-600")}>{item.desc}</p>
                                </div>
                            ))}
                        </div>

                        {/* Resit Table */}
                        <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
                            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wide">Danh Sách Thi Lại — {selectedSemesterId ? "Học kỳ đã chọn" : "Chưa chọn học kỳ"}</h3>
                                <Button size="sm" className="h-8 rounded-xl px-3 text-[9px] font-black uppercase bg-rose-500 hover:bg-rose-600 text-white">
                                    <Calendar size={12} className="mr-1.5" /> Xếp Lịch Thi Lại
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-[10px]">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-100">
                                            <th className="py-3 px-4 text-left font-black text-slate-400 uppercase tracking-widest">STT</th>
                                            <th className="py-3 px-4 text-left font-black text-slate-400 uppercase tracking-widest">Sinh viên</th>
                                            <th className="py-3 px-4 text-left font-black text-slate-400 uppercase tracking-widest">Môn học</th>
                                            <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">TC</th>
                                            <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">Điểm TK1</th>
                                            <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">Lý do</th>
                                            <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                                            <th className="py-3 px-4 text-center font-black text-slate-400 uppercase tracking-widest">Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Empty state */}
                                        <tr>
                                            <td colSpan={8} className="py-16 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <ShieldAlert size={40} className="text-slate-200" strokeWidth={1} />
                                                    <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                                                        {selectedSemesterId ? "Chưa có dữ liệu thi lại cho học kỳ này" : "Chọn học kỳ để xem danh sách thi lại"}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Credit Debt Info */}
                        <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-100 rounded-2xl p-5 space-y-2">
                            <h3 className="text-[10px] font-black text-purple-800 uppercase tracking-widest flex items-center gap-2">
                                <ShieldAlert size={13} /> Quy trình Học lại & Nợ Tín Chỉ
                            </h3>
                            <div className="text-[10px] font-bold text-purple-700 space-y-1">
                                <p>1. SV thi lại (examScore2) → Tính lại TK2 = TB TK × 40% + Điểm thi lại × 60%</p>
                                <p>2. Điểm cuối = max(TK1, TK2) — Ghi nhận điểm tốt hơn</p>
                                <p>3. Nếu max(TK1, TK2) &lt; 5.0 → SV phải đăng ký Học lại kỳ tiếp theo</p>
                                <p>4. Nếu không đăng ký → SV mang trạng thái "NỢ TÍN CHỈ" cho học phần đó</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
