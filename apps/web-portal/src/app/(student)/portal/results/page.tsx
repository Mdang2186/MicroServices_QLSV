"use client";

import { useEffect, useState, useMemo } from "react";
import { GradeSheetTable, parseScoreArray, type GradeSheetRow } from "@repo/shared-utils";
import { StudentService } from "@/services/student.service";
import {
    Search,
    Printer,
    FileText,
    GraduationCap,
    Hash,
    User,
    Download,
    LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

function getMaxScoreLength(rows: any[], field: "coef1Scores" | "coef2Scores" | "practiceScores") {
    return rows.reduce((max, row) => {
        if (row?.isPlaceholder) return max;
        return Math.max(max, parseScoreArray(row?.[field]).length);
    }, 0);
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

            timeline.push({
                label: `HK${sequentialNumber}`,
                yearLabel: `Năm ${Math.ceil(sequentialNumber / 2)}`,
                academicYear: `${academicStartYear} - ${academicStartYear + 1}`,
                systemSemester,
                grades: filteredRows,
                totalRows: mergedRows.length,
                summary: {
                    cpa,
                    hasActualGrades: actualRows.length > 0,
                },
            });
        });

        return timeline;
    }, [curriculumSemesters, grades, searchTerm, startYear, visibleSemesters]);

    const allSheetRows = useMemo((): GradeSheetRow[] => {
        return fullHistory.flatMap((group) => {
            return group.grades.map((g: any) => ({
                id: `${group.label}-${g.id || g.subjectId || g.subject?.id || g.subject?.code}`,
                semesterLabel: group.label,
                primaryText: g.subject?.name || "Học phần",
                secondaryText: g.subject?.code || "",
                credits: Number(g.subject?.credits || g.credits || 0),
                attendanceScore: g.isPlaceholder ? null : g.attendanceScore ?? null,
                regularScores: g.isPlaceholder ? [] : parseScoreArray(g.regularScores),
                coef1Scores: g.isPlaceholder ? [] : parseScoreArray(g.coef1Scores),
                coef2Scores: g.isPlaceholder ? [] : parseScoreArray(g.coef2Scores),
                practiceScores: g.isPlaceholder ? [] : parseScoreArray(g.practiceScores),
                tbThuongKy: g.isPlaceholder ? null : g.tbThuongKy ?? null,
                isEligibleForExam:
                    g.isPlaceholder || g.attendanceScore === null || g.attendanceScore === undefined
                        ? null
                        : g.isEligibleForExam,
                isAbsentFromExam: Boolean(g.isAbsentFromExam),
                examScore1: g.isPlaceholder ? null : g.examScore1 ?? null,
                examScore2: g.isPlaceholder ? null : g.examScore2 ?? null,
                finalScore1: g.isPlaceholder ? null : g.finalScore1 ?? null,
                finalScore2: g.isPlaceholder ? null : g.finalScore2 ?? null,
                totalScore10: g.isPlaceholder ? null : g.totalScore10 ?? null,
                totalScore4: g.isPlaceholder ? null : g.totalScore4 ?? null,
                letterGrade: g.isPlaceholder ? null : g.letterGrade ?? null,
                isPassed: Boolean(g.isPassed),
                cpa: group.summary?.cpa,
                notes: g.notes || (g.existingGrade ? "Hoàn thành ở kỳ khác" : ""),
                isPlaceholder: Boolean(g.isPlaceholder),
            }));
        });
    }, [fullHistory]);

    const maxCoef = useMemo(() => Math.max(3, getMaxScoreLength(allSheetRows, "coef1Scores"), getMaxScoreLength(allSheetRows, "coef2Scores")), [allSheetRows]);
    const maxPractice = useMemo(() => Math.max(2, getMaxScoreLength(allSheetRows, "practiceScores")), [allSheetRows]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-100 border-t-blue-600"></div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đang tải bảng điểm...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col bg-white overflow-hidden">


            {/* Main Sheet Area */}
            <div className="flex-1 overflow-hidden p-0">
                <GradeSheetTable
                    rows={allSheetRows}
                    showSemester={true}
                    labelHeader="Tên học phần"
                    coefColumns={maxCoef}
                    practiceColumns={maxPractice}
                    showNotes={true}
                    emptyMessage="Không tìm thấy môn học nào."
                />
            </div>

            {/* Footer / Status Bar Area */}
            <div className="h-8 shrink-0 border-t border-slate-200 bg-slate-50 px-4 flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        Tổng số: {allSheetRows.length} môn
                    </span>
                    <span className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        TC tích lũy: {curriculumProgress?.stats?.passed || 0}/{curriculumProgress?.stats?.totalCredits || "—"}
                    </span>
                </div>
                <div>
                    Sinh viên: {student?.fullName} ({student?.studentCode})
                </div>
            </div>
        </div>
    );
}
