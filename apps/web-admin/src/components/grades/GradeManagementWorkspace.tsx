"use client";

import {
  type ChangeEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  ClipboardList,
  Download,
  Search,
  Save,
  Send,
  ShieldCheck,
  Upload,
} from "lucide-react";
import {
  calculateUnetiAttendanceScore,
  calculateUnetiGrade,
  GradeSheetTable,
  normalizeScoreArray,
  parseScoreArray,
  sanitizeScoreValue,
  serializeScoreArray,
  type GradeCellField,
  type GradeSheetRow,
} from "@repo/shared-utils";

type GradeRole = "staff" | "lecturer";
type WorkspaceLayout = "standalone" | "manager";
type ScoreArrayField = Extract<GradeCellField, "regular" | "coef1" | "coef2" | "practice">;
type ScoreArrayKey = "regularScores" | "coef1Scores" | "coef2Scores" | "practiceScores";

type EditableGradeRow = {
  id: string;
  studentId: string;
  student?: {
    fullName?: string;
    studentCode?: string;
    gpa?: number | null;
    cpa?: number | null;
    adminClass?: { code?: string; name?: string } | null;
  };
  attendanceScore: number | null;
  regularScores: (number | null)[];
  coef1Scores: (number | null)[];
  coef2Scores: (number | null)[];
  practiceScores: (number | null)[];
  tbThuongKy: number | null;
  isEligibleForExam: boolean | null;
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
  status: string | null;
  notes: string | null;
};

type ScoreColumnConfig = {
  key: ScoreArrayKey;
  sheetPrefix: string;
  count: number;
};

const SCORE_ARRAY_FIELD_MAP: Record<ScoreArrayField, ScoreArrayKey> = {
  regular: "regularScores",
  coef1: "coef1Scores",
  coef2: "coef2Scores",
  practice: "practiceScores",
};

const scoreArrayKeys: ScoreArrayKey[] = [
  "regularScores",
  "coef1Scores",
  "coef2Scores",
  "practiceScores",
];

const getToken = (role: GradeRole) =>
  role === "lecturer"
    ? Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken")
    : Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");

const getEditableFields = (role: GradeRole): GradeCellField[] =>
  role === "lecturer"
    ? ["regular", "coef1", "coef2", "practice", "notes"]
    : ["attendanceScore", "regular", "coef1", "coef2", "practice", "examScore1", "examScore2", "notes"];

const cloneRow = (row: EditableGradeRow): EditableGradeRow => ({
  ...row,
  regularScores: [...row.regularScores],
  coef1Scores: [...row.coef1Scores],
  coef2Scores: [...row.coef2Scores],
  practiceScores: [...row.practiceScores],
});

const cloneRows = (rows: EditableGradeRow[]) => rows.map(cloneRow);

const normalizeNote = (value: string | null | undefined) => {
  const normalized = value?.trim() || "";
  return normalized || null;
};

