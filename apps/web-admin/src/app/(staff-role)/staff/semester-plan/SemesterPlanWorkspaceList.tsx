"use client";

import React, { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import styles from "./SemesterPlanWorkspaceList.module.css";
import {
  AlertTriangle,
  BookOpen,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  Info,
  ListChecks,
  Loader2,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { Toaster, toast } from "react-hot-toast";

const API = (path: string) => `/api${path}`;
const EMPTY_TEMPLATE = () =>
  Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [index + 1, []]),
  ) as Record<number, any[]>;

function parseConceptualSemester(semester: any) {
  const source = `${semester?.code || ""} ${semester?.name || ""}`;
  const match =
    source.match(/HK\s*([1-8])/i) ||
    source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
    source.match(/KH([1-8])/i) ||
    source.match(/SEMESTER\s*([1-8])/i);
  return match ? Number(match[1]) : null;
}

function templateToMatrix(template: any) {
  const next = EMPTY_TEMPLATE();
  (template?.items || []).forEach((item: any) => {
    const slot = item.conceptualSemester || item.suggestedSemester || 1;
    if (item.subject && next[slot]) {
      next[slot].push(item.subject);
    }
  });
  return next;
}

function flattenTemplate(matrix: Record<number, any[]>) {
  return Object.entries(matrix).flatMap(([semester, subjects]) =>
    (subjects || []).map((subject: any) => ({
      subjectId: subject.id,
      conceptualSemester: Number(semester),
      isRequired: true,
    })),
  );
}

function getDefaultPracticeSessionsPerWeek(subject: any) {
  return getRecommendedSubjectSchedule(subject).practiceSessionsPerWeek;
}

const DEFAULT_PERIODS_PER_SESSION = 3;
const DEFAULT_TEACHING_WEEKS = 15;

