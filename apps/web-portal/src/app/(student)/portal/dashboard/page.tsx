"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Link from "next/link";
import {
    GraduationCap,
    BookOpen,
    Award,
    Clock,
    MapPin,
    TrendingUp,
    ChevronRight,
    Calculator,
    Calendar,
    User,
    Trophy,
    CheckCircle2,
    ArrowRight,
    Bell,
    FileText,
    PieChart as PieChartIcon,
    Wallet,
    CreditCard,
    ClipboardList,
    AlertCircle,
    Camera
} from "lucide-react";

// ... (Rest of imports)
import { motion } from "framer-motion";
import {
    BarChart as RechartsBarChart,
    Bar as RechartsBar,
    XAxis as RechartsXAxis,
    YAxis as RechartsYAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer as RechartsResponsiveContainer,
    Cell as RechartsCell,
    PieChart as RechartsPieChart,
    Pie as RechartsPie
} from "recharts";

// Cast Recharts components to any to bypass TypeScript JSX errors
const BarChart = RechartsBarChart as any;
const Bar = RechartsBar as any;
const XAxis = RechartsXAxis as any;
const YAxis = RechartsYAxis as any;
const Tooltip = RechartsTooltip as any;
const ResponsiveContainer = RechartsResponsiveContainer as any;
const Cell = RechartsCell as any;
const PieChart = RechartsPieChart as any;
const Pie = RechartsPie as any;

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { resolveCurrentStudentContext } from "@/lib/current-student";

const toDate = (value: any) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const getSemesterKey = (semester: any, fallbackId?: string | null) =>
    `${semester?.id || fallbackId || semester?.code || semester?.name || ""}`.trim();