const normalizeSearchText = (value?: string | null) =>
  `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/,/g, ".")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const formatSearchNumber = (value: number | null | undefined, digits = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return "";
  return numericValue.toFixed(digits);
};

const getRankSearchLabel = (letterGrade?: string | null) => {
  switch (letterGrade) {
    case "A":
      return "xuat sac";
    case "B+":
      return "gioi";
    case "B":
      return "kha";
    case "C+":
      return "kha trung binh";
    case "C":
      return "trung binh";
    case "D+":
    case "D":
      return "yeu";
    case "F+":
    case "F":
      return "kem";
    default:
      return "";
  }
};

const getResultSearchLabel = (row: EditableGradeRow) => {
  if (row.tbThuongKy === null || row.tbThuongKy === undefined) return "";
  if (row.isEligibleForExam === false) return "hoc lai cam thi";
  if (row.isAbsentFromExam && (row.examScore2 === null || row.examScore2 === undefined)) {
    return "thi lai vang thi";
  }
  if (
    row.examScore1 !== null &&
    row.examScore1 !== undefined &&
    row.finalScore1 !== null &&
    row.finalScore1 !== undefined &&
    !row.isPassed &&
    (row.examScore2 === null || row.examScore2 === undefined)
  ) {
    return "thi lai";
  }
  if (row.finalScore2 !== null && row.finalScore2 !== undefined && !row.isPassed) {
    return "hoc lai";
  }
  if (!row.letterGrade) return "";
  return row.isPassed ? "dat" : "hoc lai";
};

const buildGradeSearchIndex = (
  row: EditableGradeRow,
  context?: {
    classCode?: string | null;
    subjectCode?: string | null;
    subjectName?: string | null;
    lecturerName?: string | null;
    semesterLabel?: string | null;
    credits?: number | null;
  },
) => {
  const resultLabel = getResultSearchLabel(row);
  const resultLabels = [
    row.isEligibleForExam === true ? "du thi du dieu kien eligible" : "",
    row.isEligibleForExam === false ? "cam thi khong du dieu kien hoc lai" : "",
    row.isAbsentFromExam ? "vang thi thi lai" : "",
    row.isPassed ? "dat passed" : "",
    !row.isPassed && row.totalScore10 !== null ? "truot hoc lai failed" : "",
    resultLabel,
    getRankSearchLabel(row.letterGrade),
    row.status === "APPROVED" ? "da duyet cong bo approved" : "",
    row.status === "PENDING_APPROVAL" ? "cho duyet pending approval" : "",
    row.status === "DRAFT" ? "nhap nhap dang luu draft" : "",
  ];

  return normalizeSearchText(
    [
      row.id,
      row.studentId,
      row.student?.fullName,
      row.student?.studentCode,
      row.student?.adminClass?.code,
      row.student?.adminClass?.name,
      row.notes,
      row.letterGrade,
      row.status,
      ...resultLabels,
      context?.classCode,
      context?.subjectCode,
      context?.subjectName,
      context?.lecturerName,
      context?.semesterLabel,
      formatSearchNumber(context?.credits ?? null, 0),
      formatSearchNumber(row.attendanceScore),
      formatSearchNumber(row.tbThuongKy),
      formatSearchNumber(row.examScore1),
      formatSearchNumber(row.examScore2),
      formatSearchNumber(row.finalScore1),
      formatSearchNumber(row.finalScore2),
      formatSearchNumber(row.totalScore10),
      formatSearchNumber(row.totalScore4),
      formatSearchNumber(row.student?.gpa ?? null, 2),
      formatSearchNumber(row.student?.cpa ?? null, 2),
      row.regularScores.map((score) => formatSearchNumber(score)).join(" "),
      row.coef1Scores.map((score) => formatSearchNumber(score)).join(" "),
      row.coef2Scores.map((score) => formatSearchNumber(score)).join(" "),
      row.practiceScores.map((score) => formatSearchNumber(score)).join(" "),
    ].join(" "),
  );
};

const scoreEquals = (left: number | null | undefined, right: number | null | undefined) =>
  sanitizeScoreValue(left) === sanitizeScoreValue(right);

const countDirtyCells = (
  rows: EditableGradeRow[],
  baselineRows: EditableGradeRow[],
  role: GradeRole,
) => {
  if (baselineRows.length === 0) return 0;

  const baselineMap = new Map(baselineRows.map((row) => [row.id, row]));
  let dirtyCount = 0;

  for (const row of rows) {
    const baseline = baselineMap.get(row.id);
    dirtyCount += countDirtyCellsForRow(row, baseline, role);
  }

  return dirtyCount;
};

const countDirtyCellsForRow = (
  row: EditableGradeRow,
  baseline: EditableGradeRow | undefined,
  role: GradeRole,
) => {
  if (!baseline) return 0;

  let dirtyCount = 0;

  for (const key of scoreArrayKeys) {
    const maxLength = Math.max(row[key].length, baseline[key].length);
    for (let index = 0; index < maxLength; index += 1) {
      if (!scoreEquals(row[key][index], baseline[key][index])) {
        dirtyCount += 1;
      }
    }
  }

  if (!scoreEquals(row.examScore1, baseline.examScore1)) dirtyCount += 1;
  if (!scoreEquals(row.examScore2, baseline.examScore2)) dirtyCount += 1;
  if (role === "staff" && row.isAbsentFromExam !== baseline.isAbsentFromExam) dirtyCount += 1;
  if (normalizeNote(row.notes) !== normalizeNote(baseline.notes)) dirtyCount += 1;

  return dirtyCount;
};

const isDirtyRow = (
  row: EditableGradeRow,
  baseline: EditableGradeRow | undefined,
  role: GradeRole,
) => countDirtyCellsForRow(row, baseline, role) > 0;

const buildEditableRow = (
  grade: any,
  classCredits: number,
  classPracticeColumns: number,
): EditableGradeRow => ({
  id: grade.id,
  studentId: grade.studentId,
  student: grade.student,
  attendanceScore: sanitizeScoreValue(grade.attendanceScore),
  regularScores: normalizeScoreArray(parseScoreArray(grade.regularScores), 3),
  coef1Scores: normalizeScoreArray(parseScoreArray(grade.coef1Scores), classCredits),
  coef2Scores: normalizeScoreArray(parseScoreArray(grade.coef2Scores), classCredits),
  practiceScores: normalizeScoreArray(
    parseScoreArray(grade.practiceScores),
    classPracticeColumns,
  ),
  tbThuongKy: grade.tbThuongKy ?? null,
  isEligibleForExam:
    typeof grade.isEligibleForExam === "boolean" ? grade.isEligibleForExam : null,
  isAbsentFromExam: Boolean(grade.isAbsentFromExam),
  examScore1: sanitizeScoreValue(grade.examScore1),
  examScore2: sanitizeScoreValue(grade.examScore2),
  finalScore1: grade.finalScore1 ?? null,
  finalScore2: grade.finalScore2 ?? null,
  totalScore10: grade.totalScore10 ?? null,
  totalScore4: grade.totalScore4 ?? null,
  letterGrade: grade.letterGrade ?? null,
  isPassed: Boolean(grade.isPassed),
  isLocked: Boolean(grade.isLocked),
  status: grade.status ?? null,
  notes: grade.notes ?? null,
});

const blankPlaceholderScoreColumns = (rows: EditableGradeRow[]) => {
  if (rows.length === 0) return rows;

  const nextRows = cloneRows(rows);
  let changed = false;

  const shouldBlankColumn = (values: Array<number | null | undefined>) => {
    let zeroCount = 0;

    for (const value of values) {
      const normalized = sanitizeScoreValue(value);
      if (normalized === null) continue;
      if (normalized !== 0) return false;
      zeroCount += 1;
    }

    return zeroCount >= 2;
  };

  // Some historic datasets use `0` as a placeholder for an unopened score head.
  // Blank only columns that are uniformly zero across the class to avoid masking
  // legitimate single-student zero scores.
  for (const key of scoreArrayKeys) {
    const columnCount = Math.max(...nextRows.map((row) => row[key].length), 0);

    for (let index = 0; index < columnCount; index += 1) {
      if (!shouldBlankColumn(nextRows.map((row) => row[key][index]))) continue;

      nextRows.forEach((row) => {
        if (sanitizeScoreValue(row[key][index]) === 0) {
          row[key][index] = null;
          changed = true;
        }
      });
    }
  }

  (["examScore1", "examScore2"] as const).forEach((key) => {
    if (!shouldBlankColumn(nextRows.map((row) => row[key]))) return;

    nextRows.forEach((row) => {
      if (sanitizeScoreValue(row[key]) === 0) {
        row[key] = null;
        changed = true;
      }
    });
  });

  return changed ? nextRows : rows;
};

const hasMeaningfulCellValue = (value: unknown) =>
  value !== undefined && value !== null && `${value}`.trim() !== "";

const getImportedStudentCode = (row: Record<string, unknown>) => {
  const value =
    row["Mã SV"] ??
    row["Ma SV"] ??
    row["mã sv"] ??
    row["ma sv"] ??
    row["studentCode"];

  return value ? `${value}`.trim() : "";
};

const getAuthHeaders = (token?: string): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

const getGradeRoleHeader = (role: GradeRole): Record<string, string> => ({
  "x-user-role": role === "staff" ? "ACADEMIC_STAFF" : "LECTURER",
});

const safeJson = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

export function GradeManagementWorkspace({
  role,
  classId,
  layout = "standalone",
}: {
  role: GradeRole;
  classId: string;
  layout?: WorkspaceLayout;
}) {
  const [courseClass, setCourseClass] = useState<any>(null);
  const [rows, setRows] = useState<EditableGradeRow[]>([]);
  const [baselineRows, setBaselineRows] = useState<EditableGradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const token = getToken(role);
  const credits = Number(courseClass?.subject?.credits || 3);
  const theoryHours = Number(courseClass?.subject?.theoryHours || 0);
  const practiceHours = Number(courseClass?.subject?.practiceHours || 0);
  const practiceColumns = Number(courseClass?.subject?.practiceHours || 0) > 0 ? 2 : 0;
  const editableFields = useMemo(() => getEditableFields(role), [role]);
  const deferredSearch = useDeferredValue(searchQuery.trim());

  const scoreColumns = useMemo<ScoreColumnConfig[]>(
    () => [
      { key: "regularScores", sheetPrefix: "TX", count: 3 },
      { key: "coef1Scores", sheetPrefix: "LT_HS1_", count: credits },
      { key: "coef2Scores", sheetPrefix: "LT_HS2_", count: credits },
      ...(practiceColumns > 0
        ? [{ key: "practiceScores" as const, sheetPrefix: "TH", count: practiceColumns }]
        : []),
    ],
    [credits, practiceColumns],
  );

  const dirtyCount = useMemo(
    () => countDirtyCells(rows, baselineRows, role),
    [baselineRows, role, rows],
  );

  const calculatedRows = useMemo<EditableGradeRow[]>(
    () =>
      rows.map((row) => {
        const calculated = calculateUnetiGrade({
          attendanceScore: row.attendanceScore,
          regularScores: row.regularScores,
          coef1Scores: row.coef1Scores,
          coef2Scores: row.coef2Scores,
          practiceScores: row.practiceScores,
          examScore1: row.examScore1,
          examScore2: row.examScore2,
          isAbsentFromExam: row.isAbsentFromExam,
          credits,
          theoryHours,
          practiceHours,
        });

        const hasCalculatedTotal = calculated.totalScore10 !== null;

        return {
          ...row,
          tbThuongKy: calculated.tbThuongKy ?? row.tbThuongKy,
          finalScore1: calculated.finalScore1 ?? row.finalScore1,
          finalScore2: calculated.finalScore2 ?? row.finalScore2,
          totalScore10: calculated.totalScore10 ?? row.totalScore10,
          totalScore4: calculated.totalScore4 ?? row.totalScore4,
          letterGrade: calculated.letterGrade ?? row.letterGrade,
          isEligibleForExam: calculated.isEligibleForExam ?? row.isEligibleForExam,
          isPassed: hasCalculatedTotal ? calculated.isPassed : row.isPassed,
        };
      }),
    [credits, practiceHours, rows, theoryHours],
  );

  const classResultStats = useMemo(() => {
    const total = calculatedRows.length;
    const completed = calculatedRows.filter((row) => row.totalScore10 !== null).length;
    const passed = calculatedRows.filter((row) => row.totalScore10 !== null && row.isPassed).length;
    const failed = calculatedRows.filter((row) => row.totalScore10 !== null && !row.isPassed).length;
    const averageScore =
      completed > 0
        ? calculatedRows.reduce(
            (sum, row) => sum + (Number(row.totalScore10) || 0),
            0,
          ) / completed
        : null;

    return { total, completed, passed, failed, averageScore };
  }, [calculatedRows]);

  const nominalClassStats = useMemo(() => {
    const groups = new Map<
      string,
      {
        label: string;
        total: number;
        completed: number;
        passed: number;
        totalScore: number;
        gpaTotal: number;
        gpaCount: number;
        cpaTotal: number;
        cpaCount: number;
      }
    >();

    calculatedRows.forEach((row) => {
      const label =
        row.student?.adminClass?.code ||
        row.student?.adminClass?.name ||
        "Chưa gắn lớp DN";
      const group =
        groups.get(label) ||
        {
          label,
          total: 0,
          completed: 0,
          passed: 0,
          totalScore: 0,
          gpaTotal: 0,
          gpaCount: 0,
          cpaTotal: 0,
          cpaCount: 0,
        };

      group.total += 1;

      if (row.totalScore10 !== null) {
        group.completed += 1;
        group.totalScore += Number(row.totalScore10);
        if (row.isPassed) group.passed += 1;
      }

      const gpa = Number(row.student?.gpa);
      if (Number.isFinite(gpa)) {
        group.gpaTotal += gpa;
        group.gpaCount += 1;
      }

      const cpa = Number(row.student?.cpa);
      if (Number.isFinite(cpa)) {
        group.cpaTotal += cpa;
        group.cpaCount += 1;
      }

      groups.set(label, group);
    });

    return [...groups.values()]
      .map((group) => ({
        ...group,
        failed: group.completed - group.passed,
        passRate: group.completed > 0 ? Math.round((group.passed / group.completed) * 100) : 0,
        averageScore:
          group.completed > 0 ? Math.round((group.totalScore / group.completed) * 10) / 10 : null,
        averageGpa:
          group.gpaCount > 0 ? Math.round((group.gpaTotal / group.gpaCount) * 100) / 100 : null,
        averageCpa:
          group.cpaCount > 0 ? Math.round((group.cpaTotal / group.cpaCount) * 100) / 100 : null,
      }))
      .sort((left, right) => left.label.localeCompare(right.label, "vi"));
  }, [calculatedRows]);

  const fetchData = useCallback(async () => {
    if (!classId || !token) {
      setRows([]);
      setBaselineRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const headers = getAuthHeaders(token);
      const classResponse = await fetch(`/api/courses/classes/${classId}`, { headers });
      if (!classResponse.ok) {
        throw new Error("Không thể tải thông tin lớp học phần.");
      }

      const classData = await classResponse.json();
      setCourseClass(classData);

      const [gradeResult, enrollmentResult] = await Promise.allSettled([
        fetch(`/api/grades/class/${classId}`, { headers }),
        fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, { headers }),
      ]);

      let gradeData: any[] = [];
      let enrollmentData: any[] = [];
      let gradeLoadFailed = false;
      let enrollmentLoadFailed = false;

      if (gradeResult.status === "fulfilled") {
        if (gradeResult.value.ok) {
          const payload = await safeJson(gradeResult.value);
          gradeData = Array.isArray(payload) ? payload : [];
        } else {
          gradeLoadFailed = true;
        }
      } else {
        gradeLoadFailed = true;
      }

      if (enrollmentResult.status === "fulfilled") {
        if (enrollmentResult.value.ok) {
          const payload = await safeJson(enrollmentResult.value);
          enrollmentData = Array.isArray(payload) ? payload : [];
        } else {
          enrollmentLoadFailed = true;
        }
      } else {
        enrollmentLoadFailed = true;
      }

      if (gradeData.length === 0 && enrollmentData.length > 0 && classData?.subjectId) {
        const initResponse = await fetch(`/api/grades/initialize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...headers,
          },
          body: JSON.stringify({
            classId,
            subjectId: classData.subjectId,
            studentIds: enrollmentData.map((item: any) => item.studentId),
          }),
        });

        if (initResponse.ok) {
          const payload = await safeJson(initResponse);
          gradeData = Array.isArray(payload) ? payload : [];
          gradeLoadFailed = false;
        }
      }

      const classCredits = Number(classData?.subject?.credits || 3);
      const classPracticeColumns =
        Number(classData?.subject?.practiceHours || 0) > 0 ? 2 : 0;
      const totalPeriods = Number(classData?.totalPeriods || 45);

      const enrollmentMap = new Map(enrollmentData.map((e: any) => [e.studentId, e]));

      const mappedRows = blankPlaceholderScoreColumns(
        (gradeData || []).map((grade: any) => {
          const row = buildEditableRow(grade, classCredits, classPracticeColumns);
          
          // Automatic attendance score calculation
          if (row.attendanceScore === null) {
            const enrollment = enrollmentMap.get(row.studentId);
            if (enrollment?.attendances) {
              const missedSessions = enrollment.attendances.filter((a: any) => 
                a.status === "ABSENT" || a.status === "ABSENT_UNEXCUSED"
              ).length;
              // Quy ước 3 tiết/buổi
              const missedPeriods = missedSessions * 3;
              row.attendanceScore = calculateUnetiAttendanceScore(missedPeriods, totalPeriods);
            }
          }
          
          return row;
        }),
      );

      setRows(mappedRows);
      setBaselineRows(cloneRows(mappedRows));

      if (gradeLoadFailed && enrollmentLoadFailed) {
        setMessage("Không tải được bảng điểm và danh sách ghi danh, nhưng thông tin lớp học phần vẫn đã được mở.");
      } else if (gradeLoadFailed) {
        setMessage("Không tải được bảng điểm hiện có. Nếu lớp đã có sinh viên, hệ thống sẽ thử khởi tạo lại khi cần.");
      } else if (enrollmentLoadFailed) {
        setMessage("Không tải được danh sách ghi danh. Hệ thống vẫn hiển thị dữ liệu bảng điểm hiện có.");
      }
    } catch (error) {
      console.error(error);
      setRows([]);
      setBaselineRows([]);
      setCourseClass(null);
      setMessage(
        error instanceof Error ? error.message : "Không thể tải dữ liệu bảng điểm.",
      );
    } finally {
      setLoading(false);
    }
  }, [classId, role, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateCell = useCallback(
    (
      rowId: string,
      field: Exclude<GradeCellField, "notes">,
      value: number | null,
      index?: number,
    ) => {
      const normalizedValue = sanitizeScoreValue(value);

      setRows((current) =>
        current.map((row) => {
          if (row.id !== rowId || !editableFields.includes(field)) {
            return row;
          }

          if (
            field === "regular" ||
            field === "coef1" ||
            field === "coef2" ||
            field === "practice"
          ) {
            if (index === undefined) return row;

            const key = SCORE_ARRAY_FIELD_MAP[field];
            const nextValues = [...row[key]];
            nextValues[index] = normalizedValue;

            return { ...row, [key]: nextValues };
          }

          if (field === "attendanceScore" || field === "examScore1" || field === "examScore2") {
            return { ...row, [field]: normalizedValue };
          }

          return row;
        }),
      );
    },
    [editableFields, role],
  );

  const updateNote = useCallback((rowId: string, value: string) => {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, notes: value } : row)),
    );
  }, []);

  const toggleAbsent = useCallback(
    (rowId: string) => {
      if (role !== "staff") return;

      setRows((current) =>
        current.map((row) =>
          row.id === rowId ? { ...row, isAbsentFromExam: !row.isAbsentFromExam } : row,
        ),
      );
    },
    [role],
  );

  const tableRows: GradeSheetRow[] = useMemo(() => {
      const isLecturer = role === "lecturer";
      return calculatedRows.map((row) => ({
        id: row.id,
        primaryText: row.student?.fullName || "Sinh viên",
        secondaryText: row.student?.studentCode || "",
        credits,
        attendanceScore: row.attendanceScore,
        regularScores: row.regularScores,
        coef1Scores: row.coef1Scores,
        coef2Scores: row.coef2Scores,
        practiceScores: row.practiceScores,
        tbThuongKy: row.tbThuongKy,
        isEligibleForExam: row.isEligibleForExam,
        // Restricted fields for lecturer
        isAbsentFromExam: isLecturer ? false : row.isAbsentFromExam,
        examScore1: isLecturer ? null : row.examScore1,
        examScore2: isLecturer ? null : row.examScore2,
        finalScore1: isLecturer ? null : row.finalScore1,
        finalScore2: isLecturer ? null : row.finalScore2,
        totalScore10: isLecturer ? null : row.totalScore10,
        totalScore4: isLecturer ? null : row.totalScore4,
        letterGrade: isLecturer ? null : row.letterGrade,
        isPassed: isLecturer ? false : row.isPassed,
        notes: row.notes,
        status: row.status,
        adminClassCode: row.student?.adminClass?.code || row.student?.adminClass?.name || "",
        gpa: isLecturer ? null : (row.student?.gpa ?? null),
        cpa: isLecturer ? null : (row.student?.cpa ?? null),
        isLocked: false,
      }));
    },
    [calculatedRows, credits, role],
  );

  const searchTokens = useMemo(
    () => normalizeSearchText(deferredSearch).split(" ").filter(Boolean),
    [deferredSearch],
  );

  const filteredTableRows = useMemo(() => {
    if (searchTokens.length === 0) return tableRows;

    const semesterLabel =
      courseClass?.semester?.code || courseClass?.semester?.name || null;
    const lecturerName =
      courseClass?.lecturer?.fullName || courseClass?.lecturer?.user?.fullName || null;
    const tableRowMap = new Map(tableRows.map((row) => [row.id, row]));

    return calculatedRows
      .filter((row) => {
        const searchIndex = buildGradeSearchIndex(row, {
          classCode: courseClass?.code,
          subjectCode: courseClass?.subject?.code,
          subjectName: courseClass?.subject?.name || courseClass?.name,
          lecturerName,
          semesterLabel,
          credits,
        });

        return searchTokens.every((token) => searchIndex.includes(token));
      })
      .map((row) => tableRowMap.get(row.id))
      .filter((row): row is GradeSheetRow => Boolean(row));
  }, [calculatedRows, courseClass, credits, searchTokens, tableRows]);

  const visibleStudentCount = filteredTableRows.length;
  const hasActiveSearch = searchTokens.length > 0;

  const saveGrades = useCallback(
    async (silent = false) => {
      if (!token) return false;

      if (dirtyCount === 0) {
        if (!silent) setMessage("Không có thay đổi nào cần lưu.");
        return true;
      }

      setSaving(true);
      if (!silent) setMessage("");

      try {
        const baselineMap = new Map(baselineRows.map((row) => [row.id, row]));
        const changedRows = rows.filter((row) =>
          isDirtyRow(row, baselineMap.get(row.id), role),
        );

        if (changedRows.length === 0) {
          if (!silent) setMessage("Không có thay đổi nào cần lưu.");
          return true;
        }

        const payload = changedRows.map((row) => ({
          id: row.id,
          studentId: row.studentId,
          courseClassId: classId,
          regularScores: serializeScoreArray(
            row.regularScores.map((value) => sanitizeScoreValue(value)),
          ),
          coef1Scores: serializeScoreArray(
            row.coef1Scores.map((value) => sanitizeScoreValue(value)),
          ),
          coef2Scores: serializeScoreArray(
            row.coef2Scores.map((value) => sanitizeScoreValue(value)),
          ),
          practiceScores: serializeScoreArray(
            row.practiceScores.map((value) => sanitizeScoreValue(value)),
          ),
          ...(role === "staff"
            ? {
                examScore1: sanitizeScoreValue(row.examScore1),
                examScore2: sanitizeScoreValue(row.examScore2),
                isAbsentFromExam: row.isAbsentFromExam,
              }
            : {}),
          notes: normalizeNote(row.notes),
        }));

        const response = await fetch(`/api/grades/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...getGradeRoleHeader(role),
          },
          body: JSON.stringify({ grades: payload }),
        });

        if (!response.ok) throw new Error("Lưu bảng điểm thất bại.");

        const changedIds = new Set(changedRows.map((row) => row.id));
        const nextStatus = role === "staff" ? "PENDING_APPROVAL" : "DRAFT";
        const savedRows = calculatedRows.map((row) => ({
          ...cloneRow(row),
          ...(changedIds.has(row.id) ? { status: nextStatus, isLocked: false } : {}),
        }));

        setRows(savedRows);
        setBaselineRows(cloneRows(savedRows));

        if (!silent) {
          setMessage(
            `Đã lưu dữ liệu bảng điểm (${dirtyCount} ô thay đổi). Dữ liệu đã được lưu trước khi Phòng đào tạo công bố điểm.`,
          );
        }
        return true;
      } catch (error) {
        console.error(error);
        if (!silent) setMessage("Không thể lưu dữ liệu bảng điểm.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [baselineRows, calculatedRows, classId, dirtyCount, role, rows, token],
  );

  const submitLecturerGrades = useCallback(async () => {
    if (!token) return;
    if (!confirm("Gửi bảng điểm quá trình cho Phòng đào tạo?")) return;

    const saved = await saveGrades(true);
    if (!saved) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/grades/submit/${classId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...getGradeRoleHeader(role) },
      });

      if (!response.ok) throw new Error("Gửi bảng điểm thất bại.");

      await fetchData();
      setMessage("Đã gửi bảng điểm quá trình cho Phòng đào tạo. Bảng vẫn mở để chỉnh sửa.");
    } catch {
      setMessage("Không thể gửi bảng điểm.");
    } finally {
      setSaving(false);
    }
  }, [classId, fetchData, role, saveGrades, token]);

  const approveStaffGrades = useCallback(async () => {
    if (!token) return;
    if (!confirm("Lưu dữ liệu hiện tại và công bố bảng điểm học phần?")) return;

    const saved = await saveGrades(true);
    if (!saved) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/grades/approve/${classId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, ...getGradeRoleHeader(role) },
      });

      if (!response.ok) throw new Error("Chốt bảng điểm thất bại.");

      await fetchData();
      setMessage("Đã chốt và công bố bảng điểm. Bảng vẫn mở để chỉnh sửa khi cần.");
    } catch {
      setMessage("Không thể chốt bảng điểm.");
    } finally {
      setSaving(false);
    }
  }, [classId, fetchData, role, saveGrades, token]);

  const sendReminder = useCallback(async () => {
    if (!token || !courseClass?.lecturer?.userId) return;

    setSaving(true);
    try {
      const response = await fetch(`/api/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          userId: courseClass.lecturer.userId,
          title: `Nhắc nhập điểm: ${courseClass.subject?.name || courseClass.name}`,
          content: `Vui lòng hoàn tất điểm quá trình cho lớp ${courseClass.code}.`,
          type: "REMINDER",
        }),
      });

      if (!response.ok) throw new Error("Gửi nhắc nhở thất bại.");

      setMessage("Đã gửi nhắc nhở cho giảng viên.");
    } catch {
      setMessage("Không thể gửi nhắc nhở.");
    } finally {
      setSaving(false);
    }
  }, [courseClass, token]);

  const handleDownloadTemplate = () => {
    if (rows.length === 0) {
      alert("Chưa có danh sách sinh viên để tải mẫu!");
      return;
    }

    const data = rows.map((row) => {
      const output: Record<string, string | number> = {
        "Mã SV": row.student?.studentCode || "",
        "Họ và tên": row.student?.fullName || "",
      };

      scoreColumns.forEach((column) => {
        row[column.key].forEach((score, index) => {
          output[`${column.sheetPrefix}${index + 1}`] = score ?? "";
        });
      });

      if (role === "staff") {
        output["Điểm thi 1"] = row.examScore1 ?? "";
        output["Điểm thi 2"] = row.examScore2 ?? "";
      }

      output["Ghi chú"] = row.notes || "";
      return output;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BangDiem");

    const code = courseClass?.code || "LopHocPhan";
    XLSX.writeFile(wb, `BangDiem_${code}.xlsx`);
  };

  const handleImportExcel = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      try {
        const bstr = loadEvent.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

        const importMap = new Map<string, Record<string, unknown>>();
        data.forEach((sheetRow) => {
          const studentCode = getImportedStudentCode(sheetRow);
          if (studentCode) {
            importMap.set(studentCode, sheetRow);
          }
        });

        let changedCells = 0;

        setRows((current) =>
          current.map((row) => {
            const importedRow = importMap.get(row.student?.studentCode || "");
            if (!importedRow) return row;

            let nextRow = row;

            scoreColumns.forEach((column) => {
              const nextScores = [...nextRow[column.key]];
              let changed = false;

              for (let index = 0; index < column.count; index += 1) {
                const rawValue = importedRow[`${column.sheetPrefix}${index + 1}`];
                if (!hasMeaningfulCellValue(rawValue)) continue;

                const parsedValue = sanitizeScoreValue(rawValue);
                if (parsedValue === null || scoreEquals(parsedValue, nextScores[index])) continue;

                nextScores[index] = parsedValue;
                changed = true;
                changedCells += 1;
              }

              if (changed) {
                if (nextRow === row) nextRow = cloneRow(row);
                nextRow[column.key] = nextScores;
              }
            });

            if (role === "staff") {
              const exam1Raw = importedRow["Điểm thi 1"];
              if (hasMeaningfulCellValue(exam1Raw)) {
                const exam1 = sanitizeScoreValue(exam1Raw);
                if (exam1 !== null && !scoreEquals(exam1, nextRow.examScore1)) {
                  if (nextRow === row) nextRow = cloneRow(row);
                  nextRow.examScore1 = exam1;
                  changedCells += 1;
                }
              }

              const exam2Raw = importedRow["Điểm thi 2"];
              if (hasMeaningfulCellValue(exam2Raw)) {
                const exam2 = sanitizeScoreValue(exam2Raw);
                if (exam2 !== null && !scoreEquals(exam2, nextRow.examScore2)) {
                  if (nextRow === row) nextRow = cloneRow(row);
                  nextRow.examScore2 = exam2;
                  changedCells += 1;
                }
              }
            }

            if (Object.prototype.hasOwnProperty.call(importedRow, "Ghi chú")) {
              const nextNote = normalizeNote(`${importedRow["Ghi chú"] ?? ""}`);
              if (nextNote !== normalizeNote(nextRow.notes)) {
                if (nextRow === row) nextRow = cloneRow(row);
                nextRow.notes = nextNote;
                changedCells += 1;
              }
            }

            return nextRow;
          }),
        );

        alert(
          changedCells > 0
            ? `Đã đọc ${changedCells} ô dữ liệu từ Excel. Nhấn "Lưu bảng điểm" để lưu vào hệ thống.`
            : "Không có dữ liệu mới hợp lệ để cập nhật từ file Excel.",
        );
      } catch {
        alert("File Excel không đúng định dạng mẫu!");
      }

      if (fileInputRef.current) fileInputRef.current.value = "";
    };

    reader.readAsBinaryString(file);
  };

  const subjectName = courseClass?.subject?.name || courseClass?.name || "Bảng điểm";
  const lecturerName =
    courseClass?.lecturer?.fullName ||
    courseClass?.lecturer?.user?.fullName ||
    "Chưa phân công";
  const returnHref =
    role === "staff"
      ? "/staff/grades"
      : classId
        ? `/lecturer/courses/${classId}`
        : "/lecturer/courses";
  const sectionHref = role === "staff" ? "/staff/grades" : "/lecturer/courses";
  const sectionLabel = role === "staff" ? "Quản lý điểm" : "Lớp học phần";
  const isManagerLayout = layout === "manager";

  const renderSearchBox = () => (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <label className="relative min-w-[260px] flex-1">
        <Search
          size={14}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Tìm tên, mã SV, lớp HC, ghi chú, trạng thái, điểm..."
          className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-[12px] font-semibold text-slate-700 outline-none transition-all placeholder:text-slate-400 focus:border-blue-200 focus:bg-white"
        />
      </label>

      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
        {hasActiveSearch
          ? `${visibleStudentCount}/${tableRows.length} SV khớp`
          : `${tableRows.length} SV`}
      </span>

      {hasActiveSearch ? (
        <button
          type="button"
          onClick={() => setSearchQuery("")}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50"
        >
          Xóa lọc
        </button>
      ) : null}
    </div>
  );

  const renderActionButtons = (compact = false) => (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcel}
      />

      <Link
        href={`${role === "staff" ? "/staff" : "/lecturer"}/attendance/${classId}`}
        className={`flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 font-bold text-uneti-blue shadow-sm transition-all hover:bg-blue-100 ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-2.5 text-[13px]"
        }`}
      >
        <ClipboardList size={compact ? 14 : 16} />
        Dữ liệu điểm danh
      </Link>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className={`flex items-center gap-2 rounded-xl font-bold shadow-sm transition-all hover:bg-emerald-100 ${
          compact
            ? "bg-emerald-50 px-2.5 py-1.5 text-[11px] text-emerald-600"
            : "bg-emerald-50 px-4 py-2.5 text-[13px] text-emerald-600"
        }`}
      >
        <Upload size={compact ? 14 : 16} />
        Nhập Excel
      </button>

      <button
        type="button"
        onClick={handleDownloadTemplate}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-100 ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-2.5 text-[13px]"
        }`}
      >
        <Download size={compact ? 14 : 16} />
        Tải mẫu
      </button>

      {!isManagerLayout && role === "staff" ? (
        <button
          type="button"
          onClick={sendReminder}
          disabled={saving || !courseClass?.lecturer?.userId}
          className={`flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 font-bold text-amber-700 shadow-sm transition-all hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40 ${
            compact ? "px-2.5 py-1.5 text-[11px]" : "px-4 py-2.5 text-[13px]"
          }`}
        >
          <Bell size={compact ? 14 : 16} />
          Nhắc GV
        </button>
      ) : null}

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          void saveGrades();
        }}
        disabled={saving || dirtyCount === 0}
        className={`flex items-center gap-2 rounded-xl font-bold shadow-lg transition-all ${
          saving || dirtyCount === 0
            ? "cursor-not-allowed bg-slate-100 text-slate-400 shadow-none"
            : "bg-uneti-blue text-white shadow-uneti-blue/20 hover:scale-[1.02]"
        } ${compact ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-[13px]"}`}
      >
        <Save size={compact ? 14 : 16} />
        {saving
          ? "Đang lưu..."
          : role === "staff"
            ? `Lưu bảng điểm${dirtyCount > 0 ? ` (${dirtyCount} ô)` : ""}`
            : `Lưu nháp${dirtyCount > 0 ? ` (${dirtyCount} ô)` : ""}`}
      </button>

      {!isManagerLayout && role === "staff" ? (
        <button
          type="button"
          onClick={approveStaffGrades}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 ${
            compact ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-[13px]"
          }`}
        >
          <ShieldCheck size={compact ? 14 : 16} />
          Lưu &amp; Công bố
        </button>
      ) : null}

      {!isManagerLayout && role === "lecturer" ? (
        <button
          type="button"
          onClick={submitLecturerGrades}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40 ${
            compact ? "px-3 py-1.5 text-[11px]" : "px-5 py-2.5 text-[13px]"
          }`}
        >
          <Send size={compact ? 14 : 16} />
          Gửi lên đào tạo
        </button>
      ) : null}
    </>
  );

  const renderResultStatistics = () => {
    if (calculatedRows.length === 0) return null;

    const formatOne = (value: number | null) =>
      value === null ? "--" : value.toFixed(1);
    const formatTwo = (value: number | null) =>
      value === null ? "--" : value.toFixed(2);

    return (
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-2 py-1.5">
        <div className="grid gap-2 xl:grid-cols-[auto_1fr] xl:items-center">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-slate-600">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
              Đã tính {classResultStats.completed}/{classResultStats.total}
            </span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
              Đạt {classResultStats.passed}
            </span>
            <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-rose-700">
              Chưa đạt {classResultStats.failed}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-uneti-blue">
              TB lớp {formatOne(classResultStats.averageScore)}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {nominalClassStats.map((item) => (
              <div
                key={item.label}
                className="min-w-[220px] rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-black text-slate-800">
                    {item.label}
                  </div>
                  <div className="text-[10px] font-black text-slate-500">
                    {item.completed}/{item.total} SV
                  </div>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${item.passRate}%` }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>Đạt {item.passRate}%</span>
                  <span>TK {formatOne(item.averageScore)}</span>
                  <span>GPA {formatTwo(item.averageGpa)}</span>
                  <span>CPA {formatTwo(item.averageCpa)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${
          isManagerLayout
            ? "h-full border border-slate-300 bg-white"
            : "h-[calc(100vh-4rem)] bg-slate-50/60"
        }`}
      >
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-uneti-blue" />
      </div>
    );
  }

  if (isManagerLayout) {
    return (
      <div className="flex h-full flex-col overflow-hidden border border-slate-300 bg-white">
        <div className="flex-shrink-0 border-b border-slate-100 bg-white px-3 py-2">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ShieldCheck size={15} className="text-uneti-blue" />
                <h2 className="truncate text-[14px] font-black tracking-tight text-slate-800">
                  {subjectName}
                </h2>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black text-slate-600">
                  {courseClass?.code || classId}
                </span>
                <span className="text-[11px] font-medium text-slate-400">
                  GV: {lecturerName} • {visibleStudentCount}/{rows.length} SV • {credits} TC
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              {renderActionButtons(true)}
            </div>
          </div>

          {message ? (
            <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
              {message}
            </div>
          ) : null}

          {renderSearchBox()}
        </div>

        {renderResultStatistics()}

        <div className="flex-1 overflow-hidden">
          <GradeSheetTable
            rows={filteredTableRows}
            labelHeader="Họ và tên"
            coefColumns={credits}
            practiceColumns={practiceColumns}
            editableFields={editableFields}
            onCellChange={updateCell}
            onNoteChange={updateNote}
            onToggleAbsent={role === "staff" ? toggleAbsent : undefined}
            showNotes={true}
            isRestricted={role === "lecturer"}
            emptyMessage={
              hasActiveSearch
                ? "Không tìm thấy sinh viên hoặc dữ liệu điểm khớp với từ khóa hiện tại."
                : "Chưa có dữ liệu bảng điểm."
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50/50">
      <div className="flex-shrink-0 border-b border-slate-100 bg-white px-3 py-2">
        <div className="flex flex-col gap-2 2xl:flex-row 2xl:items-center 2xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Link
              href={returnHref}
              className="inline-flex h-8 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[11px] font-black text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-uneti-blue"
            >
              <ArrowLeft size={14} />
              Quay lại
            </Link>

            <div
              className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${
                role === "staff" ? "bg-emerald-600" : "bg-uneti-blue"
              }`}
            >
              {role === "staff" ? <ShieldCheck size={16} /> : <Send size={16} />}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-1 text-[10px] font-semibold text-slate-400">
                <Link href={sectionHref} className="hover:text-uneti-blue transition-colors">
                  {sectionLabel}
                </Link>
                <ChevronRight className="h-3 w-3" />
                <span className="font-bold text-slate-600">{courseClass?.code || classId}</span>
              </div>
              <h1 className="truncate text-[15px] font-black tracking-tight text-slate-800">
                {subjectName}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black text-slate-600">
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                GV: {lecturerName}
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                {visibleStudentCount}/{rows.length} SV
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                {credits} TC
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                {dirtyCount} ô thay đổi
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 2xl:justify-end">
            {renderActionButtons(true)}
          </div>
        </div>

        {message ? (
          <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-600">
            {message}
          </div>
        ) : null}

        {renderSearchBox()}
      </div>

      {renderResultStatistics()}

      <div className="min-h-0 flex-1 overflow-hidden p-1.5">
        <div className="h-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <GradeSheetTable
            rows={filteredTableRows}
            labelHeader="Họ và tên"
            coefColumns={credits}
            practiceColumns={practiceColumns}
            editableFields={editableFields}
            onCellChange={updateCell}
            onNoteChange={updateNote}
            onToggleAbsent={role === "staff" ? toggleAbsent : undefined}
            showNotes={true}
            isRestricted={role === "lecturer"}
            emptyMessage={
              hasActiveSearch
                ? "Không tìm thấy sinh viên hoặc dữ liệu điểm khớp với từ khóa hiện tại."
                : "Chưa có dữ liệu bảng điểm."
            }
          />
        </div>
      </div>
    </div>
  );
}
