"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  Loader2,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface PlannerModalProps {
  open: boolean;
  courseClass: any;
  sessions: any[];
  rooms: any[];
  headers: any;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

type PlannerMode = "WEEKLY" | "SELECTED_DATES";

const SHIFT_OPTIONS = [
  { value: 1, label: "Ca 1 (Tiết 1-3)" },
  { value: 4, label: "Ca 2 (Tiết 4-6)" },
  { value: 7, label: "Ca 3 (Tiết 7-9)" },
  { value: 10, label: "Ca 4 (Tiết 10-12)" },
];

const DAY_OPTIONS = [
  { value: 2, label: "Thứ Hai" },
  { value: 3, label: "Thứ Ba" },
  { value: 4, label: "Thứ Tư" },
  { value: 5, label: "Thứ Năm" },
  { value: 6, label: "Thứ Sáu" },
  { value: 7, label: "Thứ Bảy" },
];

const SESSION_TYPE_OPTIONS = [
  { value: "THEORY", label: "Lý thuyết" },
  { value: "LECTURE", label: "Giảng dạy" },
  { value: "PRACTICE", label: "Thực hành" },
  { value: "EXTRA", label: "Học bù" },
];

function toDateInput(value?: Date | string | null) {
  if (!value) return format(new Date(), "yyyy-MM-dd");

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return format(new Date(), "yyyy-MM-dd");
  }

  return format(parsed, "yyyy-MM-dd");
}

function toPortalDayOfWeek(value: Date | string) {
  const jsDay = new Date(value).getDay();
  return jsDay === 0 ? 8 : jsDay + 1;
}

function hasShiftOverlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number,
) {
  return Math.max(leftStart, rightStart) <= Math.min(leftEnd, rightEnd);
}

function createWeeklyPattern(overrides: Record<string, any> = {}) {
  const startShift = Number(overrides.startShift ?? 1);
  return {
    dayOfWeek: Number(overrides.dayOfWeek ?? 2),
    startShift,
    endShift: Number(overrides.endShift ?? startShift + 2),
    roomId: overrides.roomId ?? "none",
    type: `${overrides.type || "THEORY"}`.trim().toUpperCase(),
    note: `${overrides.note || ""}`,
  };
}

function createSelectedSession(overrides: Record<string, any> = {}) {
  const startShift = Number(overrides.startShift ?? 1);
  return {
    date: `${overrides.date || toDateInput(new Date())}`,
    startShift,
    endShift: Number(overrides.endShift ?? startShift + 2),
    roomId: overrides.roomId ?? "none",
    type: `${overrides.type || "THEORY"}`.trim().toUpperCase(),
    note: `${overrides.note || ""}`,
  };
}

function buildWeeklyPatternsFromSessions(sessions: any[] = []) {
  const scheduleMap = new Map<string, any>();

  for (const session of sessions) {
    if (session?.type === "EXAM") continue;

    const dayOfWeek = toPortalDayOfWeek(session.date);
    const key = [
      dayOfWeek,
      session.startShift,
      session.endShift,
      session.roomId || "",
      session.type || "THEORY",
      session.note || "",
    ].join("::");

    if (!scheduleMap.has(key)) {
      scheduleMap.set(
        key,
        createWeeklyPattern({
          dayOfWeek,
          startShift: session.startShift,
          endShift: session.endShift,
          roomId: session.roomId || "none",
          type: session.type || "THEORY",
          note: session.note || "",
        }),
      );
    }
  }

  return [...scheduleMap.values()].sort((left, right) => {
    if (left.dayOfWeek !== right.dayOfWeek) {
      return left.dayOfWeek - right.dayOfWeek;
    }
    return left.startShift - right.startShift;
  });
}

