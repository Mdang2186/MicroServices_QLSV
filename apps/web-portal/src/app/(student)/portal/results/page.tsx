"use client";

import React, { useEffect, useState, useMemo } from "react";
import { parseScoreArray } from "@repo/shared-utils";
import { StudentService } from "@/services/student.service";
import {
    GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCurrentStudentContext } from "@/lib/current-student";

// ===== UTILITY FUNCTIONS =====

function toDate(value: any): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toNumberOrNull(value: any) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function getRowCredits(row: any) {
    return Number(row?.subject?.credits || row?.credits || 0);
}

function getRowSubjectKey(row: any) {
    return `${row?.subjectId || row?.subject?.id || row?.subject?.code || row?.courseClass?.subjectId || ""}`.trim();
}

function getRowPriority(row: any) {
    let score = 0;
    if (`${row?.status || ""}`.toUpperCase() === "APPROVED") score += 100;
    if (row?.isLocked) score += 20;
    const totalScore10 = toNumberOrNull(row?.totalScore10);
    if (totalScore10 !== null) score += 10 + totalScore10;
    const totalScore4 = toNumberOrNull(row?.totalScore4);
    if (totalScore4 !== null) score += totalScore4;
    return score;
}

function inferCohortMeta(cohortCode?: string | null) {
    const normalized = `${cohortCode || ""}`.trim().toUpperCase();
    const match = normalized.match(/^K(\d{2,})$/i);
    if (!match) return null;
    const cohortNumber = Number(match[1]);
    const startYear = 2006 + cohortNumber;
    return { code: normalized, startYear, endYear: startYear + 4 };
}

function parseConceptualSemester(semester: any) {
    const source = `${semester?.code || ""} ${semester?.name || ""}`;
    const match = source.match(/HK\s*([1-8])/i) || source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) || source.match(/SEMESTER\s*([1-8])/i);
    return match ? Number(match[1]) : null;
}

function expectedYearForSemester(startYear: number, conceptualSemester: number) {
    return startYear + Math.floor((conceptualSemester - 1) / 2);
}

function getSemesterStartYear(semester: any) {
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) return startDate.getFullYear();
    const codeMatch = `${semester?.code || ""}`.match(/(20\d{2})/);
    if (codeMatch) return Number(codeMatch[1]);
    const nameMatch = `${semester?.name || ""}`.match(/(20\d{2})\s*-\s*20\d{2}/);
    if (nameMatch) return Number(nameMatch[1]);
    return Number(semester?.year || 0);
}

function getSemesterHalfMatch(semester: any, conceptualSemester: number) {
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) return 0;
    const startMonth = startDate.getMonth() + 1;
    if (conceptualSemester % 2 === 1) return startMonth >= 7 ? 1 : 0;
    return startMonth >= 1 && startMonth <= 6 ? 1 : 0;
}

function getVisibleSemestersForCohort(semesters: any[], cohortMeta: any) {
    if (!cohortMeta) return semesters;
    const selected = Array.from({ length: 8 }, (_, index) => index + 1).map((conceptualSemester) => {
        const expectedYear = expectedYearForSemester(cohortMeta.startYear, conceptualSemester);
        const match = semesters.filter((semester) => parseConceptualSemester(semester) === conceptualSemester).sort((left, right) => {
            const leftYearDiff = Math.abs(getSemesterStartYear(left) - expectedYear);
            const rightYearDiff = Math.abs(getSemesterStartYear(right) - expectedYear);
            if (leftYearDiff !== rightYearDiff) return leftYearDiff - rightYearDiff;
            return (getSemesterHalfMatch(right, conceptualSemester) - getSemesterHalfMatch(left, conceptualSemester)) || (new Date(left?.startDate || 0).getTime() - new Date(right?.startDate || 0).getTime());
        })[0];

        return match || {
            id: `virtual-hk-${conceptualSemester}`,
            code: `HK${conceptualSemester}`,
            name: `Học kỳ ${conceptualSemester}`,
            startDate: new Date(expectedYear, conceptualSemester % 2 === 1 ? 8 : 1, 1),
            endDate: new Date(expectedYear + (conceptualSemester % 2 === 0 ? 0 : 1), conceptualSemester % 2 === 1 ? 1 : 5, 30),
            isVirtual: true
        };
    });
    return selected;
}

