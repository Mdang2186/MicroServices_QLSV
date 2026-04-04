"use client";

import React from "react";
import { Trash2 } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ScheduleEntry {
    dayOfWeek: number;   // 2 = Monday … 7 = Saturday, 8 = Sunday
    startShift: number;  // 1–12
    endShift: number;    // 1–12
    roomId: string;
    type: "THEORY" | "PRACTICE";
}

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS = [
    { value: 2, label: "Thứ 2" },
    { value: 3, label: "Thứ 3" },
    { value: 4, label: "Thứ 4" },
    { value: 5, label: "Thứ 5" },
    { value: 6, label: "Thứ 6" },
    { value: 7, label: "Thứ 7" },
    { value: 8, label: "Chủ nhật" },
];

const SHIFTS = Array.from({ length: 16 }, (_, i) => i + 1);

// Validate shift boundary rules:
// Lunch break: after shift 5 (11:30) → shift 6 starts at 13:00
// Evening break: after shift 10 (17:30) → shift 11 starts at 18:00
// No session should span across lunch (5→6) or dinner/evening (10→11) break
const INVALID_SPANS: Array<[number, number]> = [[5, 6], [10, 11]];

function isInvalidSpan(start: number, end: number): boolean {
    return INVALID_SPANS.some(([a, b]) => start <= a && end >= b);
}

// ── ScheduleRow Component ──────────────────────────────────────────────────

interface ScheduleRowProps {
    schedule: ScheduleEntry;
    index: number;
    rooms: Array<{ id: string; name: string; code?: string }>;
    disabled?: boolean;
    conflict?: string | null;
    availabilityMap?: {
        rooms: Record<string, Record<number, Record<number, string>>>;
    };
    onChange: (index: number, field: keyof ScheduleEntry, value: any) => void;
    onRemove: (index: number) => void;
}

const selectCls =
    "w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed";

export function ScheduleRow({
    schedule,
    index,
    rooms,
    disabled = false,
    conflict = null,
    availabilityMap,
    onChange,
    onRemove,
}: ScheduleRowProps) {
    const spanInvalid =
        schedule.startShift > schedule.endShift ||
        isInvalidSpan(schedule.startShift, schedule.endShift);

    return (
        <div
            className={`p-4 rounded-xl border transition-all ${
                spanInvalid || conflict
                    ? "border-rose-200 bg-rose-50"
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
            }`}
        >
            {(spanInvalid || conflict) && (
                <div className="flex flex-col gap-1 mb-2">
                    {spanInvalid && (
                        <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">
                            ⚠ Tiết học không hợp lệ (vượt giờ nghỉ trưa/tối hoặc tiết đầu &gt; tiết cuối)
                        </p>
                    )}
                    {conflict && (
                        <p className="text-[10px] font-bold text-rose-600 bg-rose-100/50 px-2 py-1 rounded inline-block uppercase tracking-wider">
                            ⚠ TRÙNG LỊCH: {conflict}
                        </p>
                    )}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                {/* Day of Week */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Thứ
                    </label>
                    <select
                        className={selectCls}
                        value={schedule.dayOfWeek}
                        disabled={disabled}
                        onChange={(e) =>
                            onChange(index, "dayOfWeek", parseInt(e.target.value))
                        }
                    >
                        {DAYS.map((d) => (
                            <option key={d.value} value={d.value}>
                                {d.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Start Shift */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Tiết bắt đầu
                    </label>
                    <select
                        className={selectCls}
                        value={schedule.startShift}
                        disabled={disabled}
                        onChange={(e) =>
                            onChange(index, "startShift", parseInt(e.target.value))
                        }
                    >
                        {SHIFTS.map((s) => (
                            <option key={s} value={s}>
                                Tiết {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* End Shift */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Tiết kết thúc
                    </label>
                    <select
                        className={selectCls}
                        value={schedule.endShift}
                        disabled={disabled}
                        onChange={(e) =>
                            onChange(index, "endShift", parseInt(e.target.value))
                        }
                    >
                        {SHIFTS.map((s) => (
                            <option key={s} value={s}>
                                Tiết {s}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Room */}
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                        Phòng học
                    </label>
                    <select
                        className={selectCls}
                        value={schedule.roomId}
                        disabled={disabled}
                        onChange={(e) => onChange(index, "roomId", e.target.value)}
                    >
                        <option value="">-- Chưa xếp phòng --</option>
                        {rooms.map((r) => {
                            const day = Number(schedule.dayOfWeek);
                            const occupiedBy = Array.from({ length: schedule.endShift - schedule.startShift + 1 }, (_, i) => schedule.startShift + i)
                                .map(t => availabilityMap?.rooms?.[r.id]?.[day]?.[t])
                                .find(name => !!name);

                            return (
                                <option key={r.id} value={r.id} className={occupiedBy ? "text-rose-500 font-bold" : ""}>
                                    {r.code ?? r.name} {occupiedBy ? `(Bận: ${occupiedBy})` : ""}
                                </option>
                            );
                        })}
                    </select>
                </div>

                {/* Type + Remove */}
                <div className="flex gap-2 items-end">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">
                            Loại
                        </label>
                        <select
                            className={selectCls}
                            value={schedule.type}
                            disabled={disabled}
                            onChange={(e) =>
                                onChange(index, "type", e.target.value as ScheduleEntry["type"])
                            }
                        >
                            <option value="THEORY">Lý thuyết</option>
                            <option value="PRACTICE">Thực hành</option>
                        </select>
                    </div>

                    {!disabled && (
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex-shrink-0"
                            title="Xóa buổi học này"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Shift info helper */}
            <div className="mt-2 text-[9px] text-slate-400 font-medium">
                {getShiftTimeLabel(schedule.startShift)} → {getShiftTimeLabel(schedule.endShift)}
                {" · "}
                {Math.max(0, schedule.endShift - schedule.startShift + 1)} tiết
            </div>
        </div>
    );
}

// ── Helper: shift → approximate time ──────────────────────────────────────

function getShiftTimeLabel(shift: number): string {
    const times: Record<number, string> = {
        1: "07:00",
        2: "07:50",
        3: "08:40",
        4: "09:30",
        5: "10:20",
        6: "13:00",
        7: "13:50",
        8: "14:40",
        9: "15:30",
        10: "16:20",
        11: "18:00",
        12: "18:50",
        13: "19:40",
        14: "20:30",
        15: "21:20",
        16: "22:10",
    };
    return times[shift] ?? `T${shift}`;
}
