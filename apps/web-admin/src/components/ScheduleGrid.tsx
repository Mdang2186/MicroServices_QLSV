"use client";

import React, { useMemo } from "react";

interface ScheduleGridProps {
    schedules: any[];
    color: "indigo" | "emerald";
    anchorDate: string;
    onOpenCourseClass?: (courseClassId: string) => void;
}

const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

const SHIFTS = Array.from({ length: 16 }, (_, index) => index + 1);
const ROW_HEIGHT = 40;

function toDateOnlyKey(value: Date | string) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function startOfWeek(dateValue: string) {
    const anchor = new Date(dateValue);
    anchor.setHours(0, 0, 0, 0);
    const day = anchor.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() + diff);
    return monday;
}

function addDays(base: Date, value: number) {
    const next = new Date(base);
    next.setDate(base.getDate() + value);
    return next;
}

function formatDayLabel(value: Date) {
    return `${DAYS[(value.getDay() + 6) % 7]} ${`${value.getDate()}`.padStart(2, "0")}/${`${value.getMonth() + 1}`.padStart(2, "0")}`;
}

function normalizeWeeklySessions(schedules: any[] = []) {
    const sorted = [...schedules]
        .filter((session) => session?.date && session?.startShift && session?.endShift)
        .sort((left, right) => {
            const leftDate = new Date(left.date).getTime();
            const rightDate = new Date(right.date).getTime();
            if (leftDate !== rightDate) return leftDate - rightDate;
            return Number(left.startShift || 0) - Number(right.startShift || 0);
        });

    return sorted.map((session) => ({
        key: `${session.id || session.courseClassId || session.date}-${session.startShift}-${session.endShift}`,
        courseClassId: session.courseClassId || session.courseClass?.id || null,
        dateKey: toDateOnlyKey(session.date),
        startShift: Number(session.startShift || 0),
        endShift: Number(session.endShift || 0),
        subjectName:
            session.courseClass?.subject?.name ||
            session.subjectName ||
            session.courseClass?.name ||
            "Lich day",
        courseCode: session.courseClass?.code || "",
        roomName: session.room?.name || "",
        type: `${session.type || "THEORY"}`.trim().toUpperCase(),
    }));
}

export default function ScheduleGrid({ schedules, color, anchorDate, onOpenCourseClass }: ScheduleGridProps) {
    const bgClass = "bg-white";
    const ringClass = "ring-slate-100";
    const borderClass = color === "indigo" ? "border-indigo-500/30 border-l-indigo-600" : "border-emerald-500/30 border-l-emerald-600";
    const textColor = color === "indigo" ? "text-indigo-900" : "text-emerald-900";

    const weekDays = useMemo(() => {
        const monday = startOfWeek(anchorDate);
        return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
    }, [anchorDate]);

    const sessionsByDate = useMemo(() => {
        const weeklySessions = normalizeWeeklySessions(schedules);
        const grouped = new Map<string, any[]>();

        weekDays.forEach((day) => {
            const key = toDateOnlyKey(day);
            grouped.set(
                key,
                weeklySessions.filter((session) => session.dateKey === key),
            );
        });

        return grouped;
    }, [schedules, weekDays]);

    const selectedDateKey = toDateOnlyKey(anchorDate);

    return (
        <div className="overflow-x-auto">
            <div className="min-w-[980px] rounded-[28px] border border-slate-200 bg-white shadow-inner">
                <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))] border-b border-slate-100 bg-slate-50/80">
                    <div className="px-3 py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        Ca
                    </div>
                    {weekDays.map((day) => (
                        <div
                            key={day.toISOString()}
                            className={`border-l border-slate-100 px-3 py-4 text-center ${
                                toDateOnlyKey(day) === selectedDateKey ? "bg-blue-50/70" : ""
                            }`}
                        >
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                                {formatDayLabel(day)}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-[72px_repeat(7,minmax(120px,1fr))]">
                    <div className="relative border-r border-slate-100 bg-slate-50/40" style={{ height: SHIFTS.length * ROW_HEIGHT }}>
                        {SHIFTS.map((shift, index) => (
                            <div
                                key={shift}
                                className="absolute inset-x-0 flex items-start justify-center border-t border-slate-100 pt-2"
                                style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                            >
                                <span className="text-[11px] font-black text-slate-400">{shift}</span>
                            </div>
                        ))}
                    </div>

                    {weekDays.map((day) => (
                        <div
                            key={day.toISOString()}
                            className={`relative border-l border-slate-100 ${
                                toDateOnlyKey(day) === selectedDateKey ? "bg-blue-50/20" : ""
                            }`}
                            style={{ height: SHIFTS.length * ROW_HEIGHT }}
                        >
                            {SHIFTS.map((shift, index) => (
                                <div
                                    key={`${toDateOnlyKey(day)}-${shift}`}
                                    className="absolute inset-x-0 border-t border-slate-100"
                                    style={{ top: index * ROW_HEIGHT, height: ROW_HEIGHT }}
                                />
                            ))}

                            {(sessionsByDate.get(toDateOnlyKey(day)) || []).map((pattern) => {
                                const clickable = Boolean(onOpenCourseClass && pattern.courseClassId);
                                const periods = pattern.endShift - pattern.startShift + 1;
                                const itemContent = (
                                    <>
                                        <p className={`truncate text-[11px] font-black uppercase tracking-tight leading-tight ${textColor}`}>
                                            {pattern.subjectName}
                                        </p>
                                        <p className="mt-0.5 truncate text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                            {pattern.courseCode}
                                        </p>
                                        <div className="mt-auto pt-1 flex items-center justify-between border-t border-slate-100 text-slate-500">
                                            <span className="text-[9px] font-black uppercase tracking-tight">
                                                {pattern.roomName || "PHÒNG ---"}
                                            </span>
                                            <span className="text-[9px] font-bold bg-slate-50 px-1.5 py-0.5 rounded-md uppercase border border-slate-100">
                                                Tiết {pattern.startShift}-{pattern.endShift}
                                            </span>
                                        </div>
                                    </>
                                );

                                const sharedClassName = `absolute left-1 right-1 overflow-hidden rounded-xl border-l-[4px] border border-slate-100 ${bgClass} p-2 flex flex-col transition-all shadow-sm`;
                                const style = {
                                    top: (pattern.startShift - 1) * ROW_HEIGHT + 2,
                                    height: periods * ROW_HEIGHT - 4,
                                };

                                if (clickable) {
                                    return (
                                        <button
                                            key={pattern.key}
                                            type="button"
                                            className={`${sharedClassName} cursor-pointer text-left hover:scale-[1.02] hover:shadow-lg hover:z-10 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-white/50`}
                                            style={style}
                                            onClick={() => onOpenCourseClass?.(pattern.courseClassId)}
                                        >
                                            {itemContent}
                                        </button>
                                    );
                                }

                                return (
                                    <div key={pattern.key} className={sharedClassName} style={style}>
                                        {itemContent}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
