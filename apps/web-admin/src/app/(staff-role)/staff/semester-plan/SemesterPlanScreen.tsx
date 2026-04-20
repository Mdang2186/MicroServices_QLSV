"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Cookies from "js-cookie";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ClipboardList,
  LayoutGrid,
  Layers,
  ListChecks,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Toaster, toast } from "react-hot-toast";
import SemesterManagerModal from "@/components/SemesterManagerModal";
import CohortManagerModal from "@/components/CohortManagerModal";
import CopyPlanModal from "@/components/CopyPlanModal";
import { Copy } from "lucide-react";

const API = (path: string) => `/api${path}`;
const EMPTY_TEMPLATE = () =>
  Object.fromEntries(
    Array.from({ length: 8 }, (_, index) => [index + 1, []]),
  ) as Record<number, any[]>;

type Step = "KHUNG" | "DIEU_PHOI" | "CHOT" | "VAN_HANH";

function parseConceptualSemester(semester: any) {
  const source = `${semester?.code || ""} ${semester?.name || ""}`;
  const match =
    source.match(/HK\s*([1-8])/i) ||
    source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
    source.match(/SEMESTER\s*([1-8])/i);
  return match ? Number(match[1]) : 1;
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

function scoreSemesterForCohort(
  semester: any,
  cohort: any,
  conceptualSemester: number,
) {
  const parsed = parseConceptualSemester(semester);
  if (parsed !== conceptualSemester) return -1;

  const startDate = semester?.startDate ? new Date(semester.startDate) : null;
  const startMonth = startDate ? startDate.getMonth() + 1 : 0;
  const startYear = startDate
    ? startDate.getFullYear()
    : Number(semester?.year || 0);
  const expectedYear = expectedYearForSemester(
    Number(cohort?.startYear || 0),
    conceptualSemester,
  );
  const expectedStudyYear = Math.ceil(conceptualSemester / 2);
  const code = `${semester?.code || ""}`;
  const name = `${semester?.name || ""}`;

  let score = 0;
  if (startYear === expectedYear || Number(semester?.year) === expectedYear) score += 50;
  if (conceptualSemester % 2 === 1 ? startMonth >= 7 : startMonth > 0 && startMonth <= 6) score += 30;
  if (new RegExp(`HK\\s*${conceptualSemester}\\s*-\\s*Năm\\s*${expectedStudyYear}`, "i").test(name)) score += 40;
  if (new RegExp(`^\\d{4}_HK${conceptualSemester}$`, "i").test(code)) score += 30;
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
    const leftSemester = parseConceptualSemester(left);
    const rightSemester = parseConceptualSemester(right);
    if (leftSemester !== rightSemester) return leftSemester - rightSemester;
    return new Date(left.startDate || 0).getTime() - new Date(right.startDate || 0).getTime();
  });
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

function formatSemesterLabel(semester: any) {
  return semester?.name || semester?.code || "Học kỳ";
}

function countTeachingWeeks(semester: any) {
  if (!semester?.startDate || !semester?.endDate) return 15;
  const start = new Date(semester.startDate);
  const end = new Date(semester.endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 15;
  }
  const diffDays =
    Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  return Math.max(1, Math.ceil(diffDays / 7));
}

function getBlockPlannedPeriods(
  totalPeriods: number,
  sessionsPerWeek: number,
  periodsPerSession: number,
  semester?: any,
) {
  const total = Number(totalPeriods || 0);
  const sessions = Number(sessionsPerWeek || 0);
  const periods = Number(periodsPerSession || 0);
  const weeks = countTeachingWeeks(semester);

  if (total <= 0 || sessions <= 0 || periods <= 0) {
    return 0;
  }

  const requiredSessions = Math.max(1, Math.ceil(total / periods));
  const availableSessions = Math.max(weeks, 1) * sessions;
  return Math.min(requiredSessions, availableSessions) * periods;
}

function getPlannedTotalPeriods(item: any, semester?: any) {
  const periodsPerSession = Number(item?.periodsPerSession || 3);
  const totalPeriods =
    Number(item?.theoryPeriods || 0) + Number(item?.practicePeriods || 0);
  const sessionsPerWeek = Math.max(
    Number(item?.theorySessionsPerWeek || 0),
    Number(item?.practiceSessionsPerWeek || 0),
    1,
  );

  return getBlockPlannedPeriods(
    totalPeriods,
    sessionsPerWeek,
    periodsPerSession,
    semester,
  );
}

function getRequiredTotalPeriods(item: any) {
  return Number(item?.subject?.credits || 0) * 15;
}

function getValidationState(item: any, semester?: any) {
  const required = getRequiredTotalPeriods(item);
  const planned = getPlannedTotalPeriods(item, semester);
  const matched = required > 0 && planned === required;
  const ratio = required > 0 ? Math.min((planned / required) * 100, 100) : 0;
  return { required, planned, matched, ratio };
}

function getDisplayedSessionsPerWeek(item: any) {
  return (
    Math.max(
      Number(item?.theorySessionsPerWeek || 0),
      Number(item?.practiceSessionsPerWeek || 0),
      1,
    ) || 1
  );
}

function buildSessionsPerWeekPatch(item: any, nextValue: number) {
  const normalized = Math.max(Number(nextValue || 0), 1);
  const hasTheory = Number(item?.theoryPeriods || 0) > 0;
  const hasPractice = Number(item?.practicePeriods || 0) > 0;

  return {
    theorySessionsPerWeek: hasTheory ? normalized : 0,
    practiceSessionsPerWeek: hasPractice ? normalized : 0,
  };
}

