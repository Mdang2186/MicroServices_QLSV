"use client";

import React from "react";

interface ScheduleGridProps {
    schedules: any[];
    color: "indigo" | "emerald";
}

export default function ScheduleGrid({ schedules, color }: ScheduleGridProps) {
    const DAYS = [2, 3, 4, 5, 6, 7, 8];
    const SHIFTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

    const isBusy = (day: number, shift: number) => {
        return (schedules as any[])?.some(s => s.dayOfWeek === day && shift >= s.startShift && shift <= s.endShift);
    };

    const bgClass = color === "indigo" ? "bg-indigo-500" : "bg-emerald-500";

    return (
        <div className="border border-slate-100 rounded-lg overflow-hidden bg-white shadow-inner p-1">
            <div className="grid grid-cols-[20px_repeat(7,1fr)] gap-px bg-slate-50">
                <div />
                {DAYS.map(d => (
                    <div key={d} className="text-[8px] font-bold text-slate-400 text-center py-1 uppercase">{d === 8 ? 'CN' : `T${d}`}</div>
                ))}
                {SHIFTS.map(s => (
                    <div key={`row-${s}`} className="contents">
                        <div className="text-[8px] font-bold text-slate-300 text-center flex items-center justify-center">{s}</div>
                        {DAYS.map(d => {
                            const busy = isBusy(d, s);
                            return (
                                <div key={`${d}-${s}`} className={`h-2.5 rounded-sm transition-all ${busy ? `${bgClass} opacity-80 scale-95 shadow-sm` : 'bg-slate-100/50 hover:bg-slate-200/50'}`} title={busy ? "Có lịch" : "Trống"} />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