function buildSelectedSessionsFromSessions(sessions: any[] = []) {
  return [...sessions]
    .filter((session) => session?.type !== "EXAM")
    .sort((left, right) => {
      const leftDate = new Date(left.date).getTime();
      const rightDate = new Date(right.date).getTime();
      if (leftDate !== rightDate) return leftDate - rightDate;
      return Number(left.startShift || 0) - Number(right.startShift || 0);
    })
    .map((session) =>
      createSelectedSession({
        date: toDateInput(session.date),
        startShift: session.startShift,
        endShift: session.endShift,
        roomId: session.roomId || "none",
        type: session.type || "THEORY",
        note: session.note || "",
      }),
    );
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

export default function CourseSchedulePlannerModal({
  open,
  courseClass,
  sessions,
  rooms,
  headers,
  onClose,
  onSuccess,
}: PlannerModalProps) {
  const [mode, setMode] = useState<PlannerMode>("WEEKLY");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    startDate: toDateInput(new Date()),
    endDate: toDateInput(new Date()),
    schedules: [createWeeklyPattern()],
    selectedSessions: [createSelectedSession()],
  });

  useEffect(() => {
    if (!open || !courseClass) return;

    const startDate = toDateInput(courseClass?.semester?.startDate || new Date());
    const endDate = toDateInput(courseClass?.semester?.endDate || new Date());
    const schedules = buildWeeklyPatternsFromSessions(sessions);
    const selectedSessions = buildSelectedSessionsFromSessions(sessions);

    setMode("WEEKLY");
    setError(null);
    setForm({
      startDate,
      endDate,
      schedules:
        schedules.length > 0
          ? schedules
          : [createWeeklyPattern({ note: "Lịch xếp lại" })],
      selectedSessions:
        selectedSessions.length > 0
          ? selectedSessions
          : [createSelectedSession({ date: startDate, note: "Lịch chọn ngày" })],
    });
  }, [open, courseClass, sessions]);

  const warnings = useMemo(() => {
    const foundWarnings = new Set<string>();

    if (mode === "WEEKLY") {
      if (new Date(form.startDate).getTime() > new Date(form.endDate).getTime()) {
        foundWarnings.add("Khoảng ngày lặp lại đang không hợp lệ: ngày bắt đầu lớn hơn ngày kết thúc.");
      }

      form.schedules.forEach((current, index) => {
        form.schedules.forEach((candidate, candidateIndex) => {
          if (
            index >= candidateIndex ||
            Number(current.dayOfWeek) !== Number(candidate.dayOfWeek) ||
            !hasShiftOverlap(
              Number(current.startShift),
              Number(current.endShift),
              Number(candidate.startShift),
              Number(candidate.endShift),
            )
          ) {
            return;
          }

          foundWarnings.add(
            `Các mẫu tuần đang tự đè nhau vào ${DAY_OPTIONS.find((day) => day.value === Number(current.dayOfWeek))?.label || "cùng ngày"}, tiết ${Math.max(
              Number(current.startShift),
              Number(candidate.startShift),
            )}-${Math.min(
              Number(current.endShift),
              Number(candidate.endShift),
            )}.`,
          );
        });
      });
    } else {
      form.selectedSessions.forEach((current, index) => {
        form.selectedSessions.forEach((candidate, candidateIndex) => {
          if (
            index >= candidateIndex ||
            current.date !== candidate.date ||
            !hasShiftOverlap(
              Number(current.startShift),
              Number(current.endShift),
              Number(candidate.startShift),
              Number(candidate.endShift),
            )
          ) {
            return;
          }

          foundWarnings.add(
            `Danh sách ngày chọn đang có buổi chồng nhau vào ${current.date}, tiết ${Math.max(
              Number(current.startShift),
              Number(candidate.startShift),
            )}-${Math.min(
              Number(current.endShift),
              Number(candidate.endShift),
            )}.`,
          );
        });
      });
    }

    return [...foundWarnings];
  }, [form.schedules, form.selectedSessions, mode]);

  if (!open || !courseClass) return null;

  function updateWeeklyPattern(index: number, field: string, value: any) {
    setForm((current) => {
      const nextSchedules = [...current.schedules];
      nextSchedules[index] = {
        ...nextSchedules[index],
        [field]: value,
      };

      if (field === "startShift") {
        nextSchedules[index].endShift = Number(value) + 2;
      }

      return {
        ...current,
        schedules: nextSchedules,
      };
    });
  }

  function updateSelectedSession(index: number, field: string, value: any) {
    setForm((current) => {
      const nextSessions = [...current.selectedSessions];
      nextSessions[index] = {
        ...nextSessions[index],
        [field]: value,
      };

      if (field === "startShift") {
        nextSessions[index].endShift = Number(value) + 2;
      }

      return {
        ...current,
        selectedSessions: nextSessions,
      };
    });
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const payload =
        mode === "WEEKLY"
          ? {
              mode,
              startDate: form.startDate,
              endDate: form.endDate,
              schedules: form.schedules.map((schedule) => ({
                ...schedule,
                roomId: schedule.roomId === "none" ? null : schedule.roomId,
                note: `${schedule.note || ""}`.trim() || null,
              })),
            }
          : {
              mode,
              selectedSessions: form.selectedSessions.map((session) => ({
                ...session,
                roomId: session.roomId === "none" ? null : session.roomId,
                note: `${session.note || ""}`.trim() || null,
              })),
            };

      const res = await fetch(`/api/courses/${courseClass.id}/replan-schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });

      const responsePayload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          extractErrorMessage(
            responsePayload,
            "Không thể xếp lại lịch cho học phần.",
          ),
        );
      }

      await Promise.resolve(onSuccess());
      alert(
        `Đã xếp lại ${responsePayload?.createdCount || 0} buổi học cho ${courseClass.code}.`,
      );
      onClose();
    } catch (submitError: any) {
      console.error(submitError);
      setError(submitError?.message || "Không thể xếp lại lịch cho học phần.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center p-8">
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-md"
        onClick={() => !loading && onClose()}
      />

      <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[40px] bg-white shadow-2xl">
        <header className="border-b border-slate-100 bg-slate-50/70 px-8 py-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-uneti-blue">
                Xếp lại lịch học phần
              </p>
              <h3 className="mt-2 text-lg font-black uppercase tracking-tight text-slate-900">
                {courseClass.subject?.name || courseClass.name}
              </h3>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {courseClass.code} • Hệ thống sẽ chặn trùng phòng, trùng giảng viên, trùng
                lớp hành chính và tự trùng ca
              </p>
            </div>

            <button
              onClick={() => !loading && onClose()}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-300 transition-all hover:bg-rose-50 hover:text-rose-500"
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => setMode("WEEKLY")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                mode === "WEEKLY"
                  ? "border-uneti-blue bg-uneti-blue text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
              )}
            >
              <Repeat size={14} />
              Lặp theo tuần
            </button>
            <button
              onClick={() => setMode("SELECTED_DATES")}
              className={cn(
                "inline-flex items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all",
                mode === "SELECTED_DATES"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
              )}
            >
              <Calendar size={14} />
              Chọn ngày cụ thể
            </button>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto p-8">
          {warnings.length > 0 ? (
            <div className="mb-6 rounded-[28px] border border-amber-100 bg-amber-50 p-5">
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-amber-500">
                  <AlertTriangle size={18} />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">
                    Cảnh báo nội bộ
                  </p>
                  {warnings.map((warning) => (
                    <p
                      key={warning}
                      className="text-[11px] font-bold leading-relaxed text-slate-700"
                    >
                      {warning}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mb-6 rounded-[28px] border border-rose-100 bg-rose-50 p-5 text-[11px] font-bold leading-relaxed text-rose-600">
              {error}
            </div>
          ) : null}

          {mode === "WEEKLY" ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5">
                  <label className="mb-3 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Bắt đầu lặp
                  </label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white bg-white px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>

                <div className="rounded-[28px] border border-slate-100 bg-slate-50/70 p-5">
                  <label className="mb-3 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Kết thúc lặp
                  </label>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        endDate: event.target.value,
                      }))
                    }
                    className="w-full rounded-2xl border border-white bg-white px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Mẫu lịch theo tuần
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Hệ thống sẽ sinh lại toàn bộ buổi học trong khoảng ngày đã chọn
                  </p>
                </div>

                <button
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      schedules: [...current.schedules, createWeeklyPattern()],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-uneti-blue"
                >
                  <Plus size={14} />
                  Thêm mẫu
                </button>
              </div>

              <div className="space-y-4">
                {form.schedules.map((schedule, index) => (
                  <div
                    key={`weekly-${index}`}
                    className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div className="grid grid-cols-[1.1fr_1fr_1.2fr_1fr_auto] gap-4">
                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Thứ học
                        </label>
                        <select
                          value={schedule.dayOfWeek}
                          onChange={(event) =>
                            updateWeeklyPattern(
                              index,
                              "dayOfWeek",
                              Number(event.target.value),
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          {DAY_OPTIONS.map((day) => (
                            <option key={day.value} value={day.value}>
                              {day.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Ca học
                        </label>
                        <select
                          value={schedule.startShift}
                          onChange={(event) =>
                            updateWeeklyPattern(
                              index,
                              "startShift",
                              Number(event.target.value),
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          {SHIFT_OPTIONS.map((shift) => (
                            <option key={shift.value} value={shift.value}>
                              {shift.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Phòng học
                        </label>
                        <select
                          value={schedule.roomId}
                          onChange={(event) =>
                            updateWeeklyPattern(index, "roomId", event.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          <option value="none">Chưa gán phòng</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name} {room.building ? `- ${room.building}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Loại buổi
                        </label>
                        <select
                          value={schedule.type}
                          onChange={(event) =>
                            updateWeeklyPattern(index, "type", event.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          {SESSION_TYPE_OPTIONS.map((typeOption) => (
                            <option key={typeOption.value} value={typeOption.value}>
                              {typeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              schedules:
                                current.schedules.length > 1
                                  ? current.schedules.filter((_, itemIndex) => itemIndex !== index)
                                  : current.schedules,
                            }))
                          }
                          disabled={form.schedules.length === 1}
                          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Ghi chú
                      </label>
                      <input
                        value={schedule.note}
                        onChange={(event) =>
                          updateWeeklyPattern(index, "note", event.target.value)
                        }
                        placeholder="Ví dụ: lý thuyết nhóm 1"
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                    Danh sách ngày học cụ thể
                  </p>
                  <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    Chọn từng ngày để né lịch bận thực tế của phòng và giảng viên
                  </p>
                </div>

                <button
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      selectedSessions: [
                        ...current.selectedSessions,
                        createSelectedSession({ date: current.startDate }),
                      ],
                    }))
                  }
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-uneti-blue"
                >
                  <Plus size={14} />
                  Thêm ngày
                </button>
              </div>

              <div className="space-y-4">
                {form.selectedSessions.map((session, index) => (
                  <div
                    key={`selected-${index}`}
                    className="rounded-[30px] border border-slate-100 bg-white p-5 shadow-sm"
                  >
                    <div className="grid grid-cols-[1.1fr_1fr_1.2fr_1fr_auto] gap-4">
                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Ngày học
                        </label>
                        <input
                          type="date"
                          value={session.date}
                          onChange={(event) =>
                            updateSelectedSession(index, "date", event.target.value)
                          }
                          className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Ca học
                        </label>
                        <select
                          value={session.startShift}
                          onChange={(event) =>
                            updateSelectedSession(
                              index,
                              "startShift",
                              Number(event.target.value),
                            )
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          {SHIFT_OPTIONS.map((shift) => (
                            <option key={shift.value} value={shift.value}>
                              {shift.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Phòng học
                        </label>
                        <select
                          value={session.roomId}
                          onChange={(event) =>
                            updateSelectedSession(index, "roomId", event.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          <option value="none">Chưa gán phòng</option>
                          {rooms.map((room) => (
                            <option key={room.id} value={room.id}>
                              {room.name} {room.building ? `- ${room.building}` : ""}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          Loại buổi
                        </label>
                        <select
                          value={session.type}
                          onChange={(event) =>
                            updateSelectedSession(index, "type", event.target.value)
                          }
                          className="w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                        >
                          {SESSION_TYPE_OPTIONS.map((typeOption) => (
                            <option key={typeOption.value} value={typeOption.value}>
                              {typeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-end">
                        <button
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              selectedSessions:
                                current.selectedSessions.length > 1
                                  ? current.selectedSessions.filter(
                                      (_, itemIndex) => itemIndex !== index,
                                    )
                                  : current.selectedSessions,
                            }))
                          }
                          disabled={form.selectedSessions.length === 1}
                          className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-slate-50 text-slate-400 transition-all hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-2 block pl-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Ghi chú
                      </label>
                      <input
                        value={session.note}
                        onChange={(event) =>
                          updateSelectedSession(index, "note", event.target.value)
                        }
                        placeholder="Ví dụ: lịch xếp lại sau khi dọn ca trùng"
                        className="w-full rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 text-[11px] font-black text-slate-800 outline-none transition-all focus:ring-4 focus:ring-uneti-blue/5"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-8 py-5">
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <RotateCcw size={14} className="text-uneti-blue" />
            Toàn bộ buổi học thường sẽ được thay thế bằng kế hoạch mới
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => !loading && onClose()}
              className="rounded-2xl bg-white px-6 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              onClick={() => void handleSubmit()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl bg-uneti-blue px-6 py-3 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-slate-900 disabled:opacity-60"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : null}
              Xếp lại lịch
            </button>
          </div>
        </footer>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
