"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, X, Loader2, Check, Save, Zap, Layers,
  Info, BookOpen, ArrowRightLeft,
  User, CheckCircle2, Plus, Edit3, Trash2, Calendar,
  Copy, Filter, ChevronDown, ArrowUpRight, Clock, Users,
  ClipboardList
} from "lucide-react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { toast, Toaster } from "react-hot-toast";
import SemesterManagerModal from "@/components/SemesterManagerModal";
import CourseDetailModal from "@/components/CourseDetailModal";
import AutoScheduleModal from "@/components/AutoScheduleModal";
import OperationalGuideModal from "@/components/OperationalGuideModal";
import RoadmapSidebar from "@/components/RoadmapSidebar";
import SemesterPlanWorkspace from "./SemesterPlanWorkspace";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const API = (p: string) => `/api${p}`;

const COHORTS = ["K17", "K18", "K19", "K20", "K21", "K22"];
const COHORT_START_YEARS: Record<string, number> = {
  K17: 2023, K18: 2024, K19: 2025, K20: 2026, K21: 2027, K22: 2028,
};
const SEM_LABELS: Record<number, string> = {
  1: "Học kỳ 1", 2: "Học kỳ 2", 3: "Học kỳ 3", 4: "Học kỳ 4",
  5: "Học kỳ 5", 6: "Học kỳ 6", 7: "Học kỳ 7", 8: "Học kỳ 8",
};

async function safeFetch(res: Response): Promise<any> {
  if (!res.ok) return null;
  try { return await res.json(); } catch { return null; }
}

function cohortYears(cohort: string): Set<number> {
  const start = COHORT_START_YEARS[cohort];
  if (!start) return new Set();
  const yrs = new Set<number>();
  for (let i = 0; i <= 4; i++) yrs.add(start + i);
  return yrs;
}