function normalizeExecutionPayload(payload: any) {
  return payload?.execution || payload || null;
}

function isSplitAdminClassCode(code?: string | null, cohort?: string | null) {
  const normalizedCode = `${code || ""}`.trim().toUpperCase();
  const normalizedCohort = `${cohort || ""}`.trim().toUpperCase();
  if (!normalizedCode || !normalizedCohort) {
    return false;
  }

  return (
    normalizedCode.startsWith(`${normalizedCohort}-`) ||
    normalizedCode.startsWith(`${normalizedCohort}_`)
  );
}

function getVisibleExecutionItems(execution: any, cohort?: string | null) {
  const items = Array.isArray(execution?.items) ? execution.items : [];
  if (!items.length) {
    return [];
  }

  const desiredSubjectIds = new Set(
    (execution?.template?.items || [])
      .filter(
        (item: any) =>
          Number(item?.conceptualSemester || 0) ===
          Number(execution?.conceptualSemester || 0),
      )
      .map((item: any) => item.subjectId),
  );

  let filtered = items;
  if (desiredSubjectIds.size > 0) {
    filtered = filtered.filter((item: any) => desiredSubjectIds.has(item.subjectId));
  }

  const splitPreferred = filtered.filter((item: any) =>
    isSplitAdminClassCode(item?.adminClass?.code, cohort),
  );

  return splitPreferred.length > 0 ? splitPreferred : filtered;
}

async function requestApi<T = any>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(API(path), init);
  const rawText = await response.text();
  let payload: any = null;

  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    const message =
      (typeof payload === "object" && payload?.message) ||
      (typeof payload === "string" && payload) ||
      `Yêu cầu thất bại (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

const StepTab = ({
  label,
  icon: Icon,
  isActive,
  onClick,
  count,
}: {
  label: string;
  icon: any;
  isActive: boolean;
  onClick: () => void;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 border-b-[3px] px-5 py-4 text-sm font-bold transition-all whitespace-nowrap ${
      isActive
        ? "border-[#004ea1] bg-blue-50/50 text-blue-700"
        : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
    }`}
  >
    <Icon size={18} className={isActive ? "text-[#004ea1]" : "text-slate-400"} />
    {label}
    {count ? (
      <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-black text-[#004ea1]">
        {count}
      </span>
    ) : null}
  </button>
);

