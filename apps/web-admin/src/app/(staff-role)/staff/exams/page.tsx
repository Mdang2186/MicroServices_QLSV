"use client";

import { useEffect, useMemo, useState } from "react";
import Cookies from "js-cookie";
import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Filter,
  Layers3,
  Loader2,
  RefreshCcw,
  Search,
  Sparkles,
  Square,
  Users,
} from "lucide-react";
import { addDays, format } from "date-fns";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Modal from "@/components/modal";
import { ChevronLeft, ChevronRight } from "lucide-react";

type PlannerTab = "groups" | "plans";
type RoomMode = "AUTO" | "MANUAL" | "HYBRID";
type StudentSortKey = "name" | "code" | "adminClass" | "process";
type AdjustmentSection = "availability" | "schedule" | "students";

interface SemesterOption {
  id: string;
  code?: string;
  name: string;
  isCurrent: boolean;
}

interface FacultyOption {
  id: string;
  code?: string;
  name: string;
}

interface CohortOption {
  id?: string;
  code: string;
  name?: string;
}

interface SubjectInfo {
  id: string;
  code: string;
  name: string;
  examType: string;
  examForm: string;
  examDuration: number;
  credits: number;
  major?: {
    faculty?: {
      id: string;
      code?: string;
      name: string;
    } | null;
  } | null;
}

interface RoomItem {
  id: string;
  name: string;
  building?: string | null;
  capacity: number;
  type: string;
}

interface PlanStudentAssignment {
  id: string;
  roomAssignmentId: string;
  gradeId: string;
  studentCode: string;
  studentName: string;
  adminClassCode?: string | null;
  examSbd: string;
  seatNumber: number;
}

interface PlanRoomAssignment {
  id: string;
  roomId?: string | null;
  roomName: string;
  roomType?: string | null;
  building?: string | null;
  capacity: number;
  assignedCount: number;
  sortOrder: number;
  students: PlanStudentAssignment[];
}

interface ScheduledPlan {
  id: string;
  semesterId: string;
  subjectId: string;
  cohort: string;
  examDate: string;
  startShift: number;
  endShift: number;
  examType: string;
  examForm?: string | null;
  preferredRoomType?: string | null;
  venueMode: RoomMode | string;
  note?: string | null;
  totalStudents: number;
  totalRooms: number;
  status: string;
  updatedAt: string;
  subject?: SubjectInfo | null;
  roomAssignments: PlanRoomAssignment[];
  students: PlanStudentAssignment[];
}

interface PlanOverview {
  id: string;
  examDate: string;
  startShift: number;
  endShift: number;
  totalRooms: number;
  totalStudents: number;
  venueMode: RoomMode | string;
  updatedAt: string;
}

interface ExamPlanningGroup {
  key: string;
  semesterId: string;
  subjectId: string;
  cohort: string;
  subject: SubjectInfo;
  examType: string;
  examForm: string;
  examDuration: number;
  facultyId?: string | null;
  facultyCode?: string | null;
  facultyName?: string | null;
  totalStudents: number;
  eligibleCount: number;
  classCount: number;
  courseClassIds: string[];
  courseClassCodes: string[];
  adminClassCodes: string[];
  hasPlan: boolean;
  plan: PlanOverview | null;
}

interface CourseClassSummary {
  id: string;
  code: string;
  name: string;
  cohort?: string | null;
}

interface StudentItem {
  gradeId: string;
  studentId: string;
  courseClassId: string;
  courseClassCode: string;
  courseClassName: string;
  studentCode: string;
  studentName: string;
  adminClassCode?: string | null;
  cohort: string;
  isEligibleForExam: boolean;
  attendanceScore?: number | null;
  processScore?: number | null;
  examSbd?: string | null;
}

interface ExamPlanningDetail {
  semesterId: string;
  subject: SubjectInfo;
  cohort: string;
  totalStudents: number;
  eligibleCount: number;
  classCount: number;
  courseClasses: CourseClassSummary[];
  students: StudentItem[];
  plans: ScheduledPlan[];
  preferredRoomTypes: string[];
}

interface AvailabilityRoom {
  id: string;
  name: string;
  building?: string | null;
  type: string;
  capacity: number;
  assignmentCapacity: number;
  isPreferred?: boolean;
}

interface AvailabilitySuggestion {
  date: string;
  dateLabel: string;
  startShift: number;
  endShift: number;
  shiftLabel: string;
  preferredRoomTypes: string[];
  status: "AVAILABLE" | "BLOCKED";
  reasons: string[];
  requiredSeats: number;
  totalCapacity: number;
  suggestedRooms: AvailabilityRoom[];
  availableRooms: AvailabilityRoom[];
}

interface AvailabilityPayload {
  semesterId: string;
  subject: SubjectInfo;
  cohort: string;
  requiredSeats: number;
  studentsPerRoom?: number | null;
  preferredRoomTypes: string[];
  suggestions: AvailabilitySuggestion[];
}

const SHIFT_OPTIONS = [
  { value: "1-3", label: "Ca 1 • Tiết 1-3", startShift: 1, endShift: 3 },
  { value: "4-6", label: "Ca 2 • Tiết 4-6", startShift: 4, endShift: 6 },
  { value: "7-9", label: "Ca 3 • Tiết 7-9", startShift: 7, endShift: 9 },
  { value: "10-12", label: "Ca 4 • Tiết 10-12", startShift: 10, endShift: 12 },
] as const;

const ROOM_MODE_OPTIONS: { value: RoomMode; label: string; hint: string }[] = [
  {
    value: "AUTO",
    label: "Tự động",
    hint: "Hệ thống tự gợi ý cụm phòng còn trống và đủ chỗ.",
  },
  {
    value: "MANUAL",
    label: "Thủ công",
    hint: "Khóa cứng phòng và số sinh viên mỗi phòng theo lựa chọn của bạn.",
  },
  {
    value: "HYBRID",
    label: "Kết hợp",
    hint: "Ưu tiên phòng bạn chọn, phần thiếu sẽ tự bù bằng phòng trống.",
  },
];

const ROOM_TYPE_LABELS: Record<string, string> = {
  THEORY: "Phòng lý thuyết",
  PRACTICE: "Phòng thực hành",
  EXAM_HALL: "Hội trường",
  SPORTS: "Sân/Bãi",
};

const ADJUSTMENT_SECTION_CONFIG: Array<{
  id: AdjustmentSection;
  label: string;
  hint: string;
  icon: typeof Sparkles;
}> = [
  {
    id: "availability",
    label: "Gợi ý ca thi",
    hint: "Xem ca thi phù hợp và nhóm phòng còn trống.",
    icon: Sparkles,
  },
  {
    id: "schedule",
    label: "Xếp lịch & phân phòng",
    hint: "Chọn ngày, ca thi, phòng và điều chỉnh sức chứa.",
    icon: CalendarDays,
  },
  {
    id: "students",
    label: "Danh sách sinh viên",
    hint: "Kiểm tra sinh viên đủ điều kiện và sơ đồ phân phòng.",
    icon: Users,
  },
];

function buildQuery(
  params: Record<string, string | number | null | undefined | false>,
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      continue;
    }
    searchParams.set(key, String(value));
  }
  return searchParams.toString();
}

function getRoomTypeLabel(type?: string | null) {
  const normalizedType = `${type || ""}`.trim().toUpperCase();
  return ROOM_TYPE_LABELS[normalizedType] || normalizedType || "Khác";
}

function getExamTypeLabel(type?: string | null) {
  const normalizedType = `${type || ""}`.trim().toUpperCase();
  switch (normalizedType) {
    case "THUC_HANH":
      return "Thi thực hành";
    case "TU_LUAN":
      return "Thi tự luận";
    case "TRAC_NGHIEM":
      return "Thi trắc nghiệm";
    case "BAO_VE":
      return "Bảo vệ";
    case "THE_CHAT":
    case "THUC_HANH_THE_CHAT":
      return "Thi thể chất";
    default:
      return normalizedType || "Chưa cấu hình";
  }
}

function formatShiftRange(startShift?: number, endShift?: number) {
  if (!startShift || !endShift) return "Chưa xếp ca";
  return `Tiết ${startShift}-${endShift}`;
}