const matchesSelectedSemester = (
    targetSemester: any,
    targetSemesterId: string | null | undefined,
    selectedSemester: any | null,
) => {
    if (!selectedSemester) return false;

    // Direct ID match
    if (targetSemester?.id === selectedSemester.id || targetSemesterId === selectedSemester.id) return true;

    // Direct Key match
    const targetKey = getSemesterKey(targetSemester, targetSemesterId || targetSemester?.id);
    const selectedKey = getSemesterKey(selectedSemester, selectedSemester.id);
    if (targetKey && selectedKey && targetKey === selectedKey) return true;

    const selectedKeys = new Set(
        [
            selectedSemester?.id,
            selectedSemester?.code,
            selectedSemester?.name,
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

    if (targetKeys.some((value) => selectedKeys.has(value))) {
        return true;
    }

    const selectedConceptualSemester = parseConceptualSemester(selectedSemester);
    const targetConceptualSemester = parseConceptualSemester(targetSemester);
    if (
        selectedConceptualSemester &&
        targetConceptualSemester &&
        selectedConceptualSemester === targetConceptualSemester
    ) {
        return true;
    }

    if (
        targetSemester?.startDate &&
        targetSemester?.endDate &&
        selectedSemester?.startDate &&
        selectedSemester?.endDate
    ) {
        const targetStart = new Date(targetSemester.startDate);
        const targetEnd = new Date(targetSemester.endDate);
        const selectedStart = new Date(selectedSemester.startDate);
        const selectedEnd = new Date(selectedSemester.endDate);

        targetStart.setHours(0, 0, 0, 0);
        targetEnd.setHours(0, 0, 0, 0);
        selectedStart.setHours(0, 0, 0, 0);
        selectedEnd.setHours(0, 0, 0, 0);

        return (
            targetStart.getTime() === selectedStart.getTime() &&
            targetEnd.getTime() === selectedEnd.getTime()
        );
    }

    return false;
};

const formatSemesterLabel = (semester: any) => {
    if (!semester) return "Chưa xác định";
    const code = `${semester.code || ""}`.trim();
    const name = `${semester.name || ""}`.trim();
    if (!code) return name || "Học kỳ";
    if (!name) return code;
    if (name.toUpperCase().includes(code.toUpperCase())) return name;
    return `${code} - ${name}`;
};


const getCourseClassSchedules = (courseClass: any) =>
    Array.isArray(courseClass?.schedules) && courseClass.schedules.length > 0
        ? courseClass.schedules
        : Array.isArray(courseClass?.sessions)
            ? courseClass.sessions
            : [];

const getWeekRange = (date: Date) => {
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const jsDay = target.getDay();
    const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
    const start = new Date(target);
    start.setDate(target.getDate() + diffToMonday);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start, end };
};

type StudentCohortMeta = {
    code: string;
    startYear: number;
    endYear: number;
};

const parseConceptualSemester = (semester: any) => {
    const source = `${semester?.code || ""} ${semester?.name || ""}`;
    const match =
        source.match(/HK\s*([1-8])/i) ||
        source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
        source.match(/SEMESTER\s*([1-8])/i);
    return match ? Number(match[1]) : null;
};

const inferCohortMeta = (cohortCode?: string | null): StudentCohortMeta | null => {
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
};

const expectedYearForSemester = (startYear: number, conceptualSemester: number) =>
    startYear + Math.floor((conceptualSemester - 1) / 2);

const normalizeSemesterForCohort = (
    semester: any,
    cohortMeta: StudentCohortMeta,
    conceptualSemester: number,
) => {
    const studyYear = Math.ceil(conceptualSemester / 2);
    const academicStartYear = cohortMeta.startYear + studyYear - 1;
    const academicYearLabel = `${academicStartYear}-${academicStartYear + 1}`;
    const isOddSemester = conceptualSemester % 2 === 1;

    return {
        ...semester,
        code: `${cohortMeta.code}_HK${conceptualSemester}`,
        name: `HK${conceptualSemester} - Năm ${studyYear} (${academicYearLabel})`,
        year: isOddSemester ? academicStartYear : academicStartYear + 1,
        startDate: isOddSemester
            ? new Date(academicStartYear, 8, 1)
            : new Date(academicStartYear + 1, 1, 1),
        endDate: isOddSemester
            ? new Date(academicStartYear + 1, 0, 20)
            : new Date(academicStartYear + 1, 5, 30),
        semesterNumber: conceptualSemester,
        cohortSemesterNumber: conceptualSemester,
        cohortStudyYear: studyYear,
        cohortAcademicYear: academicYearLabel,
    };
};

const getSemesterStartYear = (semester: any) => {
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
};

const getSemesterHalfMatch = (semester: any, conceptualSemester: number) => {
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    if (!startDate || Number.isNaN(startDate.getTime())) {
        return 0;
    }

    const startMonth = startDate.getMonth() + 1;
    if (conceptualSemester % 2 === 1) {
        return startMonth >= 7 ? 1 : 0;
    }

    return startMonth >= 1 && startMonth <= 6 ? 1 : 0;
};

const getVisibleSemestersForCohort = (semesters: any[], cohortMeta: StudentCohortMeta | null) => {
    if (!cohortMeta) return semesters;

    const selected = Array.from({ length: 8 }, (_, index) => index + 1)
        .map((conceptualSemester) => {
            const expectedYear = expectedYearForSemester(
                cohortMeta.startYear,
                conceptualSemester,
            );

            const matchedSemester = semesters
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

            return normalizeSemesterForCohort(
                matchedSemester || { id: `${cohortMeta.code}_HK${conceptualSemester}` },
                cohortMeta,
                conceptualSemester,
            );
        })
        .filter(Boolean);

    return selected.length > 0 ? selected : semesters;
};

const getCurrentOrLatestStartedSemester = (semesters: any[]) => {
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
};

const limitToPastAndCurrentSemesters = (semesters: any[]) => {
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
};

const formatIntakeLabel = (student: any) => {
    const cohort = `${student?.adminClass?.cohort || student?.intake || ""}`.trim();
    return cohort || "Chưa cập nhật";
};

export default function StudentDashboard() {
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [trainingResults, setTrainingResults] = useState<any[]>([]);
    const [allSemesters, setAllSemesters] = useState<any[]>([]);
    const [curriculumProgress, setCurriculumProgress] = useState<any>(null);
    const [selectedResultSemesterKey, setSelectedResultSemesterKey] = useState("");
    const [selectedCourseSemesterKey, setSelectedCourseSemesterKey] = useState("");
    const [loading, setLoading] = useState(true);

    const loadDashboardData = useCallback(async () => {
        try {
            const context = await resolveCurrentStudentContext();
            const resolvedStudentId = context.studentId || context.profile?.id || null;
            if (!resolvedStudentId) return;

            const profileData =
                context.profile ||
                (await StudentService.getProfileSummary(resolvedStudentId).catch(() => null)) ||
                (context.userId ? await StudentService.getProfileSummary(context.userId).catch(() => null) : null);

            if (!profileData) return;

            const studentId = profileData.id || resolvedStudentId;
            const [gradesData, trainingData, curriculumData, semesterData, fallbackEnrollments] = await Promise.all([
                StudentService.getGrades(studentId).catch(() => []),
                StudentService.getTrainingResults(studentId).catch(() => []),
                StudentService.getCurriculumProgress(studentId).catch(() => null),
                StudentService.getSemesters().catch(() => []),
                StudentService.getEnrollments(studentId).catch(() => []),
            ]);

            setStudent(profileData);
            setEnrollments(fallbackEnrollments || []);
            setGrades(gradesData || []);
            setTrainingResults(trainingData || []);
            setCurriculumProgress(curriculumData || null);
            setAllSemesters(Array.isArray(semesterData) ? semesterData : []);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDashboardData();
    }, [loadDashboardData]);

    useEffect(() => {
        const handleRefresh = () => {
            if (document.visibilityState === "visible") {
                loadDashboardData();
            }
        };

        window.addEventListener("focus", loadDashboardData);
        document.addEventListener("visibilitychange", handleRefresh);

        return () => {
            window.removeEventListener("focus", loadDashboardData);
            document.removeEventListener("visibilitychange", handleRefresh);
        };
    }, [loadDashboardData]);

    const normalizedEnrollments = useMemo(() => {
        const bestByClass = new Map<string, any>();

        for (const enrollment of enrollments || []) {
            const courseClassId =
                enrollment?.courseClassId || enrollment?.courseClass?.id || enrollment?.id;
            if (!courseClassId) continue;

            const currentScore = getCourseClassSchedules(enrollment?.courseClass).length;
            const existing = bestByClass.get(courseClassId);
            const existingScore = existing
                ? getCourseClassSchedules(existing?.courseClass).length
                : -1;

            if (!existing || currentScore >= existingScore) {
                bestByClass.set(courseClassId, enrollment);
            }
        }

        return [...bestByClass.values()];
    }, [enrollments]);

    const semesterOptions = useMemo(() => {
        const map = new Map<string, any>();

        allSemesters.forEach((semester) => {
            const semesterKey = getSemesterKey(semester, semester?.id);
            if (!semesterKey) return;
            map.set(semesterKey, {
                id: semester?.id || semesterKey,
                code: semester?.code || "",
                name: semester?.name || semesterKey,
                startDate: toDate(semester?.startDate),
                endDate: toDate(semester?.endDate),
                isCurrent: Boolean(semester?.isCurrent),
            });
        });

        normalizedEnrollments.forEach((enrollment) => {
            const semester = enrollment?.courseClass?.semester;
            const semesterKey = getSemesterKey(semester, enrollment?.courseClass?.semesterId);
            if (!semesterKey) return;

            const current = map.get(semesterKey) || {
                id: semester?.id || enrollment?.courseClass?.semesterId || semesterKey,
                code: semester?.code || "",
                name: semester?.name || semesterKey,
                startDate: toDate(semester?.startDate),
                endDate: toDate(semester?.endDate),
                isCurrent: Boolean(semester?.isCurrent),
            };

            current.startDate = current.startDate || toDate(semester?.startDate);
            current.endDate = current.endDate || toDate(semester?.endDate);
            map.set(semesterKey, current);
        });

        grades.forEach((grade) => {
            const semester = grade?.courseClass?.semester;
            const semesterKey = getSemesterKey(semester, grade?.courseClass?.semesterId);
            if (!semesterKey) return;
            if (!map.has(semesterKey)) {
                map.set(semesterKey, {
                    id: semester?.id || grade?.courseClass?.semesterId || semesterKey,
                    code: semester?.code || "",
                    name: semester?.name || grade?.semester || semesterKey,
                    startDate: toDate(semester?.startDate),
                    endDate: toDate(semester?.endDate),
                    isCurrent: Boolean(semester?.isCurrent),
                });
            }
        });

        trainingResults.forEach((item) => {
            const semesterKey = `${item?.semesterId || item?.semester || ""}`.trim();
            if (!semesterKey || map.has(semesterKey)) return;
            map.set(semesterKey, {
                id: item?.semesterId || semesterKey,
                code: "",
                name: item?.semester || semesterKey,
                startDate: null,
                endDate: null,
            });
        });

        return [...map.values()].sort((left, right) => {
            const leftTime = left.startDate?.getTime() || 0;
            const rightTime = right.startDate?.getTime() || 0;
            return rightTime - leftTime;
        });
    }, [allSemesters, grades, normalizedEnrollments, trainingResults]);

    const cohortMeta = useMemo(
        () => inferCohortMeta(student?.adminClass?.cohort || student?.intake),
        [student?.adminClass?.cohort, student?.intake],
    );

    const visibleSemesterOptions = useMemo(() => {
        const scoped = getVisibleSemestersForCohort(semesterOptions, cohortMeta);
        const limited = limitToPastAndCurrentSemesters(scoped);
        return limited.length > 0 ? limited : scoped;
    }, [cohortMeta, semesterOptions]);

    const currentSemester = useMemo(() => {
        const exact = visibleSemesterOptions.find((semester) => {
            if (!semester?.startDate || !semester?.endDate) return false;
            const today = new Date();
            const start = new Date(semester.startDate);
            const end = new Date(semester.endDate);
            today.setHours(0, 0, 0, 0);
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
            return today >= start && today <= end;
        });
        if (exact) return exact;

        const byFlag = visibleSemesterOptions.find((semester) => semester?.isCurrent);
        if (byFlag) return byFlag;

        return getCurrentOrLatestStartedSemester(visibleSemesterOptions);
    }, [visibleSemesterOptions]);

    const scoredGrades = useMemo(
        () =>
            grades.filter((grade) => {
                const rawScore = grade?.totalScore10;
                return rawScore !== null && rawScore !== undefined && Number.isFinite(Number(rawScore));
            }),
        [grades],
    );

    useEffect(() => {
        if (!visibleSemesterOptions.length) {
            setSelectedResultSemesterKey("");
            setSelectedCourseSemesterKey("");
            return;
        }

        const defaultSemesterKey = currentSemester?.id || visibleSemesterOptions[0]?.id || "";

        setSelectedResultSemesterKey((current) => {
            // If we already have a valid selection that actually has grades, keep it
            if (current && visibleSemesterOptions.some(s => s.id === current)) {
                const currentHasGrades = scoredGrades.some(g => matchesSelectedSemester(g.courseClass?.semester, g.courseClass?.semesterId, visibleSemesterOptions.find(sv => sv.id === current)));
                if (currentHasGrades) return current;
            }

            // Otherwise, start with current semester, but if it has no grades, try to find the most recent one that does
            const currentObj = visibleSemesterOptions.find(s => s.id === defaultSemesterKey);
            const currentHasGrades = scoredGrades.some(g => matchesSelectedSemester(g.courseClass?.semester, g.courseClass?.semesterId, currentObj));

            if (!currentHasGrades) {
                const latestWithGrades = visibleSemesterOptions.find(s =>
                    scoredGrades.some(g => matchesSelectedSemester(g.courseClass?.semester, g.courseClass?.semesterId, s))
                );
                if (latestWithGrades) return latestWithGrades.id;
            }

            return defaultSemesterKey;
        });

        setSelectedCourseSemesterKey((current) =>
            visibleSemesterOptions.some((semester) => semester.id === current)
                ? current
                : defaultSemesterKey,
        );
    }, [currentSemester?.id, visibleSemesterOptions, scoredGrades.length]);

    const selectedResultSemester = useMemo(
        () =>
            visibleSemesterOptions.find((semester) => semester.id === selectedResultSemesterKey) ||
            null,
        [selectedResultSemesterKey, visibleSemesterOptions],
    );

    const filteredGrades = useMemo(() => {
        if (!selectedResultSemester) return [];
        return scoredGrades.filter((grade) =>
            matchesSelectedSemester(
                grade?.courseClass?.semester,
                grade?.courseClass?.semesterId,
                selectedResultSemester,
            ),
        );
    }, [scoredGrades, selectedResultSemester]);

    const chartData = useMemo(() => {
        return filteredGrades
            .slice()
            .sort((left, right) =>
                `${left?.subject?.code || left?.subject?.name || ""}`.localeCompare(
                    `${right?.subject?.code || right?.subject?.name || ""}`,
                    "vi",
                ),
            )
            .map((grade, index) => ({
                name: grade?.subject?.code || `HP${index + 1}`,
                fullName: grade?.subject?.name || grade?.subject?.code || `Học phần ${index + 1}`,
                score: Number(grade?.totalScore10 || 0),
                credits: Number(grade?.subject?.credits || 0),
            }));
    }, [filteredGrades]);

    const selectedCourseSemester = useMemo(
        () =>
            visibleSemesterOptions.find((semester) => semester.id === selectedCourseSemesterKey) ||
            currentSemester ||
            null,
        [currentSemester, selectedCourseSemesterKey, visibleSemesterOptions],
    );

    const currentSemesterEnrollments = useMemo(() => {
        if (!currentSemester) return [];
        return normalizedEnrollments.filter((enrollment) =>
            matchesSelectedSemester(
                enrollment?.courseClass?.semester,
                enrollment?.courseClass?.semesterId,
                currentSemester,
            ),
        );
    }, [currentSemester, normalizedEnrollments]);

    const dashboardCourseEnrollments = useMemo(() => {
        if (!selectedCourseSemester) return [];
        const matchedEnrollments = normalizedEnrollments.filter((enrollment) =>
            matchesSelectedSemester(
                enrollment?.courseClass?.semester,
                enrollment?.courseClass?.semesterId,
                selectedCourseSemester,
            ),
        );

        const bySubject = new Map<string, any>();
        matchedEnrollments.forEach((enrollment) => {
            const subjectKey =
                enrollment?.courseClass?.subjectId ||
                enrollment?.courseClass?.subject?.id ||
                enrollment?.courseClassId ||
                enrollment?.id;
            if (!subjectKey || bySubject.has(subjectKey)) return;
            bySubject.set(subjectKey, enrollment);
        });

        return [...bySubject.values()];
    }, [normalizedEnrollments, selectedCourseSemester]);

    const weeklyScheduleSummary = useMemo(() => {
        const { start, end } = getWeekRange(new Date());
        const allItems = currentSemesterEnrollments.flatMap((enrollment) =>
            getCourseClassSchedules(enrollment?.courseClass)
                .map((schedule: any) => ({
                    id: `${enrollment?.courseClass?.id || enrollment?.courseClassId}-${schedule?.id || `${schedule?.date}-${schedule?.startShift}`}`,
                    type: `${schedule?.type || "THEORY"}`.toUpperCase(),
                    date: toDate(schedule?.date),
                }))
                .filter((item: any) => item.date && item.date >= start && item.date <= end),
        );

        const unique = new Map<string, any>();
        allItems.forEach((item) => {
            unique.set(item.id, item);
        });

        const values = [...unique.values()];
        return {
            study: values.filter((item) => item.type !== "EXAM").length,
            exam: values.filter((item) => item.type === "EXAM").length,
        };
    }, [currentSemesterEnrollments]);

    const todaySchedule = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return currentSemesterEnrollments
            .flatMap((enrollment: any) =>
                getCourseClassSchedules(enrollment?.courseClass)
                    .filter((schedule: any) => {
                        const scheduleDate = toDate(schedule?.date);
                        if (!scheduleDate) return false;
                        scheduleDate.setHours(0, 0, 0, 0);
                        return scheduleDate.getTime() === today.getTime() && `${schedule?.type || "THEORY"}`.toUpperCase() !== "EXAM";
                    })
                    .map((schedule: any) => ({
                        id: `${enrollment?.courseClass?.id || enrollment?.courseClassId}-${schedule?.id || `${schedule?.date}-${schedule?.startShift}`}`,
                        startShift: Number(schedule?.startShift || 0),
                        endShift: Number(schedule?.endShift || 0),
                        subject: enrollment?.courseClass?.subject,
                        room: schedule?.room,
                    })),
            )
            .sort((left, right) => left.startShift - right.startShift);
    }, [currentSemesterEnrollments]);

    const earnedCredits = useMemo(() => {
        // Source of Truth 1: The official totalEarnedCredits from the Student table
        const officialCredits = Number(student?.totalEarnedCredits || 0);

        // Source of Truth 2: The calculated mandatory credits from the curriculum
        const requiredPassedCredits = Number(
            curriculumProgress?.stats?.passedMandatory || 0,
        );

        // If official credits are significantly higher than calculated mandatory (e.g. including electives),
        // we use the official number as the primary "Earned" count.
        if (officialCredits > requiredPassedCredits) {
            return officialCredits;
        }

        if (requiredPassedCredits > 0) {
            return requiredPassedCredits;
        }

        const curriculumPassedCredits = Number(curriculumProgress?.stats?.passed || 0);
        if (curriculumPassedCredits > 0) {
            return curriculumPassedCredits;
        }

        // Fallback: manual calculation from grades array
        const bestPassedBySubject = new Map<string, any>();
        for (const grade of grades || []) {
            const subjectId = `${grade?.subjectId || grade?.subject?.id || ""}`.trim();
            if (!subjectId) continue;

            const score = Number(grade?.totalScore10 || 0);
            const isPassed = grade?.isPassed === true || score >= 4;
            if (!isPassed) continue;

            const existing = bestPassedBySubject.get(subjectId);
            if (!existing || Number(existing?.totalScore10 || 0) < score) {
                bestPassedBySubject.set(subjectId, grade);
            }
        }

        const calculated = [...bestPassedBySubject.values()].reduce(
            (sum, grade) => sum + Number(grade?.subject?.credits || 0),
            0,
        );

        return calculated || officialCredits;
    }, [
        curriculumProgress?.stats?.passed,
        curriculumProgress?.stats?.passedMandatory,
        grades,
        student?.totalEarnedCredits,
    ]);

    const requiredCredits =
        Number(curriculumProgress?.stats?.mandatory || 0) ||
        Number(student?.major?.totalCreditsRequired || 0);

    const creditsData = [
        { name: "Đạt", value: earnedCredits },
        { name: "Còn lại", value: Math.max(0, requiredCredits - earnedCredits) }
    ];

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2.5rem] border border-slate-200 bg-white p-12">
                <h2 className="text-xl font-bold text-slate-800">Không tìm thấy hồ sơ sinh viên</h2>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 space-y-6 pb-20 text-slate-700 min-h-screen overflow-x-hidden">
            {/* Top Section: Info & Counters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Box */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row gap-8 shadow-sm">
                    <div className="flex flex-col items-center gap-4 w-fit">
                        <div className="text-xs font-bold text-slate-800 self-start uppercase">Thông tin sinh viên</div>
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner">
                            <img
                                src={student?.user?.avatarUrl || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2576&auto=format&fit=crop"}
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <Link href="/portal/dashboard">
                            <Button variant="link" className="text-blue-600 text-[10px] font-bold h-auto p-0 hover:no-underline">Xem chi tiết</Button>
                        </Link>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 pt-6 border-l border-slate-100 pl-8">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">MSSV: <span className="text-slate-700 ml-1">{student?.studentCode}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Họ tên: <span className="text-slate-700 ml-1 font-black">{student?.fullName}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Giới tính: <span className="text-slate-700 ml-1">{student?.gender || "Chưa cập nhật"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Ngày sinh: <span className="text-slate-700 ml-1">{toDate(student?.dob)?.toLocaleDateString('vi-VN') || "Chưa cập nhật"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Nơi sinh: <span className="text-slate-700 ml-1">{student?.birthPlace || "Chưa cập nhật"}</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Lớp học: <span className="text-slate-700 ml-1">{student?.adminClass?.code || "Chưa xếp lớp"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Khóa học: <span className="text-slate-700 ml-1">{formatIntakeLabel(student)}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Bậc đào tạo: <span className="text-slate-700 ml-1">{student?.educationLevel || "Chưa cập nhật"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Loại hình đào tạo: <span className="text-slate-700 ml-1">{student?.educationType || "Chưa cập nhật"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Ngành: <span className="text-slate-700 ml-1">{student?.major?.name}</span></p>
                        </div>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nhắc nhở mới, chưa xem</p>
                            <p className="text-3xl font-black text-slate-800 mt-1">0</p>
                            <Link href="/portal/dashboard">
                                <Button variant="link" className="text-blue-600 text-[10px] font-bold h-auto p-0 mt-2 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400">
                            <Bell className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sky-50/50 rounded-xl border border-sky-100 p-4 border-l-4 border-l-sky-400 shadow-sm relative overflow-hidden group hover:bg-sky-50 transition-colors">
                            <p className="text-[10px] font-bold text-sky-600/70 uppercase">Lịch học trong tuần</p>
                            <p className="text-2xl font-black text-sky-700 mt-1">{weeklyScheduleSummary.study}</p>
                            <Link href="/portal/schedule">
                                <Button variant="link" className="text-sky-600 text-[10px] font-bold h-auto p-0 mt-1 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                            <Calendar className="absolute -right-2 -bottom-2 h-10 w-10 text-sky-200 opacity-50 group-hover:scale-125 transition-transform" />
                        </div>
                        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4 border-l-4 border-l-amber-400 shadow-sm relative overflow-hidden group hover:bg-amber-50 transition-colors">
                            <p className="text-[10px] font-bold text-amber-600/70 uppercase">Lịch thi trong tuần</p>
                            <p className="text-2xl font-black text-amber-700 mt-1">{weeklyScheduleSummary.exam}</p>
                            <Link href="/portal/schedule">
                                <Button variant="link" className="text-amber-600 text-[10px] font-bold h-auto p-0 mt-1 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                            <Clock className="absolute -right-2 -bottom-2 h-10 w-10 text-amber-200 opacity-50 group-hover:scale-125 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                {[
                    { label: "Điểm danh QR", icon: Camera, color: "text-indigo-500", href: "/portal/attendance/scan" },
                    { label: "Đề xuất biểu mẫu", icon: FileText, color: "text-sky-500", href: "/portal/enroll" },
                    { label: "Nhắc nhở", icon: Bell, color: "text-blue-500", href: "/portal/dashboard" },
                    { label: "Kết quả học tập", icon: TrendingUp, color: "text-indigo-500", href: "/portal/results" },
                    { label: "Lịch theo tuần", icon: Calendar, color: "text-blue-600", href: "/portal/schedule" },
                    { label: "Lịch theo tiến độ", icon: ClipboardList, color: "text-sky-600", href: "/portal/training" },
                    { label: "Tra cứu công nợ", icon: Wallet, color: "text-emerald-600", href: "/portal/tuition" },
                    { label: "Phiếu thu tổng hợp", icon: FileText, color: "text-sky-700", href: "/portal/tuition?tab=history" },
                ].map((action, i) => (
                    <Link key={i} href={action.href} className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300", action.color)}>
                            <action.icon className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 text-center leading-tight">{action.label}</span>
                    </Link>
                ))}
            </div>

            {/* Today's Schedule (Specifically requested) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-blue-600 rounded-full" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Lịch học hôm nay</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {(() => {
                        const shiftTimes: { [key: number]: string } = {
                            1: "07:00 - 09:30",
                            2: "09:35 - 12:05",
                            3: "12:30 - 15:00",
                            4: "15:05 - 17:35",
                            5: "18:00 - 20:30",
                            // Fallback for higher shifts if any
                            6: "07:00 - 09:30",
                            7: "09:35 - 12:05",
                            8: "12:30 - 15:00",
                            9: "15:05 - 17:35",
                            10: "18:00 - 20:30"
                        };

                        if (todaySchedule.length === 0) {
                            return (
                                <div className="flex-1 py-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-xl text-slate-300">
                                    <Calendar className="h-6 w-6 mb-1 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest italic font-sans">Nghỉ ngơi thôi! Hôm nay bạn không có tiết học.</p>
                                </div>
                            );
                        }

                        return todaySchedule.map((sch, i) => (
                            <Link key={i} href="/portal/schedule" className="min-w-[240px] bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 group hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                                <div className="flex flex-col items-center justify-center bg-white border border-slate-100 h-12 w-12 rounded-xl text-blue-600 font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <span className="text-[10px] opacity-70">TIẾT</span>
                                    <span className="text-lg leading-none">{sch.startShift}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-slate-700 truncate uppercase leading-tight group-hover:text-blue-600 transition-colors">{sch.subject?.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {shiftTimes[sch.startShift]}</span>
                                        <span className="flex items-center gap-1 italic"><MapPin className="h-3 w-3" /> P.{sch.room?.name || '---'}</span>
                                    </div>
                                </div>
                            </Link>
                        ));
                    })()}
                </div>
            </div>

            {/* Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-12 gap-6">
                {/* Academic results (Bar chart) */}
                <div className="lg:col-span-2 xl:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                        <h3 className="text-sm font-black text-slate-800">Kết quả học tập</h3>
                        <select
                            value={selectedResultSemesterKey}
                            onChange={(event) => setSelectedResultSemesterKey(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                        >
                            {visibleSemesterOptions.map((semester) => (
                                <option key={semester.id} value={semester.id}>
                                    {formatSemesterLabel(semester)}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="h-64 w-full bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed rounded-xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <XAxis
                                    dataKey="name"
                                    tick={{ fontSize: 10, fill: "#64748b", fontWeight: 700 }}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0}
                                />
                                <YAxis hide domain={[0, 10]} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={24}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.score >= 8.5 ? '#10b981' : entry.score >= 7.0 ? '#3b82f6' : entry.score >= 5.0 ? '#f59e0b' : '#ef4444'}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </Bar>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const dataPoint = payload[0]?.payload;
                                            return (
                                                <div className="rounded bg-slate-900 px-3 py-2 text-[10px] font-bold text-white">
                                                    <p>{dataPoint?.fullName}</p>
                                                    <p className="mt-1">Điểm: {payload[0].value}</p>
                                                    <p>Tín chỉ: {dataPoint?.credits || 0}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        {chartData.length === 0 && (
                            <div className="flex items-center justify-center h-full -mt-64 relative z-10 pointer-events-none">
                                <p className="text-slate-400 text-xs font-bold bg-white/50 px-4 py-2 rounded-lg backdrop-blur-sm">
                                    {selectedResultSemester
                                        ? `Chưa có điểm tổng kết cho ${formatSemesterLabel(selectedResultSemester)}`
                                        : "Chưa có điểm tổng kết theo học kỳ"}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Credit progress (Doughnut chart) */}
                <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-between">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4 w-full">
                        <h3 className="text-sm font-black text-slate-800 self-start">Tiến độ học tập</h3>
                        <Link href="/portal/training">
                            <ChevronRight className="h-4 w-4 text-slate-300 hover:text-blue-500 cursor-pointer" />
                        </Link>
                    </div>
                    <div className="h-56 w-56 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={creditsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <Cell fill="#00e5ff" />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-black text-blue-600">{earnedCredits}</span>
                            <div className="w-12 h-0.5 bg-slate-200 my-1" />
                            <span className="text-sm font-black text-slate-400">{requiredCredits || 0}</span>
                        </div>
                    </div>
                    <div className="w-full h-1" /> {/* Spacer */}
                </div>

                {/* Course List */}
                <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                        <h3 className="text-sm font-black text-slate-800">Lớp học phần</h3>
                        <select
                            value={selectedCourseSemesterKey}
                            onChange={(event) => setSelectedCourseSemesterKey(event.target.value)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none"
                        >
                            {visibleSemesterOptions.map((semester) => (
                                <option key={semester.id} value={semester.id}>
                                    {formatSemesterLabel(semester)}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-tight pb-2 border-b border-slate-50">
                            <div className="col-span-9">Môn học/Học phần</div>
                            <div className="col-span-3 text-right">Số tín chỉ</div>
                        </div>
                        {dashboardCourseEnrollments.length > 0 ? (
                            dashboardCourseEnrollments.map((enr, i) => (
                                <div key={i} className="grid grid-cols-12 items-center group">
                                    <div className="col-span-9 pr-4">
                                        <Link href="/portal/schedule">
                                            <p className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer tracking-tight">{enr.courseClass?.code}</p>
                                        </Link>
                                        <h4 className="text-[11px] font-bold text-slate-600 truncate">{enr.courseClass?.subject?.name}</h4>
                                    </div>
                                    <div className="col-span-3 text-right text-xs font-black text-slate-800">
                                        {enr.courseClass?.subject?.credits}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-400 text-xs italic">
                                Không có học phần trong học kỳ đã chọn
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
