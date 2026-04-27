/**
 * Shared Semester Matching and Academic Calendar Utilities
 */

export type SemesterLike = {
    id?: string | null;
    code?: string | null;
    name?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    year?: number | null;
};

export type CohortMeta = {
    code: string;
    startYear: number;
    endYear: number;
};

export function toDate(value: any): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export function parseConceptualSemester(semester?: SemesterLike | null): number | null {
    if (!semester) return null;
    const source = `${semester.code || ""} ${semester.name || ""}`.trim().toUpperCase();
    if (!source) return null;
    
    const match = 
        source.match(/HK\s*([1-8])/i) || 
        source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) || 
        source.match(/SEMESTER\s*([1-8])/i);
        
    return match ? Number(match[1]) : null;
}

export function getSemesterStartYear(semester?: SemesterLike | null): number {
    if (!semester) return 0;
    
    // 1. From startDate
    const startDate = toDate(semester.startDate);
    if (startDate) return startDate.getFullYear();
    
    // 2. From code (e.g., 2024_HK1)
    const codeMatch = `${semester.code || ""}`.match(/(20\d{2})/);
    if (codeMatch) return Number(codeMatch[1]);
    
    // 3. From name (e.g., 2024 - 2025)
    const nameMatch = `${semester.name || ""}`.match(/(20\d{2})\s*-\s*20\d{2}/);
    if (nameMatch) return Number(nameMatch[1]);
    
    // 4. From explicit year field
    return Number(semester.year || 0);
}

export function expectedYearForSemester(startYear: number, conceptualSemester: number): number {
    // HK1 (1, 3, 5, 7) -> Year + 0, 1, 2, 3 (Starts Sep)
    // HK2 (2, 4, 6, 8) -> Year + 1, 2, 3, 4 (Starts Feb)
    return startYear + Math.floor(conceptualSemester / 2);
}

export function getSemesterHalfMatch(semester: SemesterLike | null, conceptualSemester: number): number {
    if (!semester) return 0;
    const startDate = toDate(semester.startDate);
    if (!startDate) return 0;
    
    const startMonth = startDate.getMonth() + 1;
    // Odd (HK1): Sep-Jan (month 7-12)
    // Even (HK2): Feb-Jun (month 1-6)
    if (conceptualSemester % 2 === 1) return startMonth >= 7 ? 1 : 0;
    return (startMonth >= 1 && startMonth <= 6) ? 1 : 0;
}

export function inferCohortMeta(cohortCode?: string | null): CohortMeta | null {
    const normalized = `${cohortCode || ""}`.trim().toUpperCase();
    const match = normalized.match(/^K(\d{2,})$/i);
    if (!match) return null;
    
    const cohortNumber = Number(match[1]);
    const startYear = 2006 + cohortNumber;
    return {
        code: normalized,
        startYear,
        endYear: startYear + 4
    };
}

export function calculateAcademicSemester(intakeYear: number, date?: Date | string | null): number | null {
    const d = toDate(date);
    if (!d || !intakeYear) return null;
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    
    if (month >= 2 && month <= 7) {
        return (year - intakeYear) * 2;
    } else {
        const academicYear = month <= 1 ? year - 1 : year;
        const res = (academicYear - intakeYear) * 2 + 1;
        return res > 0 ? res : null;
    }
}

export function normalizeSemesterForCohort(
    semester: any,
    cohortMeta: CohortMeta | null,
    conceptualSemester: number,
) {
    if (!cohortMeta) return semester;
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
            ? new Date(academicStartYear, 8, 1, 0, 0, 0)
            : new Date(academicStartYear + 1, 1, 1, 0, 0, 0),
        endDate: isOddSemester
            ? new Date(academicStartYear + 1, 0, 20, 23, 59, 59)
            : new Date(academicStartYear + 1, 5, 30, 23, 59, 59),
        semesterNumber: conceptualSemester,
        cohortSemesterNumber: conceptualSemester,
        cohortStudyYear: studyYear,
        cohortAcademicYear: academicYearLabel,
    };
}

/**
 * Robustly checks if two semester references point to the same conceptual academic period.
 */
export function matchesSemester(
    targetSem: SemesterLike | null | undefined,
    targetId: string | null | undefined,
    referenceSem: SemesterLike | null | undefined
): boolean {
    if (!referenceSem) return false;
    
    // 1. Exact ID Match
    const rId = referenceSem.id;
    const tId = targetId || targetSem?.id;
    if (rId && tId && rId === tId) return true;
    
    // 2. Token Matching (IDs, Codes, Names)
    const rTokens = new Set(
        [referenceSem.id, referenceSem.code, referenceSem.name]
            .map(v => `${v || ""}`.trim())
            .filter(Boolean)
    );
    
    const tTokens = [targetSem?.id, targetSem?.code, targetSem?.name, targetId]
        .map(v => `${v || ""}`.trim())
        .filter(Boolean);
        
    if (tTokens.some(v => rTokens.has(v))) return true;
    
    // 3. Structural Match (Conceptual + Year)
    const rConceptual = parseConceptualSemester(referenceSem);
    const tConceptual = parseConceptualSemester(targetSem);
    
    if (rConceptual && tConceptual && rConceptual === tConceptual) {
        const rYear = getSemesterStartYear(referenceSem);
        const tYear = getSemesterStartYear(targetSem);
        // Only match if year is identical. 
        // This prevents HK1-2024 from matching HK1-2025.
        if (rYear && tYear && rYear === tYear) return true;
    }
    
    return false;
}