function getPlanKey(subjectId?: string, cohort?: string) {
  return `${subjectId || ""}::${cohort || ""}`;
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return Number(value).toFixed(1);
}

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "Không thể tải dữ liệu.");
  }
  return payload;
}

export default function StaffExamsPage() {
  const token = Cookies.get("admin_accessToken") || "";
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const [user, setUser] = useState<any>(null);
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [faculties, setFaculties] = useState<FacultyOption[]>([]);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectInfo[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);

  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedCohort, setSelectedCohort] = useState("");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<PlannerTab>("groups");

  const [groups, setGroups] = useState<ExamPlanningGroup[]>([]);
  const [scheduledPlans, setScheduledPlans] = useState<ScheduledPlan[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ExamPlanningGroup | null>(
    null,
  );
  const [detail, setDetail] = useState<ExamPlanningDetail | null>(null);
  const [availability, setAvailability] = useState<AvailabilityPayload | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [studentSortKey, setStudentSortKey] =
    useState<StudentSortKey>("adminClass");
  const [showEligibleOnly, setShowEligibleOnly] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({
    type: "",
    text: "",
  });

  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjustmentSection, setAdjustmentSection] =
    useState<AdjustmentSection>("availability");
  const [availabilityPage, setAvailabilityPage] = useState(1);
  const [studentPage, setStudentPage] = useState(1);
  const STUDENT_PAGE_SIZE = 20;
  const AVAILABILITY_PAGE_SIZE = 6;

  const [groupPage, setGroupPage] = useState(1);
  const [planPage, setPlanPage] = useState(1);
  const MAIN_PAGE_SIZE = 25;

  const [plannerForm, setPlannerForm] = useState({
    date: "",
    shift: "1-3",
    selectedShiftValues: ["1-3"] as string[],
    studentsPerRoom: "30",
    roomMode: "AUTO" as RoomMode,
    selectedRoomIds: [] as string[],
    suggestionFrom: format(new Date(), "yyyy-MM-dd"),
    suggestionTo: format(addDays(new Date(), 7), "yyyy-MM-dd"),
    customVenueEnabled: false,
    customVenueName: "",
    customVenueCapacity: "120",
    customVenueType: "SPORTS",
    customVenueBuilding: "",
    note: "",
  });

  useEffect(() => {
    const userCookie = Cookies.get("admin_user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [semesterData, roomData, facultyData, cohortData] =
          await Promise.all([
            requestJson("/api/semesters"),
            requestJson("/api/rooms", { headers: authHeaders }),
            requestJson("/api/courses/faculties", { headers: authHeaders }),
            requestJson("/api/courses/cohorts", { headers: authHeaders }),
          ]);

        setSemesters(Array.isArray(semesterData) ? semesterData : []);
        setRooms(Array.isArray(roomData) ? roomData : []);
        setFaculties(Array.isArray(facultyData) ? facultyData : []);
        setCohorts(Array.isArray(cohortData) ? cohortData : []);
      } catch (error: any) {
        setMessage({
          type: "error",
          text: error.message || "Không thể tải dữ liệu cấu hình lịch thi.",
        });
      }
    };

    void fetchMeta();
  }, [token]);

  useEffect(() => {
    if (selectedSemesterId || semesters.length === 0) return;
    const currentSemester =
      semesters.find((semester) => semester.isCurrent) || semesters[0];
    if (currentSemester) {
      setSelectedSemesterId(currentSemester.id);
    }
  }, [semesters, selectedSemesterId]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedSemesterId) {
        setSubjects([]);
        return;
      }

      try {
        const query = buildQuery({
          semesterId: selectedSemesterId,
          facultyId: selectedFacultyId || undefined,
        });
        const data = await requestJson(
          `/api/courses/subjects/by-faculty?${query}`,
          {
            headers: authHeaders,
          },
        );
        const nextSubjects = Array.isArray(data) ? data : [];
        setSubjects(nextSubjects);
        if (
          selectedSubjectId &&
          !nextSubjects.some(
            (subject: SubjectInfo) => subject.id === selectedSubjectId,
          )
        ) {
          setSelectedSubjectId("");
        }
      } catch (error: any) {
        setMessage({
          type: "error",
          text: error.message || "Không thể tải danh sách môn học.",
        });
      }
    };

    void fetchSubjects();
  }, [selectedSemesterId, selectedFacultyId, token]);

  const fetchPlanningData = async () => {
    if (!selectedSemesterId) return;

    setLoading(true);
    try {
      const groupQuery = buildQuery({
        semesterId: selectedSemesterId,
        search: searchQuery || undefined,
        facultyId: selectedFacultyId || undefined,
        cohort: selectedCohort || undefined,
        subjectId: selectedSubjectId || undefined,
      });

      const [groupData, planData] = await Promise.all([
        requestJson(`/api/courses/exam-planning/groups?${groupQuery}`, {
          headers: authHeaders,
        }),
        requestJson(
          `/api/courses/exam-planning/plans?${buildQuery({
            semesterId: selectedSemesterId,
          })}`,
          {
            headers: authHeaders,
          },
        ),
      ]);

      setGroups(Array.isArray(groupData) ? groupData : []);
      setScheduledPlans(Array.isArray(planData) ? planData : []);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải dữ liệu kế hoạch thi.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlanningData();
  }, [
    selectedSemesterId,
    selectedFacultyId,
    selectedCohort,
    selectedSubjectId,
    searchQuery,
    token,
  ]);

  useEffect(() => {
    if (!message.text) return;
    const timeout = window.setTimeout(
      () => setMessage({ type: "", text: "" }),
      4500,
    );
    return () => window.clearTimeout(timeout);
  }, [message]);

  const loadGroupDetail = async (group: {
    semesterId: string;
    subjectId: string;
    cohort: string;
  }) => {
    setDetailLoading(true);
    setDetail(null);
    setAvailability(null);
    try {
      const query = buildQuery({
        semesterId: group.semesterId,
        subjectId: group.subjectId,
        cohort: group.cohort,
      });
      const payload = await requestJson(
        `/api/courses/exam-planning/detail?${query}`,
        {
          headers: authHeaders,
        },
      );

      const primaryPlan = payload?.plans?.[0] || null;

      setDetail(payload);
      setPlannerForm((current) => ({
        ...current,
        date: primaryPlan?.examDate
          ? `${primaryPlan.examDate}`.slice(0, 10)
          : "",
        shift: primaryPlan
          ? `${primaryPlan.startShift}-${primaryPlan.endShift}`
          : current.shift,
        selectedShiftValues: primaryPlan
          ? [`${primaryPlan.startShift}-${primaryPlan.endShift}`]
          : [current.shift],
        roomMode: (primaryPlan?.venueMode as RoomMode) || current.roomMode,
        selectedRoomIds:
          primaryPlan?.roomAssignments
            ?.map((assignment: PlanRoomAssignment) => assignment.roomId)
            .filter(Boolean) || [],
        note: primaryPlan?.note || "",
        suggestionFrom:
          primaryPlan?.examDate?.slice(0, 10) || current.suggestionFrom,
        suggestionTo:
          primaryPlan?.examDate?.slice(0, 10) || current.suggestionTo,
      }));
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải chi tiết nhóm thi.",
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSelectGroup = async (group: ExamPlanningGroup) => {
    setSelectedGroup(group);
    setStudentPage(1);
    setAvailabilityPage(1);
    setAdjustmentSection(group.hasPlan ? "schedule" : "availability");
    setIsAdjustmentModalOpen(true);
    await loadGroupDetail(group);
  };

  const handleSelectPlan = async (plan: ScheduledPlan) => {
    const matchedGroup = groups.find(
      (group) =>
        group.subjectId === plan.subjectId && group.cohort === plan.cohort,
    ) || {
      key: getPlanKey(plan.subjectId, plan.cohort),
      semesterId: plan.semesterId,
      subjectId: plan.subjectId,
      cohort: plan.cohort,
      subject: plan.subject || {
        id: plan.subjectId,
        code: "MON",
        name: "Môn học",
        examType: plan.examType,
        examForm: plan.examForm || "",
        examDuration: 90,
        credits: 0,
      },
      examType: plan.examType,
      examForm: plan.examForm || "",
      examDuration: plan.subject?.examDuration || 90,
      totalStudents: plan.totalStudents,
      eligibleCount: plan.totalStudents,
      classCount: 0,
      courseClassIds: [],
      courseClassCodes: [],
      adminClassCodes: [],
      hasPlan: true,
      plan: {
        id: plan.id,
        examDate: plan.examDate,
        startShift: plan.startShift,
        endShift: plan.endShift,
        totalRooms: plan.totalRooms,
        totalStudents: plan.totalStudents,
        venueMode: plan.venueMode,
        updatedAt: plan.updatedAt,
      },
    };

    setSelectedGroup(matchedGroup as ExamPlanningGroup);
    setStudentPage(1);
    setAvailabilityPage(1);
    setAdjustmentSection("schedule");
    setIsAdjustmentModalOpen(true);
    await loadGroupDetail({
      semesterId: plan.semesterId,
      subjectId: plan.subjectId,
      cohort: plan.cohort,
    });
    
    // Auto fill form with this specific shift's data
    setPlannerForm((current) => ({
      ...current,
      date: `${plan.examDate}`.slice(0, 10),
      shift: `${plan.startShift}-${plan.endShift}`,
      selectedShiftValues: [`${plan.startShift}-${plan.endShift}`],
      roomMode: (plan.venueMode as RoomMode) || current.roomMode,
      selectedRoomIds:
        plan.roomAssignments
          ?.map((assignment: PlanRoomAssignment) => assignment.roomId)
          .filter((id): id is string => typeof id === "string") || [],
      note: plan.note || "",
    }));
  };

  const loadAvailability = async (
    override?: Partial<{
      dateFrom: string;
      dateTo: string;
      studentsPerRoom: string;
    }>,
  ) => {
    if (!detail) return;
    const dateFrom = override?.dateFrom || plannerForm.suggestionFrom;
    const dateTo = override?.dateTo || plannerForm.suggestionTo || dateFrom;
    const studentsPerRoom =
      override?.studentsPerRoom || plannerForm.studentsPerRoom;

    if (!dateFrom) {
      setMessage({
        type: "error",
        text: "Cần chọn khoảng ngày để gợi ý lịch thi.",
      });
      return;
    }

    setAvailabilityLoading(true);
    try {
      const query = buildQuery({
        semesterId: detail.semesterId,
        subjectId: detail.subject.id,
        cohort: detail.cohort,
        dateFrom,
        dateTo,
        studentsPerRoom: Number(studentsPerRoom || 0) || undefined,
        limit: 24,
        selectedDate: plannerForm.date || undefined,
        selectedStartShift:
          Number(plannerForm.shift.split("-")[0] || 0) || undefined,
      });
      const payload = await requestJson(
        `/api/courses/exam-planning/availability?${query}`,
        {
          headers: authHeaders,
        },
      );
      setAvailability(payload);
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Không thể gợi ý ca thi và phòng trống.",
      });
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const currentSlotSuggestion = useMemo(() => {
    if (!availability || !plannerForm.date) return null;
    const currentDate = `${plannerForm.date}`.slice(0, 10);
    const [startShift, endShift] = plannerForm.shift.split("-").map(Number);
    return (
      availability.suggestions.find(
        (slot) =>
          `${slot.date}`.slice(0, 10) === currentDate &&
          slot.startShift === startShift &&
          slot.endShift === endShift,
      ) || null
    );
  }, [availability, plannerForm.date, plannerForm.shift]);

  const assignedEligibleCount = useMemo(() => {
    return (detail?.plans || []).reduce(
      (total, plan) => total + (plan.students?.length || 0),
      0,
    );
  }, [detail?.plans]);

  const activeShiftPlan = useMemo(() => {
    if (!detail || !plannerForm.date) return null;
    return (
      detail.plans.find(
        (plan) =>
          `${plan.examDate}`.slice(0, 10) === plannerForm.date &&
          `${plan.startShift}-${plan.endShift}` === plannerForm.shift,
      ) || null
    );
  }, [detail, plannerForm.date, plannerForm.shift]);

  const targetSeatCount = useMemo(() => {
    if (!detail) return 0;
    if (availability) {
      return availability.requiredSeats;
    }

    return Math.max(
      0,
      detail.eligibleCount -
        assignedEligibleCount +
        (activeShiftPlan?.students?.length || 0),
    );
  }, [activeShiftPlan, assignedEligibleCount, availability, detail]);

  const remainingEligibleCount = useMemo(() => {
    if (!detail) return 0;
    return Math.max(0, detail.eligibleCount - assignedEligibleCount);
  }, [assignedEligibleCount, detail]);

  const visibleRooms = useMemo(() => {
    const baseRooms =
      currentSlotSuggestion?.availableRooms &&
      currentSlotSuggestion.availableRooms.length > 0
        ? currentSlotSuggestion.availableRooms
        : rooms
            .filter((room) =>
              detail?.preferredRoomTypes?.length
                ? detail.preferredRoomTypes.includes(room.type)
                : true,
            )
            .map((room) => ({
              ...room,
              assignmentCapacity:
                Math.min(
                  room.capacity,
                  Number(plannerForm.studentsPerRoom || 0) || room.capacity,
                ) || room.capacity,
              isPreferred:
                detail?.preferredRoomTypes?.includes(room.type) || false,
            }));

    return [...baseRooms].sort((left, right) => {
      if (Boolean(left.isPreferred) !== Boolean(right.isPreferred)) {
        return left.isPreferred ? -1 : 1;
      }
      if (left.assignmentCapacity !== right.assignmentCapacity) {
        return left.assignmentCapacity - right.assignmentCapacity;
      }
      return left.name.localeCompare(right.name);
    });
  }, [currentSlotSuggestion, rooms, detail, plannerForm.studentsPerRoom]);

  const selectedRoomCapacity = useMemo(() => {
    const selectedIds = new Set(plannerForm.selectedRoomIds);
    return visibleRooms
      .filter((room) => selectedIds.has(room.id))
      .reduce(
        (total, room) =>
          total + (Number(room.assignmentCapacity || room.capacity) || 0),
        0,
      );
  }, [visibleRooms, plannerForm.selectedRoomIds]);

  const customVenueCapacity = Number(plannerForm.customVenueCapacity || 0);
  const totalPlannedCapacity =
    selectedRoomCapacity +
    (plannerForm.customVenueEnabled && customVenueCapacity > 0
      ? customVenueCapacity
      : 0);

  const sortedStudents = useMemo(() => {
    const students = [...(detail?.students || [])];
    const filtered = showEligibleOnly
      ? students.filter((student) => student.isEligibleForExam)
      : students;

    return filtered.sort((left, right) => {
      if (studentSortKey === "code") {
        return left.studentCode.localeCompare(right.studentCode);
      }
      if (studentSortKey === "adminClass") {
        return `${left.adminClassCode || ""}`.localeCompare(
          `${right.adminClassCode || ""}`,
        );
      }
      if (studentSortKey === "process") {
        return Number(right.processScore || 0) - Number(left.processScore || 0);
      }
      if (left.studentName !== right.studentName) {
        return left.studentName.localeCompare(right.studentName);
      }
      return left.studentCode.localeCompare(right.studentCode);
    });
  }, [detail, showEligibleOnly, studentSortKey]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedStudents.length / STUDENT_PAGE_SIZE),
  );
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * STUDENT_PAGE_SIZE;
    return sortedStudents.slice(start, start + STUDENT_PAGE_SIZE);
  }, [sortedStudents, studentPage]);

  useEffect(() => {
    setStudentPage(1);
  }, [detail?.subject.id, detail?.cohort, showEligibleOnly, studentSortKey]);

  useEffect(() => {
    setAvailabilityPage(1);
  }, [availability?.subject.id, availability?.cohort, availability?.suggestions?.length]);

  const totalEligible = useMemo(() => {
    return groups.reduce((total, group) => total + group.eligibleCount, 0);
  }, [groups]);

  const paginatedGroups = useMemo(() => {
    const start = (groupPage - 1) * MAIN_PAGE_SIZE;
    return groups.slice(start, start + MAIN_PAGE_SIZE);
  }, [groups, groupPage]);

  const assignedByGradeId = useMemo(() => {
    const map = new Map<string, PlanStudentAssignment>();
    for (const plan of detail?.plans || []) {
      for (const student of plan.students || []) {
        map.set(student.gradeId, student);
      }
    }
    return map;
  }, [detail?.plans]);

  const roomByAssignmentId = useMemo(() => {
    const map = new Map<string, PlanRoomAssignment>();
    for (const plan of detail?.plans || []) {
      for (const room of plan.roomAssignments || []) {
        map.set(room.id, room);
      }
    }
    return map;
  }, [detail?.plans]);

  const stats = useMemo(() => {
    if (!detail) {
      return [
        {
          label: "Tổ hợp thi",
          value: groups.length,
          note: "Danh sách đã gộp theo môn học và khóa.",
          icon: ClipboardList,
        },
        {
          label: "Lịch đã xếp",
          value: scheduledPlans.length,
          note: "Có thể mở lại để đổi ca, đổi phòng hoặc phân phòng lại.",
          icon: Building2,
        },
        {
          label: "Kho phòng",
          value: rooms.length,
          note: "Chỉ gợi ý phòng còn trống, không trùng lịch.",
          icon: Layers3,
        },
        {
          label: "SV đủ điều kiện",
          value: totalEligible,
          note: "Sinh viên đạt điều kiện dự thi kết thúc học kỳ.",
          icon: Users,
        },
      ];
    }

    const plans = detail?.plans || [];
    let assignedCount = 0;
    for (const plan of plans) {
      assignedCount += plan.students?.length || 0;
    }

    const unassignedCount = Math.max(0, detail.eligibleCount - assignedCount);

    return [
      {
        label: "Tổng sinh viên",
        value: detail.totalStudents,
        icon: Users,
        note: "Số lượng sinh viên thuộc các lớp HP gộp",
      },
      {
        label: "Đủ điều kiện",
        value: detail.eligibleCount,
        icon: CheckSquare,
        note: "Sinh viên có đủ điểm chuyên cần/điều kiện (7.0+)",
      },
      {
        label: "Đã xếp lịch",
        value: assignedCount,
        icon: CheckCircle2,
        note: `Đã xếp ${plans.length} ca thi cho ${assignedCount} SV`,
      },
      {
        label: "Chờ xếp lịch",
        value: unassignedCount,
        icon: AlertCircle,
        note: "Sinh viên đủ điều kiện nhưng chưa có ca thi",
      },
    ];
  }, [detail, groups.length, scheduledPlans.length, rooms.length, totalEligible]);

  const filteredPlans = useMemo(() => {
    return scheduledPlans.filter((plan) => {
      if (selectedSubjectId && plan.subjectId !== selectedSubjectId)
        return false;
      if (selectedCohort && plan.cohort !== selectedCohort) return false;
      if (selectedFacultyId) {
        const facultyId = plan.subject?.major?.faculty?.id;
        if (facultyId !== selectedFacultyId) return false;
      }

      const keyword = searchQuery.trim().toLowerCase();
      if (!keyword) return true;
      const haystack = [
        plan.subject?.code,
        plan.subject?.name,
        plan.cohort,
        ...plan.roomAssignments.map((room) => room.roomName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [
    scheduledPlans,
    searchQuery,
    selectedFacultyId,
    selectedCohort,
    selectedSubjectId,
  ]);

  const paginatedPlans = useMemo(() => {
    const start = (planPage - 1) * MAIN_PAGE_SIZE;
    return filteredPlans.slice(start, start + MAIN_PAGE_SIZE);
  }, [filteredPlans, planPage]);

  // Reset pages on filter/search change
  useEffect(() => {
    setGroupPage(1);
  }, [selectedSemesterId, selectedFacultyId, selectedCohort, searchQuery]);

  useEffect(() => {
    setPlanPage(1);
  }, [selectedSemesterId, selectedFacultyId, selectedCohort, searchQuery]);

  const availabilityGridRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        date: string;
        dateLabel: string;
        slots: Record<string, AvailabilitySuggestion | null>;
      }
    >();

    for (const suggestion of availability?.suggestions || []) {
      const dateKey = `${suggestion.date}`.slice(0, 10);
      if (!rows.has(dateKey)) {
        rows.set(dateKey, {
          date: dateKey,
          dateLabel: suggestion.dateLabel,
          slots: Object.fromEntries(
            SHIFT_OPTIONS.map((shift) => [shift.value, null]),
          ) as Record<string, AvailabilitySuggestion | null>,
        });
      }

      rows.get(dateKey)!.slots[
        `${suggestion.startShift}-${suggestion.endShift}`
      ] = suggestion;
    }

    return Array.from(rows.values()).sort((left, right) =>
      left.date.localeCompare(right.date),
    );
  }, [availability]);

  const availabilityTotalPages = Math.max(
    1,
    Math.ceil(availabilityGridRows.length / AVAILABILITY_PAGE_SIZE),
  );

  const paginatedAvailabilityGridRows = useMemo(() => {
    const start = (availabilityPage - 1) * AVAILABILITY_PAGE_SIZE;
    return availabilityGridRows.slice(start, start + AVAILABILITY_PAGE_SIZE);
  }, [availabilityGridRows, availabilityPage, AVAILABILITY_PAGE_SIZE]);

  const normalizedSelectedShiftValues = useMemo(() => {
    const optionOrder = new Map<string, number>(
      SHIFT_OPTIONS.map((option, index) => [option.value, index]),
    );

    return [...new Set(plannerForm.selectedShiftValues || [])]
      .filter((value) => optionOrder.has(value))
      .sort(
        (left, right) =>
          (optionOrder.get(left) ?? 999) - (optionOrder.get(right) ?? 999),
      );
  }, [plannerForm.selectedShiftValues]);

  const totalConfiguredCapacity = useMemo(() => {
    return totalPlannedCapacity * Math.max(normalizedSelectedShiftValues.length, 1);
  }, [normalizedSelectedShiftValues.length, totalPlannedCapacity]);

  const updateSelectedShiftValues = (
    nextValues: string[],
    preferredFocusedShift?: string,
  ) => {
    const optionOrder = new Map<string, number>(
      SHIFT_OPTIONS.map((option, index) => [option.value, index]),
    );
    const normalized = [...new Set(nextValues)]
      .filter((value) => optionOrder.has(value))
      .sort(
        (left, right) =>
          (optionOrder.get(left) ?? 999) - (optionOrder.get(right) ?? 999),
      );

    if (normalized.length === 0) {
      return;
    }

    setPlannerForm((current) => ({
      ...current,
      selectedShiftValues: normalized,
      shift:
        preferredFocusedShift && normalized.includes(preferredFocusedShift)
          ? preferredFocusedShift
          : normalized.includes(current.shift)
            ? current.shift
            : normalized[0],
    }));
  };

  const handlePlannerShiftChange = (value: string) => {
    updateSelectedShiftValues(
      normalizedSelectedShiftValues.includes(value)
        ? normalizedSelectedShiftValues
        : [...normalizedSelectedShiftValues, value],
      value,
    );
  };

  const handleTogglePlannerShift = (value: string) => {
    if (normalizedSelectedShiftValues.includes(value)) {
      updateSelectedShiftValues(
        normalizedSelectedShiftValues.filter((shiftValue) => shiftValue !== value),
      );
      return;
    }

    updateSelectedShiftValues([...normalizedSelectedShiftValues, value], value);
  };


  const handleToggleRoom = (roomId: string) => {
    setPlannerForm((current) => ({
      ...current,
      selectedRoomIds: current.selectedRoomIds.includes(roomId)
        ? current.selectedRoomIds.filter((id) => id !== roomId)
        : [...current.selectedRoomIds, roomId],
    }));
  };

  const handleApplySuggestion = (suggestion: AvailabilitySuggestion) => {
    const shiftValue = `${suggestion.startShift}-${suggestion.endShift}`;
    setPlannerForm((current) => ({
      ...current,
      date: `${suggestion.date}`.slice(0, 10),
      shift: shiftValue,
      selectedShiftValues: [shiftValue],
      selectedRoomIds: suggestion.suggestedRooms.map((room) => room.id),
    }));
  };

  const refreshAfterSchedule = async () => {
    await fetchPlanningData();
    if (selectedGroup) {
      await loadGroupDetail(selectedGroup);
    }
  };

  const handleSchedule = async () => {
    if (!detail || !selectedGroup) return;
    if (!plannerForm.date) {
      setMessage({ type: "error", text: "Cần chọn ngày thi trước khi xếp." });
      return;
    }

    if (normalizedSelectedShiftValues.length === 0) {
      setMessage({
        type: "error",
        text: "Cần chọn ít nhất một ca thi để phân phòng.",
      });
      return;
    }

    if (
      plannerForm.roomMode === "MANUAL" &&
      plannerForm.selectedRoomIds.length === 0 &&
      !plannerForm.customVenueEnabled
    ) {
      setMessage({
        type: "error",
        text: "Chế độ thủ công yêu cầu chọn ít nhất một phòng hoặc địa điểm.",
      });
      return;
    }

    if (plannerForm.customVenueEnabled && !plannerForm.customVenueName.trim()) {
      setMessage({
        type: "error",
        text: "Tên địa điểm thủ công không được để trống.",
      });
      return;
    }

    setScheduleLoading(true);
    try {
      const [startShift, endShift] = plannerForm.shift.split("-").map(Number);
      const payload = await requestJson("/api/courses/exam-planning/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders || {}),
        },
        body: JSON.stringify({
          semesterId: detail.semesterId,
          subjectId: detail.subject.id,
          cohort: detail.cohort,
          date: plannerForm.date,
          startShift,
          endShift,
          shifts: normalizedSelectedShiftValues.map((value) => {
            const [shiftStart, shiftEnd] = value.split("-").map(Number);
            return {
              startShift: shiftStart,
              endShift: shiftEnd,
            };
          }),
          studentsPerRoom:
            Number(plannerForm.studentsPerRoom || 0) || undefined,
          selectedRoomIds:
            plannerForm.roomMode === "AUTO" ? [] : plannerForm.selectedRoomIds,
          allowAutoFill: plannerForm.roomMode !== "MANUAL",
          customVenue: plannerForm.customVenueEnabled
            ? {
                name: plannerForm.customVenueName,
                capacity: Number(plannerForm.customVenueCapacity || 0),
                type: plannerForm.customVenueType,
                building: plannerForm.customVenueBuilding,
              }
            : null,
          note: plannerForm.note,
          studentSortKey,
        }),
      });

      setMessage({
        type: "success",
        text:
          payload.message ||
          ((detail?.plans?.length || 0) > 0
            ? "Đã điều chỉnh lịch thi."
            : "Đã xếp lịch thi thành công."),
      });

      await refreshAfterSchedule();
      await loadAvailability({
        dateFrom: plannerForm.date,
        dateTo: plannerForm.date,
      });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.message || "Không thể xếp lịch thi.",
      });
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] space-y-4 bg-slate-50 px-1 pb-16 text-slate-700">
      <CompactLecturerHeader
        userName={user?.fullName || "Cán bộ Đào tạo"}
        userId={`CB-${user?.username || "UNETI"}`}
        minimal
        title="Điều phối lịch thi kết thúc học kỳ"
        onSemesterChange={setSelectedSemesterId}
        selectedSemesterId={selectedSemesterId}
        semesterOptions={semesters}
        semesterFilter="all"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {item.label}
                </p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">
                  {item.value}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
                <item.icon size={16} />
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">{item.note}</p>
          </div>
        ))}
      </div>

      {message.text && (
        <div
          className={cn(
            "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm",
            message.type === "success"
              ? "bg-emerald-50 border-emerald-100 text-emerald-900"
              : "bg-rose-50 border-rose-100 text-rose-900",
          )}
        >
          {message.type === "success" ? (
            <CheckCircle2 size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <p className="text-[12px] font-bold">{message.text}</p>
        </div>
      )}

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Bộ lọc điều phối
            </p>
            <h2 className="mt-1 text-base font-semibold text-slate-900">
              Chọn khóa, khoa, môn rồi gộp danh sách lớp học phần để xếp lịch
              thi
            </h2>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedFacultyId("");
              setSelectedCohort("");
              setSelectedSubjectId("");
              setSearchQuery("");
            }}
            className="h-10 rounded-md border-slate-200 text-[12px] font-medium"
          >
            <RefreshCcw size={14} className="mr-2" />
            Xóa bộ lọc
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Khoa
            </label>
            <select
              value={selectedFacultyId}
              onChange={(event) => setSelectedFacultyId(event.target.value)}
              className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
            >
              <option value="">Tất cả khoa</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Khóa
            </label>
            <select
              value={selectedCohort}
              onChange={(event) => setSelectedCohort(event.target.value)}
              className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
            >
              <option value="">Tất cả khóa</option>
              {cohorts.map((cohort) => (
                <option key={cohort.id || cohort.code} value={cohort.code}>
                  {cohort.code}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5 md:col-span-2">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Môn học
            </label>
            <select
              value={selectedSubjectId}
              onChange={(event) => setSelectedSubjectId(event.target.value)}
              className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
            >
              <option value="">Tất cả môn học</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} • {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
            <label className="mb-1 block text-[11px] font-medium text-slate-500">
              Tìm nhanh
            </label>
            <div className="flex items-center gap-2">
              <Search size={15} className="text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Mã môn, tên môn, lớp..."
                className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            {(["groups", "plans"] as PlannerTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "h-9 rounded-md px-3 text-[12px] font-medium transition-colors",
                  activeTab === tab
                    ? "border border-slate-300 bg-slate-900 text-white"
                    : "border border-transparent bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {tab === "groups" ? "Nhóm thi gộp" : "Lịch đã xếp"}
              </button>
            ))}
          </div>
          <div className="text-[12px] text-slate-500">
            {loading
              ? "Đang tải dữ liệu..."
              : activeTab === "groups"
                ? `${groups.length} tổ hợp`
                : `${filteredPlans.length} kế hoạch`}
          </div>
        </div>

        <div className="overflow-auto shadow-sm rounded-lg border border-slate-200">
          {activeTab === "groups" ? (
            <>
              <table className="w-full min-w-[1180px]">
                <thead className="bg-slate-50/90 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Khoa
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Môn học
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Khóa
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Lớp HP gộp
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Đủ ĐK / Tổng
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Trạng thái
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 text-right">
                    Tác vụ
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroups.map((group) => {
                  const isActive = selectedGroup?.key === group.key;
                  return (
                    <tr
                      key={group.key}
                      className={cn(
                        "border-b border-slate-100 hover:bg-slate-50/70",
                        isActive && "bg-blue-50/70",
                      )}
                    >
                      <td className="px-4 py-4 text-[11px] font-bold text-slate-600 uppercase">
                        {group.facultyName || "Chưa rõ"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[12px] font-black text-slate-900">
                          {group.subject.code}
                        </p>
                        <p className="text-[12px] font-bold text-slate-600 mt-1">
                          {group.subject.name}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-[12px] font-black text-slate-700 uppercase">
                        {group.cohort}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[11px] font-bold text-slate-700">
                          {group.classCount} lớp học phần
                        </p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">
                          {group.courseClassCodes.slice(0, 4).join(" • ")}
                          {group.courseClassCodes.length > 4 ? " ..." : ""}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-[12px] font-black text-slate-700">
                        {group.eligibleCount} / {group.totalStudents}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "inline-flex px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-[0.2em]",
                            group.hasPlan
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-100",
                          )}
                        >
                          {group.hasPlan ? "Đã xếp" : "Chờ xếp"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Button
                          variant={isActive ? "default" : "outline"}
                          onClick={() => void handleSelectGroup(group)}
                          className="h-10 rounded-2xl text-[11px] font-black uppercase tracking-[0.16em]"
                        >
                          {group.hasPlan ? "Điều chỉnh" : "Xếp lịch"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {groups.length > MAIN_PAGE_SIZE && (
              <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-slate-50/30 px-4 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                  disabled={groupPage === 1}
                  className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                >
                  <ChevronLeft size={14} /> Trước
                </Button>
                <span className="text-[12px] font-black text-slate-600">
                  Trang {groupPage} / {Math.ceil(groups.length / MAIN_PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setGroupPage((p) => Math.min(Math.ceil(groups.length / MAIN_PAGE_SIZE), p + 1))}
                  disabled={groupPage >= Math.ceil(groups.length / MAIN_PAGE_SIZE)}
                  className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                >
                  Sau <ChevronRight size={14} />
                </Button>
              </div>
              )}
            </>
          ) : (
            <>
              <table className="w-full min-w-[1180px]">
              <thead className="bg-slate-50/90 border-b border-slate-100">
                <tr className="text-left">
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Môn học
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Khóa
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Ngày thi
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Ca thi
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Phòng
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                    Sức chứa
                  </th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400 text-right">
                    Tác vụ
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedPlans.map((plan) => (
                  <tr
                    key={plan.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <p className="text-[12px] font-black text-slate-900">
                        {plan.subject?.code || "MON"}
                      </p>
                      <p className="text-[12px] font-bold text-slate-600 mt-1">
                        {plan.subject?.name || "Môn học"}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[12px] font-black text-slate-700 uppercase">
                      {plan.cohort}
                    </td>
                    <td className="px-4 py-4 text-[12px] font-bold text-slate-700">
                      {format(new Date(plan.examDate), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-4 text-[12px] font-bold text-slate-700">
                      {formatShiftRange(plan.startShift, plan.endShift)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-[11px] font-bold text-slate-700">
                        {plan.roomAssignments
                          .map((room) => room.roomName)
                          .join(" • ")}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-[12px] font-black text-slate-700">
                      {plan.totalStudents} SV / {plan.totalRooms} phòng
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="outline"
                        onClick={() => void handleSelectPlan(plan)}
                        className="h-10 rounded-2xl text-[11px] font-black uppercase tracking-[0.16em]"
                      >
                        Đổi lịch
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPlans.length > MAIN_PAGE_SIZE && (
              <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-slate-50/30 px-4 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanPage((p) => Math.max(1, p - 1))}
                  disabled={planPage === 1}
                  className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                >
                  <ChevronLeft size={14} /> Trước
                </Button>
                <span className="text-[12px] font-black text-slate-600">
                  Trang {planPage} / {Math.ceil(filteredPlans.length / MAIN_PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPlanPage((p) => Math.min(Math.ceil(filteredPlans.length / MAIN_PAGE_SIZE), p + 1))}
                  disabled={planPage >= Math.ceil(filteredPlans.length / MAIN_PAGE_SIZE)}
                  className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                >
                  Sau <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>

      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title="Lập lịch & Điều phối chi tiết"
        maxWidth="7xl"
        footer={
          <div className="flex w-full items-center justify-end">
            <Button
              variant="outline"
              onClick={() => setIsAdjustmentModalOpen(false)}
              className="h-10 rounded-md border-slate-300 text-[12px] font-medium"
            >
              Đóng
            </Button>
          </div>
        }
      >
        <div className="space-y-5 p-1">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Nhóm đang chọn
                </p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">
                  {selectedGroup
                    ? `${selectedGroup.subject.code} • ${selectedGroup.cohort}`
                    : "Chưa chọn tổ hợp thi"}
                </h3>
                <p className="mt-1 text-[12px] text-slate-500">
                  {detail
                    ? `${detail.subject.name} • ${getExamTypeLabel(detail.subject.examType)}`
                    : "Chọn một tổ hợp thi hoặc một lịch đã xếp để điều chỉnh."}
                </p>
              </div>
              {detailLoading && (
                <Loader2 size={18} className="animate-spin text-slate-400" />
              )}
            </div>

            {!selectedGroup || !detail ? (
              <div className="mt-4 rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="text-[13px] text-slate-500">
                  Chọn một tổ hợp thi ở bảng trên để gộp danh sách lớp học phần,
                  xem sinh viên, gợi ý ca thi và điều chỉnh phân phòng trong popup.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Khoa
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                      {selectedGroup.facultyName || "Chưa rõ"}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Sinh viên đủ điều kiện
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                      {detail.eligibleCount} / {detail.totalStudents}
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Lớp HP gộp
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                      {detail.classCount} lớp
                    </p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Ca thi đã xếp
                    </p>
                    <p className="mt-1 text-[13px] font-semibold text-slate-900">
                      {detail.plans.length} ca
                    </p>
                  </div>
                </div>

                <div className="rounded-md border border-slate-200 bg-white p-3">
                  <p className="text-[11px] font-medium text-slate-500">
                    Lớp học phần được gộp
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.courseClasses.map((courseClass) => (
                      <span
                        key={courseClass.id}
                        className="inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-700"
                      >
                        {courseClass.code}
                      </span>
                    ))}
                  </div>
                </div>

                {(detail?.plans?.length || 0) > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        Các ca thi đã xếp
                      </p>
                      <p className="text-[11px] font-medium text-slate-500">
                        Chọn nhanh để nạp lại vào form điều chỉnh
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {detail?.plans?.map((plan) => (
                        <button
                          key={plan.id}
                          type="button"
                          onClick={() => void handleSelectPlan(plan)}
                          className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-emerald-50/40 p-3 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <div>
                            <p className="text-[13px] font-bold text-slate-900">
                              {format(new Date(plan.examDate), "dd/MM/yyyy")} •{" "}
                              {formatShiftRange(plan.startShift, plan.endShift)}
                            </p>
                            <p className="mt-0.5 text-[12px] text-slate-600">
                              {plan.totalStudents} sinh viên • {plan.totalRooms} phòng
                            </p>
                          </div>
                          <span className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-[11px] font-bold text-emerald-700">
                            Mở điều chỉnh
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {detail && (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {ADJUSTMENT_SECTION_CONFIG.map((section, index) => {
                const Icon = section.icon;
                const active = adjustmentSection === section.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setAdjustmentSection(section.id)}
                    className={cn(
                      "rounded-lg border px-4 py-4 text-left transition-colors",
                      active
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-md border",
                          active
                            ? "border-white/20 bg-white/10 text-white"
                            : "border-slate-200 bg-slate-50 text-slate-500",
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[13px] font-semibold">
                            {section.label}
                          </p>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]",
                              active
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-500",
                            )}
                          >
                            Trang {index + 1}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "mt-1 text-[11px] leading-5",
                            active ? "text-slate-200" : "text-slate-500",
                          )}
                        >
                          {section.hint}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {detail && adjustmentSection === "availability" && (
            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Nhóm gợi ý ca thi và phòng trống
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Bảng ca thi theo ngày
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-slate-500">
                    {availabilityGridRows.length} ngày đang có gợi ý
                  </span>
                  <Button
                    onClick={() => void loadAvailability()}
                    disabled={availabilityLoading}
                    className="h-10 rounded-md text-[12px] font-medium"
                  >
                    {availabilityLoading ? (
                      <Loader2 size={15} className="mr-2 animate-spin" />
                    ) : (
                      <Sparkles size={15} className="mr-2" />
                    )}
                    Gợi ý lịch thi
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    value={plannerForm.suggestionFrom}
                    onChange={(event) =>
                      setPlannerForm((current) => ({
                        ...current,
                        suggestionFrom: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
                  />
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    value={plannerForm.suggestionTo}
                    onChange={(event) =>
                      setPlannerForm((current) => ({
                        ...current,
                        suggestionTo: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
                  />
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
                  <label className="mb-1 block text-[11px] font-medium text-slate-500">
                    Giới hạn SV / phòng
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={plannerForm.studentsPerRoom}
                    onChange={(event) =>
                      setPlannerForm((current) => ({
                        ...current,
                        studentsPerRoom: event.target.value,
                      }))
                    }
                    className="w-full bg-transparent text-[13px] font-medium text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="overflow-auto rounded-md border border-slate-200">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead className="bg-slate-100">
                    <tr className="text-left">
                      <th className="border-b border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600">
                        Ngày
                      </th>
                      {SHIFT_OPTIONS.map((shift) => (
                        <th
                          key={shift.value}
                          className="border-b border-l border-slate-200 px-3 py-2 text-[11px] font-medium text-slate-600"
                        >
                          {shift.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAvailabilityGridRows.map((row) => (
                      <tr key={row.date}>
                        <td className="border-b border-slate-200 px-3 py-3 align-top text-[12px] font-medium text-slate-900">
                          {row.dateLabel}
                        </td>
                        {SHIFT_OPTIONS.map((shift) => {
                          const suggestion = row.slots[shift.value];
                          if (!suggestion) {
                            return (
                              <td
                                key={`${row.date}-${shift.value}`}
                                className="border-b border-l border-slate-200 px-3 py-3 text-[12px] text-slate-400"
                              >
                                Chưa tải
                              </td>
                            );
                          }

                          const isSelected =
                            `${suggestion.date}`.slice(0, 10) ===
                              plannerForm.date &&
                            `${suggestion.startShift}-${suggestion.endShift}` ===
                              plannerForm.shift;

                          return (
                            <td
                              key={`${row.date}-${shift.value}`}
                              className="border-b border-l border-slate-200 p-0 align-top"
                            >
                              <button
                                onClick={() => handleApplySuggestion(suggestion)}
                                className={cn(
                                  "flex h-full min-h-[112px] w-full flex-col items-start justify-between px-3 py-3 text-left transition-colors",
                                  suggestion.status === "AVAILABLE"
                                    ? isSelected
                                      ? "bg-slate-900 text-white"
                                      : "bg-white hover:bg-slate-50"
                                    : "bg-slate-50 text-slate-500",
                                )}
                              >
                                <div className="space-y-1">
                                  <span
                                    className={cn(
                                      "inline-flex rounded-sm border px-2 py-0.5 text-[10px] font-medium",
                                      suggestion.status === "AVAILABLE"
                                        ? isSelected
                                          ? "border-white/30 text-white"
                                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-300 bg-white text-slate-500",
                                    )}
                                  >
                                    {suggestion.status === "AVAILABLE"
                                      ? "Có thể xếp"
                                      : "Bị chặn"}
                                  </span>
                                  <p className="text-[12px] font-medium">
                                    {suggestion.totalCapacity} /{" "}
                                    {suggestion.requiredSeats} chỗ
                                  </p>
                                  <p
                                    className={cn(
                                      "text-[11px]",
                                      isSelected ? "text-slate-200" : "text-slate-500",
                                    )}
                                  >
                                    {suggestion.suggestedRooms.length} phòng gợi ý
                                  </p>
                                </div>

                                {suggestion.reasons.length > 0 ? (
                                  <p
                                    className={cn(
                                      "line-clamp-3 text-[11px] leading-5",
                                      isSelected ? "text-slate-200" : "text-rose-700",
                                    )}
                                  >
                                    {suggestion.reasons.join(" ")}
                                  </p>
                                ) : suggestion.suggestedRooms.length > 0 ? (
                                  <p
                                    className={cn(
                                      "line-clamp-2 text-[11px] leading-5",
                                      isSelected ? "text-slate-200" : "text-slate-500",
                                    )}
                                  >
                                    {suggestion.suggestedRooms
                                      .map(
                                        (room) =>
                                          `${room.name} (${room.assignmentCapacity})`,
                                      )
                                      .join(", ")}
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    Không có phòng phù hợp.
                                  </span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {availabilityGridRows.length > AVAILABILITY_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 rounded-md border border-slate-200 bg-slate-50/40 px-4 py-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAvailabilityPage((page) => Math.max(1, page - 1))}
                    disabled={availabilityPage === 1}
                    className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                  >
                    <ChevronLeft size={14} />
                    Trước
                  </Button>
                  <span className="text-[12px] font-black text-slate-600">
                    Trang {availabilityPage} / {availabilityTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setAvailabilityPage((page) =>
                        Math.min(availabilityTotalPages, page + 1),
                      )
                    }
                    disabled={availabilityPage >= availabilityTotalPages}
                    className="h-9 gap-2 rounded-xl text-[11px] font-bold uppercase"
                  >
                    Sau
                    <ChevronRight size={14} />
                  </Button>
                </div>
              )}

              {!availabilityLoading &&
                (!availability || availability.suggestions.length === 0) && (
                  <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-[13px] text-slate-500">
                    Chọn khoảng ngày rồi bấm{" "}
                    <span className="font-medium">Gợi ý lịch thi</span> để tải
                    bảng ca theo ngày.
                  </div>
                )}
            </section>
          )}

          {detail && adjustmentSection === "schedule" && (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Nhóm xếp lịch và phân phòng
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    {detail.subject.name} • {detail.cohort}
                  </h3>
                </div>
                <div className="text-[12px] text-slate-500">
                  Gợi ý loại phòng:{" "}
                  {detail.preferredRoomTypes
                    .map((type) => getRoomTypeLabel(type))
                    .join(" • ")}
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-slate-500">
                      Ngày thi
                    </label>
                    <input
                      type="date"
                      value={plannerForm.date}
                      onChange={(event) =>
                        setPlannerForm((current) => ({
                          ...current,
                          date: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-slate-500">
                      Ca thi đang focus
                    </label>
                    <select
                      value={plannerForm.shift}
                      onChange={(event) =>
                        handlePlannerShiftChange(event.target.value)
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                    >
                      {SHIFT_OPTIONS.map((shift) => (
                        <option key={shift.value} value={shift.value}>
                          {shift.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-slate-500">
                      SV / phòng
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={plannerForm.studentsPerRoom}
                      onChange={(event) =>
                        setPlannerForm((current) => ({
                          ...current,
                          studentsPerRoom: event.target.value,
                        }))
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Chọn nhiều ca thi cho cùng một đợt phân phòng
                      </p>
                      <p className="mt-1 text-[12px] text-slate-600">
                        Hệ thống sẽ dùng danh sách sinh viên đã sắp xếp, phân tuần tự
                        theo ca đã chọn cho đến khi hết sinh viên.
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] font-semibold text-slate-700">
                      {normalizedSelectedShiftValues.length} ca • Sức chứa cấu hình{" "}
                      {totalConfiguredCapacity} chỗ
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                    {SHIFT_OPTIONS.map((shift) => {
                      const checked = normalizedSelectedShiftValues.includes(
                        shift.value,
                      );
                      const focused = plannerForm.shift === shift.value;
                      return (
                        <button
                          key={shift.value}
                          type="button"
                          onClick={() => handleTogglePlannerShift(shift.value)}
                          className={cn(
                            "rounded-md border px-3 py-3 text-left transition-colors",
                            checked
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[12px] font-semibold">
                                {shift.label}
                              </p>
                              <p
                                className={cn(
                                  "mt-1 text-[11px]",
                                  checked ? "text-slate-200" : "text-slate-500",
                                )}
                              >
                                {focused
                                  ? "Đang focus để xem chi tiết"
                                  : checked
                                    ? "Đã chọn để xếp tiếp"
                                    : "Bấm để thêm vào đợt xếp"}
                              </p>
                            </div>
                            {checked ? (
                              <CheckSquare size={16} />
                            ) : (
                              <Square size={16} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {ROOM_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setPlannerForm((current) => ({
                          ...current,
                          roomMode: option.value,
                        }))
                      }
                      className={cn(
                        "rounded-md border px-3 py-3 text-left transition-colors",
                        plannerForm.roomMode === option.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                      )}
                    >
                      <p className="text-[12px] font-medium">{option.label}</p>
                      <p
                        className={cn(
                          "mt-1 text-[11px] leading-5",
                          plannerForm.roomMode === option.value
                            ? "text-slate-200"
                            : "text-slate-500",
                        )}
                      >
                        {option.hint}
                      </p>
                    </button>
                  ))}
                </div>

                {currentSlotSuggestion && (
                  <div
                    className={cn(
                      "rounded-md border p-3",
                      currentSlotSuggestion.status === "AVAILABLE"
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-rose-200 bg-rose-50",
                    )}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium text-slate-500">
                          Trạng thái slot đã chọn
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-slate-900">
                          {currentSlotSuggestion.dateLabel} •{" "}
                          {currentSlotSuggestion.shiftLabel}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-medium text-slate-500">
                          Nhu cầu còn lại
                        </p>
                        <p className="mt-1 text-[13px] font-semibold text-slate-900">
                          {currentSlotSuggestion.totalCapacity} /{" "}
                          {currentSlotSuggestion.requiredSeats}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-slate-500">
                      Thứ tự chia phòng
                    </label>
                    <select
                      value={studentSortKey}
                      onChange={(event) =>
                        setStudentSortKey(event.target.value as StudentSortKey)
                      }
                      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                    >
                      <option value="adminClass">Theo lớp HC rồi MSSV</option>
                      <option value="code">Theo MSSV</option>
                      <option value="name">Theo họ tên</option>
                      <option value="process">Theo điểm quá trình</option>
                    </select>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
                    <p className="text-[11px] font-medium text-slate-500">
                      Cách vận hành nhiều ca
                    </p>
                    <p className="mt-1 text-[12px] leading-5 text-slate-600">
                      Cùng một cấu hình phòng sẽ được áp dụng lặp lại theo từng ca
                      đã chọn. Hệ thống giữ đúng thứ tự sinh viên rồi chia tuần tự
                      qua từng ca cho tới khi hết danh sách.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-md border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-slate-500">
                        Chọn phòng / địa điểm thủ công
                      </p>
                      <p className="mt-1 text-[12px] text-slate-600">
                        Sức chứa mỗi ca: {totalPlannedCapacity} chỗ • Tổng sức chứa
                        theo {normalizedSelectedShiftValues.length} ca:{" "}
                        {totalConfiguredCapacity} chỗ
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() =>
                        setPlannerForm((current) => ({
                          ...current,
                          customVenueEnabled: !current.customVenueEnabled,
                        }))
                      }
                      className="h-9 rounded-md border-slate-300 bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-100"
                    >
                      {plannerForm.customVenueEnabled
                        ? "Tắt địa điểm tay"
                        : "Thêm địa điểm tay"}
                    </Button>
                  </div>

                  {plannerForm.roomMode !== "AUTO" ? (
                    <div className="grid max-h-[320px] grid-cols-1 gap-2 overflow-auto pr-1 lg:grid-cols-2">
                      {visibleRooms.map((room) => {
                        const checked = plannerForm.selectedRoomIds.includes(
                          room.id,
                        );
                        return (
                          <button
                            key={room.id}
                            onClick={() => handleToggleRoom(room.id)}
                            className={cn(
                              "flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors",
                              checked
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100",
                            )}
                          >
                            <div className="text-left">
                              <p className="text-[12px] font-medium">
                                {room.name}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px]",
                                  checked ? "text-slate-300" : "text-slate-500",
                                )}
                              >
                                {room.assignmentCapacity} chỗ dùng •{" "}
                                {getRoomTypeLabel(room.type)}
                              </p>
                            </div>
                            {checked ? (
                              <CheckSquare size={16} />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed border-slate-300 bg-white px-4 py-3 text-[12px] text-slate-500">
                      Chế độ tự động sẽ ưu tiên cụm phòng gợi ý ở ca thi đang chọn
                      và tự bổ sung phòng còn trống nếu cần.
                    </div>
                  )}

                  {plannerForm.customVenueEnabled && (
                    <div className="grid grid-cols-1 gap-3 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-medium text-slate-500">
                          Tên địa điểm thủ công
                        </label>
                        <input
                          value={plannerForm.customVenueName}
                          onChange={(event) =>
                            setPlannerForm((current) => ({
                              ...current,
                              customVenueName: event.target.value,
                            }))
                          }
                          placeholder="Ví dụ: Hội trường A, sân thi thực hành..."
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-500">
                          Sức chứa
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={plannerForm.customVenueCapacity}
                          onChange={(event) =>
                            setPlannerForm((current) => ({
                              ...current,
                              customVenueCapacity: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-slate-500">
                          Loại địa điểm
                        </label>
                        <select
                          value={plannerForm.customVenueType}
                          onChange={(event) =>
                            setPlannerForm((current) => ({
                              ...current,
                              customVenueType: event.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                        >
                          {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[11px] font-medium text-slate-500">
                          Tòa nhà / ghi chú vị trí
                        </label>
                        <input
                          value={plannerForm.customVenueBuilding}
                          onChange={(event) =>
                            setPlannerForm((current) => ({
                              ...current,
                              customVenueBuilding: event.target.value,
                            }))
                          }
                          placeholder="Ví dụ: Nhà A3, khu thể thao..."
                          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-slate-500">
                    Ghi chú điều phối
                  </label>
                  <textarea
                    value={plannerForm.note}
                    onChange={(event) =>
                      setPlannerForm((current) => ({
                        ...current,
                        note: event.target.value,
                      }))
                    }
                    rows={3}
                    placeholder="Ghi chú thêm cho ca thi, cách phân phòng hoặc yêu cầu vận hành..."
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-900 outline-none"
                  />
                </div>

                <Button
                  onClick={handleSchedule}
                  disabled={scheduleLoading}
                  className="h-11 w-full rounded-md bg-slate-900 text-[12px] font-medium text-white hover:bg-slate-800"
                >
                  {scheduleLoading ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <CalendarDays size={16} className="mr-2" />
                  )}
                  {activeShiftPlan
                    ? "Cập nhật ca thi đang chọn"
                    : "Xếp lịch và phân phòng"}
                </Button>
              </div>
            </section>
          )}

          {detail && adjustmentSection === "students" && (
            <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                    Nhóm danh sách sinh viên
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-slate-900">
                    Danh sách sinh viên dự thi
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={studentSortKey}
                    onChange={(event) =>
                      setStudentSortKey(event.target.value as StudentSortKey)
                    }
                    className="h-9 rounded-md border border-slate-200 bg-white px-3 text-[12px] font-medium text-slate-700 outline-none"
                  >
                    <option value="name">Sắp xếp theo tên</option>
                    <option value="code">Sắp xếp theo MSSV</option>
                    <option value="adminClass">Sắp xếp theo lớp HC</option>
                    <option value="process">Sắp xếp theo điểm QT</option>
                  </select>
                  <Button
                    variant={showEligibleOnly ? "default" : "outline"}
                    onClick={() => setShowEligibleOnly((current) => !current)}
                    className="h-9 rounded-md text-[12px] font-medium"
                  >
                    {showEligibleOnly ? "Đang lọc đủ điều kiện" : "Xem tất cả"}
                  </Button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStudentPage((page) => Math.max(1, page - 1))}
                      disabled={studentPage === 1}
                      className="rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="min-w-[72px] text-center text-[12px] font-bold text-slate-600">
                      {studentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setStudentPage((page) => Math.min(totalPages, page + 1))
                      }
                      disabled={studentPage === totalPages}
                      className="rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-b border-slate-100 bg-white px-4 py-3 text-[12px] text-slate-500">
                Đang hiển thị {paginatedStudents.length} / {sortedStudents.length} sinh viên
                {showEligibleOnly ? " đủ điều kiện" : ""}.
              </div>

              <div className="max-h-[620px] overflow-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 border-b border-slate-100 bg-white text-left">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        MSSV
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Họ tên
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Lớp HC
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        QT
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Điều kiện
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        SBD
                      </th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                        Phòng / Ghế
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedStudents.map((student) => {
                      const assignment = assignedByGradeId.get(student.gradeId);
                      const room = assignment
                        ? roomByAssignmentId.get(assignment.roomAssignmentId)
                        : null;
                      return (
                        <tr
                          key={student.gradeId}
                          className="border-b border-slate-100 hover:bg-slate-50"
                        >
                          <td className="px-4 py-3 text-[12px] font-bold">
                            {student.studentCode}
                          </td>
                          <td className="px-4 py-3 text-[12px] font-bold">
                            {student.studentName}
                          </td>
                          <td className="px-4 py-3 text-[12px] font-medium text-slate-600">
                            {student.adminClassCode || "—"}
                          </td>
                          <td className="px-4 py-3 text-[12px] font-bold text-slate-700">
                            {formatScore(student.processScore)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                student.isEligibleForExam
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700",
                              )}
                            >
                              {student.isEligibleForExam ? "Được thi" : "Không đạt"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[12px] font-bold text-slate-700">
                            {assignment?.examSbd || student.examSbd || "—"}
                          </td>
                          <td className="px-4 py-3 text-[11px] font-bold">
                            {room?.roomName || "—"} / {assignment?.seatNumber || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {sortedStudents.length > STUDENT_PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                  <button
                    onClick={() => setStudentPage((page) => Math.max(1, page - 1))}
                    disabled={studentPage === 1}
                    className="rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="min-w-[80px] text-center text-[12px] font-bold text-slate-600">
                    Trang {studentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() =>
                      setStudentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={studentPage === totalPages}
                    className="rounded-md border border-slate-200 p-1.5 transition-colors hover:bg-slate-100 disabled:opacity-30"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </Modal>
    </div>
  );
}