function limitToPastAndCurrentSemesters(semesters: any[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find the latest semester that has started
    const started = semesters.filter(s => s.startDate && new Date(s.startDate) <= today);
    if (started.length === 0) return semesters.length > 0 ? [semesters[0]] : [];

    const latestStarted = started.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0];
    const latestStartedIdx = semesters.findIndex(s => s.id === latestStarted.id);

    return semesters.slice(0, latestStartedIdx + 1);
}

export default function ResultsPage() {
    const [grades, setGrades] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [curriculumProgress, setCurriculumProgress] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const context = await resolveCurrentStudentContext();
                if (!context.studentId) return;
                const [gs, ss, cs, ps, cp] = await Promise.all([
                    StudentService.getGrades(context.studentId),
                    StudentService.getSemesters(),
                    StudentService.getCohorts(),
                    context.profile || StudentService.getProfileSummary(context.studentId),
                    StudentService.getCurriculumProgress(context.studentId)
                ]);
                setGrades(gs || []); setSemesters(ss || []); setCohorts(cs || []); setStudent(ps); setCurriculumProgress(cp || null);
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchData();
    }, []);

    const startYear = useMemo(() => {
        const cohortCode = `${student?.adminClass?.cohort || student?.intake || ""}`.trim();
        const kMatch = cohortCode.match(/K(\d+)/i);
        return kMatch ? 2006 + parseInt(kMatch[1]) : 2024;
    }, [student]);

    const cohortMeta = useMemo(() => inferCohortMeta(student?.adminClass?.cohort || student?.intake), [student]);

    const visibleSemesters = useMemo(() => {
        const normalized = semesters.map(s => ({ ...s, startDate: toDate(s.startDate), endDate: toDate(s.endDate) }));
        const scoped = getVisibleSemestersForCohort(normalized, cohortMeta);
        return limitToPastAndCurrentSemesters(scoped);
    }, [cohortMeta, semesters]);

    const fullHistory = useMemo(() => {
        const timeline: any[] = [];
        const cumulativeBest = new Map();

        visibleSemesters.forEach((sysSem, idx) => {
            const seqNum = parseConceptualSemester(sysSem) || (idx + 1);
            const plannedSem = curriculumProgress?.semesters?.find((s: any) => Number(s.semester) === seqNum);
            const plannedSubjects = plannedSem?.items || [];
            const plannedKeys = new Set(plannedSubjects.flatMap((p: any) => [p.subjectId, p.id, p.code].map(v => `${v || ""}`.trim()).filter(Boolean)));

            const actualGrades = grades.filter(g => matchesSemesterReference(g?.courseClass?.semester, g?.courseClass?.semesterId, sysSem));

            // Map planned subjects first, then extra grades
            const rows: any[] = [];
            plannedSubjects.forEach((p: any) => {
                const match = actualGrades.find(g => `${g.subjectId || g.subject?.id || ""}`.trim() === `${p.subjectId || p.id || ""}`.trim());
                if (match) rows.push({ ...match, isPlanned: true });
                else rows.push({ subject: p, subjectId: p.subjectId, isPlanned: true, isPlaceholder: true });
            });

            // Add actual grades that weren't in the plan for this semester
            actualGrades.forEach(g => {
                const alreadyAdded = rows.some(r => `${r.id || ""}` === `${g.id || ""}` && !r.isPlaceholder);
                if (!alreadyAdded) rows.push({ ...g, isPlanned: false });
            });

            // Stats
            const actualRows = rows.filter(r => !r.isPlaceholder && toNumberOrNull(r.totalScore10) !== null);
            actualRows.forEach(r => {
                const key = getRowSubjectKey(r);
                if (key && (!cumulativeBest.get(key) || getRowPriority(r) > getRowPriority(cumulativeBest.get(key)))) cumulativeBest.set(key, r);
            });
            const allBest = [...cumulativeBest.values()];
            const totalCreds = allBest.reduce((s, r) => s + getRowCredits(r), 0);
            const cpa = totalCreds > 0 ? allBest.reduce((s, r) => s + (Number(r.totalScore4 || 0) * getRowCredits(r)), 0) / totalCreds : null;

            const semCreds = actualRows.reduce((s, r) => s + getRowCredits(r), 0);
            const gpa = semCreds > 0 ? actualRows.reduce((s, r) => s + (Number(r.totalScore4 || 0) * getRowCredits(r)), 0) / semCreds : null;

            timeline.push({
                label: `HK${seqNum}`,
                title: sysSem.name || `Học kỳ ${seqNum}`,
                academicYear: sysSem.startDate ? `${new Date(sysSem.startDate).getFullYear()} - ${new Date(sysSem.startDate).getFullYear() + 1}` : `${expectedYearForSemester(startYear, seqNum)} - ${expectedYearForSemester(startYear, seqNum) + 1}`,
                grades: rows,
                summary: { gpa, cpa }
            });
        });
        return timeline;
    }, [curriculumProgress, grades, startYear, visibleSemesters]);

    const formatVal = (val: any) => {
        if (val === null || val === undefined || val === "") return "";
        const n = Number(val);
        return isNaN(n) ? val : n.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    };

    const getRank = (gpa: number | null) => {
        if (gpa === null || gpa === 0) return "";
        if (gpa >= 3.6) return "Xuất sắc";
        if (gpa >= 3.2) return "Giỏi";
        if (gpa >= 2.5) return "Khá";
        if (gpa >= 2.0) return "Trung bình";
        return "Yếu";
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="w-full flex flex-col min-h-screen bg-white">


            {/* Excel-style Table Body */}
            <div className="flex-1 overflow-auto bg-slate-50 scrollbar-thin scrollbar-thumb-slate-200">
                <table className="w-full border-separate border-spacing-0 text-[11px] text-slate-700 bg-white">
                    <thead className="sticky top-0 z-40">
                        {/* Headers */}
                        <tr className="h-10 bg-slate-50 text-slate-600 font-bold">
                            <th rowSpan={2} className="sticky left-0 z-50 bg-[#f8fafc] border-r border-b border-slate-200 px-3 text-center min-w-[45px]">STT</th>
                            <th rowSpan={2} className="sticky left-[45px] z-50 bg-[#f8fafc] border-r border-b border-slate-200 px-3 text-left min-w-[110px]">Mã HP</th>
                            <th rowSpan={2} className="sticky left-[155px] z-50 bg-[#f8fafc] border-r border-b border-slate-200 px-3 text-left min-w-[240px]">Tên học phần</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[35px]">TC</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[40px]">CC</th>
                            <th colSpan={3} className="border-r border-b border-slate-200 px-2">Thường kỳ</th>
                            <th colSpan={4} className="border-r border-b border-slate-200 px-2">LT Hệ số 1</th>
                            <th colSpan={4} className="border-r border-b border-slate-200 px-2">LT Hệ số 2</th>
                            <th colSpan={2} className="bg-[#e2f3e8] border-r border-b border-slate-200 px-2">Thực hành</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">TBTK</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">Dự thi</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">Điểm 1</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[35px]">Vắng</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">Điểm 2</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">TK 1</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">TK 2</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">TK 10</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[35px]">Hệ 4</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[35px]">Chữ</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">GPA</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[45px]">CPA</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-2 min-w-[70px]">Xếp loại</th>
                            <th rowSpan={2} className="border-r border-b border-slate-200 px-3 min-w-[80px]">Kết quả</th>
                            <th rowSpan={2} className="border-b border-slate-200 px-3 min-w-[100px]">Ghi chú</th>
                        </tr>
                        <tr className="h-6 bg-slate-50 text-[9px] text-slate-400">
                            {[1, 2, 3].map(i => <th key={`tx-${i}`} className="border-r border-b border-slate-200 px-1 min-w-[40px]">TX{i}</th>)}
                            {[11, 12, 13, 14].map(i => <th key={`hs1-${i}`} className="border-r border-b border-slate-200 px-1 min-w-[40px]">HS{i}</th>)}
                            {[21, 22, 23, 24].map(i => <th key={`hs2-${i}`} className="border-r border-b border-slate-200 px-1 min-w-[40px]">HS{i}</th>)}
                            {[1, 2].map(i => <th key={`th-${i}`} className="bg-[#e2f3e8] border-r border-b border-slate-200 px-1 min-w-[40px]">TH{i}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {fullHistory.map((group) => (
                            <React.Fragment key={group.label}>
                                <tr className="h-7 bg-slate-100 group">
                                    <td colSpan={36} className="sticky left-0 z-10 border-b border-slate-200 px-3 font-bold text-slate-600 uppercase tracking-widest text-[10px] bg-slate-100">
                                        {group.title} — {group.academicYear}
                                    </td>
                                </tr>
                                {group.grades.length === 0 ? (
                                    <tr className="h-9"><td colSpan={36} className="border-b border-slate-100 px-6 text-slate-300 italic">Chưa có dữ liệu học phần cho học kỳ này</td></tr>
                                ) : (
                                    group.grades.map((g: any, idx: number) => {
                                        const tx = parseScoreArray(g.regularScores);
                                        const hs1 = parseScoreArray(g.coef1Scores);
                                        const hs2 = parseScoreArray(g.coef2Scores);
                                        const th = parseScoreArray(g.practiceScores);
                                        const isAbsent = Boolean(g.isAbsentFromExam);
                                        const total10 = toNumberOrNull(g.totalScore10);

                                        return (
                                            <tr key={idx} className="h-9 hover:bg-slate-50 group border-b border-slate-100">
                                                <td className="sticky left-0 bg-white group-hover:bg-slate-50 border-r border-slate-100 px-3 text-center text-slate-400 tabular-nums">{idx + 1}</td>
                                                <td className="sticky left-[45px] bg-white group-hover:bg-slate-50 border-r border-slate-100 px-3 font-medium text-slate-500 tabular-nums">{g.subject?.code || g.courseClass?.subject?.code || ""}</td>
                                                <td className="sticky left-[155px] bg-white group-hover:bg-slate-50 border-r border-slate-100 px-3 font-medium text-slate-800 truncate">{g.subject?.name || g.courseClass?.subject?.name || ""}</td>
                                                <td className="border-r border-slate-100 px-2 text-center text-slate-500">{getRowCredits(g)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums text-slate-500">{formatVal(g.attendanceScore)}</td>
                                                {[0, 1, 2].map(i => <td key={i} className="border-r border-slate-50 px-1 text-center tabular-nums text-slate-400">{formatVal(tx[i])}</td>)}
                                                {[0, 1, 2, 3].map(i => <td key={i} className="border-r border-slate-50 px-1 text-center tabular-nums text-slate-400">{formatVal(hs1[i])}</td>)}
                                                {[0, 1, 2, 3].map(i => <td key={i} className="border-r border-slate-50 px-1 text-center tabular-nums text-slate-400">{formatVal(hs2[i])}</td>)}
                                                {[0, 1].map(i => <td key={i} className="bg-[#e2f3e8]/20 border-r border-slate-50 px-1 text-center tabular-nums text-slate-400">{formatVal(th[i])}</td>)}
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums font-bold text-slate-700">{formatVal(g.tbThuongKy)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center font-bold text-[9px] uppercase">{g.isEligibleForExam === false ? "Cấm" : (g.isEligibleForExam === true ? "Đạt" : "")}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums font-bold text-slate-700">{formatVal(g.examScore1)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center">{isAbsent ? <span className="text-rose-500 font-bold">X</span> : ""}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums">{formatVal(g.examScore2)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums">{formatVal(g.finalScore1)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums">{formatVal(g.finalScore2)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums font-bold text-slate-800">{formatVal(total10)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums font-bold text-slate-800">{formatVal(g.totalScore4)}</td>
                                                <td className="border-r border-slate-100 px-2 text-center font-bold text-slate-900">{g.letterGrade}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums text-blue-600 font-bold">{idx === 0 ? formatVal(group.summary.gpa) : ""}</td>
                                                <td className="border-r border-slate-100 px-2 text-center tabular-nums text-slate-800 font-bold">{idx === 0 ? formatVal(group.summary.cpa) : ""}</td>
                                                <td className="border-r border-slate-100 px-2 text-center font-medium text-slate-500">{idx === 0 ? getRank(group.summary.gpa) : ""}</td>
                                                <td className="border-r border-slate-100 px-3 text-center">
                                                    <span className={cn("text-[8px] font-bold uppercase", g.isPassed ? "text-emerald-600" : (g.letterGrade ? "text-rose-600" : "text-slate-300"))}>
                                                        {g.isPassed ? "Đạt" : (g.letterGrade ? "Học lại" : "")}
                                                    </span>
                                                </td>
                                                <td className="px-3 text-slate-400 italic text-[9px]">{g.notes}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="h-6 shrink-0 bg-white px-6 border-t border-slate-200 flex items-center justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest">
                <span>© Student Academic Record — Spreadsheet View</span>
                <span>Ngày kết xuất: {new Date().toLocaleDateString('vi-VN')}</span>
            </div>
        </div>
    );
}

function matchesSemesterReference(tSem: any, tId: any, rSem: any) {
    if (!rSem) return false;
    const rKeys = new Set([rSem.id, rSem.code, rSem.name].map(v => `${v || ""}`.trim()).filter(Boolean));
    const tKeys = [tSem?.id, tSem?.code, tSem?.name, tId].map(v => `${v || ""}`.trim()).filter(Boolean);
    return tKeys.some(v => rKeys.has(v));
}
