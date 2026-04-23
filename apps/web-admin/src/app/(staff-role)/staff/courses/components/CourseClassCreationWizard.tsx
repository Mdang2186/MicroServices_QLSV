"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Loader2,
  Plus,
  Search,
  Square,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function normalizeSearchText(value: any) {
  return `${value ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function todayValue() {
  return format(new Date(), "yyyy-MM-dd");
}

const DAY_OPTIONS = [
  { value: 2, label: "Thứ Hai" },
  { value: 3, label: "Thứ Ba" },
  { value: 4, label: "Thứ Tư" },
  { value: 5, label: "Thứ Năm" },
  { value: 6, label: "Thứ Sáu" },
  { value: 7, label: "Thứ Bảy" },
];

const SHIFT_OPTIONS = Array.from({ length: 10 }, (_, index) => ({
  value: index + 1,
  label: `Tiết ${index + 1}`,
}));

const PERIOD_OPTIONS = Array.from({ length: 6 }, (_, index) => ({
  value: index + 1,
  label: `${index + 1} tiết`,
}));

const SESSION_TYPE_OPTIONS = [
  { value: "LECTURE", label: "Giảng dạy" },
  { value: "THEORY", label: "Lý thuyết" },
  { value: "PRACTICE", label: "Thực hành" },
];

interface CourseClassCreationWizardProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  headers: any;
  semesters: any[];
  faculties: any[];
  majors: any[];
  departments: any[];
  cohorts: any[];
  rooms: any[];
  lecturers: any[];
}

type ScheduleMode = "WEEKLY" | "SELECTED_DATES";

type WeeklySlot = {
  dayOfWeek: number;
  startShift: number;
  periodCount: number;
  roomId: string;
  type: string;
  note: string;
};

type SelectedDateSlot = {
  date: string;
  startShift: number;
  periodCount: number;
  roomId: string;
  type: string;
  note: string;
};

function createWeeklySlot(): WeeklySlot {
  return {
    dayOfWeek: 2,
    startShift: 1,
    periodCount: 3,
    roomId: "none",
    type: "LECTURE",
    note: "",
  };
}

function createSelectedDateSlot(date = todayValue()): SelectedDateSlot {
  return {
    date,
    startShift: 1,
    periodCount: 3,
    roomId: "none",
    type: "LECTURE",
    note: "",
  };
}

function extractErrorMessage(payload: any, fallback: string) {
  if (Array.isArray(payload?.message)) {
    return payload.message.join(", ");
  }
  if (typeof payload?.message === "string") {
    return payload.message;
  }
  return fallback;
}

export default function CourseClassCreationWizard({
  open,
  onClose,
  onSuccess,
  headers,
  semesters,
  faculties,
  majors,
  departments,
  cohorts,
  rooms,
  lecturers,
}: CourseClassCreationWizardProps) {
  const currentSemester = useMemo(
    () => semesters.find((semester) => semester.isCurrent) || semesters[0] || null,
    [semesters],
  );

  const [selectedFacultyId, setSelectedFacultyId] = useState("all");
  const [selectedMajorId, setSelectedMajorId] = useState("all");
  const [selectedDepartmentId, setSelectedDepartmentId] = useState("all");
  const [selectedCohort, setSelectedCohort] = useState("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [selectedAdminClassIds, setSelectedAdminClassIds] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [adminClassSearch, setAdminClassSearch] = useState("");
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("WEEKLY");
  const [saving, setSaving] = useState(false);
  const [subjectLoading, setSubjectLoading] = useState(false);
  const [adminClassLoading, setAdminClassLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [subjects, setSubjects] = useState<any[]>([]);
  const [adminClasses, setAdminClasses] = useState<any[]>([]);
  const [form, setForm] = useState({
    semesterId: currentSemester?.id || "",
    lecturerId: "none",
    maxSlots: 60,
    status: "OPEN",
    startDate: currentSemester?.startDate
      ? format(new Date(currentSemester.startDate), "yyyy-MM-dd")
      : todayValue(),
    endDate: currentSemester?.endDate
      ? format(new Date(currentSemester.endDate), "yyyy-MM-dd")
      : todayValue(),
  });
  const [weeklySlots, setWeeklySlots] = useState<WeeklySlot[]>([createWeeklySlot()]);
  const [selectedDateSlots, setSelectedDateSlots] = useState<SelectedDateSlot[]>([
    createSelectedDateSlot(),
  ]);

  const filteredMajors = useMemo(() => {
    if (selectedFacultyId === "all") return majors;
    return majors.filter((major) => major.facultyId === selectedFacultyId);
  }, [majors, selectedFacultyId]);

  const filteredDepartments = useMemo(() => {
    if (selectedFacultyId === "all") return departments;
    return departments.filter(
      (department) =>
        department.facultyId === selectedFacultyId ||
        department.faculty?.id === selectedFacultyId,
    );
  }, [departments, selectedFacultyId]);

  const filteredLecturers = useMemo(() => {
    return lecturers.filter((lecturer) => {
      if (selectedFacultyId !== "all" && lecturer.facultyId !== selectedFacultyId) {
        return false;
      }
      if (
        selectedDepartmentId !== "all" &&
        lecturer.departmentId &&
        lecturer.departmentId !== selectedDepartmentId
      ) {
        return false;
      }
      return true;
    });
  }, [lecturers, selectedFacultyId, selectedDepartmentId]);

  const filteredSubjects = useMemo(() => {
    const tokens = normalizeSearchText(subjectSearch).split(" ").filter(Boolean);
    if (!tokens.length) return subjects;
    return subjects.filter((subject) => {
      const haystack = normalizeSearchText(
        [
          subject.code,
          subject.name,
          subject.major?.code,
          subject.major?.name,
          subject.department?.code,
          subject.department?.name,
        ].join(" "),
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [subjectSearch, subjects]);

  const filteredAdminClasses = useMemo(() => {
    const tokens = normalizeSearchText(adminClassSearch).split(" ").filter(Boolean);
    if (!tokens.length) return adminClasses;
    return adminClasses.filter((adminClass) => {
      const haystack = normalizeSearchText(
        [
          adminClass.code,
          adminClass.name,
          adminClass.cohort,
          adminClass.major?.code,
          adminClass.major?.name,
        ].join(" "),
      );
      return tokens.every((token) => haystack.includes(token));
    });
  }, [adminClassSearch, adminClasses]);

  const selectedSubject = useMemo(
    () => subjects.find((subject) => subject.id === selectedSubjectId) || null,
    [selectedSubjectId, subjects],
  );

  useEffect(() => {
    if (!open) return;

    setSelectedFacultyId("all");
    setSelectedMajorId("all");
    setSelectedDepartmentId("all");
    setSelectedCohort("all");
    setSelectedSubjectId("");
    setSelectedAdminClassIds([]);
    setSubjectSearch("");
    setAdminClassSearch("");
    setScheduleMode("WEEKLY");
    setSaving(false);
    setSubjectLoading(false);
    setAdminClassLoading(false);
    setError(null);
    setForm({
      semesterId: currentSemester?.id || "",
      lecturerId: "none",
      maxSlots: 60,
      status: "OPEN",
      startDate: currentSemester?.startDate
        ? format(new Date(currentSemester.startDate), "yyyy-MM-dd")
        : todayValue(),
      endDate: currentSemester?.endDate
        ? format(new Date(currentSemester.endDate), "yyyy-MM-dd")
        : todayValue(),
    });
    setWeeklySlots([createWeeklySlot()]);
    setSelectedDateSlots([
      createSelectedDateSlot(
        currentSemester?.startDate
          ? format(new Date(currentSemester.startDate), "yyyy-MM-dd")
          : todayValue(),
      ),
    ]);
  }, [open, currentSemester]);

  useEffect(() => {
    if (!open) return;

    const selectedSemester = semesters.find((semester) => semester.id === form.semesterId);
    if (!selectedSemester) return;

    setForm((current) => ({
      ...current,
      startDate: format(new Date(selectedSemester.startDate), "yyyy-MM-dd"),
      endDate: format(new Date(selectedSemester.endDate), "yyyy-MM-dd"),
    }));
    setSelectedDateSlots([
      createSelectedDateSlot(format(new Date(selectedSemester.startDate), "yyyy-MM-dd")),
    ]);
  }, [form.semesterId, open, semesters]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const query = new URLSearchParams();

    if (selectedFacultyId !== "all") query.append("facultyId", selectedFacultyId);
    if (selectedMajorId !== "all") query.append("majorId", selectedMajorId);
    if (selectedDepartmentId !== "all") query.append("departmentId", selectedDepartmentId);

    setSubjectLoading(true);
    fetch(`/api/subjects?${query.toString()}`, {
      headers,
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const nextSubjects = Array.isArray(data) ? data : [];
        setSubjects(nextSubjects);
        if (!nextSubjects.some((subject) => subject.id === selectedSubjectId)) {
          setSelectedSubjectId("");
        }
      })
      .catch((fetchError) => {
        if (fetchError?.name !== "AbortError") {
          console.error(fetchError);
          setSubjects([]);
        }
      })
      .finally(() => setSubjectLoading(false));

    return () => controller.abort();
  }, [headers, open, selectedDepartmentId, selectedFacultyId, selectedMajorId, selectedSubjectId]);

  useEffect(() => {
    if (!open) return;

    const controller = new AbortController();
    const query = new URLSearchParams();

    if (selectedMajorId !== "all") query.append("majorId", selectedMajorId);
    if (selectedCohort !== "all") query.append("cohort", selectedCohort);

    setAdminClassLoading(true);
    fetch(`/api/admin-classes?${query.toString()}`, {
      headers,
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const nextAdminClasses = Array.isArray(data) ? data : [];
        setAdminClasses(nextAdminClasses);
        setSelectedAdminClassIds((current) =>
          current.filter((id) => nextAdminClasses.some((adminClass) => adminClass.id === id)),
        );
      })
      .catch((fetchError) => {
        if (fetchError?.name !== "AbortError") {
          console.error(fetchError);
          setAdminClasses([]);
        }
      })
      .finally(() => setAdminClassLoading(false));

    return () => controller.abort();
  }, [headers, open, selectedCohort, selectedMajorId]);

  if (!open) return null;

  function toggleAdminClass(id: string) {
    setSelectedAdminClassIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function updateWeeklySlot(index: number, field: keyof WeeklySlot, value: any) {
    setWeeklySlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  function updateSelectedDateSlot(index: number, field: keyof SelectedDateSlot, value: any) {
    setSelectedDateSlots((current) =>
      current.map((slot, slotIndex) =>
        slotIndex === index ? { ...slot, [field]: value } : slot,
      ),
    );
  }

  async function handleSubmit() {
    if (!selectedSubjectId) {
      setError("Vui lòng chọn môn học để tạo lớp học phần.");
      return;
    }
    if (new Date(form.startDate).getTime() > new Date(form.endDate).getTime()) {
      setError("Khoảng ngày xếp lịch không hợp lệ.");
      return;
    }
    if (scheduleMode === "WEEKLY" && weeklySlots.length === 0) {
      setError("Vui lòng khai báo ít nhất một buổi học theo tuần.");
      return;
    }
    if (scheduleMode === "SELECTED_DATES" && selectedDateSlots.length === 0) {
      setError("Vui lòng khai báo ít nhất một ngày học cụ thể.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const createResponse = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          semesterId: form.semesterId,
          lecturerId: form.lecturerId === "none" ? null : form.lecturerId,
          maxSlots: Number(form.maxSlots || 0),
          status: form.status,
          adminClassIds: selectedAdminClassIds,
        }),
      });

      const createdPayload = await createResponse.json().catch(() => null);
      if (!createResponse.ok) {
        throw new Error(
          extractErrorMessage(createdPayload, "Không thể tạo lớp học phần."),
        );
      }

      const createdCourseClassId = createdPayload?.id;
      if (createdCourseClassId) {
        const schedulePayload =
          scheduleMode === "WEEKLY"
            ? {
                mode: "WEEKLY",
                startDate: form.startDate,
                endDate: form.endDate,
                schedules: weeklySlots.map((slot) => ({
                  dayOfWeek: Number(slot.dayOfWeek),
                  startShift: Number(slot.startShift),
                  endShift: Number(slot.startShift) + Number(slot.periodCount) - 1,
                  roomId: slot.roomId === "none" ? null : slot.roomId,
                  type: slot.type,
                  note: slot.note || null,
                })),
              }
            : {
                mode: "SELECTED_DATES",
                selectedSessions: selectedDateSlots.map((slot) => ({
                  date: slot.date,
                  startShift: Number(slot.startShift),
                  endShift: Number(slot.startShift) + Number(slot.periodCount) - 1,
                  roomId: slot.roomId === "none" ? null : slot.roomId,
                  type: slot.type,
                  note: slot.note || null,
                })),
              };

        const scheduleResponse = await fetch(
          `/api/courses/${createdCourseClassId}/replan-schedule`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...headers },
            body: JSON.stringify(schedulePayload),
          },
        );

        if (!scheduleResponse.ok) {
          const scheduleError = await scheduleResponse.json().catch(() => null);
          throw new Error(
            extractErrorMessage(
              scheduleError,
              "Đã tạo lớp học phần nhưng không thể xếp lịch tự động.",
            ),
          );
        }
      }

      await Promise.resolve(onSuccess());
      onClose();
    } catch (submitError: any) {
      console.error(submitError);
      setError(submitError?.message || "Không thể tạo lớp học phần.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <header className="border-b border-slate-100 bg-slate-50/70 px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-uneti-blue">
                Tạo lớp học phần
              </p>
              <h2 className="mt-2 text-xl font-black uppercase tracking-tight text-slate-900">
                Xếp lớp thủ công cho môn phát sinh
              </h2>
              <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Chọn môn học, ngành, khóa và để hệ thống tạo lớp rồi xếp lịch tự động
              </p>
            </div>

            <button
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          {error ? (
            <div className="mb-6 rounded-[24px] border border-rose-100 bg-rose-50 px-5 py-4 text-[11px] font-bold text-rose-600">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-6">
              <section className="rounded-[32px] border border-slate-100 bg-white p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    1. Chọn học phần
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Lọc theo khoa, ngành, bộ môn rồi chọn môn cần mở lớp
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedFacultyId}
                    onChange={(event) => {
                      setSelectedFacultyId(event.target.value);
                      setSelectedMajorId("all");
                      setSelectedDepartmentId("all");
                    }}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="all">Tất cả khoa</option>
                    {faculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedMajorId}
                    onChange={(event) => setSelectedMajorId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="all">Tất cả ngành</option>
                    {filteredMajors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedDepartmentId}
                    onChange={(event) => setSelectedDepartmentId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="all">Tất cả bộ môn</option>
                    {filteredDepartments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <Search
                      size={14}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <input
                      value={subjectSearch}
                      onChange={(event) => setSubjectSearch(event.target.value)}
                      placeholder="Tìm mã hoặc tên môn học"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                    />
                  </div>
                </div>

                <div className="mt-5 grid max-h-80 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {subjectLoading ? (
                    <div className="col-span-full flex items-center justify-center py-12 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : filteredSubjects.length === 0 ? (
                    <div className="col-span-full rounded-[24px] border-2 border-dashed border-slate-100 py-12 text-center text-[11px] font-bold text-slate-400">
                      Không có môn học phù hợp bộ lọc hiện tại
                    </div>
                  ) : (
                    filteredSubjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedSubjectId(subject.id)}
                        className={cn(
                          "rounded-[24px] border px-5 py-4 text-left transition-all",
                          selectedSubjectId === subject.id
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-200"
                            : "border-slate-100 bg-white text-slate-600 hover:border-uneti-blue/30",
                        )}
                      >
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                          {subject.code}
                        </p>
                        <p className="mt-2 text-[12px] font-black uppercase tracking-tight">
                          {subject.name}
                        </p>
                        <p className="mt-2 text-[9px] font-bold uppercase tracking-widest opacity-70">
                          {subject.department?.name || subject.major?.name || "Chưa phân loại"}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-100 bg-white p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    2. Chọn ngành và khóa
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Gắn lớp học phần với lớp hành chính để xếp lịch và đẩy sinh viên
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={selectedMajorId}
                    onChange={(event) => setSelectedMajorId(event.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="all">Tất cả ngành</option>
                    {filteredMajors.map((major) => (
                      <option key={major.id} value={major.id}>
                        {major.code} - {major.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedCohort}
                    onChange={(event) => setSelectedCohort(event.target.value)}
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="all">Tất cả khóa</option>
                    {cohorts.map((cohort) => (
                      <option key={cohort.code} value={cohort.code}>
                        {cohort.code}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={14}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"
                    />
                    <input
                      value={adminClassSearch}
                      onChange={(event) => setAdminClassSearch(event.target.value)}
                      placeholder="Tìm lớp hành chính"
                      className="w-full rounded-2xl border border-slate-100 bg-slate-50 py-3 pl-11 pr-4 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedAdminClassIds(
                        filteredAdminClasses.map((adminClass) => adminClass.id),
                      )
                    }
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-900 hover:text-white"
                  >
                    Chọn hết
                  </button>
                </div>

                <div className="mt-5 grid max-h-72 grid-cols-1 gap-3 overflow-y-auto pr-1 md:grid-cols-2">
                  {adminClassLoading ? (
                    <div className="col-span-full flex items-center justify-center py-12 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                    </div>
                  ) : filteredAdminClasses.length === 0 ? (
                    <div className="col-span-full rounded-[24px] border-2 border-dashed border-slate-100 py-12 text-center text-[11px] font-bold text-slate-400">
                      Không tìm thấy lớp hành chính cho bộ lọc hiện tại
                    </div>
                  ) : (
                    filteredAdminClasses.map((adminClass) => {
                      const selected = selectedAdminClassIds.includes(adminClass.id);
                      return (
                        <button
                          key={adminClass.id}
                          onClick={() => toggleAdminClass(adminClass.id)}
                          className={cn(
                            "flex items-start gap-3 rounded-[24px] border px-4 py-4 text-left transition-all",
                            selected
                              ? "border-uneti-blue bg-blue-50 text-uneti-blue"
                              : "border-slate-100 bg-white text-slate-600 hover:border-uneti-blue/30",
                          )}
                        >
                          <div className="mt-0.5">
                            {selected ? <CheckSquare size={16} /> : <Square size={16} />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-tight">
                              {adminClass.code}
                            </p>
                            <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest opacity-75">
                              {adminClass.name}
                            </p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-widest opacity-60">
                              {adminClass.major?.name} • {adminClass.cohort || "Chưa có khóa"}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="rounded-[32px] border border-slate-100 bg-white p-6">
                <div className="mb-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    3. Cấu hình lớp và giảng viên
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={form.semesterId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, semesterId: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    {semesters.map((semester) => (
                      <option key={semester.id} value={semester.id}>
                        {semester.name}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min={1}
                    value={form.maxSlots}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        maxSlots: Number(event.target.value || 0),
                      }))
                    }
                    className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                    placeholder="Sĩ số tối đa"
                  />

                  <select
                    value={form.lecturerId}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, lecturerId: event.target.value }))
                    }
                    className="col-span-2 w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                  >
                    <option value="none">Chưa phân công giảng viên</option>
                    {filteredLecturers.map((lecturer) => (
                      <option key={lecturer.id} value={lecturer.id}>
                        {lecturer.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <section className="rounded-[32px] border border-slate-100 bg-white p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                      4. Xếp lịch tự động
                    </p>
                    <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Giới hạn ngày và cấu hình số buổi, số tiết
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setScheduleMode("WEEKLY")}
                      className={cn(
                        "rounded-2xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                        scheduleMode === "WEEKLY"
                          ? "border-uneti-blue bg-uneti-blue text-white"
                          : "border-slate-200 bg-white text-slate-500",
                      )}
                    >
                      Theo tuần
                    </button>
                    <button
                      onClick={() => setScheduleMode("SELECTED_DATES")}
                      className={cn(
                        "rounded-2xl border px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                        scheduleMode === "SELECTED_DATES"
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-500",
                      )}
                    >
                      Theo ngày
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
                    <label className="mb-3 block text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Bắt đầu
                    </label>
                    <input
                      type="date"
                      value={form.startDate}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, startDate: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                    />
                  </div>

                  <div className="rounded-[24px] border border-slate-100 bg-slate-50/70 p-4">
                    <label className="mb-3 block text-[9px] font-black uppercase tracking-widest text-slate-400">
                      Kết thúc
                    </label>
                    <input
                      type="date"
                      value={form.endDate}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, endDate: event.target.value }))
                      }
                      className="w-full rounded-2xl border border-white bg-white px-4 py-3 text-[11px] font-black text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                    />
                  </div>
                </div>

                {scheduleMode === "WEEKLY" ? (
                  <div className="mt-5 space-y-3">
                    {weeklySlots.map((slot, index) => (
                      <div
                        key={`weekly-${index}`}
                        className="rounded-[24px] border border-slate-100 bg-slate-50/60 p-4"
                      >
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                          <select
                            value={slot.dayOfWeek}
                            onChange={(event) =>
                              updateWeeklySlot(index, "dayOfWeek", Number(event.target.value))
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {DAY_OPTIONS.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.startShift}
                            onChange={(event) =>
                              updateWeeklySlot(index, "startShift", Number(event.target.value))
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {SHIFT_OPTIONS.map((shift) => (
                              <option key={shift.value} value={shift.value}>
                                {shift.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.periodCount}
                            onChange={(event) =>
                              updateWeeklySlot(index, "periodCount", Number(event.target.value))
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {PERIOD_OPTIONS.map((period) => (
                              <option key={period.value} value={period.value}>
                                {period.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.roomId}
                            onChange={(event) =>
                              updateWeeklySlot(index, "roomId", event.target.value)
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            <option value="none">Chọn sau</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.type}
                            onChange={(event) =>
                              updateWeeklySlot(index, "type", event.target.value)
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {SESSION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <input
                            value={slot.note}
                            onChange={(event) =>
                              updateWeeklySlot(index, "note", event.target.value)
                            }
                            placeholder="Ghi chú buổi học"
                            className="flex-1 rounded-2xl border border-white bg-white px-4 py-3 text-[10px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          />
                          <button
                            onClick={() =>
                              setWeeklySlots((current) =>
                                current.length === 1
                                  ? current
                                  : current.filter((_, slotIndex) => slotIndex !== index),
                              )
                            }
                            className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() =>
                        setWeeklySlots((current) => [...current, createWeeklySlot()])
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-uneti-blue hover:text-uneti-blue"
                    >
                      <Plus size={14} />
                      Thêm ngày học
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {selectedDateSlots.map((slot, index) => (
                      <div
                        key={`date-${index}`}
                        className="rounded-[24px] border border-slate-100 bg-slate-50/60 p-4"
                      >
                        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                          <input
                            type="date"
                            value={slot.date}
                            onChange={(event) =>
                              updateSelectedDateSlot(index, "date", event.target.value)
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          />

                          <select
                            value={slot.startShift}
                            onChange={(event) =>
                              updateSelectedDateSlot(
                                index,
                                "startShift",
                                Number(event.target.value),
                              )
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {SHIFT_OPTIONS.map((shift) => (
                              <option key={shift.value} value={shift.value}>
                                {shift.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.periodCount}
                            onChange={(event) =>
                              updateSelectedDateSlot(
                                index,
                                "periodCount",
                                Number(event.target.value),
                              )
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {PERIOD_OPTIONS.map((period) => (
                              <option key={period.value} value={period.value}>
                                {period.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.roomId}
                            onChange={(event) =>
                              updateSelectedDateSlot(index, "roomId", event.target.value)
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            <option value="none">Chọn sau</option>
                            {rooms.map((room) => (
                              <option key={room.id} value={room.id}>
                                {room.name}
                              </option>
                            ))}
                          </select>

                          <select
                            value={slot.type}
                            onChange={(event) =>
                              updateSelectedDateSlot(index, "type", event.target.value)
                            }
                            className="rounded-2xl border border-white bg-white px-3 py-3 text-[10px] font-black uppercase text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          >
                            {SESSION_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-3 flex items-center gap-3">
                          <input
                            value={slot.note}
                            onChange={(event) =>
                              updateSelectedDateSlot(index, "note", event.target.value)
                            }
                            placeholder="Ghi chú buổi học"
                            className="flex-1 rounded-2xl border border-white bg-white px-4 py-3 text-[10px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-uneti-blue/5"
                          />
                          <button
                            onClick={() =>
                              setSelectedDateSlots((current) =>
                                current.length === 1
                                  ? current
                                  : current.filter((_, slotIndex) => slotIndex !== index),
                              )
                            }
                            className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all hover:bg-rose-500 hover:text-white"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={() =>
                        setSelectedDateSlots((current) => [
                          ...current,
                          createSelectedDateSlot(form.startDate || todayValue()),
                        ])
                      }
                      className="flex w-full items-center justify-center gap-2 rounded-[24px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:border-uneti-blue hover:text-uneti-blue"
                    >
                      <Plus size={14} />
                      Thêm ngày học
                    </button>
                  </div>
                )}
              </section>

              <section className="rounded-[32px] border border-slate-100 bg-slate-900 p-6 text-white">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Tóm tắt
                </p>
                <div className="mt-4 space-y-3 text-[11px] font-bold uppercase tracking-widest text-slate-200">
                  <p>Môn học: {selectedSubject?.name || "Chưa chọn"}</p>
                  <p>Lớp hành chính: {selectedAdminClassIds.length} lớp</p>
                  <p>
                    Cách xếp lịch:{" "}
                    {scheduleMode === "WEEKLY" ? `${weeklySlots.length} mẫu/tuần` : `${selectedDateSlots.length} ngày`}
                  </p>
                  <p>
                    Khoảng ngày: {form.startDate || "--"} → {form.endDate || "--"}
                  </p>
                </div>

                <button
                  onClick={() => void handleSubmit()}
                  disabled={saving}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-[24px] bg-uneti-blue px-5 py-4 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                  {saving ? "Đang tạo và xếp lịch..." : "Tạo lớp học phần"}
                </button>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
