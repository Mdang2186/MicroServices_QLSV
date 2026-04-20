import { useEffect, useState, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ChevronRight, Save, Search, AlertCircle, CheckCircle2,
    Lock, Bell, ShieldAlert, Info, RefreshCw, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ===== UTILITY FUNCTIONS =====

/** Tính điểm hệ 10 → hệ 4 */
function score10to4(s: number): number {
    if (s >= 8.5) return 4.0;
    if (s >= 7.8) return 3.5;
    if (s >= 7.0) return 3.0;
    if (s >= 6.3) return 2.5;
    if (s >= 5.5) return 2.0;
    if (s >= 4.8) return 1.5;
    if (s >= 4.0) return 1.0;
    return 0.0;
}

/** Tính điểm hệ 10 → điểm chữ */
function score10toLetter(s: number): string {
    if (s >= 8.5) return "A";
    if (s >= 7.8) return "B+";
    if (s >= 7.0) return "B";
    if (s >= 6.3) return "C+";
    if (s >= 5.5) return "C";
    if (s >= 4.8) return "D+";
    if (s >= 4.0) return "D";
    if (s >= 3.0) return "F+";
    return "F";
}

/** Điểm chữ → xếp loại */
function letterToRank(l: string): string {
    if (l === "A") return "Xuất sắc";
    if (l === "B+") return "Giỏi";
    if (l === "B") return "Khá";
    if (l === "C+") return "Khá TB";
    if (l === "C") return "Trung bình";
    if (l === "D+" || l === "D") return "Yếu";
    return "Kém";
}

/** Parse JSON score array safely */
function parseScores(json: string | null | undefined): (number | null)[] {
    if (!json || json === "null") return [];
    try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** Serialize score array to JSON */
function serializeScores(arr: (number | null)[]): string {
    return JSON.stringify(arr);
}

/**
 * Tính TB Thường Kỳ chuẩn UNETI
 */
function calcTbThuongKy(
    cc: number | null,
    credits: number,
    regular: (number | null)[],
    coef1: (number | null)[],
    coef2: (number | null)[],
    practice: (number | null)[],
    isTheory: boolean
): number {
    const sumVal = (arr: (number | null)[]) => arr.reduce((a, b) => (a || 0) + (b || 0), 0) as number;
    let weightTotal = 0;

    if (isTheory) {
        weightTotal = credits + regular.length + coef1.length + coef2.length * 2;
        if (weightTotal === 0) return 0;
        return ((cc || 0) * credits + sumVal(regular) + sumVal(coef1) + sumVal(coef2) * 2) / weightTotal;
    } else {
        weightTotal = 1 + practice.length;
        if (weightTotal === 0) return 0;
        return ((cc || 0) * 1 + sumVal(practice)) / weightTotal;
    }
}

/** Tính Điểm Tổng Kết: 40% TB TK + 60% Điểm thi */
function calcFinalScore(tb: number, exam: number | null): number | null {
    if (exam === null) return null;
    return Math.round((tb * 0.4 + exam * 0.6) * 10) / 10;
}

// ===== TYPES =====
interface GradeRow {
    id: string;
    studentId: string;
    student?: { fullName: string; studentCode: string };
    attendanceScore: number | null;
    regularScores: string | null;   // JSON
    coef1Scores: string | null;     // JSON
    coef2Scores: string | null;     // JSON
    practiceScores: string | null;  // JSON
    tbThuongKy: number | null;
    isEligibleForExam: boolean;
    isAbsentFromExam: boolean;
    examScore1: number | null;
    examScore2: number | null;
    finalScore1: number | null;
    finalScore2: number | null;
    totalScore10: number | null;
    totalScore4: number | null;
    letterGrade: string | null;
    isPassed: boolean;
    isLocked: boolean;
    status: string;
    notes: string | null;
    // ---- local parsed ----
    _coef1: (number | null)[];
    _coef2: (number | null)[];
    _practice: (number | null)[];
    _regularScores: (number | null)[];
}

export default function LecturerGradeEntryPage() {
    const { id: classId } = useParams();
    const [rows, setRows] = useState<GradeRow[]>([]);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [searchQuery, setSearchQuery] = useState("");

    const TOKEN = Cookies.get("admin_accessToken");

    // ===== FETCH DATA =====
    useEffect(() => {
        if (!classId || !TOKEN) return;
        setLoading(true);
        const fetchData = async () => {
            try {
                const [gradeRes, classRes, enrollmentRes] = await Promise.all([
                    fetch(`/api/grades/class/${classId}`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
                    fetch(`/api/courses/classes/${classId}`, { headers: { Authorization: `Bearer ${TOKEN}` } }),
                    fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, { headers: { Authorization: `Bearer ${TOKEN}` } })
                ]);

                if (gradeRes.ok && classRes.ok) {
                    let gradeData = await gradeRes.json();
                    const classData = await classRes.json();
                    const enrollData = enrollmentRes.ok ? await enrollmentRes.json() : [];
                    
                    setCourseClass(classData);

                    // Initialize grades if empty (Lecturer specific logic)
                    if (gradeData.length === 0 && enrollData.length > 0) {
                        const initRes = await fetch(`/api/grades/initialize`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                            body: JSON.stringify({
                                classId: classId,
                                subjectId: classData.subjectId,
                                studentIds: enrollData.map((e: any) => e.studentId)
                            })
                        });
                        if (initRes.ok) {
                            gradeData = await initRes.json();
                        }
                    }

                    const creditsVal = classData?.subject?.credits ?? 3;

                    const merged: GradeRow[] = gradeData.map((g: any) => {
                        const coef1 = parseScores(g.coef1Scores);
                        const coef2 = parseScores(g.coef2Scores);
                        const practice = parseScores(g.practiceScores);
                        const regular = parseScores(g.regularScores);
                        // Pad arrays to credits length
                        while (coef1.length < creditsVal) coef1.push(null);
                        while (coef2.length < creditsVal) coef2.push(null);
                        while (practice.length < 2) practice.push(null);
                        while (regular.length < 3) regular.push(null);
                        return {
                            ...g,
                            _coef1: coef1,
                            _coef2: coef2,
                            _practice: practice,
                            _regularScores: regular,
                            isLocked: g.status !== 'DRAFT'
                        };
                    });
                    setRows(merged);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [classId, TOKEN]);

    const credits = courseClass?.subject?.credits ?? 3;
    const theoryHours = courseClass?.subject?.theoryHours ?? 0;
    const practiceHours = courseClass?.subject?.practiceHours ?? 0;
    const hasPractice = practiceHours > 0;
    const isTheory = theoryHours > 0 || hasPractice === false;

    // ===== UPDATE A SCORE FIELD =====
    const updateScore = useCallback((rowId: string, field: string, value: number | null, arrayIndex?: number) => {
        setRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (row.isLocked) return row;
            let updated = { ...row };

            if (field === "attendanceScore") updated.attendanceScore = value;
            else if (field === "coef1" && arrayIndex !== undefined) {
                const arr = [...updated._coef1];
                arr[arrayIndex] = value;
                updated._coef1 = arr;
                updated.coef1Scores = serializeScores(arr);
            }
            else if (field === "coef2" && arrayIndex !== undefined) {
                const arr = [...updated._coef2];
                arr[arrayIndex] = value;
                updated._coef2 = arr;
                updated.coef2Scores = serializeScores(arr);
            }
            else if (field === "practice" && arrayIndex !== undefined) {
                const arr = [...updated._practice];
                arr[arrayIndex] = value;
                updated._practice = arr;
                updated.practiceScores = serializeScores(arr);
            }
            else if (field === "examScore1") {
                updated.examScore1 = updated.isAbsentFromExam ? 0 : value;
            }
            else if (field === "examScore2") updated.examScore2 = value;
            else if (field === "notes") return { ...row, notes: value as any };

            // ---- Recalculate ----
            let tb = calcTbThuongKy(
                updated.attendanceScore,
                credits,
                updated._regularScores,
                updated._coef1,
                updated._coef2,
                updated._practice,
                isTheory
            );
            tb = Math.round(tb * 10) / 10;
            updated.tbThuongKy = tb;
            updated.isEligibleForExam = updated.attendanceScore !== 0; 

            const exam1 = updated.isAbsentFromExam ? 0 : updated.examScore1;
            const tk1 = calcFinalScore(tb, exam1);
            const tk2 = calcFinalScore(tb, updated.examScore2);
            updated.finalScore1 = tk1;
            updated.finalScore2 = tk2;

            const best = Math.max(tk1 ?? -Infinity, tk2 ?? -Infinity);
            const total10 = best === -Infinity ? null : Math.round(best * 10) / 10;
            updated.totalScore10 = total10;
            if (total10 !== null) {
                updated.totalScore4 = score10to4(total10);
                updated.letterGrade = score10toLetter(total10);
                updated.isPassed = total10 >= 4.0;
            } else {
                updated.totalScore4 = null;
                updated.letterGrade = null;
                updated.isPassed = false;
            }
            return updated;
        }));
    }, [credits, isTheory]);

    // ===== TOGGLE ABSENT =====
    const toggleAbsent = (rowId: string) => {
        setRows(prev => prev.map(row => {
            if (row.id !== rowId) return row;
            if (row.isLocked) return row;
            const absent = !row.isAbsentFromExam;
            const updated = { ...row, isAbsentFromExam: absent };
            if (absent) updated.examScore1 = 0;
            const tb = updated.tbThuongKy ?? 0;
            const exam1 = absent ? 0 : updated.examScore1;
            const tk1 = calcFinalScore(tb, exam1);
            const tk2 = calcFinalScore(tb, updated.examScore2);
            updated.finalScore1 = tk1;
            updated.finalScore2 = tk2;
            const best = Math.max(tk1 ?? -Infinity, tk2 ?? -Infinity);
            const total10 = best === -Infinity ? null : Math.round(best * 10) / 10;
            updated.totalScore10 = total10;
            if (total10 !== null) {
                updated.totalScore4 = score10to4(total10);
                updated.letterGrade = score10toLetter(total10);
                updated.isPassed = total10 >= 4.0;
            }
            return updated;
        }));
    };

    // ===== SAVE =====
    const handleSave = async (showMsg = true) => {
        setSaving(true);
        if (showMsg) setMessage({ text: "", type: "" });
        try {
            const payload = rows.map(r => ({
                id: r.id,
                studentId: r.studentId,
                courseClassId: classId,
                attendanceScore: r.attendanceScore,
                coef1Scores: r.coef1Scores,
                coef2Scores: r.coef2Scores,
                practiceScores: r.practiceScores,
                regularScores: r.regularScores,
                tbThuongKy: r.tbThuongKy,
                isEligibleForExam: r.isEligibleForExam,
                isAbsentFromExam: r.isAbsentFromExam,
                examScore1: r.examScore1,
                examScore2: r.examScore2,
                finalScore1: r.finalScore1,
                finalScore2: r.finalScore2,
                totalScore10: r.totalScore10,
                totalScore4: r.totalScore4,
                letterGrade: r.letterGrade,
                isPassed: r.isPassed,
                notes: r.notes,
            }));
            const res = await fetch(`/api/grades/bulk`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
                body: JSON.stringify({ grades: payload })
            });
            if (res.ok) {
                if (showMsg) {
                    setMessage({ text: "Đã lưu bản nháp thành công", type: "success" });
                    setTimeout(() => setMessage({ text: "", type: "" }), 3000);
                }
                return true;
            } else throw new Error();
        } catch {
            if (showMsg) setMessage({ text: "Có lỗi xảy ra khi lưu điểm", type: "error" });
            return false;
        } finally {
            setSaving(false);
        }
    };

    // ===== SUBMIT / LOCK =====
    const handleLock = async () => {
        if (!confirm("Sau khi 'Gửi điểm', bạn sẽ không thể chỉnh sửa nữa. Dữ liệu sẽ được gửi lên phòng Đào tạo để chốt điểm và công bố cho Sinh viên. Bạn có chắc chắn gửi?")) return;
        
        const saved = await handleSave(false);
        if (!saved) return;

        setSaving(true);
        try {
            const res = await fetch(`/api/grades/submit/${classId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });

            if (res.ok) {
                setMessage({ text: "Bảng điểm đã được gửi phòng Đào tạo chờ chốt điểm", type: "success" });
                setRows(prev => prev.map(e => ({ 
                    ...e, 
                    isLocked: true, 
                    status: 'PENDING_APPROVAL' 
                })));
            } else {
                setMessage({ text: "Lỗi khi gửi bảng điểm", type: "error" });
            }
        } catch {
            setMessage({ text: "Có lỗi xảy ra khi gửi bảng điểm", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    // ===== SCORE INPUT CELL =====
    const ScoreInput = ({ value, onChange, disabled, highlight }: {
        value: number | null; onChange: (v: number | null) => void; disabled?: boolean; highlight?: "blue" | "green" | "red";
    }) => {
        const bgMap = { blue: "bg-blue-50 border-blue-200", green: "bg-emerald-50 border-emerald-200", red: "bg-rose-50 border-rose-200" };
        return (
            <input
                type="number" step="0.5" min="0" max="10"
                disabled={disabled}
                value={value ?? ""}
                onChange={e => {
                    const v = e.target.value === "" ? null : Math.min(10, Math.max(0, parseFloat(e.target.value)));
                    onChange(v);
                }}
                className={cn(
                    "w-[52px] text-center text-[11px] font-bold py-1.5 px-1 border rounded focus:outline-none focus:ring-1 focus:ring-uneti-blue transition-colors",
                    disabled ? "bg-slate-100 text-slate-300 cursor-not-allowed border-slate-100" : (highlight ? bgMap[highlight] : "bg-white border-slate-200 hover:border-uneti-blue/40"),
                )}
            />
        );
    };

    const filtered = rows.filter(r =>
        r.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // ===== Summary Stats =====
    const totalStudents = rows.length;
    const passedCount = rows.filter(r => r.isPassed).length;
    const absentCount = rows.filter(r => r.isAbsentFromExam).length;
    const ineligibleCount = rows.filter(r => !r.isEligibleForExam).length;

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-uneti-blue" />
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-5 pb-20 max-w-full p-4">
            {/* ===== HEADER ===== */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <Link href="/lecturer/grades" className="hover:text-uneti-blue flex items-center gap-1">
                            <RefreshCw size={10} className="rotate-180" /> Quản lý Điểm
                        </Link>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue px-2 py-0.5 bg-blue-50 rounded-lg">Nhập Điểm Chi Tiết</span>
                    </div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight flex flex-wrap items-center gap-3">
                        {courseClass?.subject?.name}
                        <span className="text-[10px] font-black text-slate-400 border border-slate-200 px-2 py-0.5 rounded-lg">{courseClass?.code}</span>
                        <span className="text-[10px] font-black text-uneti-blue border border-blue-100 bg-blue-50 px-2 py-0.5 rounded-lg">{credits} TC</span>
                        {hasPractice && <span className="text-[10px] font-black text-purple-600 border border-purple-100 bg-purple-50 px-2 py-0.5 rounded-lg">Có Thực Hành</span>}
                    </h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        LOẠI: {isTheory ? 'LÝ THUYẾT' : 'THỰC HÀNH / ĐỒ ÁN'} • {totalStudents} Sinh viên
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={() => handleSave()} disabled={saving || rows.some(e => e.isLocked)}
                        className="h-10 rounded-xl px-4 text-[10px] font-black uppercase tracking-wider bg-white border-slate-200 hover:bg-slate-50 shadow-sm transition-all active:scale-95">
                        <Save className="mr-1.5 h-3.5 w-3.5" /> Lưu nháp
                    </Button>
                    <Button onClick={handleLock} disabled={saving || rows.some(e => e.isLocked)}
                        className="h-10 rounded-xl px-6 text-[10px] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg tracking-widest uppercase transition-all active:scale-95">
                        {saving ? <div className="h-3.5 w-3.5 animate-spin border-2 border-white/20 border-t-white rounded-full mr-1.5" /> : <ShieldAlert className="mr-1.5 h-3.5 w-3.5" />}
                        Gửi Điểm Lên Đào Tạo
                    </Button>
                </div>
            </div>

            {/* ===== STATS ===== */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng số SV", value: totalStudents, color: "text-slate-800", bg: "bg-white" },
                    { label: "Tỉ lệ đạt", value: totalStudents > 0 ? `${Math.round((passedCount/totalStudents)*100)}%` : "0%", color: "text-emerald-600", bg: "bg-emerald-50" },
                    { label: "Vắng thi", value: absentCount, color: "text-amber-600", bg: "bg-amber-50" },
                    { label: "Cấm thi", value: ineligibleCount, color: "text-rose-600", bg: "bg-rose-50" },
                ].map((s, i) => (
                    <div key={i} className={cn("rounded-2xl px-5 py-4 border border-slate-100 shadow-sm", s.bg)}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className={cn("text-xl font-black leading-none", s.color)}>{s.value}</p>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
                {/* Table toolbar */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                        <FileText size={16} className="text-uneti-blue" />
                        <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                            BẢNG ĐIỂM CHI TIẾT — {isTheory ? "Lý Thuyết" : "Thực Hành"}
                        </h2>
                    </div>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={13} />
                        <input type="text" placeholder="Tìm sinh viên..." value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 text-[10px] font-bold rounded-xl outline-none focus:ring-1 focus:ring-uneti-blue/30" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[10px]" style={{ minWidth: "1400px" }}>
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th rowSpan={3} className="py-2 px-3 text-center font-black text-slate-400 uppercase border-r border-slate-100 w-10">STT</th>
                                <th rowSpan={3} className="py-2 px-3 text-left font-black text-slate-600 uppercase border-r border-slate-100 w-40">Sinh viên</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 w-12">TC</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 w-14 bg-amber-50">CC</th>
                                <th colSpan={3} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 bg-sky-50">Thường Kỳ</th>
                                <th colSpan={credits} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 bg-indigo-50">LT Hệ số 1</th>
                                <th colSpan={credits} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 bg-violet-50">LT Hệ số 2</th>
                                {hasPractice && <th colSpan={2} className="py-2 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-100 bg-teal-50">Thực Hành</th>}
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-700 uppercase border-r border-slate-100 w-16 bg-orange-50">TB TK</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-700 uppercase border-r border-slate-100 w-16 bg-orange-50">Dự thi</th>
                                <th colSpan={3} className="py-2 px-2 text-center font-black text-rose-600 uppercase border-r border-slate-100 bg-rose-50">Cuối Kỳ</th>
                                <th colSpan={2} className="py-2 px-2 text-center font-black text-emerald-700 uppercase border-r border-slate-100 bg-emerald-50">Tổng Kết</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-600 uppercase border-r border-slate-100 w-14 bg-slate-100">Hệ 4</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-600 uppercase border-r border-slate-100 w-12 bg-slate-100">Chữ</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-600 uppercase border-r border-slate-100 w-20 bg-slate-100">Xếp loại</th>
                                <th rowSpan={3} className="py-2 px-2 text-center font-black text-slate-400 uppercase w-14">Ghi chú</th>
                            </tr>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="py-1.5 px-1 text-center font-bold text-slate-400 border-r border-slate-100 bg-sky-50/60">TX1</th>
                                <th className="py-1.5 px-1 text-center font-bold text-slate-400 border-r border-slate-100 bg-sky-50/60">TX2</th>
                                <th className="py-1.5 px-1 text-center font-bold text-slate-400 border-r border-slate-100 bg-sky-50/60">TX3</th>
                                {Array.from({ length: credits }).map((_, i) => (
                                    <th key={`c1h-${i}`} className="py-1.5 px-1 text-center font-bold text-indigo-400 border-r border-slate-100 bg-indigo-50/60">{i + 1}</th>
                                ))}
                                {Array.from({ length: credits }).map((_, i) => (
                                    <th key={`c2h-${i}`} className="py-1.5 px-1 text-center font-bold text-violet-400 border-r border-slate-100 bg-violet-50/60">{i + 1}</th>
                                ))}
                                {hasPractice && <>
                                    <th className="py-1.5 px-1 text-center font-bold text-teal-400 border-r border-slate-100 bg-teal-50/60">TH1</th>
                                    <th className="py-1.5 px-1 text-center font-bold text-teal-400 border-r border-slate-100 bg-teal-50/60">TH2</th>
                                </>}
                                <th className="py-1.5 px-1 text-center font-bold text-rose-400 border-r border-slate-100 bg-rose-50/60">Điểm 1</th>
                                <th className="py-1.5 px-1 text-center font-bold text-rose-400 border-r border-slate-100 bg-rose-50/60">Vắng</th>
                                <th className="py-1.5 px-1 text-center font-bold text-rose-400 border-r border-slate-100 bg-rose-50/60">Điểm 2</th>
                                <th className="py-1.5 px-1 text-center font-bold text-emerald-500 border-r border-slate-100 bg-emerald-50/60">TK 1</th>
                                <th className="py-1.5 px-1 text-center font-bold text-emerald-500 border-r border-slate-100 bg-emerald-50/60">TK 2</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((row, idx) => {
                                const tb = row.tbThuongKy ?? 0;
                                const eligible = row.isEligibleForExam;
                                const passed = row.isPassed;

                                return (
                                    <tr key={row.id} className={cn(
                                        "border-b border-slate-50 hover:bg-blue-50/20 transition-colors",
                                        !eligible && "bg-rose-50/20",
                                        row.isLocked && "opacity-60 pointer-events-none"
                                    )}>
                                        <td className="py-2.5 px-3 text-center text-slate-300 font-bold border-r border-slate-50">{idx + 1}</td>
                                        <td className="py-2.5 px-3 border-r border-slate-50 min-w-[140px]">
                                            <p className="font-black text-slate-800 text-[11px] leading-tight uppercase">{row.student?.fullName}</p>
                                            <p className="text-uneti-blue font-bold text-[9px] mt-0.5">{row.student?.studentCode}</p>
                                        </td>
                                        <td className="py-2.5 px-2 text-center font-black text-slate-500 border-r border-slate-50">{credits}</td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-50 bg-amber-50/30">
                                            <ScoreInput value={row.attendanceScore} onChange={v => updateScore(row.id, "attendanceScore", v)} />
                                        </td>
                                        {(row._regularScores || []).map((val, i) => (
                                            <td key={`tx-${i}`} className="py-2.5 px-1 text-center border-r border-slate-50 bg-sky-50/20">
                                                <ScoreInput value={val} onChange={v => {
                                                    const arr = [...row._regularScores]; arr[i] = v;
                                                    setRows(prev => prev.map(r => r.id === row.id ? { ...r, _regularScores: arr, regularScores: serializeScores(arr) } : r));
                                                }} />
                                            </td>
                                        ))}
                                        {(row._coef1 || []).map((val, i) => (
                                            <td key={`c1-${i}`} className="py-2.5 px-1 text-center border-r border-slate-50 bg-indigo-50/20">
                                                <ScoreInput value={val} onChange={v => updateScore(row.id, "coef1", v, i)} highlight="blue" />
                                            </td>
                                        ))}
                                        {(row._coef2 || []).map((val, i) => (
                                            <td key={`c2-${i}`} className="py-2.5 px-1 text-center border-r border-slate-50 bg-violet-50/20">
                                                <ScoreInput value={val} onChange={v => updateScore(row.id, "coef2", v, i)} />
                                            </td>
                                        ))}
                                        {hasPractice && (row._practice || []).map((val, i) => (
                                            <td key={`th-${i}`} className="py-2.5 px-1 text-center border-r border-slate-50 bg-teal-50/20">
                                                <ScoreInput value={val} onChange={v => updateScore(row.id, "practice", v, i)} />
                                            </td>
                                        ))}
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-orange-50/30">
                                            <span className={cn("font-black text-[12px]", tb >= 3 ? "text-orange-700" : "text-rose-600")}>
                                                {tb > 0 ? tb.toFixed(2) : "—"}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-orange-50/30">
                                            {eligible
                                                ? <span className="text-emerald-600 font-black text-[9px] px-1.5 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">✓ Đạt</span>
                                                : <span className="text-rose-600 font-black text-[9px] px-1.5 py-0.5 bg-rose-50 border border-rose-100 rounded-full">✕ Cấm</span>
                                            }
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-50 bg-rose-50/20">
                                            <ScoreInput value={row.isAbsentFromExam ? 0 : row.examScore1} disabled={!eligible || row.isAbsentFromExam}
                                                onChange={v => updateScore(row.id, "examScore1", v)} highlight="red" />
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-50 bg-rose-50/20">
                                            <input type="checkbox" checked={row.isAbsentFromExam} onChange={() => toggleAbsent(row.id)} className="w-4 h-4 rounded accent-rose-500 cursor-pointer" />
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-rose-50/20">
                                            <ScoreInput value={row.examScore2} disabled={eligible && !row.isAbsentFromExam && row.isPassed}
                                                onChange={v => updateScore(row.id, "examScore2", v)} highlight="red" />
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-50 bg-emerald-50/20">
                                            <span className="font-black text-[12px] text-emerald-700">{row.finalScore1 !== null ? row.finalScore1.toFixed(2) : "—"}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-emerald-50/20">
                                            <span className="font-black text-[12px] text-emerald-600">{row.finalScore2 !== null ? row.finalScore2.toFixed(2) : "—"}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-slate-50">
                                            <span className="font-black text-[12px] text-slate-700">{row.totalScore4 !== null ? row.totalScore4?.toFixed(1) : "—"}</span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-slate-50">
                                            <span className={cn("font-black text-[13px]",
                                                row.letterGrade === "A" ? "text-blue-600" :
                                                row.letterGrade?.startsWith("B") ? "text-emerald-600" :
                                                row.letterGrade?.startsWith("C") ? "text-orange-500" :
                                                row.letterGrade === "D" || row.letterGrade === "D+" ? "text-amber-600" : "text-rose-600")}>
                                                {row.letterGrade || "—"}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2 text-center border-r border-slate-100 bg-slate-50">
                                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-full border", passed ? "text-emerald-700 bg-emerald-50 border-emerald-100" : "text-rose-600 bg-rose-50 border-rose-100")}>
                                                {row.letterGrade ? letterToRank(row.letterGrade) : "—"}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-2">
                                            <input type="text" value={row.notes ?? ""} onChange={e => setRows(prev => prev.map(r => r.id === row.id ? { ...r, notes: e.target.value } : r))}
                                                className="w-full text-[10px] border border-slate-100 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-slate-200 text-slate-600" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Legend */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 gap-6 flex flex-wrap text-[9px] font-black uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-amber-200" /> CC: Chuyên Cần</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-sky-200" /> TX: Thường Kỳ</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-indigo-200" /> Hệ số 1 (Số cột = Tín chỉ)</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-violet-200" /> Hệ số 2 (Số cột = Tín chỉ)</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-orange-200" /> TB TK: Trung Bình Thường Kỳ</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-rose-200" /> TB TK &lt; 3.0 → Cấm thi</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-200" /> Tổng kết = 40% TB TK + 60% Thi</span>
                </div>
            </div>

            <AnimatePresence>
                {message.text && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                        className={cn("fixed bottom-8 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-[100]",
                            message.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white")}>
                        {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        <p className="text-[11px] font-black uppercase tracking-widest">{message.text}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