export default function StaffSemesterPlanPage() {
  return <SemesterPlanWorkspace />;

  const router = useRouter();
  const TOKEN = Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");
  const headers = useMemo(() => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${TOKEN}`,
  }), [TOKEN]);

  /* ── base state ──────────────────────────────────────── */
  const [realSemesters, setRealSemesters] = useState<any[]>([]);
  const [faculties, setFaculties] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [autoScheduleAfterApply, setAutoScheduleAfterApply] = useState(true);
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("LIST");

  /* ── selections ──────────────────────────────────────── */
  const [selectedRealSem, setSelectedRealSem] = useState("");
  const [selectedFacultyId, setSelectedFacultyId] = useState("");
  const [selectedMajorId, setSelectedMajorId] = useState("");
  const [cohort, setCohort] = useState("K18");
  const [activeBpSem, setActiveBpSem] = useState(1);
  const [search, setSearch] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"blueprint" | "plan">("blueprint");
  const [workflowStep, setWorkflowStep] = useState<"BLUEPRINT" | "COORDINATION" | "OPERATION">("BLUEPRINT");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);
  const [allLecturers, setAllLecturers] = useState<any[]>([]);

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [targetCohorts, setTargetCohorts] = useState<string[]>([]);
  const [duplicating, setDuplicating] = useState(false);

  const [blueprint, setBlueprint] = useState<Record<number, any[]>>({});

  const [semModal, setSemModal] = useState(false);
  const [detailModal, setDetailModal] = useState(false);
  const [autoScheduleModal, setAutoScheduleModal] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const toggleItem = (id: string) => {
    setExpandedItems(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const [classSearch, setClassSearch] = useState("");
  const [guideModal, setGuideModal] = useState(false);

  const handleSidebarSemesterChange = (semId: string, c: string, semIndex: number) => {
    setCohort(c);
    setSelectedRealSem(semId);
    setActiveBpSem(semIndex);
    if (activeTab !== "plan") setActiveTab("plan");
  };

  const subjectTree = useMemo(() => {
    if (!classes.length || !selectedRealSem) return [];
    
    const semClasses = classes.filter(c => c.semesterId === selectedRealSem);
    const subGroups: Record<string, any> = {};
    
    semClasses.forEach(cls => {
      const subId = cls.subjectId;
      if (!subGroups[subId]) {
        subGroups[subId] = {
          subject: cls.subject,
          classes: []
        };
      }
      subGroups[subId].classes.push(cls);
    });

    return Object.values(subGroups);
  }, [classes, selectedRealSem]);

  const formatSession = (s: any) => {
    if (!s) return null;
    const dayNames = ["CN", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    const d = new Date(s.date);
    return {
        day: dayNames[d.getDay()],
        time: `Tiết ${s.startShift}-${s.endShift}`,
        room: s.room?.name || "???"
    };
  };

  // toggleItem is already defined above
  const handleUpdateFactors = async (classId: string, spw: number, pps: number) => {
    try {
      const res = await fetch(API(`/semester-plan/update-class-factors`), {
        method: "POST",
        headers,
        body: JSON.stringify({ classId, sessionsPerWeek: spw, periodsPerSession: pps })
      });
      if (res.ok) {
        toast.success("Cấu hình lớp thành công");
        fetchClasses();
      }
    } catch (err) {
      toast.error("Lỗi khi cập nhật cấu hình");
    }
  };

  const calculateProgress = (cls: any) => {
    const spw = cls.sessionsPerWeek || 1;
    const pps = cls.periodsPerSession || 3;
    const configured = spw * pps * 15; // Assume 15 weeks
    const required = cls.totalPeriods || (cls.subject?.credits * 15) || 45;
    
    let percentage = (configured / required) * 100;
    let color = "bg-emerald-500";
    let statusText = "Khớp";

    if (percentage < 100) {
        color = "bg-rose-500";
        statusText = "Thiếu tiết";
    }
    if (percentage > 100) {
        color = "bg-amber-500";
        statusText = "Thừa tiết";
    }
    
    return { percentage: Math.min(percentage, 100), color, total: configured, required, statusText };
  };

  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [editingCourse, setEditingCourse] = useState<any>(null);

  const handleDeleteClass = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa lớp học phần này? Tất cả các buổi học và đăng ký liên quan sẽ bị xóa.")) return;
    try {
      const res = await fetch(API(`/courses/${id}`), { method: "DELETE", headers });
      if (res.ok) {
        toast.success("Đã xóa lớp học phần!");
        fetchClasses();
        setDetailModal(false);
      } else {
        const data = await safeFetch(res);
        toast.error(data?.message || "Lỗi khi xóa lớp.");
      }
    } catch { toast.error("Lỗi kết nối."); }
  };

  /* ── init data ───────────────────────────────────────── */
  useEffect(() => { fetchBase(); }, []);

  const fetchBase = async () => {
    setLoading(true);
    try {
      const [semRes, facRes, majRes, subRes, lectRes] = await Promise.all([
        fetch(API("/semesters"), { headers }),
        fetch(API("/faculties"), { headers }),
        fetch(API("/majors"), { headers }),
        fetch(API("/subjects"), { headers }),
        fetch(API("/lecturers"), { headers }),
      ]);

      const semData = await safeFetch(semRes) ?? [];
      const facData = await safeFetch(facRes) ?? [];
      const majData = await safeFetch(majRes) ?? [];
      const subData = await safeFetch(subRes) ?? [];
      const lectData = await safeFetch(lectRes) ?? [];

      setRealSemesters(Array.isArray(semData) ? semData : []);
      setFaculties(Array.isArray(facData) ? facData : []);
      setMajors(Array.isArray(majData) ? majData : []);
      setAllSubjects(Array.isArray(subData) ? subData : []);
      setAllLecturers(Array.isArray(lectData) ? lectData : []);

      const curSem = semData.find?.((s: any) => s.isCurrent) ?? semData[0];
      if (curSem) setSelectedRealSem(curSem.id);
      if (majData.length > 0) setSelectedMajorId(majData[0].id);
    } catch (err) {
      console.error("fetchBase error:", err);
      toast.error("Lỗi tải dữ liệu ban đầu.");
    } finally {
      setLoading(false);
    }
  };

  const cohortFilteredSems = useMemo(() => {
    const startYr = COHORT_START_YEARS[cohort] || 2024;
    // Filter all semesters starting from the cohort's admission year
    return realSemesters
      .filter(s => s.year >= startYr)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [realSemesters, cohort]);

  const groupedSems = useMemo(() => {
    const map = new Map<string, any[]>();
    cohortFilteredSems.forEach(s => {
      const match = s.name?.match(/\((\d{4}-\d{4})\)/);
      const groupKey = match ? `Năm học ${match[1]}` : `Năm ${s.year}`;
      if (!map.has(groupKey)) map.set(groupKey, []);
      map.get(groupKey)!.push(s);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [cohortFilteredSems]);

  useEffect(() => {
    if (cohortFilteredSems.length > 0) {
      const curSem = cohortFilteredSems.find(s => s.isCurrent) ?? cohortFilteredSems[0];
      setSelectedRealSem(curSem.id);
    } else {
      setSelectedRealSem("");
    }
  }, [cohort, cohortFilteredSems]);

  const filteredMajors = useMemo(() => {
    if (!selectedFacultyId) return majors;
    return majors.filter(m => m.facultyId === selectedFacultyId || m.faculty?.id === selectedFacultyId);
  }, [majors, selectedFacultyId]);

  useEffect(() => {
    if (filteredMajors.length > 0 && !filteredMajors.some(m => m.id === selectedMajorId)) {
      setSelectedMajorId(filteredMajors[0].id);
    }
  }, [filteredMajors]);

  const loadBlueprint = useCallback(async (majorId: string, c: string) => {
    const empty: Record<number, any[]> = {};
    for (let i = 1; i <= 8; i++) empty[i] = [];
    try {
      const res = await fetch(API(`/semester-plan/blueprint?majorId=${majorId}&cohort=${c}`), { headers });
      const data = await safeFetch(res);
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          const s = item.suggestedSemester;
          if (s >= 1 && s <= 8 && item.subject) empty[s].push(item.subject);
        });
      }
    } catch (err) { console.warn("loadBlueprint error:", err); }
    setBlueprint(empty);
  }, [headers]);

  useEffect(() => {
    if (selectedMajorId) loadBlueprint(selectedMajorId, cohort);
  }, [selectedMajorId, cohort, loadBlueprint]);

  const fetchClasses = useCallback(async (background = false) => {
    if (!selectedMajorId || !cohort) return;
    try {
      if (!background) setLoading(true);
      const res = await fetch(API(`/semester-plan/classes-by-cohort?majorId=${selectedMajorId}&cohort=${cohort}`), { headers });
      const data = await safeFetch(res);
      setClasses(Array.isArray(data) ? data : []);
    } catch { 
      toast.error("Lỗi tải lộ trình học tập."); 
    } finally {
      if (!background) setLoading(false);
    }
  }, [selectedMajorId, cohort, headers]);

  useEffect(() => { 
    if (activeTab === "plan") fetchClasses(); 
  }, [selectedMajorId, cohort, activeTab, fetchClasses]);

  const currentSemSubs = blueprint[activeBpSem] || [];
  const semCredits = (n: number) => (blueprint[n] || []).reduce((a, s) => a + (s.credits || 0), 0);
  const totalCredits = useMemo(() => Object.values(blueprint).flat().reduce((a, s) => a + (s.credits || 0), 0), [blueprint]);

  const otherSemOf = useCallback((subId: string): string | null => {
    for (const [k, v] of Object.entries(blueprint)) {
      if (parseInt(k) !== activeBpSem && (v as any[]).some((s: any) => s.id === subId))
        return SEM_LABELS[parseInt(k)];
    }
    return null;
  }, [blueprint, activeBpSem]);

  const toggleSub = useCallback((sub: any) => {
    const cur = blueprint[activeBpSem] || [];
    const here = cur.some((s: any) => s.id === sub.id);
    const other = otherSemOf(sub.id);
    if (other && !here) { toast.error(`"${sub.name}" đã xếp ở ${other}.`); return; }
    setBlueprint(prev => ({
      ...prev,
      [activeBpSem]: here ? cur.filter((s: any) => s.id !== sub.id) : [...cur, sub],
    }));
  }, [blueprint, activeBpSem, otherSemOf]);

  const handleSave = async () => {
    if (!selectedMajorId || !cohort) return;
    setSaving(true);
    try {
      const items: any[] = [];
      Object.entries(blueprint).forEach(([sem, subs]) =>
        (subs as any[]).forEach(s => items.push({ subjectId: s.id, suggestedSemester: parseInt(sem) }))
      );
      
      // 1. SAVE BLUEPRINT (Conceptual Plan)
      const res = await fetch(API("/semester-plan/blueprint"), {
        method: "POST", headers,
        body: JSON.stringify({ majorId: selectedMajorId, cohort, items }),
      });
      
      if (!res.ok) {
        const e = await safeFetch(res);
        toast.error(e?.message || "Lỗi khi lưu kế hoạch.");
        return;
      }

      // 2. BULK SYNC ALL 8 SEMESTERS (Sync-All Workflow)
      toast.loading("Đang đồng bộ lộ trình toàn khóa...", { id: "sync-all" });
      let syncSuccess = 0, syncTotal = 0;

      for (let conceptualSem = 1; conceptualSem <= 8; conceptualSem++) {
        const subjectIds = (blueprint[conceptualSem] || []).map((s: any) => s.id);
        if (subjectIds.length === 0) continue;

        const realSem = cohortFilteredSems[conceptualSem - 1];
        if (!realSem) continue;

        syncTotal++;
        const applyRes = await fetch(API("/semester-plan/apply"), {
          method: "POST", headers,
          body: JSON.stringify({ 
            semesterId: realSem.id, 
            majorId: selectedMajorId, 
            cohort, 
            subjectIds 
          }),
        });
        if (applyRes.ok) syncSuccess++;
      }

      if (syncTotal > 0) {
        if (syncSuccess === syncTotal) {
          toast.success((t) => (
            <div className="flex flex-col gap-2">
              <span className="font-bold text-emerald-700 uppercase tracking-widest text-[10px]">Đồng bộ Blueprint Thành công</span>
              <p className="text-xs text-slate-600 font-bold">✓ Đã khởi tạo {syncSuccess} học kỳ thực thi.</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { toast.dismiss(t.id); router.push(`/staff/courses?semesterId=${selectedRealSem}&cohort=${cohort}`); }}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-100"
                >
                  Đến Quản lý học phần
                </button>
                <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">Đóng</button>
              </div>
            </div>
          ), { id: "sync-all", duration: 8000 });
        } else {
          toast.error(`Hoàn tất với lỗi: Đồng bộ ${syncSuccess}/${syncTotal} học kỳ thành công.`, { id: "sync-all" });
        }
      } else {
        toast.success(`Đã lưu ${items.length} môn mẫu cho ${cohort}`, { id: "sync-all" });
      }

      // 3. Optional Auto Schedule
      if (autoScheduleAfterApply && syncSuccess > 0 && selectedRealSem) {
        toast.loading("Đang tự động xếp lịch thông minh...", { id: "auto-sched" });
        await fetch(API(`/semester-plan/schedule/${selectedRealSem}`), {
          method: "POST", headers,
          body: JSON.stringify({ periodsPerSession: 3, sessionsPerWeek: 1 })
        });
        toast.success("Đã hoàn tất xếp lịch thông minh cho các lớp mới!", { id: "auto-sched" });
      }

      fetchClasses(true); // REFRESH DATA
      setWorkflowStep("COORDINATION");
    } catch (err) { 
      console.error("Bulk Sync Error:", err);
      toast.error("Lỗi kết nối trong quá trình đồng bộ."); 
    } finally { 
      setSaving(false); 
    }
  };

  const handleCommitPlan = async () => {
    if (!confirm("Xác nhận chốt dữ liệu và kích hoạt vận hành cho toàn bộ lớp học phần này?\nSinh viên có thể đăng ký và Giảng viên bắt đầu nhập điểm/điểm danh.")) return;
    
    setIsCommitting(true);
    try {
      const res = await fetch(API(`/semester-plan/schedule/${selectedRealSem}`), {
        method: "POST",
        headers,
        body: JSON.stringify({ 
            periodsPerSession: 3, 
            sessionsPerWeek: 1,
            commit: true 
        })
      });

      if (res.ok) {
        toast.success("Hệ thống đã được kích hoạt vận hành!");
        setWorkflowStep("OPERATION");
        fetchClasses(true);
      } else {
        const data = await safeFetch(res);
        toast.error(data?.message || "Không thể chốt dữ liệu.");
      }
    } catch {
      toast.error("Lỗi kết nối khi chốt dữ liệu.");
    } finally {
      setIsCommitting(false);
    }
  };

  const handleUpdateLecturer = async (classId: string, lecturerId: string) => {
    try {
      const res = await fetch(API(`/courses/${classId}`), {
        method: "PATCH",
        headers,
        body: JSON.stringify({ lecturerId })
      });
      if (res.ok) {
        toast.success("Cập nhật giảng viên thành công");
        fetchClasses(true);
      }
    } catch {
      toast.error("Lỗi cập nhật giảng viên");
    }
  };

  const handleDuplicate = async () => {
    if (!selectedMajorId || targetCohorts.length === 0) {
      toast.error("Vui lòng chọn khóa đích.");
      return;
    }
    setDuplicating(true);
    try {
      const res = await fetch(API("/semester-plan/blueprint/duplicate"), {
        method: "POST", headers,
        body: JSON.stringify({ majorId: selectedMajorId, sourceCohort: cohort, targetCohorts }),
      });
      if (res.ok) {
        toast.success(`Đã sao chép kế hoạch sang ${targetCohorts.length} khóa.`);
        setIsCopyModalOpen(false);
        setTargetCohorts([]);
      } else {
        const e = await safeFetch(res);
        toast.error(e?.message || "Lỗi khi sao chép.");
      }
    } catch { toast.error("Lỗi kết nối."); }
    finally { setDuplicating(false); }
  };

  const handleApply = async () => {
    if (!confirm("Hệ thống sẽ dựa trên Kế hoạch khung để tự động: tạo lớp học phần, gán giảng viên và đăng kí sinh viên hàng loạt cho học kỳ này. Tiếp tục?")) return;
    if (!selectedRealSem || !selectedMajorId) { toast.error("Chọn học kỳ triển khai trước."); return; }
    const subjectIds = currentSemSubs.map((s: any) => s.id);
    if (!subjectIds.length) { toast.error(`${SEM_LABELS[activeBpSem]} chưa có môn học nào.`); return; }
    setApplying(true);
    try {
      const items: any[] = [];
      Object.entries(blueprint).forEach(([sem, subs]) =>
        (subs as any[]).forEach(s => items.push({ subjectId: s.id, suggestedSemester: parseInt(sem) }))
      );
      await fetch(API("/semester-plan/blueprint"), {
        method: "POST", headers,
        body: JSON.stringify({ majorId: selectedMajorId, cohort, items }),
      });
      const res = await fetch(API("/semester-plan/apply"), {
        method: "POST", headers,
        body: JSON.stringify({ semesterId: selectedRealSem, majorId: selectedMajorId, cohort, subjectIds }),
      });
      const data = await safeFetch(res);
      if (res.ok) {
        toast.success((t) => (
          <div className="flex flex-col gap-2">
            <span className="font-bold text-emerald-700 uppercase tracking-widest text-[10px]">Đồng bộ Blueprint Thành công</span>
            <p className="text-xs text-slate-600 font-bold">✓ Hiện có {data.created || 0} lớp học phần đang hoạt động.</p>
            <p className="text-[10px] text-slate-400 font-bold italic">Hệ thống đã tự động gán sinh viên và đề xuất giảng viên.</p>
            <div className="flex gap-2">
              <button 
                onClick={() => { toast.dismiss(t.id); router.push(`/staff/courses?semesterId=${selectedRealSem}&cohort=${cohort}`); }}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg shadow-indigo-100"
              >
                Cấu hình lịch học
              </button>
              <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase">Đóng</button>
            </div>
          </div>
        ), { duration: 8000 });
        
        // AUTO SCHEDULE
        if (autoScheduleAfterApply) {
          toast.loading("Đang tự động xếp lịch cho các lớp vừa tạo...", { id: "auto-sched" });
          await fetch(API(`/semester-plan/schedule/${selectedRealSem}`), {
            method: "POST", headers,
            body: JSON.stringify({ periodsPerSession: 3, sessionsPerWeek: 1 })
          });
          toast.success("Đã hoàn tất xếp lịch thông minh!", { id: "auto-sched" });
        }

        await fetchClasses(true); // BACKGROUND REFRESH
      } else {
        // Detailed error toast
        const errorMsg = data?.message || data?.error || "Lỗi máy chủ khi chuyển đổi Blueprint";
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch (err: any) { 
        console.error("Apply Blueprint Error:", err);
        toast.error("Lỗi kết nối: Không thể liên lạc với máy chủ đào tạo."); 
    }
    finally { setApplying(false); }
  };

  const handleAutoScheduleConfirm = async (config: { periodsPerSession: number; sessionsPerWeek: number }) => {
    if (!selectedRealSem) {
      toast.error("Vui lòng chọn học kỳ thực tế trước.");
      return;
    }
    setScheduling(true);
    try {
      const res = await fetch(API(`/semester-plan/schedule/${selectedRealSem}`), {
        method: "POST",
        headers,
        body: JSON.stringify(config),
      });
      const data = await safeFetch(res);
      if (!res.ok) {
        const msg = data?.message || "Thuật toán xếp lịch gặp lỗi logic.";
        toast.error(msg, { duration: 6000 });
        throw new Error(msg);
      }
      
      toast.success("Đã tự động xếp lịch thành công!");
      setAutoScheduleModal(false);
      fetchClasses();
    } catch (err: any) {
      console.error("Scedule Error:", err);
      setTimeout(() => fetchClasses(), 500);
    } finally {
      setScheduling(false);
    }
  };

  const filteredSubs = useMemo(() => {
    let list = allSubjects;
    if (selectedMajorId) {
      list = list.filter(s => s.majorId === selectedMajorId || s.major?.id === selectedMajorId);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }
    return list;
  }, [allSubjects, selectedMajorId, search]);

  const filteredClasses = useMemo(() => {
    let list = classes;
    if (selectedSubjectId) {
      list = list.filter(c => c.subjectId === selectedSubjectId || c.subject?.id === selectedSubjectId);
    }
    if (selectedMajorId) {
      list = list.filter(c => {
        const classMajorId = c.subject?.majorId || c.majorId;
        const matchesMajor = classMajorId === selectedMajorId;
        const matchesCohort = c.cohort === cohort || c.adminClasses?.some((ac: any) => ac.cohort === cohort);
        return matchesMajor && matchesCohort;
      });
    } else {
      list = list.filter(c => c.cohort === cohort || c.adminClasses?.some((ac: any) => ac.cohort === cohort));
    }
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      list = list.filter(c => 
        c.code?.toLowerCase().includes(q) || 
        c.name?.toLowerCase().includes(q) || 
        c.subject?.name?.toLowerCase().includes(q) ||
        c.lecturer?.fullName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [classes, selectedMajorId, cohort, selectedSubjectId, globalSearch]);
  
  const totalEnrolled = useMemo(() => {
    return filteredClasses.reduce((acc, cls) => acc + (cls._count?.enrollments || 0), 0);
  }, [filteredClasses]);

  const activeSemName = realSemesters.find(s => s.id === selectedRealSem)?.name || "—";

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl animate-bounce">
          <Layers size={26} className="text-white" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Toaster position="top-right" toastOptions={{ duration: 3500 }} />

      {/* ══ TOP BAR ══ */}
      <div className="bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-none">Kế hoạch Đào tạo</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Lộ trình & triển khai học kỳ</p>
            </div>
          </div>
          <div className="w-px h-7 bg-slate-100 hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Khóa</span>
            <select value={cohort} onChange={e => setCohort(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200">
              {COHORTS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="w-px h-7 bg-slate-100 hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Khoa</span>
            <select value={selectedFacultyId} onChange={e => setSelectedFacultyId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 max-w-[160px]">
              <option value="">Tất cả Khoa</option>
              {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Ngành</span>
            <select value={selectedMajorId} onChange={e => setSelectedMajorId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 max-w-[200px]">
              {filteredMajors.length === 0
                ? <option value="">Chưa có ngành</option>
                : filteredMajors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
              }
            </select>
          </div>
          <div className="w-px h-7 bg-slate-100 hidden lg:block" />
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 ring-indigo-200 transition-all">
            <Search size={14} className="text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm mọi thứ..." 
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              className="bg-transparent outline-none text-xs font-bold text-slate-700 placeholder:text-slate-300 w-40"
            />
            {globalSearch && <button onClick={() => setGlobalSearch("")}><X size={12} className="text-slate-400" /></button>}
          </div>
          <div className="w-px h-7 bg-slate-100 hidden lg:block" />
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">HK triển khai</span>
            <div className="relative">
              <select value={selectedRealSem} onChange={e => setSelectedRealSem(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 max-w-[240px] appearance-none pr-8">
                {cohortFilteredSems.length === 0 ? (
                  <option value="">Chưa có HK cho {cohort}</option>
                ) : groupedSems.map(([groupLabel, items]) => (
                  <optgroup key={groupLabel} label={`── ${groupLabel} ──`}>
                    {items.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.isCurrent ? " ✓" : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <div className="w-px h-7 bg-slate-100 hidden lg:block" />
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                  onClick={() => setGuideModal(true)}>
            <BookOpen size={14} /> Hướng dẫn
          </button>
          <div className="flex-1" />
          <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
            <button onClick={() => setWorkflowStep("BLUEPRINT")}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${workflowStep === "BLUEPRINT" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Kế hoạch khung
            </button>
            <button onClick={() => { setWorkflowStep("COORDINATION"); fetchClasses(); }}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${workflowStep === "COORDINATION" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Trạm Điều phối
            </button>
            <button onClick={() => { setWorkflowStep("OPERATION"); fetchClasses(); }}
              className={`px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${workflowStep === "OPERATION" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Vận hành
            </button>
          </div>
        </div>
        <div className="px-5 pb-2 flex items-center gap-2 text-[10px] text-slate-400 font-bold">
          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-black">{cohort}</span>
          {selectedFacultyId && <><span className="text-slate-300">·</span><span>{faculties.find(f => f.id === selectedFacultyId)?.name}</span></>}
          {selectedMajorId && <><span className="text-slate-300">·</span><span>{majors.find(m => m.id === selectedMajorId)?.name}</span></>}
          {selectedRealSem && <><span className="text-slate-300">·</span><span className="text-indigo-600 font-black">{activeSemName}</span></>}
          <span className="ml-auto text-[9px] text-slate-300">{cohortFilteredSems.length} HK có sẵn cho {cohort}</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {workflowStep !== "BLUEPRINT" ? (
          <RoadmapSidebar 
            majors={majors}
            selectedMajorId={selectedMajorId}
            onMajorChange={setSelectedMajorId}
            cohorts={COHORTS}
            selectedCohort={cohort}
            onCohortChange={setCohort}
            semesters={cohortFilteredSems}
            selectedSemesterId={selectedRealSem}
            onSemesterChange={handleSidebarSemesterChange}
          />
        ) : (
          /* SHARED LEFT SIDEBAR FOR BLUEPRINT */
          <div className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto scrollbar-hide">
            <div className="p-5 space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] block mb-2">Thông tin học kỳ</label>
                <select value={activeBpSem}
                  onChange={e => { setActiveBpSem(parseInt(e.target.value)); setSearch(""); }}
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-400 transition-all">
                  {[1,2,3,4,5,6,7,8].map(n => {
                    const cnt = (blueprint[n]||[]).length, cr = semCredits(n);
                    return (
                      <option key={n} value={n}>
                        {SEM_LABELS[n]}{cnt > 0 ? ` · ${cnt} môn (${cr} TC)` : " · chưa có môn"}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex items-center justify-between px-3 py-2.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-700">{SEM_LABELS[activeBpSem]}</span>
                  <span className="text-[9px] font-bold text-slate-400">{cohort}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-indigo-600">{currentSemSubs.length} môn</span>
                  <span className="text-xs font-black text-slate-500">{semCredits(activeBpSem)} TC</span>
                </div>
              </div>

              <div>
                  <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Môn học phần</p>
                  {activeTab === "blueprint" && currentSemSubs.length > 0 && (
                      <button onClick={() => setBlueprint(prev => ({ ...prev, [activeBpSem]: [] }))}
                          className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase transition-colors">Xóa hết</button>
                  )}
                  </div>
                  {currentSemSubs.length > 0 ? (
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {currentSemSubs.map((s: any) => {
                      const isActiveDetail = selectedSubjectId === s.id;
                      return (
                      <div key={s.id} 
                           onClick={() => {
                              setSelectedSubjectId(isActiveDetail ? null : s.id);
                              setActiveTab("plan");
                           }}
                           className={`flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all cursor-pointer group ${isActiveDetail ? "bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-100" : "bg-indigo-50 border-indigo-100 hover:border-indigo-300"}`}>
                          <div className="flex-1 min-w-0">
                              <p className={`text-[11px] font-bold truncate leading-tight flex items-center gap-1 ${isActiveDetail ? "text-white" : "text-indigo-800"}`}>
                                {s.name} <ArrowUpRight size={10} className={isActiveDetail ? "text-indigo-200" : "text-indigo-400"} />
                              </p>
                              <p className={`text-[9px] font-black uppercase mt-0.5 ${isActiveDetail ? "text-indigo-200" : "text-indigo-400"}`}>{s.code} · {s.credits} TC</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); toggleSub(s); }}
                              className={`ml-2 w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 ${isActiveDetail ? "bg-indigo-500 text-white hover:bg-white hover:text-rose-500" : "bg-indigo-100 text-indigo-400 hover:bg-rose-100 hover:text-rose-500"}`}>
                              <X size={9} />
                          </button>
                      </div>
                      );
                  })}
                  </div>
                  ) : (
                  <div className="border-2 border-dashed border-slate-200 rounded-2xl p-5 text-center">
                      <BookOpen size={26} className="text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-bold text-slate-400">Chưa chọn môn</p>
                  </div>
                  )}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tiến độ kế hoạch {cohort}</p>
                <div className="space-y-1">
                  {[1,2,3,4,5,6,7,8].map(n => {
                      const cnt = (blueprint[n]||[]).length, cr = semCredits(n);
                      const isActive = activeBpSem === n;
                      return (
                          <button key={`bp-sum-${n}`} 
                              onClick={() => { 
                                  setActiveBpSem(n); 
                                  setSearch(""); 
                                  const targetRealSem = cohortFilteredSems[n-1];
                                  if (targetRealSem) setSelectedRealSem(targetRealSem.id);
                              }}
                              className={`w-full flex justify-between items-center py-2 px-3 rounded-xl text-[10px] transition-all text-left group ${isActive ? "bg-indigo-600 shadow-lg shadow-indigo-100" : "hover:bg-slate-100"}`}>
                              <span className={isActive ? "font-black text-white" : "font-bold text-slate-500 group-hover:text-indigo-600"}>{SEM_LABELS[n]}</span>
                              {cnt > 0 ? (
                                  <span className={`flex items-center gap-1.5 ${isActive ? "text-indigo-100 font-bold" : "text-slate-400 font-bold"}`}>
                                      {cnt} <span className="opacity-40">·</span> {cr}TC
                                  </span>
                              ) : (
                                  <span className="text-slate-300 group-hover:text-slate-400">—</span>
                              )}
                          </button>
                      );
                  })}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between px-2">
                  <span className="text-[9px] font-black text-slate-400">Toàn khóa</span>
                  <span className={`text-sm font-black ${totalCredits >= 120 ? "text-emerald-600" : "text-amber-500"}`}>{totalCredits} / 145 TC</span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest leading-none">Smart Mode</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Tự động xếp lịch</p>
                  </div>
                  <button 
                    onClick={() => setAutoScheduleAfterApply(!autoScheduleAfterApply)}
                    className={cn(
                      "w-10 h-5 rounded-full transition-all relative",
                      autoScheduleAfterApply ? "bg-indigo-600" : "bg-slate-200"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                      autoScheduleAfterApply ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>
                {autoScheduleAfterApply && (
                  <p className="text-[8px] font-bold text-indigo-600 bg-indigo-50 p-2 rounded-lg leading-relaxed">
                    Hệ thống sẽ tự động gán giảng viên và phòng học ngay sau khi bạn đồng bộ kế hoạch.
                  </p>
                )}
              </div>

              <div className="space-y-2 pb-6">
                <button onClick={handleSave} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                  {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />} Lưu kế hoạch
                </button>
                {activeTab === "blueprint" && (
                  <button onClick={() => setIsCopyModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border-2 border-indigo-100 text-indigo-600 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-indigo-50 transition-all">
                      <ArrowRightLeft size={14} /> Sao chép kế hoạch
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {activeTab === "blueprint" ? (
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                    <input type="text" placeholder={`Tìm môn học cho ${SEM_LABELS[activeBpSem]}...`}
                      value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200 placeholder:text-slate-400 transition-all" />
                    {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-all"><X size={10} /></button>}
                  </div>
                  <span className="text-xs font-bold text-slate-400 whitespace-nowrap">{filteredSubs.length} môn</span>
                  <button onClick={() => {
                    const toAdd = filteredSubs.filter(s => !Object.entries(blueprint).some(([k, v]) => parseInt(k) !== activeBpSem && (v as any[]).some((x: any) => x.id === s.id)));
                    setBlueprint(prev => ({ ...prev, [activeBpSem]: toAdd }));
                  }} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider whitespace-nowrap transition-colors">Chọn tất cả</button>
                  <button onClick={() => setBlueprint(prev => ({ ...prev, [activeBpSem]: [] }))} className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider whitespace-nowrap transition-colors">Bỏ chọn</button>
                </div>

                <div className="flex-1 overflow-y-auto p-0 bg-slate-50/30 scrollbar-hide">
                  <div className="divide-y divide-slate-100 max-w-5xl mx-auto bg-white shadow-sm border-x border-slate-100">
                    {filteredSubs.map((s: any) => {
                        const sel = currentSemSubs.some((x: any) => x.id === s.id);
                        const otherSem = otherSemOf(s.id);
                        const blocked = !!otherSem && !sel;
                        return (
                        <div key={s.id} onClick={() => !blocked && toggleSub(s)}
                            className={cn(
                                "flex items-center gap-4 px-6 py-4 transition-all group cursor-pointer",
                                sel ? "bg-indigo-50/50" : blocked ? "opacity-40 grayscale" : "hover:bg-slate-50"
                            )}>
                            <div className={cn(
                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0",
                                sel ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 group-hover:border-indigo-300"
                            )}>
                                {sel && <Check size={14} strokeWidth={3} />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={cn(
                                        "text-xs font-black uppercase tracking-widest",
                                        sel ? "text-indigo-600" : "text-slate-400"
                                    )}>{s.code}</span>
                                    {blocked && (
                                        <span className="px-2 py-0.5 bg-amber-100/50 text-amber-700 text-[9px] font-black rounded-md flex items-center gap-1 uppercase tracking-wider">
                                            <Info size={10} /> Đã thuộc {otherSem}
                                        </span>
                                    )}
                                </div>
                                <h3 className={cn(
                                    "text-sm font-bold truncate transition-colors",
                                    sel ? "text-slate-900" : "text-slate-700"
                                )}>{s.name}</h3>
                            </div>

                            <div className="flex items-center gap-6 shrink-0">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-800">{s.credits} TC</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">Tín chỉ</span>
                                </div>
                                <div className="w-px h-6 bg-slate-100" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); router.push(`/staff/courses?subjectId=${s.id}`); }}
                                    className="p-2.5 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-100 transition-all">
                                    <ArrowUpRight size={18} />
                                </button>
                            </div>
                        </div>
                        );
                    })}
                  </div>
                </div>
                    </div>
                ) : (
            <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
                {/* ── WORKFLOW: COORDINATION & OPERATION STATION ── */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-slate-50/20">
                    {workflowStep === "COORDINATION" && (
                        <div className="max-w-7xl mx-auto space-y-6">
                            {/* Header Stats */}
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Môn học khả dụng</p>
                                    <p className="text-xl font-black text-slate-800">{currentSemSubs.length}</p>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lớp đã gán (Draft)</p>
                                    <p className="text-xl font-black text-indigo-600">{classes.filter(c => c.status === 'PLANNING').length}</p>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tổng tín chỉ</p>
                                    <p className="text-xl font-black text-slate-800">{semCredits(activeBpSem)} TC</p>
                                </div>
                                <div className="bg-white p-5 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                                       <Zap size={60} className="text-emerald-600" />
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tiến độ thiết lập</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500" style={{ width: `${(classes.filter(c => c.status === 'PLANNING').length / (currentSemSubs.length || 1)) * 50}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-slate-400">50%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions & Coordination Table */}
                            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden min-h-[500px]">
                                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                                            <Zap size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Trạm Điều phối (EMS Station)</h3>
                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-tighter italic">Hiệu chỉnh tham số trước khi Chốt vận hành</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={handleApply}
                                            disabled={applying}
                                            className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-black text-[11px] uppercase tracking-wider hover:bg-slate-200 transition-all flex items-center gap-2"
                                        >
                                            <Layers size={14} /> {applying ? "Đang xử lý..." : "Khởi tạo nhanh (Mapping)"}
                                        </button>
                                        <button 
                                            onClick={() => handleCommitPlan()}
                                            disabled={isCommitting}
                                            className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-100 animate-in zoom-in-95 duration-500 transition-all flex items-center gap-2"
                                        >
                                            <Zap size={14} className="fill-current" /> {isCommitting ? "Đang kích hoạt..." : "Xếp lịch & Chốt (Zap)"}
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 bg-slate-900 text-white flex items-center justify-between px-8 border-b border-slate-800">
                                   <div className="flex items-center gap-3">
                                        <Info size={14} className="text-indigo-400" />
                                        <p className="text-[10px] font-bold uppercase tracking-tight">Cơ chế Tự động có kiểm soát: Bạn có thể sửa trực tiếp Giảng viên và Tần suất trước khi nhấn nút "Zap"</p>
                                   </div>
                                   <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{filteredClasses.filter(c => c.status === 'PLANNING').length} Lớp chờ duyệt</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Users size={12} className="text-indigo-400" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300">{totalEnrolled} Sinh viên dự kiến</span>
                                        </div>
                                   </div>
                                </div>

                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50">
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Học phần / Lớp</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-28">Sĩ số</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảng viên / Khoa</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-48 text-center">Buổi/Tuần ─ Tiết/Buổi</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-32 text-center">Trạng thái</th>
                                            <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {classes.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-32 text-center">
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <Search size={48} className="mb-4" />
                                                        <p className="text-sm font-bold">Chưa có lớp nào được gán cho {cohort}</p>
                                                        <p className="text-[10px] font-black uppercase mt-2">Nhấn "Khởi tạo nhanh" để ánh xạ lớp danh nghĩa vào môn học</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : classes.filter(c => c.status === 'PLANNING').length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-20 text-center">
                                                    <div className="flex flex-col items-center opacity-30">
                                                        <CheckCircle2 size={40} className="mb-4 text-emerald-500" />
                                                        <p className="text-sm font-bold">Mọi lớp đã được phê duyệt</p>
                                                        <p className="text-[10px] font-black uppercase mt-2">Chuyển sang tab "Vận hành" để xem lịch học</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : classes.filter(c => c.status === 'PLANNING').map((cls) => (
                                            <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <p className="text-[12px] font-black text-slate-800 uppercase tracking-tighter">{cls.name}</p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                                        <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">{cls.code}</span>
                                                        <div className="w-px h-3 bg-slate-200 mx-0.5" />
                                                        {cls.adminClasses?.map((ac: any) => (
                                                            <span key={ac.id} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase">
                                                                {ac.code}
                                                            </span>
                                                        ))}
                                                        <span className="text-[10px] font-bold text-slate-300 ml-1">TC: {cls.subject?.credits}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className="text-[13px] font-black text-slate-700">{cls._count?.enrollments || 0}</span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Sinh viên</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="relative group/select">
                                                        <Users size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                                                        <select 
                                                            value={cls.lecturerId || ""}
                                                            onChange={(e) => handleUpdateLecturer(cls.id, e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 appearance-none transition-all"
                                                        >
                                                            <option value="">Chờ phân công GV</option>
                                                            {allLecturers.map(l => (
                                                                <option key={l.id} value={l.id}>{l.fullName} ({l.lectureCode})</option>
                                                            ))}
                                                        </select>
                                                        <Edit3 size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 opacity-0 group-hover/select:opacity-100" />
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <input 
                                                            type="number" value={cls.sessionsPerWeek || 1} min={1} max={5}
                                                            onChange={(e) => handleUpdateFactors(cls.id, parseInt(e.target.value), cls.periodsPerSession || 3)}
                                                            className="w-12 bg-white border border-slate-200 rounded-lg py-1.5 text-center text-xs font-black text-slate-700 outline-none focus:border-indigo-500 shadow-sm"
                                                        />
                                                        <span className="text-slate-300 font-bold">×</span>
                                                        <select 
                                                            value={cls.periodsPerSession || 3}
                                                            onChange={(e) => handleUpdateFactors(cls.id, cls.sessionsPerWeek || 1, parseInt(e.target.value))}
                                                            className="bg-white border border-slate-200 rounded-lg py-1.5 px-2 text-xs font-black text-slate-700 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                                                        >
                                                            {[1,2,3,4,5,6].map(v => <option key={v} value={v}>{v} Tiết</option>)}
                                                        </select>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5 text-center">
                                                    <span className="inline-flex px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 items-center justify-center gap-1.5 shadow-sm shadow-amber-50">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                        Draft (Sẵn sàng)
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteClass(cls.id); }} 
                                                            className="p-2.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                                            title="Xoá lớp"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {workflowStep === "OPERATION" && (
                        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700 p-8">
                            {/* Operation Context */}
                            <div className="flex bg-slate-900 rounded-[40px] p-10 border border-slate-800 shadow-2xl items-center justify-between relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] -mr-48 -mt-48 group-hover:bg-emerald-500/20 transition-all duration-1000" />
                                <div className="relative z-10 flex items-center gap-8">
                                    <div className="w-20 h-20 bg-emerald-600 rounded-[24px] flex items-center justify-center text-white shadow-2xl shadow-emerald-500/40 relative">
                                        <div className="absolute inset-0 bg-white/20 rounded-[24px] animate-ping opacity-20" />
                                        <CheckCircle2 size={36} />
                                    </div>
                                    <div>
                                        <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-3">Vận hành đào tạo trực tiếp</h2>
                                        <div className="flex items-center gap-4">
                                            <span className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full text-[11px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-inner">{cohort} · {activeSemName}</span>
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-sm font-bold text-slate-400 italic">Đã chốt danh sách {classes.filter(c => c.status === 'OPEN').length} lớp học phần - Hệ thống đang mở đăng ký</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="flex items-center bg-white/5 rounded-2xl p-1 border border-white/10">
                                        <button onClick={() => setViewMode("LIST")} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === "LIST" ? "bg-white text-slate-900 shadow-lg" : "text-white/40 hover:text-white")}>
                                            Danh sách
                                        </button>
                                        <button onClick={() => setViewMode("GRID")} className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", viewMode === "GRID" ? "bg-white text-slate-900 shadow-lg" : "text-white/40 hover:text-white")}>
                                            Thẻ (Cards)
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setWorkflowStep("COORDINATION")}
                                        className="px-8 py-4 bg-white/10 hover:bg-white text-white hover:text-slate-900 rounded-[20px] font-black text-[12px] uppercase tracking-widest transition-all backdrop-blur-md flex items-center gap-3 border border-white/10 group/btn"
                                    >
                                        <Zap size={18} className="group-hover/btn:fill-current" /> Trạm Điều phối
                                    </button>
                                </div>
                            </div>

                            {/* Main Content: Operation View */}
                            {viewMode === "GRID" ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-32">
                                    {classes.filter(c => c.status === 'OPEN').map(cls => (
                                        <div key={cls.id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 group relative">
                                            <div className="absolute top-6 right-6">
                                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-200 shadow-sm">Đang học</span>
                                            </div>
                                            <div className="flex items-start justify-between mb-8">
                                                <div className="w-14 h-14 bg-slate-900 rounded-[20px] flex items-center justify-center text-white shadow-xl group-hover:bg-indigo-600 transition-all duration-300 group-hover:scale-110">
                                                    <Users size={28} />
                                                </div>
                                            </div>
                                            <div className="mb-10 min-h-[80px]">
                                                <h4 className="text-lg font-black text-slate-800 leading-tight mb-3 line-clamp-2 uppercase tracking-tight">{cls.name}</h4>
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className="text-[10px] font-black text-indigo-600 uppercase bg-indigo-50 px-2 py-1 rounded-md">{cls.code}</span>
                                                    {cls.adminClasses?.map((ac: any) => (
                                                        <span key={ac.id} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100 uppercase">
                                                            {ac.code}
                                                        </span>
                                                    ))}
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 italic ml-auto">
                                                        <Clock size={12}/> {cls.sessionsPerWeek || 1} buổi/tuần
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="space-y-4 mb-8">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 shadow-inner">
                                                        {cls.lecturer?.fullName?.split(' ').pop()?.charAt(0) || '?'}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[11px] font-black text-slate-700 truncate">{cls.lecturer?.fullName || "Chưa phân công"}</p>
                                                        <p className="text-[9px] font-bold text-indigo-400 uppercase">Giảng viên phụ trách</p>
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-50 flex items-center justify-between">
                                                    <div>
                                                        <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Thực sĩ số</p>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-lg font-black text-slate-800">{cls._count?.enrollments || 0}</span>
                                                            <span className="text-[10px] font-bold text-slate-300">/ {cls.maxSlots || 60}</span>
                                                        </div>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200" />
                                                    <div className="text-right">
                                                         <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Phần trăm</p>
                                                         <p className="text-sm font-black text-emerald-600">{( (cls._count?.enrollments || 0) / (cls.maxSlots || 60) * 100).toFixed(0)}%</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                                                <button onClick={() => router.push(`/staff/attendance/${cls.id}`)}
                                                    className="flex items-center justify-center gap-2 py-4 bg-slate-50 text-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-100">
                                                    <ClipboardList size={16}/> Điểm danh
                                                </button>
                                                <button onClick={() => router.push(`/staff/grades/${cls.id}`)}
                                                    className="flex items-center justify-center gap-2 py-4 bg-indigo-50 text-indigo-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm hover:shadow-indigo-100">
                                                    <Edit3 size={16}/> Nhập điểm
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden mb-32">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/50">
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã lớp / Tên học phần</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảng viên phụ trách</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sỹ số</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Phiên học</th>
                                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quản lý</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {classes.filter(c => c.status === 'OPEN').map(cls => (
                                                <tr key={cls.id} className="hover:bg-slate-50/50 transition-colors group">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-[10px] uppercase">
                                                                {cls.subject?.credits}TC
                                                            </div>
                                                            <div>
                                                                <p className="text-[12px] font-black text-slate-900 leading-tight uppercase">{cls.name}</p>
                                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">{cls.code}</p>
                                                                    {cls.adminClasses?.map((ac: any) => (
                                                                        <span key={ac.id} className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100 uppercase">
                                                                            {ac.code}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-400 border border-slate-200 uppercase">
                                                                {cls.lecturer?.fullName?.split(' ').pop()?.charAt(0) || '?'}
                                                            </div>
                                                            <p className="text-[11px] font-black text-slate-700">{cls.lecturer?.fullName || "Chưa gán"}</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <div className="inline-flex items-baseline gap-1 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                            <span className="text-[12px] font-black text-slate-900">{cls._count?.enrollments || 0}</span>
                                                            <span className="text-[10px] font-bold text-slate-300">/ {cls.maxSlots || 60}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 text-center">
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">
                                                            {cls.sessionsPerWeek || 1} buổi · {cls.periodsPerSession || 3} tiết
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={() => router.push(`/staff/attendance/${cls.id}`)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Điểm danh">
                                                                <ClipboardList size={18} />
                                                            </button>
                                                            <button onClick={() => router.push(`/staff/grades/${cls.id}`)}
                                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Nhập điểm">
                                                                <Edit3 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {classes.filter(c => c.status === 'OPEN').length === 0 && (
                                <div className="col-span-full py-40 border-4 border-dashed border-slate-50 rounded-[60px] flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm">
                                    <div className="w-24 h-24 bg-slate-50 rounded-[32px] flex items-center justify-center text-slate-200 mb-6 shadow-inner">
                                        <Layers size={48} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-300 uppercase tracking-widest">Hệ thống sẵn sàng vận hành</h4>
                                    <p className="text-xs font-bold text-slate-400 mt-2 italic">Dữ liệu sẽ hiển thị ở đây sau khi bạn nhấn nút "Zap" tại Trạm Điều phối</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        )}
        </div>
      </div>

      <SemesterManagerModal isOpen={semModal} onClose={() => setSemModal(false)} headers={headers} onSuccess={(m: string) => { toast.success(m); fetchBase(); }} />
      <CourseDetailModal isOpen={detailModal} onClose={() => setDetailModal(false)} course={selectedClass} onEdit={() => {}} onDelete={handleDeleteClass} onManage={(id) => router.push(`/staff/courses?courseId=${id}`)} />
      <AutoScheduleModal isOpen={autoScheduleModal} onClose={() => setAutoScheduleModal(false)} onConfirm={handleAutoScheduleConfirm} isExecuting={scheduling} />
      <OperationalGuideModal isOpen={guideModal} onClose={() => setGuideModal(false)} />

      {isCopyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[30px] w-full max-w-md shadow-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-900">Sao chép kế hoạch</h3>
                <p className="text-sm font-bold text-slate-400">Từ khóa {cohort} sang các khóa khác</p>
              </div>
              <button onClick={() => setIsCopyModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all"><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-8">
              {COHORTS.filter(c => c !== cohort).map(c => (
                <button key={`target-${c}`} onClick={() => setTargetCohorts(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])}
                  className={`py-3 rounded-2xl text-xs font-black transition-all border-2 ${targetCohorts.includes(c) ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-white border-slate-100 text-slate-500 hover:border-indigo-100"}`}>{c}</button>
              ))}
            </div>
            <button key="confirm-duplicate" onClick={handleDuplicate} disabled={duplicating || targetCohorts.length === 0} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all disabled:opacity-50">
              {duplicating ? <Loader2 className="animate-spin mx-auto" /> : `Sao chép sang ${targetCohorts.length} khóa`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
