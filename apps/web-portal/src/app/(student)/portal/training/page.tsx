"use client";

import React, { useEffect, useMemo, useState } from "react";
import { resolveCurrentStudentContext } from "@/lib/current-student";
import { StudentService } from "@/services/student.service";

const SLOT_COUNT = 8;
const STUDY_YEAR_COUNT = 4;

type TrainingSlot = {
    slotNumber: number;
    studyYear: number;
    expectedYear: number;
    expectedSemNo: number;
    displayLabel: string;
    legacyLabel: string;
    semesterId: string | null;
    semesterName: string;
};

function parseDateOnly(value: unknown) {
    if (!value) return null;
    const text = `${value}`;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseIntakeYear(intake: string | null | undefined): number | null {
    if (!intake) return null;
    const normalized = intake.trim().toUpperCase();

    if (/^\d{4}$/.test(normalized)) return parseInt(normalized, 10);

    const cohortMatch = normalized.match(/^K(\d{1,2})$/);
    if (cohortMatch) {
        const cohortNumber = parseInt(cohortMatch[1], 10);
        if (cohortNumber >= 10 && cohortNumber <= 40) return 2006 + cohortNumber;
        if (cohortNumber >= 50) return 1957 + cohortNumber;
    }

    const classYearMatch = normalized.match(/^(\d{2})/);
    if (classYearMatch) {
        const year = parseInt(classYearMatch[1], 10);
        if (year >= 10 && year <= 50) return 2000 + year;
    }

    return null;
}

function normalizeCohortCode(value?: string | null) {
    const raw = `${value || ""}`.trim().toUpperCase();
    if (!raw) return null;

    const direct = raw.match(/^K?(\d{1,2})$/);
    if (direct) return `K${Number(direct[1])}`;

    const embedded = raw.match(/\bK(\d{1,2})\b/);
    if (embedded) return `K${Number(embedded[1])}`;

    const legacyClass = raw.match(/^(\d{2})A[12]/);
    if (legacyClass) return `K${Number(legacyClass[1])}`;

    const studentCode = raw.match(/^SVK?(\d{2})/);
    if (studentCode) return `K${Number(studentCode[1])}`;

    return null;
}

function resolveStudentCohortCode(student: any) {
    const candidates = [
        student?.intake,
        student?.adminClass?.cohort,
        student?.adminClass?.code,
        student?.studentCode,
        student?.student?.studentCode,
        student?.username,
    ];

    for (const candidate of candidates) {
        const cohortCode = normalizeCohortCode(candidate);
        if (cohortCode) return cohortCode;
    }

    return null;
}

function parseLegacyAdminClassMeta(adminClassCode?: string | null, cohortCode?: string | null) {
    const code = `${adminClassCode || ""}`.trim().toUpperCase();
    const cohort = `${cohortCode || ""}`.trim().toUpperCase();
    if (!code || code.startsWith("K")) return null;

    const match = code.match(/^(\d{2})A([12])-([A-Z0-9]+)$/);
    if (!match) return null;

    return {
        cohort: cohort || `K${match[1]}`,
        section: match[2].padStart(2, "0"),
        majorCode: match[3],
    };
}

function normalizeText(value?: string | null) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function compactText(value?: string | null) {
    return normalizeText(value).replace(/\s+/g, "");
}

function normalizeComparable(value?: string | null) {
    return normalizeText(value).replace(/[^a-z0-9]/g, "");
}

function extractHkNumber(label?: string | null) {
    const normalized = normalizeText(label);
    const match = normalized.match(/\bhk\s*([1-8])\b|\bhoc ky\s*([1-8])\b/);
    const rawValue = match?.[1] || match?.[2];
    return rawValue ? Number(rawValue) : null;
}

function extractStudyYearNumber(label?: string | null) {
    const normalized = normalizeText(label);
    const match = normalized.match(/\bnam\s*([1-4])\b/);
    return match?.[1] ? Number(match[1]) : null;
}

function extractAcademicYearStart(label?: string | null) {
    const normalized = normalizeText(label);
    const match = normalized.match(/\b(20\d{2})\s*-\s*(20\d{2})\b/);
    return match ? Number(match[1]) : null;
}

function buildExpectedSlots(startYear: number): TrainingSlot[] {
    return Array.from({ length: SLOT_COUNT }, (_, index) => {
        const slotNumber = index + 1;
        const studyYear = Math.floor(index / 2) + 1;
        const expectedSemNo = index % 2 === 0 ? 1 : 2;
        const expectedYear = startYear + studyYear - 1;
        const academicYearLabel = `${expectedYear}-${expectedYear + 1}`;

        return {
            slotNumber,
            studyYear,
            expectedYear,
            expectedSemNo,
            displayLabel: `HK${expectedSemNo} (${academicYearLabel})`,
            legacyLabel: `HK${slotNumber} - Năm ${studyYear} (${academicYearLabel})`,
            semesterId: null,
            semesterName: "",
        };
    });
}

function resolveSlotFromDates(startDate: Date | null, endDate: Date | null, startYear: number | null) {
    if (!startDate || !startYear) return null;

    const compareDate = endDate || startDate;
    for (let yearIndex = 0; yearIndex < STUDY_YEAR_COUNT; yearIndex += 1) {
        const academicStartYear = startYear + yearIndex;
        const oddSemester = yearIndex * 2 + 1;
        const evenSemester = yearIndex * 2 + 2;
        const firstStart = new Date(academicStartYear, 8, 1);
        const firstEnd = new Date(academicStartYear + 1, 0, 31, 23, 59, 59);
        const secondStart = new Date(academicStartYear + 1, 1, 1);
        const secondEnd = new Date(academicStartYear + 1, 6, 31, 23, 59, 59);

        if (compareDate >= firstStart && startDate <= firstEnd) {
            return oddSemester;
        }

        if (compareDate >= secondStart && startDate <= secondEnd) {
            return evenSemester;
        }
    }

    return null;
}

function resolveSlotFromLabel(label: string | null | undefined, startYear: number | null) {
    const hkNumber = extractHkNumber(label);
    if (!hkNumber) return null;

    if (hkNumber >= 3 && hkNumber <= 8) return hkNumber;

    const studyYear = extractStudyYearNumber(label);
    if (studyYear && hkNumber >= 1 && hkNumber <= 2) {
        return (studyYear - 1) * 2 + hkNumber;
    }

    const academicYearStart = extractAcademicYearStart(label);
    if (startYear !== null && academicYearStart !== null) {
        const yearOffset = academicYearStart - startYear;
        if (yearOffset >= 0 && yearOffset < STUDY_YEAR_COUNT) {
            return yearOffset * 2 + hkNumber;
        }
    }

    return hkNumber >= 1 && hkNumber <= SLOT_COUNT ? hkNumber : null;
}

function isLegacyMultiSemesterLabel(value: string) {
    return /^hk[3-9]|^hk[1-9][0-9]/.test(value);
}

function buildSlotsFromSystemSemesters(allSemesters: any[], startYear: number) {
    const slots = buildExpectedSlots(startYear);
    const sorted = [...(allSemesters || [])].sort((left, right) => {
        const leftTime = left?.startDate ? new Date(left.startDate).getTime() : 0;
        const rightTime = right?.startDate ? new Date(right.startDate).getTime() : 0;
        return leftTime - rightTime;
    });
    const usedSemIds = new Set<string>();

    slots.forEach((slot) => {
        const academicYearLabel = `${slot.expectedYear}-${slot.expectedYear + 1}`;
        const compactYearLabel = academicYearLabel.replace("-", "");
        let bestScore = -1;
        let bestSemester: any = null;

        for (const semester of sorted) {
            const semesterId = `${semester?.id || ""}`.trim();
            if (!semesterId || usedSemIds.has(semesterId)) continue;

            const name = compactText(semester?.name);
            if (!name) continue;

            const hasYearRange =
                name.includes(academicYearLabel) || name.includes(compactYearLabel);
            if (!hasYearRange || isLegacyMultiSemesterLabel(name)) continue;

            let score = 0;
            if (
                name.startsWith(`hk${slot.expectedSemNo}`) ||
                name.includes(`hk${slot.expectedSemNo}`) ||
                name.includes(`hocky${slot.expectedSemNo}`)
            ) {
                score += 10;
            }

            if (name.includes(`nam${slot.studyYear}`)) {
                score += 5;
            }

            if (score > bestScore) {
                bestScore = score;
                bestSemester = semester;
            }
        }

        if (bestScore < 3) {
            const augStart = new Date(`${slot.expectedYear}-08-01`).getTime();
            const janStart = new Date(`${slot.expectedYear + 1}-01-01`).getTime();
            const augEnd = new Date(`${slot.expectedYear + 1}-08-31`).getTime();
            const windowStart = slot.expectedSemNo === 1 ? augStart : janStart;
            const windowEnd = slot.expectedSemNo === 1 ? janStart : augEnd;

            bestSemester = sorted.find((semester) => {
                const semesterId = `${semester?.id || ""}`.trim();
                if (!semesterId || usedSemIds.has(semesterId)) return false;

                const startTime = semester?.startDate
                    ? new Date(semester.startDate).getTime()
                    : Number.NaN;
                const name = compactText(semester?.name);
                return (
                    Number.isFinite(startTime) &&
                    startTime >= windowStart &&
                    startTime < windowEnd &&
                    !isLegacyMultiSemesterLabel(name)
                );
            });

            if (!bestSemester) {
                bestSemester = sorted.find((semester) => {
                    const semesterId = `${semester?.id || ""}`.trim();
                    if (!semesterId || usedSemIds.has(semesterId)) return false;

                    const startDate = parseDateOnly(semester?.startDate);
                    if (!startDate) return false;

                    const month = startDate.getMonth() + 1;
                    const year = startDate.getFullYear();
                    const yearMatches = year === slot.expectedYear || year === slot.expectedYear + 1;
                    if (!yearMatches) return false;

                    return slot.expectedSemNo === 1
                        ? month >= 8 && month <= 11
                        : month >= 12 || month <= 3;
                });
            }
        }

        if (!bestSemester) {
            bestSemester =
                sorted.find((semester) => {
                    const semesterId = `${semester?.id || ""}`.trim();
                    if (!semesterId || usedSemIds.has(semesterId)) return false;

                    const name = compactText(semester?.name);
                    return (
                        name.includes(academicYearLabel) ||
                        name.includes(compactYearLabel) ||
                        name.includes(String(slot.expectedYear)) ||
                        name.includes(String(slot.expectedYear + 1))
                    );
                }) || null;
        }

        if (bestSemester?.id) {
            usedSemIds.add(bestSemester.id);
            slot.semesterId = bestSemester.id;
            slot.semesterName = `${bestSemester?.name || ""}`.trim();
        }
    });

    return slots;
}

function resolveEarliestYearFromSemesterItems(items: any[]) {
    let minYear = Number.POSITIVE_INFINITY;

    for (const item of items || []) {
        const label = `${item?.label || item?.semester?.name || item?.name || ""}`.trim();
        const labelYear = extractAcademicYearStart(label);
        if (labelYear && labelYear < minYear) {
            minYear = labelYear;
            continue;
        }

        const startDate = parseDateOnly(item?.startDate || item?.semester?.startDate);
        if (startDate && startDate.getFullYear() < minYear) {
            minYear = startDate.getFullYear();
        }
    }

    return Number.isFinite(minYear) ? minYear : null;
}

function resolveTrainingSlot(
    item: any,
    startYear: number | null,
    semesterIdToSlot: Map<string, number>,
    semesterNameToSlot: Map<string, number>,
) {
    const semesterId = `${item?.semesterId || ""}`.trim();
    if (semesterId && semesterIdToSlot.has(semesterId)) {
        return semesterIdToSlot.get(semesterId) || null;
    }

    const semesterLabel = `${item?.semester || ""}`.trim();
    const normalizedLabel = normalizeText(semesterLabel);
    if (normalizedLabel && semesterNameToSlot.has(normalizedLabel)) {
        return semesterNameToSlot.get(normalizedLabel) || null;
    }

    return resolveSlotFromLabel(semesterLabel, startYear);
}

function resolveDisplayAdminClass(student: any, adminClasses: any[]) {
    const directAdminClassId = `${student?.adminClassId || student?.adminClass?.id || ""}`.trim();
    const directAdminClassCode = `${student?.adminClass?.code || ""}`.trim().toUpperCase();
    const cohortCode = resolveStudentCohortCode(student);

    if (directAdminClassId && directAdminClassCode.startsWith("K")) {
        return (
            adminClasses.find((item: any) => item.id === directAdminClassId) || {
                id: directAdminClassId,
                code: directAdminClassCode,
                cohort: cohortCode,
            }
        );
    }

    if (directAdminClassCode.startsWith("K")) {
        return (
            adminClasses.find((item: any) => `${item?.code || ""}`.trim().toUpperCase() === directAdminClassCode) ||
            null
        );
    }

    const legacyMeta = parseLegacyAdminClassMeta(directAdminClassCode, cohortCode);
    if (legacyMeta) {
        return (
            adminClasses.find((item: any) => {
                const code = `${item?.code || ""}`.trim().toUpperCase();
                return (
                    `${item?.cohort || ""}`.trim().toUpperCase() === legacyMeta.cohort &&
                    code.startsWith(`${legacyMeta.cohort}-`) &&
                    code.includes(`-${legacyMeta.majorCode}`) &&
                    code.endsWith(`-${legacyMeta.section}`)
                );
            }) || null
        );
    }

    if (directAdminClassId) {
        return adminClasses.find((item: any) => item.id === directAdminClassId) || null;
    }

    return null;
}

function resolveStudentCodeCandidates(student: any, profile: any) {
    return [
        profile?.studentCode,
        student?.studentCode,
        student?.student?.studentCode,
    ]
        .map((value) => `${value || ""}`.trim().toUpperCase())
        .filter(Boolean);
}

function resolveStudentTrainingRow(rows: any[], student: any, profile: any) {
    if (!Array.isArray(rows) || rows.length === 0) return null;

    const studentCodes = new Set(resolveStudentCodeCandidates(student, profile));
    for (const row of rows) {
        const rowStudentCode = `${row?.studentCode || ""}`.trim().toUpperCase();
        if (rowStudentCode && studentCodes.has(rowStudentCode)) {
            return row;
        }
    }

    const normalizedNames = new Set(
        [
            profile?.fullName,
            student?.fullName,
            student?.student?.fullName,
        ]
            .map((value) => normalizeComparable(value))
            .filter(Boolean),
    );
    const codeSuffixes = [...studentCodes]
        .map((value) => value.match(/(\d{2,})$/)?.[1] || "")
        .filter(Boolean);

    for (const row of rows) {
        const rowName = normalizeComparable(row?.fullName);
        const rowStudentCode = `${row?.studentCode || ""}`.trim().toUpperCase();
        if (!rowName || !normalizedNames.has(rowName)) continue;
        if (codeSuffixes.length === 0 || codeSuffixes.some((suffix) => rowStudentCode.endsWith(suffix))) {
            return row;
        }
    }

    return null;
}

export default function TrainingResultsPage() {
    const [trainingData, setTrainingData] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [studentIdentity, setStudentIdentity] = useState<any>(null);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [allSemesters, setAllSemesters] = useState<any[]>([]);
    const [cohortSemesters, setCohortSemesters] = useState<any[]>([]);
    const [cohortCode, setCohortCode] = useState<string | null>(null);
    const [selectedAdminClass, setSelectedAdminClass] = useState<any>(null);
    const [selectedStudentClassRow, setSelectedStudentClassRow] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const ctx = await resolveCurrentStudentContext();
                const identity = ctx.profile || ctx.sessionUser || null;
                const resolvedCohortCode = resolveStudentCohortCode(identity);

                setProfile(ctx.profile || null);
                setStudentIdentity(identity);
                setCohortCode(resolvedCohortCode);

                if (!ctx.studentId) return;

                const [data, cohs, semesters, cohortSemesterItems, classItems] = await Promise.all([
                    StudentService.getTrainingResults(ctx.studentId),
                    StudentService.getCohorts(),
                    StudentService.getSemesters(),
                    resolvedCohortCode
                        ? StudentService.getCohortSemesters(resolvedCohortCode).catch(() => [])
                        : Promise.resolve([]),
                    resolvedCohortCode
                        ? StudentService.getAdminClasses(undefined, resolvedCohortCode).catch(() => [])
                        : Promise.resolve([]),
                ]);

                setTrainingData(Array.isArray(data) ? data : []);
                setCohorts(Array.isArray(cohs) ? cohs : []);
                setAllSemesters(Array.isArray(semesters) ? semesters : []);
                setCohortSemesters(Array.isArray(cohortSemesterItems) ? cohortSemesterItems : []);

                const resolvedAdminClass = resolveDisplayAdminClass(identity, Array.isArray(classItems) ? classItems : []);
                setSelectedAdminClass(resolvedAdminClass);

                if (resolvedAdminClass?.id) {
                    const classRows = await StudentService.getAdminClassTrainingResults(resolvedAdminClass.id).catch(
                        () => [],
                    );
                    setSelectedStudentClassRow(
                        resolveStudentTrainingRow(
                            Array.isArray(classRows) ? classRows : [],
                            identity,
                            ctx.profile,
                        ),
                    );
                } else {
                    setSelectedStudentClassRow(null);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const effectiveCohortCode = selectedAdminClass?.cohort || cohortCode;

    const resolvedStartYear = useMemo(() => {
        if (effectiveCohortCode) {
            const cohort = cohorts.find(
                (item) => `${item?.code || ""}`.trim().toUpperCase() === effectiveCohortCode,
            );
            if (cohort?.startYear) return Number(cohort.startYear);

            const parsedCohortYear = parseIntakeYear(effectiveCohortCode);
            if (parsedCohortYear) return parsedCohortYear;
        }

        const intakeYear = parseIntakeYear(
            studentIdentity?.intake ||
                studentIdentity?.adminClass?.cohort ||
                studentIdentity?.adminClass?.code ||
                studentIdentity?.studentCode ||
                studentIdentity?.student?.studentCode,
        );
        if (intakeYear) return intakeYear;

        if (profile?.admissionDate) {
            const admissionYear = new Date(profile.admissionDate).getFullYear();
            if (Number.isFinite(admissionYear)) return admissionYear;
        }

        const cohortSemestersYear = resolveEarliestYearFromSemesterItems(cohortSemesters);
        if (cohortSemestersYear) return cohortSemestersYear;

        let minYear = Number.POSITIVE_INFINITY;
        for (const item of trainingData) {
            const academicYearStart = extractAcademicYearStart(item?.semester);
            if (academicYearStart && academicYearStart < minYear) {
                minYear = academicYearStart;
            }
        }

        if (Number.isFinite(minYear)) return minYear;
        return new Date().getFullYear() - STUDY_YEAR_COUNT;
    }, [cohortSemesters, cohorts, effectiveCohortCode, profile, studentIdentity, trainingData]);

    const canonicalSlots = useMemo(() => {
        if (selectedAdminClass) {
            return buildSlotsFromSystemSemesters(allSemesters, resolvedStartYear);
        }

        const slots = buildExpectedSlots(resolvedStartYear);

        const assignSemester = (slotNumber: number | null, semesterId: string, semesterName: string) => {
            if (!slotNumber || slotNumber < 1 || slotNumber > SLOT_COUNT) return;

            const slot = slots[slotNumber - 1];
            if (!slot.semesterId && semesterId) {
                slot.semesterId = semesterId;
            }
            if (!slot.semesterName && semesterName) {
                slot.semesterName = semesterName;
            }
        };

        cohortSemesters.forEach((item: any) => {
            const semesterRecord =
                item?.semester && typeof item.semester === "object" ? item.semester : item;
            const semesterId = `${item?.semesterId || semesterRecord?.id || item?.id || ""}`.trim();
            const semesterName = `${semesterRecord?.name || item?.label || item?.name || ""}`.trim();
            const slotNumber =
                Number(item?.semesterNumber || semesterRecord?.semesterNumber || 0) ||
                resolveSlotFromLabel(semesterName, resolvedStartYear) ||
                resolveSlotFromDates(
                    parseDateOnly(item?.startDate || semesterRecord?.startDate),
                    parseDateOnly(item?.endDate || semesterRecord?.endDate),
                    resolvedStartYear,
                );

            assignSemester(slotNumber, semesterId, semesterName);
        });

        if (slots.some((slot) => !slot.semesterId)) {
            const fallbackSlots = buildSlotsFromSystemSemesters(allSemesters, resolvedStartYear);
            fallbackSlots.forEach((slot) => {
                assignSemester(slot.slotNumber, slot.semesterId || "", slot.semesterName);
            });
        }

        return slots;
    }, [allSemesters, cohortSemesters, resolvedStartYear, selectedAdminClass]);

    const semesterIdToSlot = useMemo(() => {
        const mappedSlots = new Map<string, number>();
        canonicalSlots.forEach((slot) => {
            if (slot.semesterId) {
                mappedSlots.set(slot.semesterId, slot.slotNumber);
            }
        });
        return mappedSlots;
    }, [canonicalSlots]);

    const semesterNameToSlot = useMemo(() => {
        const mappedSlots = new Map<string, number>();

        canonicalSlots.forEach((slot) => {
            [slot.semesterName, slot.displayLabel, slot.legacyLabel].forEach((label) => {
                const normalized = normalizeText(label);
                if (normalized) {
                    mappedSlots.set(normalized, slot.slotNumber);
                }
            });
        });

        return mappedSlots;
    }, [canonicalSlots]);

    const dataBySlot = useMemo(() => {
        const mappedSlots = new Map<number, any>();

        for (const item of trainingData) {
            const slotNumber = resolveTrainingSlot(
                item,
                resolvedStartYear,
                semesterIdToSlot,
                semesterNameToSlot,
            );
            if (!slotNumber || slotNumber < 1 || slotNumber > SLOT_COUNT) continue;

            const existing = mappedSlots.get(slotNumber);
            if (!existing || Number(item?.score || 0) > Number(existing?.score || 0)) {
                mappedSlots.set(slotNumber, item);
            }
        }

        return mappedSlots;
    }, [resolvedStartYear, semesterIdToSlot, semesterNameToSlot, trainingData]);

    const classRowDataBySlot = useMemo(() => {
        const mappedSlots = new Map<number, any>();
        if (!selectedStudentClassRow) {
            return mappedSlots;
        }

        for (const item of selectedStudentClassRow?.scores || []) {
            const semesterId = `${item?.semesterId || ""}`.trim();
            const slotNumber = semesterId ? semesterIdToSlot.get(semesterId) || null : null;
            if (!slotNumber || slotNumber < 1 || slotNumber > SLOT_COUNT) continue;

            mappedSlots.set(slotNumber, {
                score: item?.score,
                rating: item?.classification || "",
                semesterId,
            });
        }

        return mappedSlots;
    }, [selectedStudentClassRow, semesterIdToSlot]);

    const displayedDataBySlot = selectedStudentClassRow ? classRowDataBySlot : dataBySlot;

    if (loading) {
        return (
            <div className="container mx-auto min-h-screen max-w-7xl px-4 py-8 font-sans">
                <div className="flex items-center justify-center rounded-sm border border-slate-300 bg-white py-16 shadow-sm">
                    <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-100 border-t-[#337ab7]" />
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto min-h-screen max-w-7xl px-4 py-8 font-sans">
            <h1 className="mb-1 text-lg font-bold uppercase tracking-tight text-slate-800">
                Kết quả rèn luyện
            </h1>
            <p className="mb-4 text-xs font-medium text-slate-500">
                {`Khóa ${effectiveCohortCode || "chưa xác định"}${selectedAdminClass?.code ? ` • Lớp ${selectedAdminClass.code}` : ""} • ${profile?.studentCode || studentIdentity?.studentCode || studentIdentity?.student?.studentCode || "MSSV"}`}
            </p>

            <div className="overflow-x-auto rounded-sm border border-slate-300 shadow-sm">
                <table className="min-w-[720px] w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-white">
                            <th className="w-[60px] border border-slate-300 px-3 py-2 text-center font-bold text-[#337ab7]">
                                STT
                            </th>
                            <th className="w-[120px] border border-slate-300 px-3 py-2 text-center font-bold text-[#337ab7]">
                                Ngày vi phạm
                            </th>
                            <th className="border border-slate-300 px-3 py-2 text-center font-bold text-[#337ab7]">
                                Nội dung
                            </th>
                            <th className="w-[100px] border border-slate-300 px-3 py-2 text-center font-bold text-[#337ab7]">
                                Hình thức
                            </th>
                            <th className="w-[110px] border border-slate-300 px-3 py-2 text-center font-bold text-[#337ab7]">
                                Ghi chú
                            </th>
                            <th className="w-[110px] border border-slate-300 px-3 py-2 text-center font-bold leading-snug text-[#337ab7]">
                                Điểm
                                <br />
                                Cộng/Trừ
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {canonicalSlots.map((slot) => {
                            const data = displayedDataBySlot.get(slot.slotNumber);
                            const score =
                                data?.score !== undefined && data?.score !== null
                                    ? Number(data.score).toFixed(2).replace(".", ",")
                                    : "";
                            const rating = data?.rating || "";

                            return (
                                <React.Fragment key={slot.slotNumber}>
                                    <tr className="bg-[#eef3f7]">
                                        <td
                                            colSpan={2}
                                            className="border border-slate-300 px-3 py-1.5 text-sm font-bold text-[#337ab7]"
                                        >
                                            <div className="flex flex-col">
                                                <span>{`Kỳ ${slot.slotNumber}`}</span>
                                                <span className="text-[10px] font-normal uppercase text-slate-400">
                                                    {slot.displayLabel}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                    </tr>

                                    <tr className="bg-white">
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-[#c87941]">
                                            Điểm rèn luyện
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">
                                            {score}
                                        </td>
                                    </tr>

                                    <tr className="border-b-2 border-slate-100 bg-white">
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5 text-center font-semibold text-[#c87941]">
                                            Xếp loại
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                        <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">
                                            {rating}
                                        </td>
                                        <td className="border border-slate-300 px-3 py-1.5" />
                                    </tr>
                                </React.Fragment>
                            );
                        })}

                        {canonicalSlots.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="border border-slate-300 px-3 py-8 text-center text-slate-400"
                                >
                                    Chưa có dữ liệu rèn luyện
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
