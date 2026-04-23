export type UnetiGradeInput = {
  attendanceScore?: number | null;
  regularScores?: Array<number | null | undefined> | null;
  coef1Scores?: Array<number | null | undefined> | null;
  coef2Scores?: Array<number | null | undefined> | null;
  practiceScores?: Array<number | null | undefined> | null;
  examScore1?: number | null;
  examScore2?: number | null;
  isAbsentFromExam?: boolean;
  credits?: number | null;
  theoryHours?: number | null;
  practiceHours?: number | null;
};

export type UnetiGradeResult = {
  tbThuongKy: number | null;
  finalScore1: number | null;
  finalScore2: number | null;
  totalScore10: number | null;
  totalScore4: number | null;
  letterGrade: string | null;
  isEligibleForExam: boolean | null;
  isPassed: boolean;
};

const toFiniteNumber = (value: unknown) => {
  if (value === null || value === undefined) return null;
  const parsed = Number(`${value}`.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

export const roundUnetiScore = (value: unknown) => {
  const parsed = toFiniteNumber(value);
  return parsed === null ? null : Math.round(parsed * 10) / 10;
};

const normalizeScore = (value: unknown) => {
  const rounded = roundUnetiScore(value);
  if (rounded === null) return null;
  return Math.max(0, Math.min(10, rounded));
};

const hasAnyScore = (values?: Array<number | null | undefined> | null) =>
  Boolean(values?.some((value) => normalizeScore(value) !== null));

const calculateWeightedAverage = (
  items: Array<{ value: number | null | undefined; weight: number }>,
) => {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const item of items) {
    const score = normalizeScore(item.value);
    if (score === null) continue;

    weightedSum += score * item.weight;
    totalWeight += item.weight;
  }

  return totalWeight > 0 ? roundUnetiScore(weightedSum / totalWeight) : null;
};

export const mapUnetiScoreToScale = (score: number | null | undefined) => {
  const normalized = normalizeScore(score);
  if (normalized === null) return { letterGrade: null, totalScore4: null };

  if (normalized >= 8.5) return { letterGrade: "A", totalScore4: 4.0 };
  if (normalized >= 7.8) return { letterGrade: "B+", totalScore4: 3.5 };
  if (normalized >= 7.0) return { letterGrade: "B", totalScore4: 3.0 };
  if (normalized >= 6.3) return { letterGrade: "C+", totalScore4: 2.5 };
  if (normalized >= 5.5) return { letterGrade: "C", totalScore4: 2.0 };
  if (normalized >= 4.8) return { letterGrade: "D+", totalScore4: 1.5 };
  if (normalized >= 4.0) return { letterGrade: "D", totalScore4: 1.0 };
  if (normalized >= 3.0) return { letterGrade: "F+", totalScore4: 0.5 };
  return { letterGrade: "F", totalScore4: 0.0 };
};

export const calculateUnetiAttendanceScore = (
  missedPeriods: number,
  totalPeriods: number,
) => {
  if (totalPeriods <= 0) return 10;

  const absentPercent = (Math.max(missedPeriods, 0) / totalPeriods) * 100;
  if (absentPercent >= 50) return 0;
  if (absentPercent === 0) return 10;
  if (absentPercent < 10) return 8;
  if (absentPercent < 20) return 6;
  if (absentPercent < 35) return 4;
  return 2;
};

export function calculateUnetiGrade(input: UnetiGradeInput): UnetiGradeResult {
  const credits = Math.max(Number(input.credits || 0), 1);
  const theoryHours = Number(input.theoryHours || 0);
  const practiceHours = Number(input.practiceHours || 0);
  const isTheory = theoryHours > 0 || practiceHours === 0;
  const cc = normalizeScore(input.attendanceScore) ?? 0;
  const regularScores = input.regularScores || [];
  const coef1Scores = input.coef1Scores || [];
  const coef2Scores = input.coef2Scores || [];
  const practiceScores = input.practiceScores || [];

  let tbThuongKy: number | null = null;
  let finalScore1: number | null = null;
  let finalScore2: number | null = null;
  let totalScore10: number | null = null;

  if (isTheory) {
    if (hasAnyScore([...regularScores, ...coef1Scores, ...coef2Scores])) {
      tbThuongKy = calculateWeightedAverage([
        { value: cc, weight: credits },
        ...regularScores.map((value) => ({ value, weight: 1 })),
        ...coef1Scores.map((value) => ({ value, weight: 1 })),
        ...coef2Scores.map((value) => ({ value, weight: 2 })),
      ]);
    }
  } else if (hasAnyScore(practiceScores)) {
    tbThuongKy = calculateWeightedAverage([
      { value: cc, weight: 1 },
      ...practiceScores.map((value) => ({ value, weight: 1 })),
    ]);
  }

  const isEligibleForExam =
    tbThuongKy === null ? null : cc > 0 && Number(tbThuongKy) >= 3.0;

  if (isTheory) {
    if (
      isEligibleForExam &&
      !input.isAbsentFromExam &&
      normalizeScore(input.examScore1) !== null
    ) {
      finalScore1 = roundUnetiScore(
        Number(tbThuongKy) * 0.4 + Number(normalizeScore(input.examScore1)) * 0.6,
      );
    }

    if (isEligibleForExam && normalizeScore(input.examScore2) !== null) {
      finalScore2 = roundUnetiScore(
        Number(tbThuongKy) * 0.4 + Number(normalizeScore(input.examScore2)) * 0.6,
      );
    }

    const finalCandidates = [finalScore1, finalScore2].filter(
      (value): value is number => Number.isFinite(Number(value)),
    );
    totalScore10 =
      finalCandidates.length > 0
        ? roundUnetiScore(Math.max(...finalCandidates))
        : null;
  } else if (isEligibleForExam && tbThuongKy !== null) {
    totalScore10 = tbThuongKy;
    finalScore1 = tbThuongKy;
  }

  const scale = mapUnetiScoreToScale(totalScore10);

  return {
    tbThuongKy,
    finalScore1,
    finalScore2,
    totalScore10,
    totalScore4: scale.totalScore4,
    letterGrade: scale.letterGrade,
    isEligibleForExam,
    isPassed: totalScore10 !== null && Number(totalScore10) >= 4.0 && Boolean(isEligibleForExam),
  };
}