export default function SemesterPlanScreen() {
  const router = useRouter();
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
  const [processing, setProcessing] = useState(false);
  const [resettingSchedules, setResettingSchedules] = useState(false);
  const [resettingClasses, setResettingClasses] = useState(false);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  const [activeStep, setActiveStep] = useState<Step>("KHUNG");
  const [majors, setMajors] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [execution, setExecution] = useState<any | null>(null);

  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [activeBlueprintTab, setActiveBlueprintTab] = useState(1);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateMatrix, setTemplateMatrix] = useState<Record<number, any[]>>(EMPTY_TEMPLATE());
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddSubjectModalOpen, setIsAddSubjectModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const executionScopeAbortRef = useRef<AbortController | null>(null);

  const selectedCohortMeta = useMemo(
    () => cohorts.find((item) => item.code === selectedCohort) || null,
    [cohorts, selectedCohort],
  );
  const visibleSemesters = useMemo(
    () => getVisibleSemestersForCohort(semesters, selectedCohortMeta),
    [semesters, selectedCohortMeta],
  );
  const activeSemester = useMemo(
    () => visibleSemesters.find((item) => item.id === selectedSemesterId) || null,
    [visibleSemesters, selectedSemesterId],
  );
  const activeTemplate = useMemo(
    () => templates.find((item) => item.id === activeTemplateId) || null,
    [templates, activeTemplateId],
  );
  const canExecute = useMemo(
    () => isWithinSemesterWindow(activeSemester),
    [activeSemester],
  );

  const currentBlueprintSubjects = templateMatrix[activeBlueprintTab] || [];
  const assignedSubjectIds = useMemo(
    () => new Set(flattenTemplate(templateMatrix).map((item) => item.subjectId)),
    [templateMatrix],
  );
  const availableSubjects = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    return subjects.filter((subject) => {
      if (assignedSubjectIds.has(subject.id)) return false;
      if (!keyword) return true;
      return (
        `${subject.code || ""}`.toLowerCase().includes(keyword) ||
        `${subject.name || ""}`.toLowerCase().includes(keyword)
      );
    });
  }, [subjects, searchQuery, assignedSubjectIds]);

  const coordinationItems = useMemo(
    () => getVisibleExecutionItems(execution, selectedCohort),
    [execution, selectedCohort],
  );
  const runningClasses = useMemo(
    () => coordinationItems.filter((item: any) => item.generatedCourseClass),
    [coordinationItems],
  );
  const selectedMajor = useMemo(
    () => majors.find((item) => item.id === selectedMajorId) || null,
    [majors, selectedMajorId],
  );

  const bootstrap = async () => {
    setLoading(true);
    try {
      const [majorData, cohortData, semesterData, lecturerData] = await Promise.all([
        requestApi("/majors", { headers: authHeaders }),
        requestApi("/cohorts", { headers: authHeaders }),
        requestApi("/semesters", { headers: authHeaders }),
        requestApi("/lecturers", { headers: authHeaders }),
      ]);

      const nextMajors = Array.isArray(majorData) ? majorData : [];
      const nextCohorts = Array.isArray(cohortData) ? cohortData : [];
      const nextSemesters = sortSemesters(Array.isArray(semesterData) ? semesterData : []);

      setMajors(nextMajors);
      setCohorts(nextCohorts);
      setSemesters(nextSemesters);
      setLecturers(Array.isArray(lecturerData) ? lecturerData : []);

      const defaultMajor = nextMajors[0]?.id || "";
      const defaultCohort = nextCohorts[0]?.code || "";
      const cohortMeta = nextCohorts.find((item: any) => item.code === defaultCohort);
      const cohortSemesters = getVisibleSemestersForCohort(nextSemesters, cohortMeta);
      const currentSemester =
        cohortSemesters.find((semester: any) => isWithinSemesterWindow(semester)) ||
        cohortSemesters[0] ||
        nextSemesters[0] ||
        null;

      if (!selectedMajorId) setSelectedMajorId(defaultMajor);
      if (!selectedCohort) setSelectedCohort(defaultCohort);
      if (!selectedSemesterId) setSelectedSemesterId(currentSemester?.id || "");
      if (activeBlueprintTab === 1 && currentSemester) setActiveBlueprintTab(parseConceptualSemester(currentSemester));
    } catch {
      toast.error("Không thể tải dữ liệu nền.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
  }, [authHeaders]);

  const refreshBaseData = async () => {
    try {
      const [majorData, cohortData, semesterData] = await Promise.all([
        requestApi("/majors", { headers: authHeaders }),
        requestApi("/cohorts", { headers: authHeaders }),
        requestApi("/semesters", { headers: authHeaders }),
      ]);
      setMajors(Array.isArray(majorData) ? majorData : []);
      setCohorts(Array.isArray(cohortData) ? cohortData : []);
      setSemesters(sortSemesters(Array.isArray(semesterData) ? semesterData : []));
    } catch (err) {
      console.error("Refresh failed:", err);
    }
  };

  useEffect(() => {
    if (!selectedMajorId) {
      setSubjects([]);
      return;
    }

    requestApi(`/subjects?majorId=${selectedMajorId}`, { headers: authHeaders })
      .then((data) => setSubjects(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Không thể tải danh sách môn học."));
  }, [selectedMajorId, authHeaders]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort) {
      setTemplates([]);
      setTemplateMatrix(EMPTY_TEMPLATE());
      return;
    }

    requestApi(
      `/semester-plan/templates?majorId=${selectedMajorId}&cohort=${selectedCohort}`,
      { headers: authHeaders },
    )
      .then((data) => {
        const templateList = Array.isArray(data) ? data : [];
        const preferred =
          templateList.find((item: any) => item.status === "DRAFT") ||
          templateList.find((item: any) => item.status === "PUBLISHED") ||
          templateList[0] ||
          null;

        setTemplates(templateList);
        setActiveTemplateId(preferred?.id || null);
        setTemplateMatrix(preferred ? templateToMatrix(preferred) : EMPTY_TEMPLATE());
      })
      .catch(() => {
        setTemplates([]);
        setTemplateMatrix(EMPTY_TEMPLATE());
      });
  }, [selectedMajorId, selectedCohort, authHeaders]);

  useEffect(() => {
    if (!selectedMajorId || !selectedCohort || !selectedSemesterId) {
      setExecution(null);
      return;
    }

    executionScopeAbortRef.current?.abort();
    const controller = new AbortController();
    executionScopeAbortRef.current = controller;

    const params = new URLSearchParams({
      majorId: selectedMajorId,
      cohort: selectedCohort,
      semesterId: selectedSemesterId,
    });

    requestApi(`/semester-plan/executions/current?${params.toString()}`, {
      headers: authHeaders,
      signal: controller.signal as AbortSignal,
    })
      .then((data) => setExecution(normalizeExecutionPayload(data)))
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setExecution(null);
        }
      });

    return () => {
      controller.abort();
    };
  }, [selectedMajorId, selectedCohort, selectedSemesterId, authHeaders]);

  const handleAddSubjectToBlueprint = (subject: any) => {
    setTemplateMatrix((prev) => ({
      ...prev,
      [activeBlueprintTab]: [...(prev[activeBlueprintTab] || []), subject],
    }));
    toast.success(`Đã thêm ${subject.name} vào học kỳ ${activeBlueprintTab}.`);
  };

  const handleRemoveSubjectFromBlueprint = (subjectId: string) => {
    setTemplateMatrix((prev) => ({
      ...prev,
      [activeBlueprintTab]: (prev[activeBlueprintTab] || []).filter(
        (item: any) => item.id !== subjectId,
      ),
    }));
    toast.success("Đã gỡ môn học khỏi khung.");
  };

  const persistTemplate = async () => {
    if (!selectedMajorId || !selectedCohort) return null;
    setSaving(true);
    try {
      const data = await requestApi("/semester-plan/templates", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          templateId: activeTemplate?.status === "DRAFT" ? activeTemplate.id : undefined,
          majorId: selectedMajorId,
          cohort: selectedCohort,
          items: flattenTemplate(templateMatrix),
        }),
      });
      setTemplates((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      setActiveTemplateId(data.id);
      toast.success("Đã lưu kế hoạch khung.");
      return data;
    } catch (error: any) {
      toast.error(error?.message || "Không thể lưu kế hoạch khung.");
      return null;
    } finally {
      setSaving(false);
    }
  };

  const publishTemplate = async () => {
    setPublishing(true);
    try {
      const draft = await persistTemplate();
      if (!draft?.id) return;
      const data = await requestApi(`/semester-plan/templates/${draft.id}/publish`, {
        method: "POST",
        headers: authHeaders,
      });
      setTemplates((current) => [data, ...current.filter((item) => item.id !== data.id)]);
      setActiveTemplateId(data.id);
      toast.success("Đã phát hành kế hoạch khung.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể phát hành kế hoạch.");
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyPlan = async (targetCohorts: string[]) => {
    try {
      const items = flattenTemplate(templateMatrix);
      if (items.length === 0) {
        toast.error("Kế hoạch hiện tại đang trống, không có gì để sao chép.");
        return;
      }

      let successCount = 0;
      for (const cohortCode of targetCohorts) {
        const res = await fetch(API("/semester-plan/templates"), {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({
            majorId: selectedMajorId,
            cohort: cohortCode,
            items: items,
          }),
        });
        if (res.ok) successCount++;
      }

      toast.success(`Đã sao chép kế hoạch thành công cho ${successCount} khóa.`);
    } catch (error: any) {
      toast.error(error?.message || "Lỗi khi sao chép kế hoạch.");
    }
  };

  const handleGenerateDrafts = async () => {
    if (!selectedSemesterId || !selectedMajorId || !selectedCohort) return;
    executionScopeAbortRef.current?.abort();
    setGenerating(true);
    try {
      const data = await requestApi("/semester-plan/executions/generate", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          semesterId: selectedSemesterId,
          majorId: selectedMajorId,
          cohort: selectedCohort,
        }),
      });
      const nextExecution = normalizeExecutionPayload(data);
      const visibleItems = getVisibleExecutionItems(nextExecution, selectedCohort);
      setExecution(nextExecution);
      setActiveStep("DIEU_PHOI");
      toast.success(
        `Đã tách ${visibleItems.length || 0} lớp học phần cho ${formatSemesterLabel(activeSemester)}.`,
      );
      const alreadyScheduledCount =
        visibleItems.filter(
          (item: any) => (item?.generatedCourseClass?.sessions?.length || 0) > 0,
        )?.length || 0;
      if (alreadyScheduledCount > 0) {
        toast.error(
          `${alreadyScheduledCount} lớp học phần đã có lịch sẵn. Hệ thống sẽ giữ nguyên, không tạo chồng lịch mới.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể tạo lớp dự thảo.");
    } finally {
      setGenerating(false);
    }
  };

  const updateDraft = async (itemId: string, patch: Record<string, any>) => {
    try {
      const data = await requestApi(`/semester-plan/execution-items/${itemId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(patch),
      });
      setExecution((current: any) =>
        current
          ? {
              ...current,
              items: current.items.map((item: any) =>
                item.id === itemId ? { ...item, ...data } : item,
              ),
            }
          : current,
      );
    } catch (error: any) {
      toast.error(error?.message || "Không thể cập nhật lớp dự thảo.");
    }
  };

  const handleExecuteZap = async () => {
    if (!execution?.id) return;
    setProcessing(true);
    try {
      const data = await requestApi(`/semester-plan/executions/${execution.id}/zap`, {
        method: "POST",
        headers: authHeaders,
      });
      const params = new URLSearchParams({
        majorId: selectedMajorId,
        cohort: selectedCohort,
        semesterId: selectedSemesterId,
      });
      const refreshedExecution = await requestApi(
        `/semester-plan/executions/current?${params.toString()}`,
        { headers: authHeaders },
      ).catch(() => null);

      setExecution(normalizeExecutionPayload(refreshedExecution) || data.execution || data);
      setActiveStep("VAN_HANH");
      toast.success("Chốt kế hoạch và đẩy sinh viên thành công.");
      if (Number(data?.summary?.alreadyScheduledClasses || 0) > 0) {
        toast.error(
          `Đã giữ nguyên ${data.summary.alreadyScheduledClasses} lớp đã có lịch, không xếp chồng thêm.`,
        );
      }
      if (data?.summary?.conflicts?.length) {
        toast.error(`Có ${data.summary.conflicts.length} lớp cần rà soát lại lịch hoặc giảng viên.`);
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể chốt và mở lớp.");
    } finally {
      setProcessing(false);
    }
  };

  const handleResetSchedulesFromScratch = async () => {
    if (!selectedSemesterId) {
      toast.error("Chưa chọn học kỳ để dựng lại lịch.");
      return;
    }

    if (
      !window.confirm(
        `Hệ thống sẽ xóa toàn bộ lịch học thường của ${formatSemesterLabel(activeSemester)}, chuẩn hóa mặc định 1 buổi/tuần và dựng lại từ đầu. Tiếp tục?`,
      )
    ) {
      return;
    }

    setResettingSchedules(true);
    try {
      const data = await requestApi("/semester-plan/reset-study-schedules", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ semesterId: selectedSemesterId }),
      });

      const params = new URLSearchParams({
        majorId: selectedMajorId,
        cohort: selectedCohort,
        semesterId: selectedSemesterId,
      });
      const executionData = await requestApi(
        `/semester-plan/executions/current?${params.toString()}`,
        { headers: authHeaders },
      ).catch(() => null);

      setExecution(normalizeExecutionPayload(executionData));
      setActiveStep("VAN_HANH");

      toast.success(
        `Đã xóa ${Number(data?.clearedSessions || 0)} buổi và dựng lại ${Number(data?.rebuiltClasses || 0)} lớp học phần.`,
      );

      if (Number(data?.orphanCourseClasses || 0) > 0) {
        toast.error(
          `Còn ${data.orphanCourseClasses} lớp học phần ngoài kế hoạch nên chưa được dựng lại.`,
        );
      }

      if (Array.isArray(data?.conflicts) && data.conflicts.length > 0) {
        toast.error(
          `Còn ${data.conflicts.length} lớp cần rà soát lại giảng viên hoặc phòng.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa lịch cũ và dựng lại từ đầu.");
    } finally {
      setResettingSchedules(false);
    }
  };

  const handleResetExecutionClasses = async () => {
    if (!execution?.id) {
      toast.error("Chưa có execution để xóa lớp đã tách.");
      return;
    }

    if (
      !window.confirm(
        `Hệ thống sẽ xóa toàn bộ lớp học phần đã tách của ${formatSemesterLabel(activeSemester)} và trả về trạng thái điều phối để tách lại theo template hiện tại. Tiếp tục?`,
      )
    ) {
      return;
    }

    setResettingClasses(true);
    try {
      const data = await requestApi(`/semester-plan/executions/${execution.id}/reset-classes`, {
        method: "POST",
        headers: authHeaders,
      });
      setExecution(normalizeExecutionPayload(data));
      setActiveStep("DIEU_PHOI");
      toast.success(
        `Đã xóa ${Number(data?.removedClasses || 0)} lớp học phần và làm sạch ${Number(data?.removedItems || 0)} mục cũ ngoài template.`,
      );
      if (Array.isArray(data?.skippedProtectedClasses) && data.skippedProtectedClasses.length > 0) {
        toast.error(
          `${data.skippedProtectedClasses.length} lớp đã có điểm hoặc đã khóa điểm nên chưa thể xóa tự động.`,
        );
      }
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa lớp đã tách.");
    } finally {
      setResettingClasses(false);
    }
  };

  const handleDeleteExecutionClass = async (item: any) => {
    const classId = item?.generatedCourseClass?.id;
    if (!classId) {
      toast.error("Lớp học phần chưa được sinh.");
      return;
    }

    if (
      !window.confirm(
        `Xóa lớp học phần ${item?.generatedCourseClass?.code || ""} để tạo lại từ execution item này?`,
      )
    ) {
      return;
    }

    setDeletingClassId(classId);
    try {
      await requestApi(`/semester-plan/execution-classes/${classId}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      const params = new URLSearchParams({
        majorId: selectedMajorId,
        cohort: selectedCohort,
        semesterId: selectedSemesterId,
      });
      const executionData = await requestApi(
        `/semester-plan/executions/current?${params.toString()}`,
        { headers: authHeaders },
      ).catch(() => null);

      setExecution(normalizeExecutionPayload(executionData));
      setActiveStep("DIEU_PHOI");
      toast.success("Đã xóa lớp học phần để tạo lại.");
    } catch (error: any) {
      toast.error(error?.message || "Không thể xóa lớp học phần.");
    } finally {
      setDeletingClassId(null);
    }
  };

  const handleAttendance = (item: any) => {
    const classId = item?.generatedCourseClass?.id;
    if (!classId) {
      toast.error("Lớp học phần chưa được sinh, chưa thể mở điểm danh.");
      return;
    }
    router.push(`/staff/attendance/${classId}`);
  };

  const handleGrade = (item: any) => {
    const classId = item?.generatedCourseClass?.id;
    if (!classId) {
      toast.error("Lớp học phần chưa được sinh, chưa thể mở bảng điểm.");
      return;
    }
    router.push(`/staff/grades/${classId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#004ea1]" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-screen w-full flex-col bg-slate-50/50 font-sans text-slate-900">
      <Toaster position="top-right" />

      <div className="relative z-10 shrink-0 border-b border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 p-5 pl-8 md:flex-row md:items-center">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-slate-800">
              Lập kế hoạch & Điều phối
            </h1>
            <p className="mt-1 text-xs font-bold text-slate-400">
              Phân hệ Quản lý Đào tạo UNETI
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-2">
            <div className="flex flex-col px-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Ngành
              </label>
              <select
                value={selectedMajorId}
                onChange={(e) => setSelectedMajorId(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-bold text-blue-700 outline-none"
              >
                {majors.map((major) => (
                  <option key={major.id} value={major.id}>
                    {major.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col px-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Khóa
              </label>
              <select
                value={selectedCohort}
                onChange={(e) => setSelectedCohort(e.target.value)}
                className="cursor-pointer bg-transparent text-sm font-bold text-blue-700 outline-none"
              >
                {cohorts.map((cohort) => (
                  <option key={cohort.code} value={cohort.code}>
                    {cohort.code}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex flex-col px-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                Kỳ triển khai
              </label>
              <select
                value={selectedSemesterId}
                onChange={(e) => {
                  const semester = visibleSemesters.find(
                    (item) => item.id === e.target.value,
                  );
                  setSelectedSemesterId(e.target.value);
                  setActiveBlueprintTab(parseConceptualSemester(semester));
                }}
                className="cursor-pointer bg-transparent text-sm font-black text-emerald-700 outline-none"
              >
                {visibleSemesters.map((semester) => (
                  <option key={semester.id} value={semester.id}>
                    {formatSemesterLabel(semester)}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setIsCohortModalOpen(true)}
                className="p-3 text-slate-500 hover:text-[#004ea1] hover:bg-blue-50 rounded-xl transition-all"
                title="Quản lý Khóa sinh viên"
              >
                <Users size={20} />
              </button>
              <button 
                onClick={() => setIsSemesterModalOpen(true)}
                className="p-3 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Quản lý Học kỳ"
              >
                <Calendar size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="scrollbar-hide flex items-center overflow-x-auto px-4">
          <StepTab
            label="1. Setup Kế hoạch khung"
            icon={Layers}
            isActive={activeStep === "KHUNG"}
            onClick={() => setActiveStep("KHUNG")}
          />
          <StepTab
            label="2. Điều phối & Tách lớp"
            icon={LayoutGrid}
            isActive={activeStep === "DIEU_PHOI"}
            onClick={() => setActiveStep("DIEU_PHOI")}
            count={coordinationItems.length}
          />
          <StepTab
            label="3. Theo dõi vận hành"
            icon={ListChecks}
            isActive={activeStep === "VAN_HANH"}
            onClick={() => setActiveStep("VAN_HANH")}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="w-full">
          {activeStep === "KHUNG" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-800">
                    <BookOpen size={24} className="text-[#004ea1]" />
                    Khung chương trình: Khóa {selectedCohort} - Ngành{" "}
                    {selectedMajor?.name || selectedMajorId}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Setup lộ trình môn học cho 8 học kỳ. Dữ liệu này sẽ làm gốc để
                    tách lớp ở Bước 2.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={persistTemplate}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700"
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Save size={16} />
                    )}
                    Lưu nháp
                  </button>
                  <button
                    onClick={publishTemplate}
                    disabled={publishing}
                    className="flex items-center gap-2 rounded-xl bg-[#004ea1] px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-200 transition-all hover:bg-blue-700"
                  >
                    {publishing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    Phát hành
                  </button>
                  <button
                    onClick={() => setIsCopyModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    <Copy size={16} />
                    Sao chép kế hoạch
                  </button>
                  <button
                    onClick={handleGenerateDrafts}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700"
                  >
                    Điều phối {formatSemesterLabel(activeSemester)}{" "}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {Array.from({ length: 8 }, (_, index) => index + 1).map((sem) => (
                    <button
                      key={sem}
                      onClick={() => setActiveBlueprintTab(sem)}
                      className={`rounded-xl px-5 py-2.5 text-sm font-black whitespace-nowrap transition-all ${
                        activeBlueprintTab === sem
                          ? "bg-[#004ea1] text-white shadow-md shadow-indigo-200"
                          : "border border-slate-200 bg-white text-slate-500 hover:bg-blue-50 hover:text-[#004ea1]"
                      }`}
                    >
                      Học kỳ {sem}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 p-6">
                  <div>
                    <h3 className="font-black text-slate-700">
                      Danh sách môn bắt buộc (Học kỳ {activeBlueprintTab})
                    </h3>
                    <p className="mt-1 text-xs font-bold text-slate-400">
                      Phiên bản đang dùng:{" "}
                      {activeTemplate ? `v${activeTemplate.version}` : "Chưa lưu"}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddSubjectModalOpen(true)}
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 transition-colors hover:bg-blue-100"
                  >
                    <Plus size={14} /> Thêm môn học
                  </button>
                </div>

                <div className="overflow-hidden rounded-b-[2rem]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-6 py-4">Mã môn</th>
                        <th className="px-6 py-4">Tên học phần</th>
                        <th className="px-6 py-4">Bộ môn quản lý</th>
                        <th className="px-6 py-4 text-center">Tín chỉ</th>
                        <th className="px-6 py-4 text-center">LT/TH</th>
                        <th className="px-6 py-4 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {currentBlueprintSubjects.length > 0 ? (
                        currentBlueprintSubjects.map((subject: any) => (
                          <tr
                            key={subject.id}
                            className="group transition-colors hover:bg-slate-50"
                          >
                            <td className="px-6 py-4 font-bold text-[#004ea1]">
                              {subject.code || subject.id}
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800">
                              {subject.name}
                            </td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-500">
                              {subject.department?.name || subject.department || "Chưa gán"}
                            </td>
                            <td className="bg-slate-50/50 px-6 py-4 text-center font-black text-slate-600">
                              {subject.credits}
                            </td>
                            <td className="px-6 py-4 text-center text-xs text-slate-500">
                              {Number(subject.theoryPeriods || subject.theoryHours || 0)}/
                              {Number(subject.practicePeriods || subject.practiceHours || 0)}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => handleRemoveSubjectFromBlueprint(subject.id)}
                                className="rounded-lg p-2 text-slate-300 opacity-0 transition-colors group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                            <Layers size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-base font-bold">
                              Học kỳ {activeBlueprintTab} chưa có môn học nào.
                            </p>
                            <p className="mt-1 text-xs">
                              Nhấn "Thêm môn học" để thiết lập lộ trình.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
          {activeStep === "DIEU_PHOI" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-slate-800">
                  <LayoutGrid size={24} className="text-[#004ea1]" />
                  Bảng Điều phối Lớp học phần ({formatSemesterLabel(activeSemester)})
                </h2>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700">
                    <ShieldCheck size={16} /> Cơ chế: Tách độc lập
                  </div>
                  <button
                    onClick={handleResetExecutionClasses}
                    disabled={!execution?.id || resettingClasses || processing}
                    className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-black uppercase tracking-widest text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-50"
                  >
                    {resettingClasses ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    Xóa lớp đã tách
                  </button>
                  <button
                    onClick={handleExecuteZap}
                    disabled={!execution?.id || processing}
                    className="flex items-center gap-2 rounded-xl bg-[#004ea1] px-5 py-2.5 text-xs font-black uppercase tracking-widest text-white shadow-md transition-all hover:bg-blue-700 disabled:opacity-50"
                  >
                    {processing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    Kích hoạt hệ thống
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="w-1/4 px-6 py-5">Môn học & Lớp gốc</th>
                        <th className="w-1/4 px-6 py-5">Giảng viên (Nhập tay)</th>
                        <th className="px-4 py-5 text-center">Buổi/Tuần</th>
                        <th className="px-4 py-5 text-center">Tiết/Buổi</th>
                        <th className="w-48 px-6 py-5 text-right">
                          Khớp Khung ({countTeachingWeeks(activeSemester)} Tuần)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {coordinationItems.length > 0 ? (
                        coordinationItems.map((item: any) => {
                          const validation = getValidationState(item, activeSemester);
                          return (
                            <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                              <td className="px-6 py-5">
                                <p className="mb-1.5 font-bold leading-tight text-slate-800">
                                  {item.subject.name}
                                </p>
                                <div className="flex items-center gap-2 text-[10px] font-bold">
                                  <span className="rounded border border-blue-100 bg-blue-50 px-2 py-0.5 text-[#004ea1]">
                                    {item.subject.code}
                                  </span>
                                  <span className="flex items-center gap-1 rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-slate-600">
                                    <Users size={10} /> {item.adminClass.code} ({item.expectedStudentCount} SV)
                                  </span>
                                  {(item?.generatedCourseClass?.sessions?.length || 0) > 0 ? (
                                    <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                                      Đã có lịch
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="px-6 py-5">
                                <div className="relative">
                                  <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                  <select
                                    value={item.lecturerId || ""}
                                    onChange={(e) => updateDraft(item.id, { lecturerId: e.target.value })}
                                    className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-xs font-bold text-blue-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                  >
                                    <option value="">Chọn giảng viên</option>
                                    {lecturers.map((lecturer) => (
                                      <option key={lecturer.id} value={lecturer.id}>
                                        {lecturer.fullName}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="px-4 py-5 text-center">
                                <input
                                  type="number"
                                  min="1"
                                  max="5"
                                  value={getDisplayedSessionsPerWeek(item)}
                                  onChange={(e) =>
                                    updateDraft(
                                      item.id,
                                      buildSessionsPerWeekPatch(item, Number(e.target.value)),
                                    )
                                  }
                                  className="w-16 rounded-xl border border-slate-200 px-2 py-2.5 text-center text-xs font-bold outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-4 py-5 text-center">
                                <select
                                  value={item.periodsPerSession || 3}
                                  onChange={(e) => updateDraft(item.id, { periodsPerSession: Number(e.target.value) })}
                                  className="w-20 cursor-pointer rounded-xl border border-slate-200 px-2 py-2.5 text-center text-xs font-bold outline-none focus:border-blue-500"
                                >
                                  <option value={1}>1 Tiết</option>
                                  <option value={2}>2 Tiết</option>
                                  <option value={3}>3 Tiết</option>
                                  <option value={4}>4 Tiết</option>
                                  <option value={5}>5 Tiết</option>
                                </select>
                              </td>
                              <td className="px-6 py-5 text-right">
                                <div className="flex flex-col items-end">
                                  <span className={`text-xs font-black uppercase ${validation.matched ? "text-emerald-600" : "text-rose-500"}`}>
                                    {validation.matched ? (
                                      <CheckCircle2 size={14} className="mr-1 inline" />
                                    ) : (
                                      <AlertCircle size={14} className="mr-1 inline" />
                                    )}
                                    {validation.planned} / {validation.required} Tiết
                                  </span>
                                  <div className="mt-2 h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-slate-100">
                                    <div
                                      className={`h-full rounded-full transition-all ${validation.matched ? "bg-emerald-500" : "bg-rose-500"}`}
                                      style={{ width: `${validation.ratio}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                            <LayoutGrid size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-base font-bold">Chưa có lớp học phần nào được tách.</p>
                            <p className="mt-1 text-xs">Vui lòng quay lại "Kế hoạch khung" và phát hành kế hoạch trước khi điều phối.</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}

          {activeStep === "VAN_HANH" ? (
            <div className="animate-in fade-in slide-in-from-bottom-2">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="flex items-center gap-3 text-xl font-black uppercase tracking-tight text-slate-800">
                    <ListChecks size={24} className="text-emerald-600" />
                    Danh sách Lớp học phần đang vận hành
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleResetSchedulesFromScratch}
                    disabled={resettingSchedules || processing || !selectedSemesterId}
                    className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-amber-700 transition-all hover:bg-amber-100 disabled:opacity-60"
                  >
                    {resettingSchedules ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Trash2 size={14} />
                    )}
                    Xóa lịch cũ & dựng lại
                  </button>
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                    Đang diễn ra ({formatSemesterLabel(activeSemester)})
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="w-1/4 px-6 py-5">Mã HP / Lớp học phần</th>
                      <th className="w-1/4 px-6 py-5">Môn học</th>
                      <th className="px-6 py-5">Giảng viên</th>
                      <th className="px-6 py-5 text-center">Sĩ số</th>
                      <th className="px-6 py-5 text-right">Thao tác nghiệp vụ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {runningClasses.length > 0 ? (
                      runningClasses.map((item: any) => (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-5">
                            <p className="font-mono text-sm font-bold text-slate-800">
                              {item.generatedCourseClass?.code || "Chưa sinh"}
                            </p>
                            <p className="mt-1 text-[10px] font-bold text-slate-500">
                              Từ lớp HC: <span className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 text-[#004ea1]">{item.adminClass.code}</span>
                            </p>
                          </td>
                          <td className="px-6 py-5">
                            <p className="font-bold leading-tight text-slate-800">{item.subject.name}</p>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500">
                                <UserCheck size={14} />
                              </div>
                              <span className="text-sm font-bold text-slate-700">
                                {item.lecturer?.fullName || "Chưa cập nhật"}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5 text-center">
                            <span className="inline-flex items-center justify-center rounded-full border border-blue-100 bg-blue-50 px-4 py-1.5 text-xs font-black text-blue-700">
                              {item.generatedCourseClass?._count?.enrollments || item.expectedStudentCount} SV
                            </span>
                          </td>
                          <td className="px-6 py-5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleDeleteExecutionClass(item)}
                                disabled={deletingClassId === item?.generatedCourseClass?.id}
                                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-[10px] font-black uppercase text-rose-700 transition-all hover:bg-rose-100 disabled:opacity-60"
                              >
                                {deletingClassId === item?.generatedCourseClass?.id ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Trash2 size={14} />
                                )}
                                Xóa lớp
                              </button>
                              <button
                                onClick={() => handleAttendance(item)}
                                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-[10px] font-black uppercase text-white shadow-md transition-all"
                              >
                                <ClipboardList size={14} /> Điểm danh
                              </button>
                              <button
                                onClick={() => handleGrade(item)}
                                className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-[10px] font-black uppercase text-blue-700 transition-all hover:bg-[#004ea1] hover:text-white"
                              >
                                <Sparkles size={14} /> Nhập điểm
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                          <ListChecks size={40} className="mx-auto mb-4 opacity-20" />
                          <p className="text-base font-bold">Chưa có lớp nào được mở.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {isAddSubjectModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="flex h-[min(720px,90vh)] w-full max-w-3xl animate-in zoom-in-95 flex-col overflow-hidden rounded-[2.5rem] bg-white shadow-2xl duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 p-6">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800">
                  Thêm Môn Học Vào Khung
                </h3>
                <p className="mt-1 text-xs font-bold text-slate-500">
                  Đang cấu hình cho: Học kỳ {activeBlueprintTab}
                </p>
              </div>
              <button
                onClick={() => setIsAddSubjectModalOpen(false)}
                className="rounded-full border border-slate-200 bg-white p-2 text-slate-400 shadow-sm transition-colors hover:text-rose-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="border-b border-slate-100 p-6">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo mã môn hoặc tên môn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border-2 border-slate-100 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold text-slate-700 outline-none transition-all focus:border-blue-500"
                />
              </div>
            </div>

            <div className="h-[400px] flex-1 overflow-y-auto p-2">
              <div className="grid grid-cols-1 gap-2">
                {availableSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between rounded-2xl border-2 border-slate-100 bg-white p-4 transition-all hover:border-indigo-200"
                  >
                    <div>
                      <p className="text-sm font-bold leading-tight text-slate-800">
                        {subject.name}
                      </p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-black uppercase text-[#004ea1]">
                          {subject.code || subject.id}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          TC: {subject.credits} | Bộ môn: {subject.department?.name || subject.department || "Chưa gán"}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAddSubjectToBlueprint(subject)}
                      className="flex items-center gap-2 rounded-xl bg-[#004ea1] px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-blue-700 shadow-md"
                    >
                      <Plus size={14} /> Chọn
                    </button>
                  </div>
                ))}

                {availableSubjects.length === 0 ? (
                  <div className="py-12 text-center text-sm font-bold text-slate-400">
                    Không còn môn học phù hợp để thêm vào học kỳ này.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
      <SemesterManagerModal 
        isOpen={isSemesterModalOpen} 
        onClose={() => setIsSemesterModalOpen(false)} 
        headers={authHeaders}
        onSuccess={(msg) => { toast.success(msg); refreshBaseData(); }}
      />
      
      {isCohortModalOpen && (
        <CohortManagerModal
          isOpen={isCohortModalOpen}
          onClose={() => {
            setIsCohortModalOpen(false);
            refreshBaseData();
          }}
          headers={authHeaders}
          onSuccess={toast.success}
        />
      )}

      {isCopyModalOpen && (
        <CopyPlanModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          currentCohort={selectedCohort}
          currentMajorId={selectedMajorId}
          cohorts={cohorts}
          onCopy={handleCopyPlan}
        />
      )}
    </div>
  );
}