function normalizeComparable(value?: string | null) {
  return `${value || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function getSemesterWeekCount(semester?: any) {
  if (!semester?.startDate || !semester?.endDate) return DEFAULT_TEACHING_WEEKS;
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return DEFAULT_TEACHING_WEEKS;
  }

  const diffDays = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.ceil(diffDays / 7));
}

function isPracticeSubject(subject: any, rawTheoryPeriods: number, rawPracticePeriods: number) {
  const examType = normalizeComparable(subject?.examType);
  const examForm = normalizeComparable(subject?.examForm);
  return (
    rawPracticePeriods > rawTheoryPeriods ||
    (rawPracticePeriods > 0 && rawTheoryPeriods <= 0) ||
    examType.includes("THUCHANH") ||
    examForm.includes("THUCHANH") ||
    examForm.includes("MAYTINH")
  );
}

function getSuggestedSessionsPerWeek(
  totalPeriods: number,
  configuredSessionsPerWeek: number,
  availableWeeks: number,
) {
  if (totalPeriods <= 0) return 0;
  if (configuredSessionsPerWeek > 0) return configuredSessionsPerWeek;

  const effectiveWeeks = Math.max(
    Math.min(availableWeeks, DEFAULT_TEACHING_WEEKS),
    1,
  );

  for (const sessions of [1, 2, 3, 4]) {
    const periodsPerSession = Math.ceil(totalPeriods / effectiveWeeks / sessions);
    if (periodsPerSession <= 4) {
      return sessions;
    }
  }

  return 1;
}

function getRecommendedSubjectSchedule(subject: any, availableWeeks = DEFAULT_TEACHING_WEEKS) {
  const credits = Number(subject?.credits || 0);
  const rawTheoryPeriods = Number(subject?.theoryPeriods ?? subject?.theoryHours ?? 0);
  const rawPracticePeriods = Number(subject?.practicePeriods ?? subject?.practiceHours ?? 0);
  const rawTotalPeriods = rawTheoryPeriods + rawPracticePeriods;
  const practiceOriented = isPracticeSubject(subject, rawTheoryPeriods, rawPracticePeriods);
  const targetTotalPeriods =
    rawTotalPeriods > 0
      ? rawTotalPeriods
      : credits > 0
        ? practiceOriented
          ? credits * 30
          : credits * 15
        : 15;
  let periodsPerSession = Math.max(
    1,
    Number(subject?.periodsPerSession || DEFAULT_PERIODS_PER_SESSION),
  );

  let theoryPeriods = 0;
  let practicePeriods = 0;

  if (rawTheoryPeriods > 0 && rawPracticePeriods > 0) {
    const theoryRatio = rawTheoryPeriods / rawTotalPeriods;
    theoryPeriods = Math.round(targetTotalPeriods * theoryRatio);
    practicePeriods = Math.max(targetTotalPeriods - theoryPeriods, 0);
  } else if (practiceOriented) {
    practicePeriods = targetTotalPeriods;
  } else {
    theoryPeriods = targetTotalPeriods;
  }

  const theorySessionsPerWeek =
    theoryPeriods > 0
      ? getSuggestedSessionsPerWeek(
          theoryPeriods,
          Number(subject?.theorySessionsPerWeek || 0),
          availableWeeks,
        )
      : 0;
  const practiceSessionsPerWeek =
    practicePeriods > 0
      ? getSuggestedSessionsPerWeek(
          practicePeriods,
          Number(subject?.practiceSessionsPerWeek || 0),
          availableWeeks,
        )
      : 0;

  // FIX: When calculating periods per session, avoid inflating based on long semester duration
  // If semester is 22 weeks, we still usually want 3 periods/session over fewer weeks, 
  // not 2 periods/session over 22 weeks. 
  const effectiveWeeks = Math.min(availableWeeks, DEFAULT_TEACHING_WEEKS); 
  
  const derivedTheoryPeriodsPerSession =
    theoryPeriods > 0
      ? Math.ceil(
          theoryPeriods /
            Math.max(effectiveWeeks, 1) /
            Math.max(theorySessionsPerWeek, 1),
        )
      : 0;
  const derivedPracticePeriodsPerSession =
    practicePeriods > 0
      ? Math.ceil(
          practicePeriods /
            Math.max(effectiveWeeks, 1) /
            Math.max(practiceSessionsPerWeek, 1),
        )
      : 0;
  const derivedPeriodsPerSession = Math.max(
    derivedTheoryPeriodsPerSession,
    derivedPracticePeriodsPerSession,
    1,
  );
  periodsPerSession =
    Number(subject?.periodsPerSession || 0) > 0
      ? Math.max(Number(subject?.periodsPerSession || 0), derivedPeriodsPerSession)
      : derivedPeriodsPerSession;

  return {
    theoryPeriods,
    practicePeriods,
    theorySessionsPerWeek,
    practiceSessionsPerWeek,
    periodsPerSession,
    totalPeriods: theoryPeriods + practicePeriods,
  };
}

function isWithinSemesterWindow(semester: any) {
  if (!semester?.startDate || !semester?.endDate) return false;
  const now = new Date();
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return now >= start && now <= end;
}

function statusTone(status?: string) {
  switch (status) {
    case "EXECUTED":
    case "PUBLISHED":
    case "READY":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "NEEDS_REVIEW":
    case "PARTIAL":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "DRAFT":
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function statusLabel(status?: string) {
  switch (status) {
    case "PUBLISHED":
      return "Đã phát hành";
    case "EXECUTED":
      return "Đã thực hiện";
    case "READY":
      return "Sẵn sàng";
    case "NEEDS_REVIEW":
      return "Cần rà soát";
    case "PARTIAL":
      return "Một phần";
    case "DRAFT":
    default:
      return "Nháp";
  }
}

function sortSubjects(items: any[]) {
  return [...items].sort((left, right) =>
    `${left.code || ""}`.localeCompare(`${right.code || ""}`),
  );
}

function formatDateRange(semester: any) {
  if (!semester?.startDate || !semester?.endDate) return "Chưa có mốc thời gian";
  const formatter = new Intl.DateTimeFormat("vi-VN");
  return `${formatter.format(new Date(semester.startDate))} - ${formatter.format(new Date(semester.endDate))}`;
}

function resolveSemesterReference(semesters: any[]) {
  const withinWindow = semesters.find((semester) => isWithinSemesterWindow(semester));
  if (withinWindow) return withinWindow;

  const now = new Date().getTime();
  const started = [...semesters]
    .filter((semester) => new Date(semester?.startDate || 0).getTime() <= now)
    .sort(
      (left, right) =>
        new Date(right?.startDate || 0).getTime() -
        new Date(left?.startDate || 0).getTime(),
    );

  return started[0] || semesters[0] || null;
}

function getSemesterProgressMeta(semester: any, referenceSemester: any) {
  if (!semester) {
    return {
      label: "Dự kiến",
      tone: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    };
  }

  if (referenceSemester?.id === semester.id) {
    return {
      label: "Hiện tại",
      tone: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };
  }

  const semesterStart = new Date(semester?.startDate || 0).getTime();
  const referenceStart = new Date(referenceSemester?.startDate || 0).getTime();

  if (referenceSemester && semesterStart < referenceStart) {
    return {
      label: "Đã xong",
      tone: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    };
  }

  return {
    label: "Dự kiến",
    tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  };
}

function formatSemesterOptionLabel(semester: any) {
  const code = `${semester?.code || ""}`.trim();
  const name = `${semester?.name || ""}`.trim();
  const codeTail = code.split("_").pop() || code;

  const normalize = (value?: string) =>
    `${value || ""}`
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

  if (!code) return name || "Học kỳ";
  if (!name) return code;
  if (
    normalize(name).includes(normalize(code)) ||
    normalize(name).includes(normalize(codeTail))
  ) {
    return name;
  }
  return `${name} (${code})`;
}

function getSubjectTotalPeriods(subject: any) {
  return getRecommendedSubjectSchedule(subject).totalPeriods;
}

function getConfiguredPeriodsForExecutionItem(item: any) {
  return Number(item?.theoryPeriods || 0) + Number(item?.practicePeriods || 0);
}

function getExecutionValidation(item: any, semester?: any) {
  const expectedPeriods = getSubjectTotalPeriods(item?.subject);
  const configuredPeriods = getConfiguredPeriodsForExecutionItem(item);
  const availableWeeks = getSemesterWeekCount(semester);
  
  // Weekly Capacity project should be capped at expected periods for visualization
  // if Configured Periods matches expected, it's matched regardless of extra weeks.
  const projectionWeeks = Math.min(availableWeeks, DEFAULT_TEACHING_WEEKS);

  const weeklyCapacity =
    (Number(item?.theorySessionsPerWeek || 0) + Number(item?.practiceSessionsPerWeek || 0) || 1) *
    Number(item?.periodsPerSession || DEFAULT_PERIODS_PER_SESSION) *
    projectionWeeks;

  const matched =
    expectedPeriods > 0 &&
    expectedPeriods === configuredPeriods;

  const ratio =
    expectedPeriods > 0 ? configuredPeriods / expectedPeriods : 0;

  let tone = "bg-amber-500";
  let label = "Lệch khung";
  if (matched) {
    tone = "bg-emerald-500";
    label = "Khớp khung";
  } else if (configuredPeriods < expectedPeriods) {
    tone = "bg-rose-500";
    label = "Thiếu tiết";
  }

  return {
    expectedPeriods,
    configuredPeriods,
    weeklyCapacity,
    matched,
    label,
    tone,
    ratio: Math.max(0, Math.min(ratio, 1)),
  };
}

function formatDateInput(value?: string | Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sortCohorts(items: any[]) {
  return [...items].sort((left, right) => left.startYear - right.startYear);
}

function sortSemesters(items: any[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.startDate || 0).getTime();
    const rightTime = new Date(right.startDate || 0).getTime();
    return leftTime - rightTime;
  });
}

function expectedYearForSemester(startYear: number, conceptualSemester: number) {
  return startYear + Math.floor(conceptualSemester / 2);
}

function scoreSemesterForCohort(semester: any, cohort: any, conceptualSemester: number) {
  const parsed = parseConceptualSemester(semester);
  
  const startDate = semester?.startDate ? new Date(semester.startDate) : null;
  const startMonth = startDate ? startDate.getMonth() + 1 : 0;
  const startYear = startDate ? startDate.getFullYear() : Number(semester?.year || 0);

  // Time-based calculation for K18 (and others)
  // conceptual 1,2 = year 1, conceptual 3,4 = year 2...
  const expectedYear = cohort.startYear + Math.floor((conceptualSemester - 1) / 2);
  const isOddSemester = conceptualSemester % 2 === 1;
  
  let score = 0;

  // 1. Name Match (Strongest signal)
  if (parsed === conceptualSemester) {
    score += 100;
  } else if (parsed !== null) {
      // If it explicitly says another semester number, it's a very poor match
      return -1;
  }

  // 2. Year Match
  if (startYear === expectedYear || Number(semester?.year) === expectedYear) {
    score += 50;
  } else if (startYear > 0 && Math.abs(startYear - expectedYear) > 1) {
      // Too far away in time
      return -1;
  }

  // 3. Season Match (Odd = Late year, Even = Early year)
  if (isOddSemester) {
    if (startMonth >= 7 && startMonth <= 12) score += 30;
  } else {
    if (startMonth >= 1 && startMonth <= 6) score += 30;
  }

  // 4. Pattern Match (UNETI style)
  const expectedStudyYear = Math.ceil(conceptualSemester / 2);
  const name = `${semester?.name || ""}`;
  const code = `${semester?.code || ""}`;

  if (new RegExp(`HK\\s*${conceptualSemester}\\s*-\\s*Năm\\s*${expectedStudyYear}`, "i").test(name)) score += 40;
  if (new RegExp(`^\\d{4}_HK${conceptualSemester}$`, "i").test(code)) score += 30;
  
  // 5. Exclude Summer Semesters unless specifically requested
  if (/H[OỌ]C\s*K[YỲ]\s*H[EÈ]|HKH/i.test(name) || /HKH/i.test(code)) score -= 100;
  
  return score;
}

function getVisibleSemestersForCohort(semesters: any[], cohort: any) {
  if (!cohort) return [];
  const selected: any[] = [];
  const usedIds = new Set<string>();

  for (let conceptualSemester = 1; conceptualSemester <= 8; conceptualSemester += 1) {
    const best = semesters
      .filter((semester) => !usedIds.has(semester.id))
      .map((semester) => ({
        semester,
        score: scoreSemesterForCohort(semester, cohort, conceptualSemester),
      }))
      .filter((entry) => entry.score >= 50)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return new Date(left.semester.startDate || 0).getTime() - new Date(right.semester.startDate || 0).getTime();
      })[0];

    if (best?.semester) {
      selected.push(best.semester);
      usedIds.add(best.semester.id);
    }
  }

  return selected.sort((left, right) => {
    const leftSemester = parseConceptualSemester(left) || 1;
    const rightSemester = parseConceptualSemester(right) || 1;
    if (leftSemester !== rightSemester) return leftSemester - rightSemester;
    return new Date(left.startDate || 0).getTime() - new Date(right.startDate || 0).getTime();
  });
}

const CURRENT_YEAR = new Date().getFullYear();

function createEmptyCohortForm() {
  return {
    code: "",
    startYear: CURRENT_YEAR,
    endYear: CURRENT_YEAR + 4,
    isActive: true,
  };
}

function createEmptySemesterForm() {
  return {
    code: "",
    name: "",
    year: `${CURRENT_YEAR}`,
    startDate: "",
    endDate: "",
    isCurrent: false,
  };
}

function createEmptySubjectForm(majorId = "", departmentId = "") {
  const defaults = getRecommendedSubjectSchedule({
    credits: 3,
    theoryPeriods: 0,
    practicePeriods: 0,
    examType: "TRAC_NGHIEM",
    examForm: "Tự luận",
  });
  return {
    code: "",
    name: "",
    majorId,
    departmentId,
    credits: 3,
    theoryHours: defaults.theoryPeriods,
    practiceHours: defaults.practicePeriods,
    selfStudyHours: 0,
    examDuration: 90,
    examType: "TRAC_NGHIEM",
    examForm: "Tự luận",
    theoryPeriods: defaults.theoryPeriods,
    practicePeriods: defaults.practicePeriods,
    theorySessionsPerWeek: defaults.theorySessionsPerWeek,
    practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
  };
}

function createEmptyLecturerForm(departmentId = "", facultyId = "") {
  return {
    lectureCode: "",
    fullName: "",
    degree: "",
    phone: "",
    departmentId,
    facultyId,
  };
}

export default function SemesterPlanWorkspaceList() {
  const token =
    Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken") || "";
  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    }),
    [token],
  );

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [autoRunningHistory, setAutoRunningHistory] = useState(false);
  const [globalAutomating, setGlobalAutomating] = useState(false);
  const [copying, setCopying] = useState(false);

  const [step, setStep] = useState<
    "blueprint" | "coordination" | "zap" | "management"
  >(
    "blueprint",
  );
  const [majors, setMajors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [curriculumSubjects, setCurriculumSubjects] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [execution, setExecution] = useState<any | null>(null);
  const [expectedStudents, setExpectedStudents] = useState({
    totalCount: 0,
    classCount: 0,
  });
  const [loadingExpectedStudents, setLoadingExpectedStudents] = useState(false);

  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [activeConceptualSemester, setActiveConceptualSemester] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateMatrix, setTemplateMatrix] = useState<Record<number, any[]>>(
    EMPTY_TEMPLATE(),
  );
  const [copyTargets, setCopyTargets] = useState<string[]>([]);

  const [templateSearch, setTemplateSearch] = useState("");
  const [executionSearch, setExecutionSearch] = useState("");
  const [executionStatusFilter, setExecutionStatusFilter] = useState("ALL");
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorStatusFilter, setMonitorStatusFilter] = useState("ALL");
  const [managerOpen, setManagerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [semesterDropdownOpen, setSemesterDropdownOpen] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [copyDropdownOpen, setCopyDropdownOpen] = useState(false);
  const [managerTab, setManagerTab] = useState<"cohorts" | "semesters" | "subjects" | "lecturers">(
    "cohorts",
  );
  const [managerSaving, setManagerSaving] = useState(false);
  const [editingCohortCode, setEditingCohortCode] = useState<string | null>(null);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);
  const [editingLecturerId, setEditingLecturerId] = useState<string | null>(null);
  const [cohortForm, setCohortForm] = useState(createEmptyCohortForm());
  const [semesterForm, setSemesterForm] = useState(createEmptySemesterForm());
  const [subjectForm, setSubjectForm] = useState(createEmptySubjectForm());
  const [lecturerForm, setLecturerForm] = useState(createEmptyLecturerForm());

  const resetCohortForm = () => {
    setEditingCohortCode(null);
    setCohortForm(createEmptyCohortForm());
  };

  const resetSemesterForm = () => {
    setEditingSemesterId(null);
    setSemesterForm(createEmptySemesterForm());
  };

  const resetSubjectForm = (majorId?: string, departmentId?: string) => {
    setEditingSubjectId(null);
    setSubjectForm(
      createEmptySubjectForm(
        majorId ?? selectedMajorId,
        departmentId ?? selectedDepartmentId,
      ),
    );
  };

  const resetLecturerForm = (departmentId?: string, facultyId?: string) => {
    setEditingLecturerId(null);
    setLecturerForm(
      createEmptyLecturerForm(
        departmentId ?? selectedDepartmentId,
        facultyId ??
        departments.find((department) => department.id === (departmentId ?? selectedDepartmentId))?.facultyId ??
        "",
      ),
    );
  };

  const reloadCohorts = async (preferredCode?: string | null) => {
    const response = await fetch(API("/cohorts"), { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Không thể tải lại danh sách khóa.");
    }

    const nextCohorts = sortCohorts(Array.isArray(data) ? data : []);
    setCohorts(nextCohorts);

    const nextSelectedCode =
      (preferredCode &&
        nextCohorts.find((item) => item.code === preferredCode)?.code) ||
      nextCohorts.find((item) => item.code === selectedCohort)?.code ||
      nextCohorts.find((item) => item.isActive)?.code ||
      nextCohorts[0]?.code ||
      "";

    setSelectedCohort(nextSelectedCode);
    return nextCohorts;
  };

  const reloadSemesters = async (preferredId?: string | null) => {
    const response = await fetch(API("/semesters"), { headers: authHeaders });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Không thể tải lại danh sách học kỳ.");
    }

    const nextSemesters = sortSemesters(Array.isArray(data) ? data : []);
    setSemesters(nextSemesters);

    const nextSelectedId =
      (preferredId &&
        nextSemesters.find((item) => item.id === preferredId)?.id) ||
      nextSemesters.find((item) => item.id === selectedSemesterId)?.id ||
      "";

    setSelectedSemesterId(nextSelectedId);

    return nextSemesters;
  };

  const reloadSubjects = async (
    majorId = selectedMajorId,
    departmentId = selectedDepartmentId,
  ) => {
    if (!majorId) {
      setSubjects([]);
      return [];
    }

    const params = new URLSearchParams({ majorId });
    if (departmentId) {
      params.set("departmentId", departmentId);
    }

    const response = await fetch(API(`/subjects?${params.toString()}`), {
      headers: authHeaders,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Không thể tải danh sách môn học.");
    }

    const nextSubjects = Array.isArray(data) ? data : [];
    setSubjects(nextSubjects);
    return nextSubjects;
  };

  const reloadCurriculumSubjects = async (
    majorId = selectedMajorId,
    cohort = selectedCohort,
    conceptualSemester = activeConceptualSemester,
    departmentId = selectedDepartmentId,
  ) => {
    if (!majorId || !cohort) {
      setCurriculumSubjects([]);
      return [];
    }

    const params = new URLSearchParams({
      majorId,
      cohort,
      semesterNumber: `${conceptualSemester}`,
    });

    const response = await fetch(
      API(`/semester-plan/curriculum?${params.toString()}`),
      {
        headers: authHeaders,
      },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(
        data?.message || "Không thể tải môn học từ khung chương trình.",
      );
    }

    const rows = Array.isArray(data) ? data : [];
    const mapped = rows
      .map((row: any) => row.subject || row)
      .filter(Boolean)
      .filter((subject: any, index: number, source: any[]) => {
        return source.findIndex((item) => item.id === subject.id) === index;
      })
      .filter((subject: any) =>
        departmentId ? subject.departmentId === departmentId : true,
      );

    setCurriculumSubjects(sortSubjects(mapped));
    return mapped;
  };

  const reloadLecturers = async () => {
    const response = await fetch(API("/lecturers"), {
      headers: authHeaders,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.message || "Không thể tải danh sách giảng viên.");
    }

    const nextLecturers = Array.isArray(data) ? data : [];
    setLecturers(nextLecturers);
    return nextLecturers;
  };

  useEffect(() => {
    const bootstrap = async () => {
      setLoading(true);
      try {
        const [majorRes, departmentRes, cohortRes, semesterRes, lecturerRes] =
          await Promise.all([
            fetch(API("/majors"), { headers: authHeaders }),
            fetch(API("/departments"), { headers: authHeaders }),
            fetch(API("/cohorts"), { headers: authHeaders }),
            fetch(API("/semesters"), { headers: authHeaders }),
            fetch(API("/lecturers"), { headers: authHeaders }),
          ]);

        const [majorData, departmentData, cohortData, semesterData, lecturerData] =
          await Promise.all([
            majorRes.json(),
            departmentRes.json(),
            cohortRes.json(),
            semesterRes.json(),
            lecturerRes.json(),
          ]);

        if (
          !majorRes.ok ||
          !departmentRes.ok ||
          !cohortRes.ok ||
          !semesterRes.ok ||
          !lecturerRes.ok
        ) {
          throw new Error("Không thể tải dữ liệu nền cho màn kế hoạch đào tạo.");
        }

        const majorList = Array.isArray(majorData) ? majorData : [];
        const departmentList = Array.isArray(departmentData) ? departmentData : [];
        const cohortList = sortCohorts(Array.isArray(cohortData) ? cohortData : []);
        const semesterList = sortSemesters(
          Array.isArray(semesterData) ? semesterData : [],
        );

        setMajors(majorList);
        setDepartments(departmentList);
        setCohorts(cohortList);
        setSemesters(semesterList);
        setLecturers(Array.isArray(lecturerData) ? lecturerData : []);

        const defaultMajor = majorList[0]?.id || "";
        const defaultCohort =
          cohortList.find((item: any) => item.isActive)?.code ||
          cohortList[0]?.code ||
          "";
        const defaultVisibleSemesters = getVisibleSemestersForCohort(
          semesterList,
          cohortList.find((item: any) => item.code === defaultCohort),
        );
        const defaultSemester =
          defaultVisibleSemesters.find((semester: any) => semester.isCurrent)?.id ||
          defaultVisibleSemesters[0]?.id ||
          semesterList.find((semester: any) => semester.isCurrent)?.id ||
          semesterList[0]?.id ||
          "";

        setSelectedMajorId(defaultMajor);
        setSelectedCohort(defaultCohort);
        setSelectedSemesterId(defaultSemester);
        const semester = semesterList.find(
          (item: any) => item.id === defaultSemester,
        );
        setActiveConceptualSemester(parseConceptualSemester(semester) || 1);
      } catch (error: any) {
        toast.error(
          error?.message || "Không thể tải dữ liệu nền cho màn kế hoạch đào tạo.",
        );
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, [authHeaders]);

  useEffect(() => {
    if (!selectedMajorId) return;

    const loadSubjects = async () => {
      try {
        await reloadSubjects(selectedMajorId, selectedDepartmentId);
      } catch (error: any) {
        setSubjects([]);
        toast.error(error?.message || "Không thể tải danh sách môn học.");
      }
    };

    loadSubjects();
  }, [selectedMajorId, selectedDepartmentId, authHeaders]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort) {
      setCurriculumSubjects([]);
      return;
    }

    const loadCurriculumSubjects = async () => {
      try {
        await reloadCurriculumSubjects(
          selectedMajorId,
          selectedCohort,
          activeConceptualSemester,
          selectedDepartmentId,
        );
      } catch (error: any) {
        setCurriculumSubjects([]);
        toast.error(
          error?.message || "Không thể tải môn học từ khung chương trình.",
        );
      }
    };

    loadCurriculumSubjects();
  }, [
    selectedMajorId,
    selectedCohort,
    activeConceptualSemester,
    selectedDepartmentId,
    authHeaders,
  ]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort) return;

    const loadTemplates = async () => {
      try {
        const response = await fetch(
          API(
            `/semester-plan/templates?majorId=${selectedMajorId}&cohort=${selectedCohort}`,
          ),
          { headers: authHeaders },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data?.message ||
            "Không thể tải mẫu kế hoạch. Kiểm tra lại migration của module kế hoạch đào tạo.",
          );
        }

        const templateList = Array.isArray(data) ? data : [];
        setTemplates(templateList);
        const preferred =
          templateList.find((item: any) => item.status === "DRAFT") ||
          templateList.find((item: any) => item.status === "PUBLISHED") ||
          templateList[0] ||
          null;

        setActiveTemplateId(preferred?.id || null);
        setTemplateMatrix(preferred ? templateToMatrix(preferred) : EMPTY_TEMPLATE());
        setExecution(null);
      } catch (error: any) {
        setTemplates([]);
        setActiveTemplateId(null);
        setTemplateMatrix(EMPTY_TEMPLATE());
        setExecution(null);
        toast.error(
          error?.message ||
          "Không thể tải mẫu kế hoạch. Kiểm tra lại migration của module kế hoạch đào tạo.",
        );
      }
    };

    loadTemplates();
  }, [selectedMajorId, selectedCohort, authHeaders]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort) {
      setExpectedStudents({ totalCount: 0, classCount: 0 });
      return;
    }

    const loadExpectedStudents = async () => {
      setLoadingExpectedStudents(true);
      try {
        const response = await fetch(
          API(
            `/semester-plan/expected-students?majorId=${selectedMajorId}&cohort=${selectedCohort}`,
          ),
          { headers: authHeaders },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            data?.message || "Không thể kiểm tra lớp danh nghĩa của khóa.",
          );
        }
        setExpectedStudents({
          totalCount: Number(data?.totalCount || 0),
          classCount: Number(data?.classCount || 0),
        });
      } catch (error: any) {
        setExpectedStudents({ totalCount: 0, classCount: 0 });
        toast.error(
          error?.message || "Không thể kiểm tra lớp danh nghĩa của khóa.",
        );
      } finally {
        setLoadingExpectedStudents(false);
      }
    };

    loadExpectedStudents();
  }, [selectedMajorId, selectedCohort, authHeaders]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort || !selectedSemesterId) {
      setExecution(null);
      return;
    }

    const loadExistingExecution = async () => {
      try {
        const params = new URLSearchParams({
          semesterId: selectedSemesterId,
          majorId: selectedMajorId,
          cohort: selectedCohort,
        });
        const response = await fetch(
          API(`/semester-plan/executions/current?${params.toString()}`),
          { headers: authHeaders },
        );
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Không thể tải dữ liệu vận hành.");
        }
        setExecution(data || null);
      } catch (error: any) {
        setExecution(null);
        toast.error(error?.message || "Không thể tải dữ liệu vận hành.");
      }
    };

    loadExistingExecution();
  }, [selectedMajorId, selectedCohort, selectedSemesterId, authHeaders]);

  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId) || null,
    [templates, activeTemplateId],
  );
  const selectedCohortMeta = useMemo(
    () => cohorts.find((cohort) => cohort.code === selectedCohort) || null,
    [cohorts, selectedCohort],
  );
  const visibleSemesters = useMemo(
    () => getVisibleSemestersForCohort(semesters, selectedCohortMeta),
    [semesters, selectedCohortMeta],
  );
  const currentReferenceSemester = useMemo(
    () => resolveSemesterReference(visibleSemesters),
    [visibleSemesters],
  );
  const activeSemester = useMemo(
    () => semesters.find((semester) => semester.id === selectedSemesterId) || null,
    [semesters, selectedSemesterId],
  );
  const selectedVisibleSemester = useMemo(
    () =>
      visibleSemesters.find((semester) => semester.id === selectedSemesterId) ||
      null,
    [visibleSemesters, selectedSemesterId],
  );
  const displayedTemplate =
    activeTemplate ||
    templates.slice().sort((left, right) => right.version - left.version)[0] ||
    null;
  const availableCopyCohorts = useMemo(
    () => cohorts.filter((cohort) => cohort.code !== selectedCohort),
    [cohorts, selectedCohort],
  );
  const selectedMajor = useMemo(
    () => majors.find((major) => major.id === selectedMajorId) || null,
    [majors, selectedMajorId],
  );
  const visibleDepartments = useMemo(() => {
    if (!selectedMajor?.facultyId) return departments;
    return departments.filter(
      (department) => department.facultyId === selectedMajor.facultyId,
    );
  }, [departments, selectedMajor]);
  const subjectFormDepartments = useMemo(() => {
    const formMajor = majors.find((major) => major.id === subjectForm.majorId);
    if (!formMajor?.facultyId) return departments;
    return departments.filter(
      (department) => department.facultyId === formMajor.facultyId,
    );
  }, [departments, majors, subjectForm.majorId]);
  const lecturerFormDepartments = useMemo(() => {
    if (!lecturerForm.facultyId) return departments;
    return departments.filter(
      (department) => department.facultyId === lecturerForm.facultyId,
    );
  }, [departments, lecturerForm.facultyId]);
  const managerSubjectRows = useMemo(() => {
    return [...subjects].sort((left, right) =>
      `${left.code || ""}`.localeCompare(`${right.code || ""}`),
    );
  }, [subjects]);
  const managerLecturerRows = useMemo(() => {
    const list = selectedDepartmentId
      ? lecturers.filter((lecturer) => lecturer.departmentId === selectedDepartmentId)
      : selectedMajor?.facultyId
        ? lecturers.filter((lecturer) => lecturer.facultyId === selectedMajor.facultyId)
        : lecturers;

    return [...list].sort((left, right) =>
      `${left.fullName || ""}`.localeCompare(`${right.fullName || ""}`),
    );
  }, [lecturers, selectedDepartmentId, selectedMajor]);
  const getLecturerOptionsForItem = (item: any) => {
    const departmentId = item?.subject?.departmentId;
    if (departmentId) {
      const sameDepartment = lecturers.filter(
        (lecturer) => lecturer.departmentId === departmentId,
      );
      if (sameDepartment.length > 0) {
        return sameDepartment;
      }
    }

    if (selectedMajor?.facultyId) {
      const sameFaculty = lecturers.filter(
        (lecturer) => lecturer.facultyId === selectedMajor.facultyId,
      );
      if (sameFaculty.length > 0) {
        return sameFaculty;
      }
    }

    return lecturers;
  };
  const canExecute = useMemo(
    () => isWithinSemesterWindow(activeSemester),
    [activeSemester],
  );

  useEffect(() => {
    if (!selectedCohortMeta) return;

    if (visibleSemesters.length === 0) {
      setSelectedSemesterId("");
      setActiveConceptualSemester(1);
      return;
    }

    const matched = visibleSemesters.find(
      (semester) => semester.id === selectedSemesterId,
    );
    const nextSemester =
      matched ||
      visibleSemesters.find((semester) => semester.isCurrent) ||
      visibleSemesters[0];

    if (!nextSemester) return;

    if (nextSemester.id !== selectedSemesterId) {
      setSelectedSemesterId(nextSemester.id);
    }
    setActiveConceptualSemester(parseConceptualSemester(nextSemester) || 1);
  }, [selectedCohortMeta, selectedSemesterId, visibleSemesters]);

  useEffect(() => {
    if (!selectedDepartmentId) return;

    const exists = visibleDepartments.some(
      (department) => department.id === selectedDepartmentId,
    );
    if (!exists) {
      setSelectedDepartmentId("");
    }
  }, [selectedDepartmentId, visibleDepartments]);

  const selectedSubjectsForSemester = useMemo(
    () => sortSubjects(templateMatrix[activeConceptualSemester] || []),
    [templateMatrix, activeConceptualSemester],
  );
  const assignedSubjectIds = useMemo(
    () =>
      new Set(
        Object.values(templateMatrix)
          .flatMap((semesterSubjects) => semesterSubjects || [])
          .map((subject: any) => subject.id)
          .filter(Boolean),
      ),
    [templateMatrix],
  );
  const totalSelectedSubjects = useMemo(
    () =>
      Object.values(templateMatrix).reduce(
        (sum, semesterSubjects) => sum + (semesterSubjects?.length || 0),
        0,
      ),
    [templateMatrix],
  );
  const hasPublishedTemplate = useMemo(
    () => templates.some((template) => template.status === "PUBLISHED"),
    [templates],
  );
  const canPublishTemplate = totalSelectedSubjects > 0;
  const hasAdminClasses = expectedStudents.classCount > 0;
  const canGeneratePreview =
    Boolean(selectedSemesterId && selectedMajorId && selectedCohort) &&
    hasPublishedTemplate &&
    hasAdminClasses;
  const automationSemesters = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    const byToday = visibleSemesters.filter((semester) => {
      const startDate = semester?.startDate ? new Date(semester.startDate) : null;
      return startDate ? startDate <= today : false;
    });

    if (byToday.length > 0) {
      return byToday;
    }

    if (!activeSemester?.startDate) {
      return [];
    }

    const fallbackLimit = new Date(activeSemester.startDate).getTime();
    return visibleSemesters.filter((semester) => {
      const startDate = semester?.startDate ? new Date(semester.startDate) : null;
      return startDate ? startDate.getTime() <= fallbackLimit : false;
    });
  }, [visibleSemesters, activeSemester]);
  const canAutoRunToCurrent =
    Boolean(selectedMajorId && selectedCohort) &&
    hasPublishedTemplate &&
    hasAdminClasses &&
    automationSemesters.length > 0;

  const templateRows = useMemo(() => {
    return sortSubjects(curriculumSubjects)
      .filter((subject: any) => {
        const keyword = templateSearch.trim().toLowerCase();
        const matchedKeyword =
          !keyword ||
          subject.code?.toLowerCase().includes(keyword) ||
          subject.name?.toLowerCase().includes(keyword) ||
          subject.department?.name?.toLowerCase().includes(keyword);
        return matchedKeyword && !assignedSubjectIds.has(subject.id);
      });
  }, [
    curriculumSubjects,
    templateSearch,
    assignedSubjectIds,
  ]);

  const executionRows = useMemo(() => {
    const items = execution?.items || [];
    return items.filter((item: any) => {
      const keyword = executionSearch.trim().toLowerCase();
      const matchedKeyword =
        !keyword ||
        item.subject?.code?.toLowerCase().includes(keyword) ||
        item.subject?.name?.toLowerCase().includes(keyword) ||
        item.adminClass?.code?.toLowerCase().includes(keyword) ||
        item.lecturer?.fullName?.toLowerCase().includes(keyword);
      const matchedStatus =
        executionStatusFilter === "ALL" || item.status === executionStatusFilter;
      return matchedKeyword && matchedStatus;
    });
  }, [execution, executionSearch, executionStatusFilter]);

  const monitorRows = useMemo(() => {
    const items = execution?.items || [];
    return items.filter((item: any) => {
      const keyword = monitorSearch.trim().toLowerCase();
      const matchedKeyword =
        !keyword ||
        item.subject?.code?.toLowerCase().includes(keyword) ||
        item.subject?.name?.toLowerCase().includes(keyword) ||
        item.adminClass?.code?.toLowerCase().includes(keyword) ||
        item.generatedCourseClass?.code?.toLowerCase().includes(keyword) ||
        item.lecturer?.fullName?.toLowerCase().includes(keyword);
      const matchedStatus =
        monitorStatusFilter === "ALL" || item.status === monitorStatusFilter;
      return matchedKeyword && matchedStatus;
    });
  }, [execution, monitorSearch, monitorStatusFilter]);

  const stats = useMemo(() => {
    const items = execution?.items || [];
    return {
      total: items.length,
      ready: items.filter((item: any) => item.status === "READY").length,
      executed: items.filter((item: any) => item.status === "EXECUTED").length,
      review: items.filter((item: any) => item.status === "NEEDS_REVIEW").length,
      classes: items.filter((item: any) => item.generatedCourseClass).length,
    };
  }, [execution]);

  const coordinationStats = useMemo(() => {
    const items = execution?.items || [];
    const validations = items.map((item: any) =>
      getExecutionValidation(item, activeSemester),
    );
    return {
      total: items.length,
      balanced: validations.filter((item: any) => item.matched).length,
      unbalanced: validations.filter((item: any) => !item.matched).length,
      missingLecturer: items.filter((item: any) => !item.lecturerId).length,
      expectedStudents: items.reduce(
        (sum: number, item: any) => sum + Number(item.expectedStudentCount || 0),
        0,
      ),
    };
  }, [activeSemester, execution]);

  const canZapExecution = useMemo(() => {
    return Boolean(
      execution?.id &&
      coordinationStats.total > 0 &&
      coordinationStats.unbalanced === 0 &&
      coordinationStats.missingLecturer === 0,
    );
  }, [execution, coordinationStats]);

  const persistTemplate = async (publish = false) => {
    if (!selectedMajorId || !selectedCohort) return null;
    const items = flattenTemplate(templateMatrix);
    setSaving(true);
    try {
      const response = await fetch(API("/semester-plan/templates"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          templateId: activeTemplate?.status === "DRAFT" ? activeTemplate.id : undefined,
          majorId: selectedMajorId,
          cohort: selectedCohort,
          items,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Lưu nháp thất bại.");
      toast.success("Đã lưu bản nháp kế hoạch.");
      setTemplates((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      setActiveTemplateId(data.id);
      if (!publish) {
        setTemplateMatrix(templateToMatrix(data));
      }
      return data;
    } catch (error: any) {
      toast.error(error?.message || "Lưu nháp thất bại.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    if (!canPublishTemplate) {
      toast.error("Chọn ít nhất một môn học trước khi phát hành mẫu kế hoạch.");
      return;
    }

    setPublishing(true);
    try {
      const draft = await persistTemplate(true);
      if (!draft?.id) return;

      const response = await fetch(
        API(`/semester-plan/templates/${draft.id}/publish`),
        {
          method: "POST",
          headers: authHeaders,
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Phát hành thất bại.");

      toast.success("Đã phát hành mẫu kế hoạch.");
      setTemplates((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      setActiveTemplateId(data.id);
      setTemplateMatrix(templateToMatrix(data));
      setStep("coordination");
    } catch (error: any) {
      toast.error(error?.message || "Phát hành thất bại.");
    } finally {
      setPublishing(false);
    }
  };

  const generateExecution = async () => {
    if (!hasPublishedTemplate) {
      toast.error("Chưa có mẫu kế hoạch đã phát hành cho ngành và khóa này.");
      return;
    }

    if (!hasAdminClasses) {
      toast.error(
        "Khóa này chưa có lớp danh nghĩa phù hợp để tạo bản xem trước.",
      );
      return;
    }

    if (!selectedSemesterId || !selectedMajorId || !selectedCohort) return;
    setGenerating(true);
    try {
      const response = await fetch(API("/semester-plan/executions/generate"), {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          semesterId: selectedSemesterId,
          majorId: selectedMajorId,
          cohort: selectedCohort,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Không thể tạo bản xem trước.");
      setExecution(data);
      setStep("coordination");
      toast.success("Đã tạo bản xem trước thực thi.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể tạo bản xem trước.");
    } finally {
      setGenerating(false);
    }
  };

  const toggleSubject = (subject: any) => {
    setTemplateMatrix((current) => {
      const assignedSemester = Object.entries(current).find(([, semesterSubjects]) =>
        (semesterSubjects || []).some((item: any) => item.id === subject.id),
      )?.[0];

      if (
        assignedSemester &&
        Number(assignedSemester) !== activeConceptualSemester
      ) {
        toast.error(
          `${subject.code} đã được gán ở HK${assignedSemester}. Một môn chỉ được học trong một học kỳ.`,
        );
        return current;
      }

      const currentSemesterSubjects = current[activeConceptualSemester] || [];
      const exists = currentSemesterSubjects.some((item: any) => item.id === subject.id);
      const nextSemesterSubjects = exists
        ? currentSemesterSubjects.filter((item: any) => item.id !== subject.id)
        : sortSubjects([...currentSemesterSubjects, subject]);
      return { ...current, [activeConceptualSemester]: nextSemesterSubjects };
    });
  };

  const addFilteredSubjectsToSemester = () => {
    setTemplateMatrix((current) => {
      const currentSemesterSubjects = current[activeConceptualSemester] || [];
      const subjectMap = new Map(
        currentSemesterSubjects.map((item: any) => [item.id, item]),
      );
      templateRows.forEach((subject: any) => {
        subjectMap.set(subject.id, subject);
      });
      return {
        ...current,
        [activeConceptualSemester]: sortSubjects(Array.from(subjectMap.values())),
      };
    });
  };

  const clearConceptualSemester = () => {
    setTemplateMatrix((current) => ({ ...current, [activeConceptualSemester]: [] }));
  };

  const copyTemplateToTargets = async () => {
    if (!activeTemplateId || !copyTargets.length) return;
    setCopying(true);
    try {
      const response = await fetch(
        API(`/semester-plan/templates/${activeTemplateId}/copy`),
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ targetCohorts: copyTargets }),
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Sao chép kế hoạch thất bại.");
      toast.success(`Đã sao chép kế hoạch sang ${data.count} khóa.`);
      setCopyTargets([]);
    } catch (error: any) {
      toast.error(error?.message || "Sao chép kế hoạch thất bại.");
    } finally {
      setCopying(false);
    }
  };

  const updateExecutionItem = async (itemId: string, patch: Record<string, any>) => {
    try {
      const response = await fetch(API(`/semester-plan/execution-items/${itemId}`), {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Cập nhật item thất bại.");

      const resolvedLecturerId =
        data?.lecturerId !== undefined ? data.lecturerId : patch.lecturerId;
      const resolvedLecturer =
        lecturers.find((lecturer) => lecturer.id === resolvedLecturerId) || null;

      setExecution((current: any) =>
        current
          ? {
            ...current,
            items: current.items.map((item: any) =>
              item.id === itemId
                ? {
                  ...item,
                  ...data,
                  lecturer:
                    data?.lecturer || resolvedLecturer || item.lecturer || null,
                }
                : item,
            ),
          }
          : current,
      );
    } catch (error: any) {
      toast.error(error?.message || "Cập nhật item thất bại.");
    }
  };

  const deleteExecutionClass = async (itemId: string, classId: string) => {
    if (
      !window.confirm(
        "Bạn có chắc chắn muốn xóa lớp học phần này? Thao tác này sẽ xóa toàn bộ lịch học và điểm danh liên quan. Mục kế hoạch sẽ được trả về trạng thái Nháp.",
      )
    )
      return;

    try {
      const response = await fetch(API(`/semester-plan/classes/${classId}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok)
        throw new Error(data?.message || "Xóa lớp học phần thất bại.");

      toast.success("Đã xóa lớp học phần.");

      // Reload execution to get updated statuses and removed class references
      if (execution?.id) {
        const reloadResponse = await fetch(
          API(`/semester-plan/executions/${execution.id}`),
          {
            headers: authHeaders,
          },
        );
        if (reloadResponse.ok) {
          const newData = await reloadResponse.json();
          setExecution(newData);
        }
      }
    } catch (error: any) {
      toast.error(error?.message || "Xóa lớp học phần thất bại.");
    }
  };

  const runExecution = async (path: string, successMessage: string) => {
    if (!execution?.id) return;
    setExecuting(true);
    try {
      const response = await fetch(API(path), {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.message || "Thực thi thất bại.");
      const params = new URLSearchParams({
        majorId: selectedMajorId,
        cohort: selectedCohort,
        semesterId: selectedSemesterId,
      });
      const refreshedResponse = await fetch(
        API(`/semester-plan/executions/current?${params.toString()}`),
        { headers: authHeaders },
      );
      if (refreshedResponse.ok) {
        const refreshedExecution = await refreshedResponse.json();
        setExecution(refreshedExecution || null);
      } else {
        setExecution(data.execution || null);
      }
      setStep("management");
      toast.success(successMessage);
      if (data?.summary?.conflicts?.length) {
        toast.error(
          `Có ${data.summary.conflicts.length} mục cần rà soát lại lịch hoặc giảng viên.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Thực thi thất bại.");
    } finally {
      setExecuting(false);
    }
  };

  const zapExecution = async () => {
    if (!execution?.id) return;

    if (!canZapExecution) {
      toast.error(
        "Cần gán đủ giảng viên và cân bằng đúng tổng số tiết trước khi ZAP.",
      );
      return;
    }

    setExecuting(true);
    const loadingToast = toast.loading(
      "Đang ZAP: mở lớp học phần, đẩy sinh viên, xếp lịch và khởi tạo bảng điểm...",
    );

    try {
      const response = await fetch(
        API(`/semester-plan/executions/${execution.id}/zap`),
        {
          method: "POST",
          headers: authHeaders,
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "ZAP thất bại.");
      }

      const params = new URLSearchParams({
        majorId: selectedMajorId,
        cohort: selectedCohort,
        semesterId: selectedSemesterId,
      });
      const refreshedResponse = await fetch(
        API(`/semester-plan/executions/current?${params.toString()}`),
        { headers: authHeaders },
      );
      if (refreshedResponse.ok) {
        const refreshedExecution = await refreshedResponse.json();
        setExecution(refreshedExecution || null);
      } else {
        setExecution(data.execution || null);
      }
      setStep("management");
      toast.success("ZAP thành công. Lớp học phần đã được mở.", {
        id: loadingToast,
      });

      if (data?.gradeInitialization?.createdGrades) {
        toast.success(
          `Đã khởi tạo ${data.gradeInitialization.createdGrades} bản ghi điểm.`,
        );
      }

      if (data?.summary?.conflicts?.length) {
        toast.error(
          `Có ${data.summary.conflicts.length} lớp cần rà soát lại giảng viên hoặc lịch.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "ZAP thất bại.", { id: loadingToast });
    } finally {
      setExecuting(false);
    }
  };

  const autoRunUpToCurrent = async () => {
    if (!canAutoRunToCurrent) {
      toast.error(
        "Cần có mẫu đã phát hành, lớp danh nghĩa và ít nhất một học kỳ hợp lệ để chạy tự động.",
      );
      return;
    }

    const semesterNames = automationSemesters.map((semester) => semester.name);
    if (
      !window.confirm(
        `Hệ thống sẽ tự động tạo và thực hiện ${automationSemesters.length} học kỳ từ đầu khóa đến hiện tại:\n- ${semesterNames.join("\n- ")}`,
      )
    ) {
      return;
    }

    setAutoRunningHistory(true);
    const loadingToast = toast.loading(
      "Đang tạo tự động tất cả học kỳ từ đầu khóa đến hiện tại...",
    );

    try {
      const response = await fetch(
        API("/semester-plan/executions/auto-run-up-to-current"),
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            majorId: selectedMajorId,
            cohort: selectedCohort,
            semesterIds: automationSemesters.map((semester) => semester.id),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Không thể chạy tự động toàn bộ học kỳ.");
      }

      if (data?.currentExecution) {
        setExecution(data.currentExecution);
        setSelectedSemesterId(data.currentExecution.semesterId || selectedSemesterId);
      }
      setStep("management");

      toast.success(
        `Đã xử lý ${data?.summary?.processedSemesters || 0}/${automationSemesters.length} học kỳ.`,
        { id: loadingToast },
      );

      const conflictCount = data?.summary?.conflicts?.length || 0;
      if (conflictCount > 0) {
        toast.error(
          `Còn ${conflictCount} cảnh báo cần rà soát ở một số học kỳ.`,
        );
      }
    } catch (error: any) {
      toast.error(
        error?.message || "Không thể chạy tự động toàn bộ học kỳ.",
        { id: loadingToast },
      );
    } finally {
      setAutoRunningHistory(false);
    }
  };

  const handleGlobalAutomate = async () => {
    if (
      !window.confirm(
        "CẢNH BÁO: Thao tác này sẽ tự động lập kế hoạch và xếp lịch cho TẤT CẢ các ngành, khóa và học kỳ có mẫu kế hoạch đã phát hành. Đây là thao tác nặng và có thể mất nhiều thời gian. Bạn có chắc chắn muốn tiếp tục?",
      )
    ) {
      return;
    }

    setGlobalAutomating(true);
    const id = toast.loading("Đang chạy tự động hóa toàn hệ thống...");
    try {
      const response = await fetch(API("/semester-plan/global-automate"), {
        method: "POST",
        headers: authHeaders,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.message || "Tự động hóa toàn cầu thất bại.");

      toast.success(
        `Hoàn tất tự động hóa hệ thống: ${data.summary?.runs?.length || 0} lượt chạy.`,
        { id },
      );
      // Optional: reload something
    } catch (error: any) {
      toast.error(error?.message || "Tự động hóa toàn cầu thất bại.", { id });
    } finally {
      setGlobalAutomating(false);
    }
  };

  const openCreateCohort = () => {
    resetCohortForm();
    setManagerTab("cohorts");
    setManagerOpen(true);
  };

  const openEditCohort = (cohort: any) => {
    setEditingCohortCode(cohort.code);
    setCohortForm({
      code: cohort.code || "",
      startYear: cohort.startYear || CURRENT_YEAR,
      endYear: cohort.endYear || (cohort.startYear || CURRENT_YEAR) + 4,
      isActive: Boolean(cohort.isActive),
    });
    setManagerTab("cohorts");
    setManagerOpen(true);
  };

  const saveCohort = async () => {
    setManagerSaving(true);
    try {
      const method = editingCohortCode ? "PATCH" : "POST";
      const path = editingCohortCode
        ? `/cohorts/${editingCohortCode}`
        : "/cohorts";
      const response = await fetch(API(path), {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          code: cohortForm.code,
          startYear: Number(cohortForm.startYear),
          endYear: Number(cohortForm.endYear),
          isActive: cohortForm.isActive,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Không thể lưu khóa sinh viên.");
      }

      await reloadCohorts(data?.code || cohortForm.code);
      setSelectedCohort(data?.code || cohortForm.code);
      resetCohortForm();
      toast.success(
        editingCohortCode
          ? "Đã cập nhật khóa sinh viên."
          : "Đã thêm khóa sinh viên.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu khóa sinh viên.");
    } finally {
      setManagerSaving(false);
    }
  };

  const removeCohort = async (code: string) => {
    if (!window.confirm(`Xóa khóa ${code}?`)) return;

    setManagerSaving(true);
    try {
      const response = await fetch(API(`/cohorts/${code}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Không thể xóa khóa sinh viên.");
      }

      await reloadCohorts(code === selectedCohort ? null : selectedCohort);
      if (editingCohortCode === code) {
        resetCohortForm();
      }
      toast.success("Đã xóa khóa sinh viên.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa khóa sinh viên.");
    } finally {
      setManagerSaving(false);
    }
  };

  const openCreateSemester = () => {
    resetSemesterForm();
    setManagerTab("semesters");
    setManagerOpen(true);
  };

  const openEditSemester = (semester: any) => {
    setEditingSemesterId(semester.id);
    setSemesterForm({
      code: semester.code || "",
      name: semester.name || "",
      year: `${semester.year || ""}`,
      startDate: formatDateInput(semester.startDate),
      endDate: formatDateInput(semester.endDate),
      isCurrent: Boolean(semester.isCurrent),
    });
    setManagerTab("semesters");
    setManagerOpen(true);
  };

  const saveSemester = async () => {
    setManagerSaving(true);
    try {
      const method = editingSemesterId ? "PATCH" : "POST";
      const path = editingSemesterId
        ? `/semesters/${editingSemesterId}`
        : "/semesters";
      const response = await fetch(API(path), {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          code: semesterForm.code,
          name: semesterForm.name,
          year: Number(semesterForm.year),
          startDate: semesterForm.startDate,
          endDate: semesterForm.endDate,
          isCurrent: semesterForm.isCurrent,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Không thể lưu học kỳ.");
      }

      await reloadSemesters(data?.id || editingSemesterId || null);
      setSelectedSemesterId(data?.id || selectedSemesterId);
      resetSemesterForm();
      toast.success(
        editingSemesterId ? "Đã cập nhật học kỳ." : "Đã thêm học kỳ.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu học kỳ.");
    } finally {
      setManagerSaving(false);
    }
  };

  const removeSemester = async (semesterId: string) => {
    if (!window.confirm("Xóa học kỳ này?")) return;

    setManagerSaving(true);
    try {
      const response = await fetch(API(`/semesters/${semesterId}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Không thể xóa học kỳ.");
      }

      await reloadSemesters(semesterId === selectedSemesterId ? null : selectedSemesterId);
      if (editingSemesterId === semesterId) {
        resetSemesterForm();
      }
      toast.success("Đã xóa học kỳ.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa học kỳ.");
    } finally {
      setManagerSaving(false);
    }
  };

  const openCreateSubject = () => {
    resetSubjectForm(selectedMajorId, selectedDepartmentId);
    setManagerTab("subjects");
    setManagerOpen(true);
  };

  const openEditSubject = (subject: any) => {
    const defaults = getRecommendedSubjectSchedule(subject);
    setEditingSubjectId(subject.id);
    setSubjectForm({
      code: subject.code || "",
      name: subject.name || "",
      majorId: subject.majorId || selectedMajorId,
      departmentId: subject.departmentId || "",
      credits: Number(subject.credits || 3),
      theoryHours: defaults.theoryPeriods,
      practiceHours: defaults.practicePeriods,
      selfStudyHours: Number(subject.selfStudyHours || 0),
      examDuration: Number(subject.examDuration || 90),
      examType: subject.examType || "TRAC_NGHIEM",
      examForm: subject.examForm || "Tự luận",
      theoryPeriods: defaults.theoryPeriods,
      practicePeriods: defaults.practicePeriods,
      theorySessionsPerWeek: defaults.theorySessionsPerWeek,
      practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
    });
    setManagerTab("subjects");
    setManagerOpen(true);
  };

  const saveSubject = async () => {
    setManagerSaving(true);
    try {
      const scheduleDefaults = getRecommendedSubjectSchedule(subjectForm);
      const method = editingSubjectId ? "PUT" : "POST";
      const path = editingSubjectId
        ? `/subjects/${editingSubjectId}`
        : "/subjects";
      const response = await fetch(API(path), {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          code: subjectForm.code,
          name: subjectForm.name,
          majorId: subjectForm.majorId,
          departmentId: subjectForm.departmentId || null,
          credits: Number(subjectForm.credits),
          theoryHours: scheduleDefaults.theoryPeriods,
          practiceHours: scheduleDefaults.practicePeriods,
          selfStudyHours: Number(subjectForm.selfStudyHours),
          examDuration: Number(subjectForm.examDuration),
          examType: subjectForm.examType,
          examForm: subjectForm.examForm,
          theoryPeriods: scheduleDefaults.theoryPeriods,
          practicePeriods: scheduleDefaults.practicePeriods,
          theorySessionsPerWeek: scheduleDefaults.theorySessionsPerWeek,
          practiceSessionsPerWeek: scheduleDefaults.practiceSessionsPerWeek,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Không thể lưu môn học.");
      }

      await reloadSubjects(
        subjectForm.majorId || selectedMajorId,
        subjectForm.departmentId || "",
      );
      if (subjectForm.majorId) {
        setSelectedMajorId(subjectForm.majorId);
      }
      setSelectedDepartmentId(subjectForm.departmentId || "");
      resetSubjectForm(subjectForm.majorId || selectedMajorId, subjectForm.departmentId || "");
      toast.success(
        editingSubjectId ? "Đã cập nhật môn học." : "Đã thêm môn học.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu môn học.");
    } finally {
      setManagerSaving(false);
    }
  };

  const removeSubject = async (subjectId: string) => {
    if (!window.confirm("Xóa môn học này?")) return;

    setManagerSaving(true);
    try {
      const response = await fetch(API(`/subjects/${subjectId}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Không thể xóa môn học.");
      }

      await reloadSubjects();
      if (editingSubjectId === subjectId) {
        resetSubjectForm();
      }
      toast.success("Đã xóa môn học.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa môn học.");
    } finally {
      setManagerSaving(false);
    }
  };

  const openCreateLecturer = () => {
    const defaultDepartment = selectedDepartmentId || "";
    const defaultFaculty =
      departments.find((department) => department.id === defaultDepartment)?.facultyId ||
      selectedMajor?.facultyId ||
      "";
    setEditingLecturerId(null);
    setLecturerForm(createEmptyLecturerForm(defaultDepartment, defaultFaculty));
    setManagerTab("lecturers");
    setManagerOpen(true);
  };

  const openEditLecturer = (lecturer: any) => {
    setEditingLecturerId(lecturer.id);
    setLecturerForm({
      lectureCode: lecturer.lectureCode || "",
      fullName: lecturer.fullName || "",
      degree: lecturer.degree || "",
      phone: lecturer.phone || "",
      departmentId: lecturer.departmentId || "",
      facultyId: lecturer.facultyId || "",
    });
    setManagerTab("lecturers");
    setManagerOpen(true);
  };

  const saveLecturer = async () => {
    setManagerSaving(true);
    try {
      const selectedDepartment = departments.find(
        (department) => department.id === lecturerForm.departmentId,
      );
      const facultyId =
        selectedDepartment?.facultyId || lecturerForm.facultyId || null;

      const method = editingLecturerId ? "PUT" : "POST";
      const path = editingLecturerId
        ? `/lecturers/${editingLecturerId}`
        : "/lecturers";
      const response = await fetch(API(path), {
        method,
        headers: authHeaders,
        body: JSON.stringify({
          lectureCode: lecturerForm.lectureCode,
          fullName: lecturerForm.fullName,
          degree: lecturerForm.degree || null,
          phone: lecturerForm.phone || null,
          departmentId: lecturerForm.departmentId || null,
          facultyId,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Không thể lưu giảng viên.");
      }

      await reloadLecturers();
      setEditingLecturerId(null);
      setLecturerForm(
        createEmptyLecturerForm(
          lecturerForm.departmentId || selectedDepartmentId,
          facultyId || selectedMajor?.facultyId || "",
        ),
      );
      toast.success(
        editingLecturerId ? "Đã cập nhật giảng viên." : "Đã thêm giảng viên.",
      );
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu giảng viên.");
    } finally {
      setManagerSaving(false);
    }
  };

  const removeLecturer = async (lecturerId: string) => {
    if (!window.confirm("Xóa giảng viên này?")) return;

    setManagerSaving(true);
    try {
      const response = await fetch(API(`/lecturers/${lecturerId}`), {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Không thể xóa giảng viên.");
      }

      await reloadLecturers();
      if (editingLecturerId === lecturerId) {
        const defaultFaculty = selectedMajor?.facultyId || "";
        setEditingLecturerId(null);
        setLecturerForm(
          createEmptyLecturerForm(selectedDepartmentId || "", defaultFaculty),
        );
      }
      toast.success("Đã xóa giảng viên.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa giảng viên.");
    } finally {
      setManagerSaving(false);
    }
  };

  const renderTemplateStep = () => (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Giai đoạn 1 • Master planning
            </p>
            <h2 className="mt-1 font-black">
              Blueprint môn học của HK{activeConceptualSemester}
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Chọn hoặc bỏ chọn môn học từ khung chương trình đào tạo chuẩn. Mỗi môn chỉ được gán đúng một học kỳ nên môn đã chọn sẽ tự ẩn khỏi khung bên trái.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[720px] xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={templateSearch}
                onChange={(event) => setTemplateSearch(event.target.value)}
                placeholder="Tìm theo mã môn, tên môn, bộ môn..."
                className="w-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] font-medium outline-none"
              />
            </div>

            <button
              onClick={addFilteredSubjectsToSemester}
              className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Thêm tất cả theo lọc
            </button>

            <button
              onClick={clearConceptualSemester}
              className="inline-flex items-center justify-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-rose-600"
            >
              Xóa toàn bộ môn của HK
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Chọn</th>
                <th className="px-4 py-3">Mã môn</th>
                <th className="px-4 py-3">Tên môn</th>
                <th className="px-4 py-3">TC</th>
                <th className="px-4 py-3">Bộ môn</th>
                <th className="px-4 py-3">LT / TH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {templateRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                    Không còn môn chưa gán học kỳ nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                templateRows.map((subject: any) => (
                  <tr key={subject.id} className="bg-white">
                    <td className="px-4 py-2.5">
                      <button
                        onClick={() => toggleSubject(subject)}
                        className="bg-slate-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700"
                      >
                        Thêm
                      </button>
                    </td>
                    <td className="px-4 py-3 font-black text-indigo-700">
                      {subject.code}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-slate-900">{subject.name}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500">
                        {subject.examType || "N/A"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {subject.credits}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600">
                      {subject.department?.name || "Chưa gắn bộ môn"}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-600">
                      {subject.theoryPeriods || 0} / {subject.practicePeriods || 0}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-200 xl:border-l xl:border-t-0">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-[13px] font-semibold text-slate-900">
              Danh sách môn đã chọn cho HK{activeConceptualSemester}
            </div>
            <div className="mt-1 text-[12px] font-medium text-slate-500">
              Danh sách đã chọn để rà soát và bỏ nhanh.
            </div>
          </div>

          <div className="max-h-[720px] overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Mã môn</th>
                  <th className="px-4 py-3">Tên môn</th>
                  <th className="px-4 py-3">TC</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {selectedSubjectsForSemester.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                      HK{activeConceptualSemester} chưa có môn nào.
                    </td>
                  </tr>
                ) : (
                  selectedSubjectsForSemester.map((subject: any, index: number) => (
                    <tr key={subject.id}>
                      <td className="px-4 py-3 font-black text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 font-black text-indigo-700">
                        {subject.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900">{subject.name}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {subject.credits}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleSubject(subject)}
                          className="bg-rose-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600"
                        >
                          Bỏ
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );

  const renderExecutionStep = () => (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Giai đoạn 2 • Điều phối thực thi
            </p>
            <h2 className="mt-1 font-black">
              Trạm điều phối lớp học phần
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Mỗi dòng là một lớp học phần dự kiến mở cho đúng một lớp danh nghĩa trong {activeSemester?.name || "học kỳ đã chọn"}. Hệ thống tự chuẩn hóa tổng tiết theo công thức tín chỉ × 15, tách LT/TH theo loại môn, mặc định 1 buổi/tuần và tự suy ra số tiết/buổi phù hợp trong cửa sổ học kỳ.
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:min-w-[720px] xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={executionSearch}
                onChange={(event) => setExecutionSearch(event.target.value)}
                placeholder="Lọc theo môn, lớp danh nghĩa, giảng viên..."
                className="w-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-[13px] font-medium outline-none"
              />
            </div>

            <label className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium text-slate-700">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={executionStatusFilter}
                onChange={(event) => setExecutionStatusFilter(event.target.value)}
                className="bg-transparent outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Nháp</option>
                <option value="READY">Sẵn sàng</option>
                <option value="NEEDS_REVIEW">Cần rà soát</option>
                <option value="EXECUTED">Đã thực hiện</option>
              </select>
            </label>

            <button
              onClick={handleGlobalAutomate}
              disabled={globalAutomating}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"
              title="Tự động xếp lịch cho tất cả các ngành/khóa/học kỳ"
            >
              {globalAutomating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="font-medium text-sm">Lập lịch toàn hệ thống</span>
            </button>

            <button
              onClick={() => setStep("blueprint")}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Tạo lại bản xem trước
            </button>

            <button
              onClick={() => setStep("zap")}
              disabled={!execution?.id}
              className="inline-flex items-center justify-center gap-2 bg-indigo-600 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
            >
              <PlayCircle className="h-4 w-4" />
              Sang bước ZAP
            </button>
          </div>
        </div>
      </div>

      {execution && (
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <dl className="grid gap-3 md:grid-cols-4">
            {[
              { label: "Tổng lớp dự kiến", value: coordinationStats.total },
              { label: "Khớp khung", value: coordinationStats.balanced },
              { label: "Lệch khung", value: coordinationStats.unbalanced },
              { label: "Thiếu giảng viên", value: coordinationStats.missingLecturer },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {item.label}
                </dt>
                <dd className="mt-1 text-xl font-black text-slate-900">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {!execution ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto max-w-xl space-y-3">
            <Workflow className="mx-auto h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">
              Chưa có bản xem trước
            </div>
            <div className="text-[13px] font-medium text-slate-500">
              Hãy chọn học kỳ thực tế rồi bấm "Sinh bản xem trước" để hệ thống tạo danh sách môn theo từng lớp danh nghĩa.
            </div>
          </div>
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-[1650px] text-sm">
            <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Học phần</th>
                <th className="px-4 py-3">Lớp danh nghĩa</th>
                <th className="px-4 py-3">SV dự kiến</th>
                <th className="px-4 py-3">Giảng viên</th>
                <th className="px-4 py-3">Tổng tiết</th>
                <th className="px-4 py-3">LT</th>
                <th className="px-4 py-3">TH</th>
                <th className="px-4 py-3">Buổi LT</th>
                <th className="px-4 py-3">Buổi TH</th>
                <th className="px-4 py-3">Tiết/buổi</th>
                <th className="px-4 py-3">Khớp khung</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {executionRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                    Không có dòng xem trước nào phù hợp với bộ lọc.
                  </td>
                </tr>
              ) : (
                executionRows.map((item: any, index: number) => (
                  <tr key={item.id} className="align-top">
                    <td className="px-4 py-3 font-black text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-black text-indigo-700">
                        {item.subject?.code}
                      </div>
                      <div className="mt-1 font-black text-slate-900">
                        {item.subject?.name}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {item.adminClass?.code}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-700">
                      {item.expectedStudentCount}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const lecturerOptions = getLecturerOptionsForItem(item);
                        return (
                          <select
                            value={item.lecturerId || ""}
                            onChange={(event) =>
                              updateExecutionItem(item.id, {
                                lecturerId: event.target.value,
                              })
                            }
                            className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold outline-none"
                          >
                            <option value="">Chọn giảng viên</option>
                            {lecturerOptions.map((lecturer) => (
                              <option key={lecturer.id} value={lecturer.id}>
                                {lecturer.fullName}
                              </option>
                            ))}
                          </select>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 font-black text-slate-700">
                      {getSubjectTotalPeriods(item.subject)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={item.theoryPeriods || 0}
                        onBlur={(event) =>
                          updateExecutionItem(item.id, {
                            theoryPeriods: Number(event.target.value),
                          })
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={item.practicePeriods || 0}
                        onBlur={(event) =>
                          updateExecutionItem(item.id, {
                            practicePeriods: Number(event.target.value),
                          })
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={item.theorySessionsPerWeek || 1}
                        onBlur={(event) =>
                          updateExecutionItem(item.id, {
                            theorySessionsPerWeek: Number(event.target.value),
                          })
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={item.practiceSessionsPerWeek || 1}
                        onBlur={(event) =>
                          updateExecutionItem(item.id, {
                            practiceSessionsPerWeek: Number(event.target.value),
                          })
                        }
                        className="w-20 rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        defaultValue={item.periodsPerSession || 3}
                        onBlur={(event) =>
                          updateExecutionItem(item.id, {
                            periodsPerSession: Number(event.target.value),
                          })
                        }
                        className="w-24 rounded-xl border border-slate-200 px-3 py-2 font-bold outline-none"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const validation = getExecutionValidation(
                          item,
                          activeSemester,
                        );
                        return (
                          <div className="min-w-[180px] space-y-2">
                            <div className="flex items-center justify-between gap-3 text-[11px] font-black">
                              <span
                                className={
                                  validation.matched
                                    ? "text-emerald-700"
                                    : "text-rose-600"
                                }
                              >
                                {validation.label}
                              </span>
                              <span className="text-slate-500">
                                {validation.configuredPeriods}/{validation.expectedPeriods} tiết
                              </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full ${validation.tone}`}
                                style={{
                                  width: `${Math.max(
                                    8,
                                    Math.min(validation.ratio * 100, 100),
                                  )}%`,
                                }}
                              />
                            </div>
                            <div className="text-[11px] font-bold text-slate-500">
                              Tải theo kỳ: {validation.weeklyCapacity} tiết trong cửa sổ học kỳ.
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-2 text-[11px] font-black uppercase ${statusTone(item.status)}`}
                      >
                        {statusLabel(item.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {item.generatedCourseClassId && (
                        <button
                          onClick={() =>
                            deleteExecutionClass(
                              item.id,
                              item.generatedCourseClassId,
                            )
                          }
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 transition-colors hover:bg-rose-100"
                          title="Xóa lớp học phần này"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  const renderZapStep = () => (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
          Giai đoạn 3 • Smart scheduling & ZAP
        </p>
        <h2 className="mt-1 font-black">Chốt kế hoạch và mở lớp tự động</h2>
        <p className="mt-1 text-[13px] font-medium text-slate-500">
          ZAP sẽ mở lớp học phần, đẩy toàn bộ sinh viên của lớp danh nghĩa tương ứng, xếp lịch và khởi tạo bảng điểm.
        </p>
      </div>

      {!execution ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto max-w-xl space-y-3">
            <Workflow className="mx-auto h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">
              Chưa có dữ liệu điều phối
            </div>
            <div className="text-[13px] font-medium text-slate-500">
              Hãy phát hành blueprint và tạo bản xem trước trước khi chạy ZAP.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <dl className="grid gap-3 md:grid-cols-4">
              {[
                { label: "Lớp dự kiến mở", value: coordinationStats.total },
                { label: "Sinh viên dự kiến", value: coordinationStats.expectedStudents },
                { label: "Khớp khung", value: coordinationStats.balanced },
                { label: "Thiếu giảng viên", value: coordinationStats.missingLecturer },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-xl font-black text-slate-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 px-6 py-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Kiểm tra</th>
                    <th className="px-4 py-3">Kết quả</th>
                    <th className="px-4 py-3">Ý nghĩa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    {
                      label: "Blueprint đã phát hành",
                      status: hasPublishedTemplate,
                      detail: "Mẫu kế hoạch đã được publish cho ngành và khóa đang chọn.",
                    },
                    {
                      label: "Có lớp danh nghĩa",
                      status: hasAdminClasses,
                      detail: `${expectedStudents.classCount} lớp danh nghĩa sẽ được tách 1-1 thành lớp học phần.`,
                    },
                    {
                      label: "Đủ giảng viên",
                      status: coordinationStats.missingLecturer === 0,
                      detail:
                        coordinationStats.missingLecturer === 0
                          ? "Toàn bộ lớp dự kiến đã có giảng viên."
                          : `Còn ${coordinationStats.missingLecturer} lớp chưa gán giảng viên.`,
                    },
                    {
                      label: "Khớp tổng số tiết",
                      status: coordinationStats.unbalanced === 0,
                      detail:
                        coordinationStats.unbalanced === 0
                          ? "Toàn bộ lớp đã khớp Credits x 15."
                          : `Còn ${coordinationStats.unbalanced} lớp lệch khung số tiết.`,
                    },
                  ].map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-3 font-black text-slate-900">{row.label}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-1.5 text-[11px] font-black uppercase ${row.status
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-rose-50 text-rose-600 ring-1 ring-rose-200"
                            }`}
                        >
                          {row.status ? "Đạt" : "Chưa đạt"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-slate-500">
                        {row.detail}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div>
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Atomic transaction
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-800">
                  `ZAP` sẽ thực hiện một lượt:
                </div>
              </div>
              <ul className="space-y-2 text-[13px] font-medium text-slate-600">
                <li>1. Chuyển trạng thái lớp học phần sang `OPEN`.</li>
                <li>2. Insert enrollment từ toàn bộ sinh viên thuộc lớp danh nghĩa.</li>
                <li>3. Sinh `ClassSession` theo cấu hình buổi/tuần và tiết/buổi.</li>
                <li>4. Khởi tạo bảng điểm cho từng sinh viên trong lớp học phần.</li>
              </ul>

              <button
                onClick={zapExecution}
                disabled={!canZapExecution || executing || !canExecute}
                className="inline-flex w-full items-center justify-center gap-2 bg-indigo-600 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
              >
                {executing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <PlayCircle className="h-4 w-4" />
                )}
                ZAP: Chốt & mở lớp tự động
              </button>

              <div
                className={`rounded-xl px-4 py-3 text-[12px] font-semibold ${canExecute
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-600"
                  }`}
              >
                {canExecute
                  ? `Học kỳ đang trong cửa sổ thực thi: ${formatDateRange(activeSemester)}`
                  : `Ngoài cửa sổ thực thi: ${formatDateRange(activeSemester)}`}
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );

  const renderMonitorStep = () => (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Giai đoạn 4 • Vận hành & quản lý
            </p>
            <h2 className="mt-1 font-black">
              Danh sách lớp học phần đang mở
            </h2>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              Danh sách lớp học phần đã ZAP thành công, dùng để điểm danh và nhập điểm theo từng lớp danh nghĩa.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={zapExecution}
              disabled={!execution?.id || !canExecute || executing}
              className="inline-flex items-center gap-2 bg-indigo-600 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60"
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              ZAP / Mở lớp
            </button>

            <button
              onClick={() =>
                runExecution(
                  `/semester-plan/executions/${execution?.id}/rebuild-schedule`,
                  "Đã xếp lại lịch cho kế hoạch học kỳ.",
                )
              }
              disabled={!execution?.id || executing}
              className="inline-flex items-center gap-2 border border-slate-300 bg-white px-3 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-60"
            >
              {executing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Xếp lại lịch
            </button>
          </div>
        </div>

        <div className={`mt-4 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-black ${canExecute ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}>
          {canExecute ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {canExecute
            ? `Học kỳ đang trong cửa sổ thực thi: ${formatDateRange(activeSemester)}`
            : `Ngoài cửa sổ thực thi: ${formatDateRange(activeSemester)}`}
        </div>
      </div>

      <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
        <dl className="grid gap-3 md:grid-cols-5">
          {[
            { label: "Tổng dòng", value: stats.total },
            { label: "Sẵn sàng", value: stats.ready },
            { label: "Đã thực thi", value: stats.executed },
            { label: "Cần rà soát", value: stats.review },
            { label: "Lớp đã sinh", value: stats.classes },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl bg-white px-4 py-3">
              <dt className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {item.label}
              </dt>
              <dd className="mt-1 text-2xl font-black text-slate-900">
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {!execution ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto max-w-xl space-y-3">
            <PlayCircle className="mx-auto h-10 w-10 text-slate-300" />
            <div className="text-base font-semibold text-slate-700">
              Chưa có dữ liệu vận hành để theo dõi
            </div>
            <div className="text-[13px] font-medium text-slate-500">
              Hãy tạo bản xem trước trước, sau đó thực hiện kế hoạch đào tạo để tạo lớp học phần và lịch học thật.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="border-b border-slate-200 px-6 py-4">
            <div className="flex flex-col gap-3 xl:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={monitorSearch}
                  onChange={(event) => setMonitorSearch(event.target.value)}
                  placeholder="Tìm theo môn, lớp, lớp học phần, giảng viên..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm font-bold outline-none"
                />
              </div>

              <label className="inline-flex items-center gap-2 border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium text-slate-700">
                <Filter className="h-4 w-4 text-slate-400" />
                <select
                  value={monitorStatusFilter}
                  onChange={(event) => setMonitorStatusFilter(event.target.value)}
                  className="bg-transparent outline-none"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="DRAFT">Nháp</option>
                  <option value="READY">Sẵn sàng</option>
                  <option value="EXECUTED">Đã thực hiện</option>
                  <option value="NEEDS_REVIEW">Cần rà soát</option>
                </select>
              </label>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1300px] text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th className="px-4 py-3">Học phần</th>
                  <th className="px-4 py-3">Lớp danh nghĩa</th>
                  <th className="px-4 py-3">Lớp HP</th>
                  <th className="px-4 py-3">Giảng viên</th>
                  <th className="px-4 py-3">SV</th>
                  <th className="px-4 py-3">Buổi đã xếp</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {monitorRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-sm font-bold text-slate-500">
                      Không có dòng vận hành nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  monitorRows.map((item: any, index: number) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-black text-slate-500">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-indigo-700">
                          {item.subject?.code}
                        </div>
                        <div className="mt-1 font-black text-slate-900">
                          {item.subject?.name}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {item.adminClass?.code}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-black text-slate-900">
                          {item.generatedCourseClass?.code || "Chưa sinh"}
                        </div>
                        <div className="mt-1 text-xs font-bold text-slate-500">
                          {item.generatedCourseClass?.name || "Chưa có lớp học phần"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {item.lecturer?.fullName || "Chưa gán"}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {item.generatedCourseClass?._count?.enrollments ??
                          item.expectedStudentCount}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-700">
                        {item.generatedCourseClass?.sessions?.length || 0}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-3 py-2 text-[11px] font-black uppercase ${statusTone(item.status)}`}
                        >
                          {statusLabel(item.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.generatedCourseClass?.id ? (
                          <div className="flex justify-end gap-2">
                            <Link
                              href={`/staff/attendance/${item.generatedCourseClass.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700"
                            >
                              Điểm danh
                            </Link>
                            <Link
                              href={`/staff/grades/${item.generatedCourseClass.id}`}
                              className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-black uppercase text-indigo-700"
                            >
                              Nhập điểm
                            </Link>
                          </div>
                        ) : (
                          <div className="text-right text-xs font-bold text-slate-400">
                            Chưa có lớp HP
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );

  const renderSubjectManager = () => (
    <>
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Biểu mẫu môn học
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {editingSubjectId ? "Sửa môn học" : "Thêm môn học mới"}
            </div>
          </div>

          <button
            onClick={openCreateSubject}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
          >
            <Plus className="h-4 w-4" />
            Mới
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Mã môn
              </span>
              <input
                value={subjectForm.code}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="WEB_DEV"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Tên môn
              </span>
              <input
                value={subjectForm.name}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Phát triển ứng dụng Web"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Ngành
              </span>
              <select
                value={subjectForm.majorId}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    majorId: event.target.value,
                    departmentId: "",
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="">Chọn ngành</option>
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Bộ môn
              </span>
              <select
                value={subjectForm.departmentId}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    departmentId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="">Không gắn bộ môn</option>
                {subjectFormDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Tín chỉ
              </span>
              <input
                type="number"
                value={subjectForm.credits}
                onChange={(event) =>
                  setSubjectForm((current) => {
                    const next = {
                      ...current,
                      credits: Number(event.target.value),
                    };
                    const defaults = getRecommendedSubjectSchedule(next);
                    return {
                      ...next,
                      theoryHours: defaults.theoryPeriods,
                      practiceHours: defaults.practicePeriods,
                      theoryPeriods: defaults.theoryPeriods,
                      practicePeriods: defaults.practicePeriods,
                      theorySessionsPerWeek: defaults.theorySessionsPerWeek,
                      practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
                    };
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Tiết LT
              </span>
              <input
                type="number"
                value={subjectForm.theoryPeriods}
                onChange={(event) =>
                  setSubjectForm((current) => {
                    const next = {
                      ...current,
                      theoryPeriods: Number(event.target.value),
                      theoryHours: Number(event.target.value),
                    };
                    const defaults = getRecommendedSubjectSchedule(next);
                    return {
                      ...next,
                      theoryPeriods: defaults.theoryPeriods,
                      theoryHours: defaults.theoryPeriods,
                      practicePeriods: defaults.practicePeriods,
                      practiceHours: defaults.practicePeriods,
                      theorySessionsPerWeek: defaults.theorySessionsPerWeek,
                      practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
                    };
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Tiết TH
              </span>
              <input
                type="number"
                value={subjectForm.practicePeriods}
                onChange={(event) =>
                  setSubjectForm((current) => {
                    const next = {
                      ...current,
                      practicePeriods: Number(event.target.value),
                      practiceHours: Number(event.target.value),
                    };
                    const defaults = getRecommendedSubjectSchedule(next);
                    return {
                      ...next,
                      theoryPeriods: defaults.theoryPeriods,
                      theoryHours: defaults.theoryPeriods,
                      practicePeriods: defaults.practicePeriods,
                      practiceHours: defaults.practicePeriods,
                      theorySessionsPerWeek: defaults.theorySessionsPerWeek,
                      practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
                    };
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Buổi LT / tuần
              </span>
              <input
                type="number"
                value={subjectForm.theorySessionsPerWeek}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    theorySessionsPerWeek: Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Buổi TH / tuần
              </span>
              <input
                type="number"
                value={subjectForm.practiceSessionsPerWeek}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    practiceSessionsPerWeek: Number(event.target.value),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Hình thức thi
              </span>
              <select
                value={subjectForm.examType}
                onChange={(event) =>
                  setSubjectForm((current) => {
                    const next = {
                      ...current,
                      examType: event.target.value,
                    };
                    const defaults = getRecommendedSubjectSchedule(next);
                    return {
                      ...next,
                      theoryHours: defaults.theoryPeriods,
                      practiceHours: defaults.practicePeriods,
                      theoryPeriods: defaults.theoryPeriods,
                      practicePeriods: defaults.practicePeriods,
                      theorySessionsPerWeek: defaults.theorySessionsPerWeek,
                      practiceSessionsPerWeek: defaults.practiceSessionsPerWeek,
                    };
                  })
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              >
                <option value="TRAC_NGHIEM">Trắc nghiệm</option>
                <option value="TU_LUAN">Tự luận</option>
                <option value="THUC_HANH">Thực hành</option>
              </select>
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Mô tả thi
              </span>
              <input
                value={subjectForm.examForm}
                onChange={(event) =>
                  setSubjectForm((current) => ({
                    ...current,
                    examForm: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={saveSubject}
              disabled={managerSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {managerSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingSubjectId ? "Lưu môn" : "Thêm môn"}
            </button>

            <button
              onClick={() => resetSubjectForm()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Danh sách môn học
              </div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                Đang hiển thị các môn theo ngành và bộ môn đã chọn trên màn hình chính.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              {managerSubjectRows.length} môn
            </div>
          </div>
        </div>

        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã môn</th>
              <th className="px-4 py-3">Tên môn</th>
              <th className="px-4 py-3">Ngành</th>
              <th className="px-4 py-3">Bộ môn</th>
              <th className="px-4 py-3">TC / LT / TH</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {managerSubjectRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm font-bold text-slate-500"
                >
                  Không có môn học trong phạm vi lọc hiện tại.
                </td>
              </tr>
            ) : (
              managerSubjectRows.map((subject) => (
                <tr key={subject.id}>
                  <td className="px-4 py-3 font-black text-indigo-700">
                    {subject.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-900">{subject.name}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {subject.major?.name || "Chưa gán"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {subject.department?.name || "Chưa gán"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {subject.credits} TC / {subject.theoryPeriods || subject.theoryHours || 0} LT / {subject.practicePeriods || subject.practiceHours || 0} TH
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditSubject(subject)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        onClick={() => removeSubject(subject.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black uppercase text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderLecturerManager = () => (
    <>
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
              Biểu mẫu giảng viên
            </div>
            <div className="mt-1 text-lg font-black text-slate-900">
              {editingLecturerId ? "Sửa giảng viên" : "Thêm giảng viên mới"}
            </div>
          </div>

          <button
            onClick={openCreateLecturer}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
          >
            <Plus className="h-4 w-4" />
            Mới
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Mã giảng viên
              </span>
              <input
                value={lecturerForm.lectureCode}
                onChange={(event) =>
                  setLecturerForm((current) => ({
                    ...current,
                    lectureCode: event.target.value.toUpperCase(),
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Họ tên
              </span>
              <input
                value={lecturerForm.fullName}
                onChange={(event) =>
                  setLecturerForm((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Học vị
              </span>
              <input
                value={lecturerForm.degree}
                onChange={(event) =>
                  setLecturerForm((current) => ({
                    ...current,
                    degree: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                Số điện thoại
              </span>
              <input
                value={lecturerForm.phone}
                onChange={(event) =>
                  setLecturerForm((current) => ({
                    ...current,
                    phone: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
              />
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
              Bộ môn
            </span>
            <select
              value={lecturerForm.departmentId}
              onChange={(event) => {
                const nextDepartmentId = event.target.value;
                const nextDepartment = departments.find(
                  (department) => department.id === nextDepartmentId,
                );
                setLecturerForm((current) => ({
                  ...current,
                  departmentId: nextDepartmentId,
                  facultyId: nextDepartment?.facultyId || current.facultyId,
                }));
              }}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
            >
              <option value="">Chọn bộ môn</option>
              {lecturerFormDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
            Khoa phụ trách:{" "}
            {majors.find((major) => major.facultyId === lecturerForm.facultyId)?.faculty?.name ||
              departments.find((department) => department.id === lecturerForm.departmentId)?.faculty?.name ||
              "Tự động theo bộ môn"}
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={saveLecturer}
              disabled={managerSaving}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
            >
              {managerSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {editingLecturerId ? "Lưu giảng viên" : "Thêm giảng viên"}
            </button>

            <button
              onClick={() => resetLecturerForm()}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-700"
            >
              <RefreshCw className="h-4 w-4" />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      <div className="min-h-0 overflow-auto">
        <div className="border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                Danh sách giảng viên
              </div>
              <div className="mt-1 text-sm font-bold text-slate-500">
                Đang hiển thị giảng viên theo khoa hoặc bộ môn phù hợp với màn hình chính.
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              {managerLecturerRows.length} giảng viên
            </div>
          </div>
        </div>

        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã GV</th>
              <th className="px-4 py-3">Họ tên</th>
              <th className="px-4 py-3">Bộ môn</th>
              <th className="px-4 py-3">Học vị</th>
              <th className="px-4 py-3">Điện thoại</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {managerLecturerRows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm font-bold text-slate-500"
                >
                  Không có giảng viên trong phạm vi lọc hiện tại.
                </td>
              </tr>
            ) : (
              managerLecturerRows.map((lecturer) => (
                <tr key={lecturer.id}>
                  <td className="px-4 py-3 font-black text-indigo-700">
                    {lecturer.lectureCode}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-black text-slate-900">{lecturer.fullName}</div>
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {lecturer.department?.name || "Chưa gán"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {lecturer.degree || "Chưa khai báo"}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-700">
                    {lecturer.phone || "Chưa khai báo"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditLecturer(lecturer)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </button>
                      <button
                        onClick={() => removeLecturer(lecturer.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black uppercase text-rose-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderManager = () => {
    if (!managerOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/30 p-4 backdrop-blur-sm">
        <div className="ml-auto flex h-full w-full max-w-[1180px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-200 px-6 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                  <Settings2 className="h-4 w-4" />
                  Danh mục nền
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Quản lý khóa, học kỳ, môn học và giảng viên
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">
                  Quản lý đầy đủ dữ liệu nền để lập kế hoạch đào tạo, tạo xem trước và vận hành học kỳ.
                </p>
              </div>

              <button
                onClick={() => {
                  setManagerOpen(false);
                  resetCohortForm();
                  resetSemesterForm();
                  resetSubjectForm();
                  resetLecturerForm();
                }}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                {
                  key: "cohorts" as const,
                  label: "Khóa sinh viên",
                  icon: ListChecks,
                },
                {
                  key: "semesters" as const,
                  label: "Học kỳ",
                  icon: CalendarRange,
                },
                {
                  key: "subjects" as const,
                  label: "Môn học",
                  icon: BookOpen,
                },
                {
                  key: "lecturers" as const,
                  label: "Giảng viên",
                  icon: Pencil,
                },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setManagerTab(key)}
                  className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-black ${managerTab === key
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[360px_minmax(0,1fr)]">
            {managerTab === "subjects" ? (
              renderSubjectManager()
            ) : managerTab === "lecturers" ? (
              renderLecturerManager()
            ) : managerTab === "cohorts" ? (
              <>
                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 xl:border-b-0 xl:border-r">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Biểu mẫu khóa sinh viên
                      </div>
                      <div className="mt-1 text-lg font-black text-slate-900">
                        {editingCohortCode ? `Sửa ${editingCohortCode}` : "Thêm khóa mới"}
                      </div>
                    </div>

                    <button
                      onClick={openCreateCohort}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Mới
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Mã khóa
                      </span>
                      <input
                        value={cohortForm.code}
                        onChange={(event) =>
                          setCohortForm((current) => ({
                            ...current,
                            code: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="K18"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Năm bắt đầu
                        </span>
                        <input
                          type="number"
                          value={cohortForm.startYear}
                          onChange={(event) =>
                            setCohortForm((current) => ({
                              ...current,
                              startYear: Number(event.target.value),
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Năm kết thúc
                        </span>
                        <input
                          type="number"
                          value={cohortForm.endYear}
                          onChange={(event) =>
                            setCohortForm((current) => ({
                              ...current,
                              endYear: Number(event.target.value),
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                        />
                      </label>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={cohortForm.isActive}
                        onChange={(event) =>
                          setCohortForm((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Khóa đang hoạt động
                    </label>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={saveCohort}
                        disabled={managerSaving}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
                      >
                        {managerSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {editingCohortCode ? "Lưu khóa" : "Thêm khóa"}
                      </button>

                      <button
                        onClick={resetCohortForm}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Làm mới
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 overflow-auto">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          Danh sách khóa
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-500">
                          Chọn một khóa để màn hình chính tự giới hạn đúng 8 học kỳ của khóa đó.
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                        {cohorts.length} khóa
                      </div>
                    </div>
                  </div>

                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Khóa</th>
                        <th className="px-4 py-3">Niên khóa</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cohorts.map((cohort) => (
                        <tr
                          key={cohort.code}
                          className={
                            selectedCohort === cohort.code ? "bg-indigo-50/60" : "bg-white"
                          }
                        >
                          <td className="px-4 py-3">
                            <div className="font-black text-slate-900">{cohort.code}</div>
                          </td>
                          <td className="px-4 py-3 font-bold text-slate-700">
                            {cohort.startYear}-{cohort.endYear}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-2 text-[11px] font-black uppercase ${cohort.isActive
                                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                  : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                                }`}
                            >
                              {cohort.isActive ? "Đang dùng" : "Ngừng dùng"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => openEditCohort(cohort)}
                                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                Sửa
                              </button>
                              <button
                                onClick={() => removeCohort(cohort.code)}
                                className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black uppercase text-rose-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5 xl:border-b-0 xl:border-r">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Biểu mẫu học kỳ
                      </div>
                      <div className="mt-1 text-lg font-black text-slate-900">
                        {editingSemesterId ? "Sửa học kỳ" : "Thêm học kỳ mới"}
                      </div>
                    </div>

                    <button
                      onClick={openCreateSemester}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                      Mới
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    <label className="block space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Mã học kỳ
                      </span>
                      <input
                        value={semesterForm.code}
                        onChange={(event) =>
                          setSemesterForm((current) => ({
                            ...current,
                            code: event.target.value,
                          }))
                        }
                        placeholder="2024_HK1"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Tên học kỳ
                      </span>
                      <input
                        value={semesterForm.name}
                        onChange={(event) =>
                          setSemesterForm((current) => ({
                            ...current,
                            name: event.target.value,
                          }))
                        }
                        placeholder="HK1 - Năm 1 (2024-2025)"
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Năm học bắt đầu
                      </span>
                      <input
                        type="number"
                        value={semesterForm.year}
                        onChange={(event) =>
                          setSemesterForm((current) => ({
                            ...current,
                            year: event.target.value,
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                      />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Ngày bắt đầu
                        </span>
                        <input
                          type="date"
                          value={semesterForm.startDate}
                          onChange={(event) =>
                            setSemesterForm((current) => ({
                              ...current,
                              startDate: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                        />
                      </label>

                      <label className="block space-y-2">
                        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Ngày kết thúc
                        </span>
                        <input
                          type="date"
                          value={semesterForm.endDate}
                          onChange={(event) =>
                            setSemesterForm((current) => ({
                              ...current,
                              endDate: event.target.value,
                            }))
                          }
                          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                        />
                      </label>
                    </div>

                    <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700">
                      <input
                        type="checkbox"
                        checked={semesterForm.isCurrent}
                        onChange={(event) =>
                          setSemesterForm((current) => ({
                            ...current,
                            isCurrent: event.target.checked,
                          }))
                        }
                        className="h-4 w-4 rounded border-slate-300"
                      />
                      Đặt làm học kỳ hiện tại
                    </label>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={saveSemester}
                        disabled={managerSaving}
                        className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-60"
                      >
                        {managerSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {editingSemesterId ? "Lưu học kỳ" : "Thêm học kỳ"}
                      </button>

                      <button
                        onClick={resetSemesterForm}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-black uppercase tracking-widest text-slate-700"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Làm mới
                      </button>
                    </div>
                  </div>
                </div>

                <div className="min-h-0 overflow-auto">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">
                          8 học kỳ theo khóa
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-500">
                          {selectedCohortMeta
                            ? `Đang hiển thị các học kỳ phù hợp với khóa ${selectedCohortMeta.code}.`
                            : "Hãy chọn khóa sinh viên ở màn hình chính."}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                        {visibleSemesters.length}/8 học kỳ
                      </div>
                    </div>
                  </div>

                  <table className="min-w-full text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-left text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">HK</th>
                        <th className="px-4 py-3">Tên học kỳ</th>
                        <th className="px-4 py-3">Thời gian</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visibleSemesters.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-12 text-center text-sm font-bold text-slate-500"
                          >
                            Chưa tìm được 8 học kỳ phù hợp với khóa đang chọn.
                          </td>
                        </tr>
                      ) : (
                        visibleSemesters.map((semester) => (
                          <tr
                            key={semester.id}
                            className={
                              selectedSemesterId === semester.id
                                ? "bg-indigo-50/60"
                                : "bg-white"
                            }
                          >
                            <td className="px-4 py-3 font-black text-indigo-700">
                              HK{parseConceptualSemester(semester) || 1}
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-black text-slate-900">
                                {semester.name}
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-500">
                                {semester.code}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-700">
                              {formatDateRange(semester)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-3 py-2 text-[11px] font-black uppercase ${semester.isCurrent
                                    ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                    : "bg-slate-100 text-slate-500 ring-1 ring-slate-200"
                                  }`}
                              >
                                {semester.isCurrent ? "Hiện tại" : "Dự kiến"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEditSemester(semester)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Sửa
                                </button>
                                <button
                                  onClick={() => removeSemester(semester.id)}
                                  className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black uppercase text-rose-600"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Xóa
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGuideModal = () => {
    if (!guideOpen) return null;

    const stages = [
      {
        title: "GĐ1 • Blueprint",
        detail:
          "Chọn môn học theo từng HK1-HK8. Một môn chỉ được nằm ở một học kỳ.",
      },
      {
        title: "GĐ2 • Điều phối",
        detail:
          "Sinh bản xem trước theo từng lớp danh nghĩa, gán giảng viên và kiểm tra khung tiết.",
      },
      {
        title: "GĐ3 • ZAP",
        detail:
          "Chốt kế hoạch, mở lớp học phần, đẩy sinh viên và xếp lịch tự động.",
      },
      {
        title: "GĐ4 • Vận hành",
        detail:
          "Theo dõi lớp đã mở, lịch học, điểm danh và tác vụ nhập điểm.",
      },
    ];

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/30 p-4 backdrop-blur-sm">
        <div className="mx-auto mt-8 max-w-[760px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-indigo-600">
                <Info className="h-4 w-4" />
                Hướng dẫn sử dụng
              </div>
              <h2 className="mt-2 text-xl font-black text-slate-900">
                Quy trình kế hoạch đào tạo
              </h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Màn này được tối ưu theo 4 giai đoạn để thao tác nhanh và ít sai sót.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 bg-white text-slate-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 px-5 py-5 md:grid-cols-2">
            {stages.map((stage) => (
              <div key={stage.title} className="border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-black text-slate-900">{stage.title}</div>
                <div className="mt-1 text-[13px] font-medium leading-6 text-slate-600">
                  {stage.detail}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 px-5 py-4 text-[13px] font-medium leading-6 text-slate-600">
            <p>
              `Đã xong` được xác định theo học kỳ hiện tại của khóa. Khi học kỳ hiện tại bắt đầu,
              mọi học kỳ có ngày bắt đầu sớm hơn sẽ tự chuyển sang trạng thái `Đã xong`.
            </p>
            <p className="mt-2">
              Mặc định hệ thống dùng 1 buổi/tuần cho mỗi môn. Staff có thể chỉnh tay ở bước
              điều phối trước khi chốt mở lớp.
            </p>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className={`${styles.compact} min-h-screen bg-slate-50 p-3 text-slate-900 lg:p-4`}>
      <Toaster position="top-right" />
      {renderManager()}
      {renderGuideModal()}

      <div className="mx-auto max-w-[1600px] space-y-3">
        <header className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.24em] text-indigo-600">
                  <ListChecks className="h-4 w-4" />
                  Kế hoạch đào tạo
                </div>
                <h1 className="text-[32px] font-black tracking-tight">
                  Quản lý kế hoạch đào tạo
                </h1>
                <p className="text-[13px] font-medium text-slate-500">
                  Chọn ngành, khóa và học kỳ để lập kế hoạch, tạo bản xem trước, rồi thực hiện và theo dõi lớp học phần.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[520px] xl:grid-cols-4">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ngành</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-800">{selectedMajor?.name || "Chưa chọn"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Khóa</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-800">{selectedCohort || "Chưa chọn"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">HK triển khai</div>
                  <div className="mt-1 text-[13px] font-semibold text-slate-800">{activeSemester ? formatSemesterOptionLabel(activeSemester) : "Chưa chọn"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cửa sổ thực thi</div>
                  <div className={`mt-1 text-[13px] font-semibold ${canExecute ? "text-emerald-600" : "text-rose-600"}`}>{canExecute ? "Đang mở" : "Đang khóa"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Ngành</span>
                <select
                  value={selectedMajorId}
                  onChange={(event) => {
                    setSelectedDepartmentId("");
                    setSelectedMajorId(event.target.value);
                  }}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium outline-none"
                >
                  {majors.map((major) => (
                    <option key={major.id} value={major.id}>{major.name}</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Bộ môn</span>
                <select
                  value={selectedDepartmentId}
                  onChange={(event) => setSelectedDepartmentId(event.target.value)}
                  className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium outline-none"
                >
                  <option value="">Tất cả bộ môn cùng khoa</option>
                  {visibleDepartments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Khóa</span>
                <select value={selectedCohort} onChange={(event) => setSelectedCohort(event.target.value)} className="w-full border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium outline-none">
                  {cohorts.map((cohort) => (
                    <option key={cohort.code} value={cohort.code}>{cohort.code} ({cohort.startYear}-{cohort.endYear})</option>
                  ))}
                </select>
              </label>

              <label className="space-y-2 xl:min-w-[280px]">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Học kỳ thực thi</span>
                <select
                  value={selectedSemesterId}
                  onChange={(event) => {
                    const semester = visibleSemesters.find(
                      (item) => item.id === event.target.value,
                    );
                    setSelectedSemesterId(event.target.value);
                    setActiveConceptualSemester(parseConceptualSemester(semester) || 1);
                  }}
                  className="w-full min-w-[280px] border border-slate-200 bg-slate-50 px-3 py-2.5 text-[13px] font-medium outline-none"
                >
                  {visibleSemesters.length === 0 ? (
                    <option value="">Không có học kỳ phù hợp</option>
                  ) : (
                    visibleSemesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>{formatSemesterOptionLabel(semester)}</option>
                    ))
                  )}
                </select>
                <div className="text-xs font-bold text-slate-500">
                  {selectedCohort
                    ? `Đang hiển thị ${visibleSemesters.length}/8 học kỳ của khóa ${selectedCohort}.`
                    : "Chưa chọn khóa sinh viên."}
                </div>
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
              <button onClick={() => setManagerOpen(true)} className="inline-flex h-10 w-full items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700">
                <Settings2 className="h-4 w-4" />
                Quản lý kỳ & khóa
              </button>
              <button onClick={() => persistTemplate()} disabled={saving} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-slate-900 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Lưu nháp
              </button>
              <button onClick={publishTemplate} disabled={publishing || !canPublishTemplate} className="inline-flex h-10 w-full items-center justify-center gap-2 bg-indigo-600 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white disabled:opacity-60">
                {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Phát hành
              </button>
              <button onClick={generateExecution} disabled={generating || !canGeneratePreview} className="inline-flex h-10 w-full items-center justify-center gap-2 border border-slate-300 bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-60">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Workflow className="h-4 w-4" />}
                Tạo xem trước
              </button>
              <button
                onClick={autoRunUpToCurrent}
                disabled={autoRunningHistory || !canAutoRunToCurrent}
                className="inline-flex h-10 w-full items-center justify-center gap-2 border border-emerald-300 bg-emerald-50 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700 disabled:opacity-60"
              >
                {autoRunningHistory ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarRange className="h-4 w-4" />
                )}
                Tạo tự động đến hiện tại
              </button>
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Học kỳ của khóa
                </div>
              </div>

              {visibleSemesters.length === 0 ? (
                <div className="px-4 py-4 text-sm font-semibold text-slate-500">
                  Chưa tìm được học kỳ phù hợp với khóa đang chọn.
                </div>
              ) : (
                <div className="p-3">
                  <button
                    type="button"
                    onClick={() => setSemesterDropdownOpen((current) => !current)}
                    className="flex w-full items-start justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Học kỳ đang chọn
                      </div>
                      <div className="mt-1 truncate text-[13px] font-black text-slate-900">
                        {selectedVisibleSemester
                          ? formatSemesterOptionLabel(selectedVisibleSemester)
                          : "Chọn học kỳ"}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                        {selectedVisibleSemester
                          ? <>
                              <span>{formatDateRange(selectedVisibleSemester)}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                                getSemesterProgressMeta(selectedVisibleSemester, currentReferenceSemester).tone
                              }`}>
                                {getSemesterProgressMeta(selectedVisibleSemester, currentReferenceSemester).label}
                              </span>
                            </>
                          : `Đang hiển thị ${visibleSemesters.length}/8 học kỳ của khóa ${selectedCohort}.`}
                      </div>
                    </div>
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-500">
                      {semesterDropdownOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {semesterDropdownOpen ? (
                    <div className="mt-2 overflow-hidden border border-slate-200 bg-white">
                      <div className="max-h-60 divide-y divide-slate-100 overflow-y-auto">
                        {visibleSemesters.map((semester) => {
                          const conceptualSemester = parseConceptualSemester(semester);
                          const isSelected = selectedSemesterId === semester.id;
                          const progress = getSemesterProgressMeta(semester, currentReferenceSemester);
                          return (
                            <button
                              key={semester.id}
                              type="button"
                              onClick={() => {
                                setSelectedSemesterId(semester.id);
                                setActiveConceptualSemester(conceptualSemester || 1);
                                setSemesterDropdownOpen(false);
                              }}
                              className={`grid w-full gap-2 px-3 py-2.5 text-left md:grid-cols-[58px_minmax(0,1fr)_170px_82px] ${isSelected ? "bg-indigo-50" : "bg-white hover:bg-slate-50"
                                }`}
                            >
                              <div className="text-[13px] font-black text-indigo-700">
                                HK{conceptualSemester}
                              </div>
                              <div className="min-w-0">
                                <div className="truncate text-[13px] font-black text-slate-900">
                                  {formatSemesterOptionLabel(semester)}
                                </div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                  {semester.code}
                                </div>
                              </div>
                              <div className="text-xs font-semibold text-slate-600">
                                {formatDateRange(semester)}
                              </div>
                              <div>
                                <span
                                  className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${progress.tone}`}
                                >
                                  {progress.label}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-[13px] font-medium text-slate-600">
              {!canPublishTemplate
                ? "Cần chọn ít nhất 1 môn học trong mẫu kế hoạch trước khi phát hành."
                : !hasPublishedTemplate
                  ? "Sau khi phát hành mẫu kế hoạch, nút tạo bản xem trước sẽ được mở."
                  : loadingExpectedStudents
                    ? "Đang kiểm tra lớp danh nghĩa của khóa đã chọn..."
                    : !hasAdminClasses
                      ? "Khóa này chưa có lớp danh nghĩa phù hợp, nên chưa thể tạo bản xem trước."
                      : `Sẵn sàng tạo bản xem trước theo ${expectedStudents.classCount} lớp danh nghĩa, ${expectedStudents.totalCount} sinh viên dự kiến. Nút "Tạo tự động đến hiện tại" sẽ chạy ${automationSemesters.length} học kỳ từ đầu khóa đến học kỳ hiện tại.`
              }
            </div>
          </div>

          <div className="px-4 pb-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Lớp danh nghĩa
                </div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {loadingExpectedStudents ? "..." : expectedStudents.classCount}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Sinh viên dự kiến
                </div>
                <div className="mt-1 text-base font-black text-slate-900">
                  {loadingExpectedStudents ? "..." : expectedStudents.totalCount}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
              {[
                { value: "blueprint" as const, icon: BookOpen, label: "GĐ1 • Blueprint" },
                { value: "coordination" as const, icon: Workflow, label: "GĐ2 • Điều phối" },
                { value: "zap" as const, icon: Sparkles, label: "GĐ3 • ZAP" },
                { value: "management" as const, icon: PlayCircle, label: "GĐ4 • Vận hành" },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  onClick={() => setStep(value)}
                  className={`flex items-center justify-between rounded-lg border px-4 py-3 text-left transition ${step === value
                      ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-black">
                    <Icon className="h-4 w-4" />
                    {label}
                  </span>
                  <span className="text-[11px] font-black uppercase tracking-[0.18em]">{step === value ? "Đang mở" : "Chuyển"}</span>
                </button>
              ))}
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="hidden h-11 shrink-0 items-center gap-2 border border-slate-300 bg-white px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 lg:inline-flex"
              >
                <Info className="h-4 w-4" />
                Info
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Học kỳ khái niệm</p>
              </div>
              <div className="divide-y divide-slate-100">
                {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => (
                  <button key={semester} onClick={() => setActiveConceptualSemester(semester)} className={`flex w-full items-center justify-between px-5 py-3 text-left ${activeConceptualSemester === semester ? "bg-indigo-50 text-indigo-700" : "bg-white text-slate-700 hover:bg-slate-50"}`}>
                    <span className="text-sm font-black">HK{semester}</span>
                    <span className="text-xs font-black">{(templateMatrix[semester] || []).length} môn</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Phiên bản kế hoạch</p>
              </div>
              {templates.length === 0 ? (
                <div className="px-5 py-6 text-sm font-bold text-slate-500">
                  Chưa có mẫu kế hoạch cho ngành và khóa đang chọn.
                </div>
              ) : (
                <div className="p-4">
                  <button
                    type="button"
                    onClick={() => setTemplateDropdownOpen((current) => !current)}
                    className="flex w-full items-start justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                        Phiên bản đang chọn
                      </div>
                      <div className="mt-1 truncate text-[13px] font-black text-slate-900">
                        {displayedTemplate ? `Phiên bản ${displayedTemplate.version}` : "Chưa có phiên bản"}
                      </div>
                      <div className="mt-1 text-xs font-semibold text-slate-500">
                        {displayedTemplate
                          ? `${displayedTemplate.items?.length || 0} môn • ${
                              displayedTemplate.publishedAt
                                ? new Intl.DateTimeFormat("vi-VN").format(
                                    new Date(displayedTemplate.publishedAt),
                                  )
                                : "Chưa phát hành"
                            }`
                          : "Chưa có mẫu kế hoạch"}
                      </div>
                    </div>
                    <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-500">
                      {templateDropdownOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </span>
                  </button>

                  {displayedTemplate ? (
                    <div className="mt-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusTone(displayedTemplate.status)}`}>
                        {statusLabel(displayedTemplate.status)}
                      </span>
                    </div>
                  ) : null}

                  {templateDropdownOpen ? (
                    <div className="mt-2 overflow-hidden border border-slate-200 bg-white">
                      <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                        {templates
                          .slice()
                          .sort((a, b) => b.version - a.version)
                          .map((template) => (
                            <button
                              key={template.id}
                              type="button"
                              onClick={() => {
                                setActiveTemplateId(template.id);
                                setTemplateMatrix(templateToMatrix(template));
                                setTemplateDropdownOpen(false);
                                setStep("blueprint");
                              }}
                              className={`w-full px-3 py-3 text-left ${activeTemplateId === template.id ? "bg-indigo-50" : "bg-white hover:bg-slate-50"}`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="truncate text-[13px] font-black text-slate-900">
                                    Phiên bản {template.version}
                                  </div>
                                  <div className="mt-1 text-xs font-bold text-slate-500">
                                    {template.items?.length || 0} môn • {template.publishedAt ? new Intl.DateTimeFormat("vi-VN").format(new Date(template.publishedAt)) : "Chưa phát hành"}
                                  </div>
                                </div>
                                <span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${statusTone(template.status)}`}>
                                  {statusLabel(template.status)}
                                </span>
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-4">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-400">Sao chép sang khóa khác</p>
              </div>
              <div className="p-4">
                <button
                  type="button"
                  onClick={() => setCopyDropdownOpen((current) => !current)}
                  className="flex w-full items-start justify-between gap-3 border border-slate-200 bg-slate-50 px-3 py-2.5 text-left"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                      Khóa đích
                    </div>
                    <div className="mt-1 truncate text-[13px] font-black text-slate-900">
                      {copyTargets.length
                        ? `${copyTargets.length} khóa đã chọn`
                        : "Chọn khóa cần sao chép"}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-slate-500">
                      {copyTargets.length ? copyTargets.join(", ") : "Dropdown tích chọn nhiều khóa"}
                    </div>
                  </div>
                  <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center border border-slate-200 bg-white text-slate-500">
                    {copyDropdownOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </span>
                </button>

                {copyDropdownOpen ? (
                  <div className="mt-2 overflow-hidden border border-slate-200 bg-white">
                    <div className="max-h-64 divide-y divide-slate-100 overflow-y-auto">
                      {availableCopyCohorts.map((cohort) => {
                        const checked = copyTargets.includes(cohort.code);
                        return (
                          <label
                            key={cohort.code}
                            className="flex cursor-pointer items-center justify-between gap-3 px-3 py-3 hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-black text-slate-800">{cohort.code}</div>
                              <div className="text-xs font-bold text-slate-500">
                                {cohort.startYear}-{cohort.endYear}
                              </div>
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                setCopyTargets((current) =>
                                  checked
                                    ? current.filter((item) => item !== cohort.code)
                                    : [...current, cohort.code],
                                )
                              }
                              className="h-4 w-4 accent-indigo-600"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="border-t border-slate-200 px-4 py-4">
                <button onClick={copyTemplateToTargets} disabled={!activeTemplateId || copying || !copyTargets.length} className="inline-flex w-full items-center justify-center gap-2 border border-slate-300 bg-white px-4 py-2.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-slate-700 disabled:opacity-60">
                  {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                  Sao chép kế hoạch
                </button>
              </div>
            </section>

          </aside>

          <main className="space-y-4">
            {step === "blueprint" && renderTemplateStep()}
            {step === "coordination" && renderExecutionStep()}
            {step === "zap" && renderZapStep()}
            {step === "management" && renderMonitorStep()}
          </main>
        </div>
      </div>
    </div>
  );
}
