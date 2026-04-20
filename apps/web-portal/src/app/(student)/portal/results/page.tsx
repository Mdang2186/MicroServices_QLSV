"use client";

import { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import {
    Search,
    Printer,
    FileText,
    Info,
    Calendar,
    GraduationCap,
    Hash,
    Trophy,
    BarChart3,
    BookCheck,
    User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveCurrentStudentContext } from "@/lib/current-student";

// ===== UTILITY FUNCTIONS =====

function parseScores(json: string | null | undefined): (number | null)[] {
    if (!json || json === "null") return [];
    try {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch {
        return [];
    }
}

function toDate(value: any): Date | null {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function toNumberOrNull(value: any) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

function formatScore(value: any, digits = 2) {
    const num = toNumberOrNull(value);
    return num === null ? "—" : num.toFixed(digits);
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

type StudentCohortMeta = {
    code: string;
    startYear: number;
    endYear: number;
};

function inferCohortMeta(cohortCode?: string | null): StudentCohortMeta | null {
    const normalized = `${cohortCode || ""}`.trim().toUpperCase();
    const match = normalized.match(/^K(\d{2,})$/i);
    if (!match) return null;

    const cohortNumber = Number(match[1]);
    if (!Number.isFinite(cohortNumber)) return null;

    const startYear = 2006 + cohortNumber;
    return {
        code: normalized,
        startYear,
        endYear: startYear + 4,
    };
}

function parseConceptualSemester(semester: any) {
    const source = `${semester?.code || ""} ${semester?.name || ""}`;
    const match =
        source.match(/HK\s*([1-8])/i) ||
        source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
        source.match(/SEMESTER\s*([1-8])/i);
    return match ? Number(match[1]) : null;
}

function expectedYearForSemester(startYear: number, conceptualSemester: number) {
    return startYear + Math.floor(conceptualSemester / 2);
}

function getSemesterStartYear(semester: any) {
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    if (startDate && !Number.isNaN(startDate.getTime())) {
        return startDate.getFullYear();
    }

    const codeMatch = `${semester?.code || ""}`.match(/(20\d{2})/);
    if (codeMatch) {
        return Number(codeMatch[1]);
    }

    const nameMatch = `${semester?.name || ""}`.match(/(20\d{2})\s*-\s*20\d{2}/);
    if (nameMatch) {
        return Number(nameMatch[1]);
    }

    return Number(semester?.year || 0);
}

function getSemesterHalfMatch(semester: any, conceptualSemester: number) {
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) {
        return 0;
    }

    const startMonth = startDate.getMonth() + 1;
    if (conceptualSemester % 2 === 1) {
        return startMonth >= 7 ? 1 : 0;
    }

    return startMonth >= 1 && startMonth <= 6 ? 1 : 0;
}

function getVisibleSemestersForCohort(semesters: any[], cohortMeta: StudentCohortMeta | null) {
    if (!cohortMeta) return semesters;

    const selected = Array.from({ length: 8 }, (_, index) => index + 1)
        .map((conceptualSemester) => {
            const expectedYear = expectedYearForSemester(
                cohortMeta.startYear,
                conceptualSemester,
            );

            return semesters
                .filter((semester) => parseConceptualSemester(semester) === conceptualSemester)
                .sort((left, right) => {
                    const leftYearDiff = Math.abs(getSemesterStartYear(left) - expectedYear);
                    const rightYearDiff = Math.abs(getSemesterStartYear(right) - expectedYear);
                    if (leftYearDiff !== rightYearDiff) {
                        return leftYearDiff - rightYearDiff;
                    }

                    const halfMatchDiff =
                        getSemesterHalfMatch(right, conceptualSemester) -
                        getSemesterHalfMatch(left, conceptualSemester);
                    if (halfMatchDiff !== 0) {
                        return halfMatchDiff;
                    }

                    return (
                        new Date(left?.startDate || 0).getTime() -
                        new Date(right?.startDate || 0).getTime()
                    );
                })[0];
        })
        .filter(Boolean);

    return selected.length > 0 ? selected : semesters;
}

function getCurrentOrLatestStartedSemester(semesters: any[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const exactCurrent = semesters.find((semester) => {
        if (!semester?.startDate || !semester?.endDate) return false;
        const startDate = new Date(semester.startDate);
        const endDate = new Date(semester.endDate);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);
        return today >= startDate && today <= endDate;
    });
    if (exactCurrent) return exactCurrent;

    return (
        [...semesters]
            .filter((semester) => {
                if (!semester?.startDate) return false;
                const startDate = new Date(semester.startDate);
                startDate.setHours(0, 0, 0, 0);
                return startDate <= today;
            })
            .sort(
                (left, right) =>
                    new Date(right?.startDate || 0).getTime() -
                    new Date(left?.startDate || 0).getTime(),
            )[0] ||
        semesters[0] ||
        null
    );
}

function limitToPastAndCurrentSemesters(semesters: any[]) {
    const boundarySemester = getCurrentOrLatestStartedSemester(semesters);
    if (!boundarySemester) return semesters;

    const boundaryStart = boundarySemester?.startDate
        ? new Date(boundarySemester.startDate)
        : null;
    if (boundaryStart) {
        boundaryStart.setHours(0, 0, 0, 0);
    }

    return semesters.filter((semester) => {
        if (!semester?.startDate || !boundaryStart) return true;
        const startDate = new Date(semester.startDate);
        startDate.setHours(0, 0, 0, 0);
        return startDate <= boundaryStart;
    });
}

function calculateCurrentConceptualSemester(startYear: number, targetDate: Date) {
    const date = new Date(targetDate);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const academicHalf = month >= 7 ? 1 : 0;
    const conceptualSemester = (year - startYear) * 2 + academicHalf;
    return Math.min(8, Math.max(1, conceptualSemester));
}

function matchesSemesterReference(
    targetSemester: any,
    targetSemesterId: string | null | undefined,
    referenceSemester: any | null,
) {
    if (!referenceSemester) return false;

    const referenceKeys = new Set(
        [
            referenceSemester?.id,
            referenceSemester?.code,
            referenceSemester?.name,
        ]
            .map((value) => `${value || ""}`.trim())
            .filter(Boolean),
    );

    const targetKeys = [
        targetSemester?.id,
        targetSemester?.code,
        targetSemester?.name,
        targetSemesterId,
    ]
        .map((value) => `${value || ""}`.trim())
        .filter(Boolean);

    if (targetKeys.some((value) => referenceKeys.has(value))) {
        return true;
    }

    if (
        targetSemester?.startDate &&
        targetSemester?.endDate &&
        referenceSemester?.startDate &&
        referenceSemester?.endDate
    ) {
        const targetStart = new Date(targetSemester.startDate);
        const targetEnd = new Date(targetSemester.endDate);
        const referenceStart = new Date(referenceSemester.startDate);
        const referenceEnd = new Date(referenceSemester.endDate);

        targetStart.setHours(0, 0, 0, 0);
        targetEnd.setHours(0, 0, 0, 0);
        referenceStart.setHours(0, 0, 0, 0);
        referenceEnd.setHours(0, 0, 0, 0);

        return (
            targetStart.getTime() === referenceStart.getTime() &&
            targetEnd.getTime() === referenceEnd.getTime()
        );
    }

    return false;
}

export default function ResultsPage() {
    const [grades, setGrades] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [curriculumProgress, setCurriculumProgress] = useState<any>(null);
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const context = await resolveCurrentStudentContext();
                if (!context.studentId) return;

                const [gradesData, semestersData, cohortsData, profileData, curriculumData] = await Promise.all([
                    StudentService.getGrades(context.studentId),
                    StudentService.getSemesters(),
                    StudentService.getCohorts(),
                    StudentService.getProfileByStudentId(context.studentId),
                    StudentService.getCurriculumProgress(context.studentId)
                ]);

                setGrades(gradesData || []);
                setSemesters(semestersData || []);
                setCohorts(cohortsData || []);
                setStudent(profileData);
                setCurriculumProgress(curriculumData || null);
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const curriculumSemesters = useMemo(
        () => (Array.isArray(curriculumProgress?.semesters) ? curriculumProgress.semesters : []),
        [curriculumProgress],
    );

    const startYear = useMemo(() => {
        const cohortCode = `${student?.adminClass?.cohort || student?.intake || ""}`.trim();
        if (!cohortCode) return 2024;

        const cohort = cohorts.find(c => c.code === cohortCode);
        if (cohort?.startYear) return cohort.startYear;
        
        const kMatch = cohortCode.match(/K(\d+)/i);
        if (kMatch) {
            const kNum = parseInt(kMatch[1]);
            return 2006 + kNum; // Mapping: K18 = 2024
        }
        return 2024;
    }, [student?.adminClass?.cohort, student?.intake, cohorts]);

    const cohortMeta = useMemo(
        () => inferCohortMeta(student?.adminClass?.cohort || student?.intake),
        [student?.adminClass?.cohort, student?.intake],
    );

    const visibleSemesters = useMemo(() => {
        const normalizedSemesters = (Array.isArray(semesters) ? semesters : []).map((semester) => ({
            ...semester,
            startDate: toDate(semester?.startDate),
            endDate: toDate(semester?.endDate),
        }));

        const scoped = getVisibleSemestersForCohort(normalizedSemesters, cohortMeta);
        const limited = limitToPastAndCurrentSemesters(scoped);
        const visible = limited.length > 0 ? limited : scoped;

        if (visible.length > 0) {
            return [...visible].sort((left, right) => {
                const leftSemester = parseConceptualSemester(left) || 99;
                const rightSemester = parseConceptualSemester(right) || 99;
                if (leftSemester !== rightSemester) {
                    return leftSemester - rightSemester;
                }
                return (
                    new Date(left?.startDate || 0).getTime() -
                    new Date(right?.startDate || 0).getTime()
                );
            });
        }

        const fallbackCount = calculateCurrentConceptualSemester(startYear, new Date());
        return Array.from({ length: fallbackCount }, (_, index) => {
            const conceptualSemester = index + 1;
            const academicStartYear = expectedYearForSemester(startYear, conceptualSemester);
            return {
                id: `fallback-hk-${conceptualSemester}`,
                code: `HK${conceptualSemester}`,
                name: `Học kỳ ${conceptualSemester}`,
                startDate: null,
                endDate: null,
                conceptualSemester,
                academicStartYear,
            };
        });
    }, [cohortMeta, semesters, startYear]);

    const fullHistory = useMemo(() => {
        const timeline = [];
        const cumulativeBestBySubject = new Map<string, any>();

        visibleSemesters.forEach((systemSemester, index) => {
            const sequentialNumber =
                Number(systemSemester?.conceptualSemester) ||
                parseConceptualSemester(systemSemester) ||
                index + 1;
            const academicStartYear =
                systemSemester?.academicStartYear ||
                (systemSemester?.startDate
                    ? new Date(systemSemester.startDate).getFullYear()
                    : expectedYearForSemester(startYear, sequentialNumber));

            const plannedSemester = curriculumSemesters.find(
                (item) => Number(item?.semester || 0) === sequentialNumber,
            );
            const plannedSubjects = Array.isArray(plannedSemester?.items)
                ? plannedSemester.items
                : [];
            const plannedSubjectKeys = new Set(
                plannedSubjects.flatMap((item: any) =>
                    [item?.subjectId, item?.id, item?.code]
                        .map((value) => `${value || ""}`.trim())
                        .filter(Boolean),
                ),
            );

            const actualGradesInSemester = grades.filter((grade) =>
                matchesSemesterReference(
                    grade?.courseClass?.semester,
                    grade?.courseClass?.semesterId,
                    systemSemester,
                ),
            );
            const semesterGrades =
                plannedSubjectKeys.size > 0
                    ? actualGradesInSemester.filter((grade) =>
                        plannedSubjectKeys.has(`${grade?.subjectId || grade?.subject?.id || grade?.subject?.code || ""}`.trim()),
                    )
                    : actualGradesInSemester;

            const mergedRows: any[] = [];

            plannedSubjects.forEach((planItem) => {
                const matchingGrade = semesterGrades.find(
                    (grade) =>
                        `${grade?.subjectId || grade?.subject?.id || grade?.subject?.code || ""}`.trim() ===
                        `${planItem?.subjectId || planItem?.id || planItem?.code || ""}`.trim(),
                );

                if (matchingGrade) {
                    mergedRows.push({ ...matchingGrade, isPlanned: true });
                    return;
                }

                const passedGradeInAnySemester = grades.find(
                    (grade) => grade.subjectId === planItem.subjectId && grade.isPassed,
                );

                mergedRows.push({
                    subject: planItem,
                    subjectId: planItem.subjectId,
                    isPlanned: true,
                    isPlaceholder: true,
                    existingGrade: passedGradeInAnySemester,
                });
            });

            if (plannedSubjects.length === 0) {
                semesterGrades.forEach((grade) => {
                    mergedRows.push({ ...grade, isPlanned: false });
                });
            }

            const filteredRows = mergedRows.filter((row) => {
                const name = row.subject?.name || "";
                const code = row.subject?.code || "";
                return (
                    name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    code.toLowerCase().includes(searchTerm.toLowerCase())
                );
            });

            const actualRows = mergedRows.filter(
                (row) => !row.isPlaceholder && toNumberOrNull(row?.totalScore4) !== null,
            );
            const attemptedCredits = actualRows.reduce(
                (sum, row) => sum + getRowCredits(row),
                0,
            );
            const earnedSemesterCredits = actualRows
                .filter((row) => row.isPassed)
                .reduce((sum, row) => sum + getRowCredits(row), 0);
            const semesterGpa =
                attemptedCredits > 0
                    ? actualRows.reduce(
                        (sum, row) =>
                            sum + Number(row.totalScore4 || 0) * getRowCredits(row),
                        0,
                    ) / attemptedCredits
                    : null;

            actualRows.forEach((row) => {
                const subjectKey = getRowSubjectKey(row);
                if (!subjectKey) return;

                const existing = cumulativeBestBySubject.get(subjectKey);
                if (!existing || getRowPriority(row) > getRowPriority(existing)) {
                    cumulativeBestBySubject.set(subjectKey, row);
                }
            });

            const cumulativeRows = [...cumulativeBestBySubject.values()].filter(
                (row) => toNumberOrNull(row?.totalScore4) !== null,
            );
            const cumulativeCredits = cumulativeRows.reduce(
                (sum, row) => sum + getRowCredits(row),
                0,
            );
            const cpa =
                cumulativeCredits > 0
                    ? cumulativeRows.reduce(
                        (sum, row) =>
                            sum + Number(row.totalScore4 || 0) * getRowCredits(row),
                        0,
                    ) / cumulativeCredits
                    : null;
            const cumulativeEarnedCredits = cumulativeRows
                .filter((row) => row.isPassed)
                .reduce((sum, row) => sum + getRowCredits(row), 0);
            const failedCount = actualRows.filter((row) => row.isPassed === false).length;
            const passedCount = actualRows.filter((row) => row.isPassed === true).length;

            timeline.push({
                label: `HK${sequentialNumber}`,
                yearLabel: `Năm ${Math.ceil(sequentialNumber / 2)}`,
                academicYear: `${academicStartYear} - ${academicStartYear + 1}`,
                systemSemester,
                grades: filteredRows,
                totalRows: mergedRows.length,
                summary: {
                    semesterGpa,
                    cpa,
                    attemptedCredits,
                    earnedSemesterCredits,
                    cumulativeEarnedCredits,
                    passedCount,
                    failedCount,
                    hasActualGrades: actualRows.length > 0,
                },
            });
        });

        return timeline;
    }, [curriculumSemesters, grades, searchTerm, startYear, visibleSemesters]);

    const overallSummary = useMemo(() => {
        const lastMeasuredSemester = [...fullHistory]
            .reverse()
            .find((group) => group.summary?.hasActualGrades);

        const stats = curriculumProgress?.stats || {};
        return {
            latestGpa: lastMeasuredSemester?.summary?.semesterGpa ?? null,
            currentCpa: lastMeasuredSemester?.summary?.cpa ?? null,
            earnedCredits:
                Number(stats?.passed || 0) ||
                Number(lastMeasuredSemester?.summary?.cumulativeEarnedCredits || 0),
            requiredCredits: Number(stats?.totalCredits || 0),
            mandatoryCredits: Number(stats?.mandatory || 0),
            passedMandatoryCredits: Number(stats?.passedMandatory || 0),
        };
    }, [curriculumProgress?.stats, fullHistory]);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 bg-transparent pb-20 p-2 max-w-full">
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 px-6 py-6 text-white">
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em]">
                                <GraduationCap className="h-3.5 w-3.5" />
                                Kết quả học tập
                            </div>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight">
                                    {student?.fullName || curriculumProgress?.fullName || "Sinh viên UNETI"}
                                </h1>
                                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] font-bold text-blue-100">
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                        <Hash className="h-3.5 w-3.5" />
                                        {student?.studentCode || curriculumProgress?.studentCode || "Chưa có MSSV"}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                        <User className="h-3.5 w-3.5" />
                                        {student?.adminClass?.code || curriculumProgress?.adminClassCode || "Chưa có lớp"}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
                                        <GraduationCap className="h-3.5 w-3.5" />
                                        {student?.major?.name || curriculumProgress?.majorName || "Chưa có ngành"} • {student?.adminClass?.cohort || student?.intake || curriculumProgress?.cohort || "Chưa có khóa"}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="h-10 rounded-xl border-white/30 bg-white/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/20 hover:text-white">
                                <Printer className="mr-2 h-3.5 w-3.5" /> In bảng điểm
                            </Button>
                            <Button className="h-10 rounded-xl bg-white text-[10px] font-black uppercase tracking-widest text-blue-700 shadow-lg shadow-indigo-900/20 hover:bg-blue-50">
                                <FileText className="mr-2 h-3.5 w-3.5" /> Xuất PDF
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 bg-slate-50/70 px-6 py-5 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-inner">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">GPA kỳ gần nhất</p>
                                <p className="mt-1 text-2xl font-black text-slate-900">{formatScore(overallSummary.latestGpa)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-inner">
                                <Trophy className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">CPA hiện tại</p>
                                <p className="mt-1 text-2xl font-black text-slate-900">{formatScore(overallSummary.currentCpa)}</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-inner">
                                <BookCheck className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Tín chỉ tích lũy</p>
                                <p className="mt-1 text-2xl font-black text-slate-900">
                                    {overallSummary.earnedCredits}/{overallSummary.requiredCredits || "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-inner">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Bắt buộc đã đạt</p>
                                <p className="mt-1 text-2xl font-black text-slate-900">
                                    {overallSummary.passedMandatoryCredits}/{overallSummary.mandatoryCredits || "—"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm môn học trong chương trình..."
                        className="w-full pl-11 pr-4 py-2.5 bg-slate-50/50 border border-slate-100 text-[11px] font-bold rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 transition-all font-sans"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-700">
                    <Calendar className="h-3.5 w-3.5" />
                    Đang hiển thị {fullHistory.length}/8 học kỳ đến hiện tại
                </div>
            </div>

            {fullHistory.map((group, idx) => (
                <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                    {/* Semester Header */}
                    <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className={cn(
                                "h-2 w-2 rounded-full",
                                group.grades.some(g => !g.isPlaceholder) ? "bg-blue-500" : "bg-slate-300"
                            )} />
                            <h2 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">
                                {group.label} - {group.yearLabel} 
                                <span className="ml-2 text-slate-400 font-bold">({group.academicYear})</span>
                            </h2>
                        </div>
                        <div className={cn(
                            "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border shadow-sm",
                            group.totalRows > 0 ? "bg-white text-slate-600 border-slate-200" : "bg-white text-slate-200 border-slate-100"
                        )}>
                            {group.totalRows} Học phần
                        </div>
                    </div>

                    <div className="grid gap-3 border-b border-slate-100 bg-white px-6 py-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">GPA học kỳ</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{formatScore(group.summary.semesterGpa)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">CPA sau kỳ</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{formatScore(group.summary.cpa)}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">TC có điểm</p>
                            <p className="mt-1 text-xl font-black text-slate-900">{group.summary.attemptedCredits || 0}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">TC đạt trong kỳ</p>
                            <p className="mt-1 text-xl font-black text-emerald-700">{group.summary.earnedSemesterCredits || 0}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Đạt / Trượt</p>
                            <p className="mt-1 text-xl font-black text-slate-900">
                                {group.summary.passedCount || 0}
                                <span className="mx-1 text-slate-300">/</span>
                                <span className="text-rose-600">{group.summary.failedCount || 0}</span>
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-[10px]" style={{ minWidth: "1550px" }}>
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th rowSpan={3} className="py-2.5 px-4 text-center font-black text-slate-400 uppercase border-r border-slate-50 w-12">STT</th>
                                    <th rowSpan={3} className="py-2.5 px-4 text-left font-black text-slate-700 uppercase border-r border-slate-50 w-64">Học phần</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-50 w-12">TC</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-50 w-14 bg-amber-50/30">CC</th>
                                    <th colSpan={3} className="py-1.5 px-2 text-center font-black text-slate-400 uppercase border-r border-slate-50 bg-sky-50/30 text-[9px]">Thường Kỳ</th>
                                    <th colSpan={3} className="py-1.5 px-2 text-center font-black text-slate-400 uppercase border-r border-slate-50 bg-indigo-50/30 text-[9px]">LT Hệ số 1</th>
                                    <th colSpan={3} className="py-1.5 px-2 text-center font-black text-slate-400 uppercase border-r border-slate-50 bg-violet-50/30 text-[9px]">LT Hệ số 2</th>
                                    <th colSpan={2} className="py-1.5 px-2 text-center font-black text-slate-400 uppercase border-r border-slate-50 bg-teal-50/30 text-[9px]">Thực Hành</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-orange-700 uppercase border-r border-slate-50 w-16 bg-orange-50/40">TB TK</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-slate-500 uppercase border-r border-slate-50 w-14 bg-orange-50/30 text-[9px]">Dự thi</th>
                                    <th colSpan={3} className="py-1.5 px-2 text-center font-black text-rose-500 uppercase border-r border-slate-50 bg-rose-50/30 text-[9px]">Cuối Kỳ</th>
                                    <th colSpan={2} className="py-1.5 px-2 text-center font-black text-emerald-600 uppercase border-r border-slate-50 bg-emerald-50/30 text-[9px]">Tổng Kết</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-slate-600 uppercase border-r border-slate-50 w-14 bg-slate-50/50">Hệ 4</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-slate-600 uppercase border-r border-slate-50 w-12 bg-slate-50/50">Chữ</th>
                                    <th rowSpan={3} className="py-2.5 px-2 text-center font-black text-emerald-700 uppercase w-20 bg-emerald-50/20">Kết quả</th>
                                </tr>
                                <tr className="bg-slate-50/30 border-b border-slate-100 text-[8px] text-slate-400">
                                    <th className="py-1 px-1 border-r border-slate-50 bg-sky-50/20">TX1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-sky-50/20">TX2</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-sky-50/20">TX3</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-indigo-50/20">1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-indigo-50/20">2</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-indigo-50/20">3</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-violet-50/20">1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-violet-50/20">2</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-violet-50/20">3</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-teal-50/20">TH1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-teal-50/20">TH2</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-rose-50/20">T1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-rose-50/20">V</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-rose-50/20">T2</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-emerald-50/20">TK1</th>
                                    <th className="py-1 px-1 border-r border-slate-50 bg-emerald-50/20">TK2</th>
                                </tr>
                            </thead>
                            <tbody>
                                {group.grades.length > 0 ? (
                                    group.grades.map((g, idx) => {
                                        const reg = parseScores(g.regularScores);
                                        const c1 = parseScores(g.coef1Scores);
                                        const c2 = parseScores(g.coef2Scores);
                                        const th = parseScores(g.practiceScores);
                                        const tb = g.tbThuongKy ?? 0;
                                        const eligible = g.isEligibleForExam;
                                        const final1 = g.finalScore1;
                                        const final2 = g.finalScore2;
                                        const score4 = g.totalScore4;
                                        const letter = g.letterGrade;
                                        const credits = g.subject?.credits || g.subject?.credits;

                                        return (
                                            <tr key={idx} className={cn(
                                                "transition-colors border-slate-50 h-9",
                                                g.isPlaceholder ? "opacity-40 grayscale-[0.5]" : "hover:bg-slate-50/80"
                                            )}>
                                                <td className="py-1 px-4 text-center text-slate-300 font-bold border-r border-slate-50">{idx + 1}</td>
                                                <td className="py-1 px-4 border-r border-slate-50 font-black text-slate-800 uppercase leading-tight min-w-[200px]">
                                                    {g.subject?.name}
                                                    <p className="text-uneti-blue font-bold text-[8px] mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                                        {g.subject?.code}
                                                        {g.existingGrade && <span className="ml-2 text-emerald-600 italic">(Đã hoàn thành ở kỳ khác)</span>}
                                                    </p>
                                                </td>
                                                <td className="py-1 px-2 text-center font-black text-slate-500 border-r border-slate-50">{credits}</td>
                                                
                                                {/* Score Fields (Hidden if placeholder) */}
                                                {!g.isPlaceholder ? (
                                                    <>
                                                        <td className="py-1 px-2 text-center border-r border-slate-50 bg-amber-50/10 font-bold text-slate-700">{g.attendanceScore ?? ""}</td>
                                                        {Array.from({ length: 3 }).map((_, i) => <td key={i} className="py-1 px-1 text-center border-r border-slate-50 bg-sky-50/10 font-bold text-slate-600">{reg[i] ?? ""}</td>)}
                                                        {Array.from({ length: 3 }).map((_, i) => <td key={i} className="py-1 px-1 text-center border-r border-slate-50 bg-indigo-50/10 font-bold text-slate-600">{c1[i] ?? ""}</td>)}
                                                        {Array.from({ length: 3 }).map((_, i) => <td key={i} className="py-1 px-1 text-center border-r border-slate-50 bg-violet-50/10 font-bold text-slate-600">{c2[i] ?? ""}</td>)}
                                                        {Array.from({ length: 2 }).map((_, i) => <td key={i} className="py-1 px-1 text-center border-r border-slate-50 bg-teal-50/10 font-bold text-slate-600">{th[i] ?? ""}</td>)}
                                                        <td className="py-1 px-2 text-center border-r border-slate-100 bg-orange-50/30">
                                                            <span className={cn("font-black text-[10px]", tb >= 3 ? "text-orange-700" : "text-rose-600")}>{tb > 0 ? tb.toFixed(2) : ""}</span>
                                                        </td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-100 bg-orange-50/30 font-bold">
                                                            {eligible ? <span className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded-full border border-emerald-100 text-[8px] font-black uppercase">Đạt</span> : <span className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded-full border border-rose-100 text-[8px] font-black uppercase">Cấm</span>}
                                                        </td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-50 bg-rose-50/10 font-bold text-slate-700">{g.examScore1 ?? ""}</td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-50 bg-rose-50/10"><div className={cn("w-3 h-3 rounded-full mx-auto border-2", g.isAbsentFromExam ? "bg-rose-500 border-rose-200" : "bg-white border-slate-100")} /></td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-50 bg-rose-50/10 font-bold text-slate-700">{g.examScore2 ?? ""}</td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-50 bg-emerald-50/10"><span className="font-black text-[10px] text-emerald-700">{final1 !== null ? final1.toFixed(2) : ""}</span></td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-100 bg-emerald-50/10"><span className="font-black text-[10px] text-emerald-600">{final2 !== null ? final2.toFixed(2) : ""}</span></td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-100 bg-slate-50/50"><span className="font-black text-[10px] text-slate-700">{score4 !== null ? score4?.toFixed(2) : ""}</span></td>
                                                        <td className="py-1 px-2 text-center border-r border-slate-100 bg-slate-50/50">
                                                            <span className={cn("font-black text-[11px] tracking-widest", letter?.startsWith("A") ? "text-blue-600" : letter?.startsWith("B") ? "text-emerald-600" : letter?.startsWith("C") ? "text-orange-500" : letter?.startsWith("D") ? "text-amber-500" : "text-rose-600")}>{letter || ""}</span>
                                                        </td>
                                                        <td className="py-1 px-3 text-center pr-4">
                                                            {g.isPassed ? <span className="inline-flex items-center text-emerald-600 font-bold text-[8px] uppercase gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Đạt HP</span> : <span className="inline-flex items-center text-rose-600 font-bold text-[8px] uppercase gap-1 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">Trượt</span>}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td colSpan={14} className="border-r border-slate-50 bg-slate-50/10 text-center italic text-slate-300 tracking-widest">
                                                            Chưa đăng ký / Chưa có điểm
                                                        </td>
                                                        <td className="bg-slate-50/10" />
                                                        <td className="bg-slate-50/10" />
                                                        <td className="py-1 px-3 text-center pr-4">
                                                            {g.existingGrade ? <span className="text-emerald-500 uppercase font-black text-[7px] bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">Đã học</span> : <span className="text-slate-300 uppercase font-black text-[7px]">—</span>}
                                                        </td>
                                                    </>
                                                )}
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan={30} className="py-8 text-center text-slate-300 italic font-medium uppercase tracking-[0.2em] bg-slate-50/10">
                                            Không có môn học nào được thiết lập trong chương trình khung cho kỳ này
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}

            {/* Global Legend */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-wrap items-center gap-x-8 gap-y-2 opacity-80">
                <div className="flex items-center gap-2">
                    <Info size={14} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Ghi chú:</span>
                </div>
                <div className="flex flex-wrap gap-6 text-[9px] font-black text-slate-400 items-center uppercase">
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-slate-200" /> Hàng nhạt: Môn trong chương trình chưa có điểm</span>
                    <span className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Chấm xanh: Kỳ học đã hoàn thành / có điểm</span>
                </div>
            </div>
        </div>
    );
}
