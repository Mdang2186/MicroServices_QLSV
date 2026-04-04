"use client";

import React, { useState, useMemo } from "react";
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval, 
    isSameMonth, 
    isSameDay, 
    addMonths, 
    subMonths,
    isToday
} from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface Session {
    id: string;
    date: string | Date;
    type: string;
    startShift: number;
    endShift: number;
    roomId?: string;
    room?: { name: string };
    note?: string;
}

interface ScheduleCalendarProps {
    sessions: Session[];
    onDateClick: (date: string) => void;
    onSessionClick: (session: Session) => void;
}

const SESSION_COLORS: Record<string, string> = {
    THEORY: "bg-indigo-500",
    PRACTICE: "bg-emerald-500",
    EXAM: "bg-rose-500",
    MAKEUP: "bg-amber-500"
};

const SESSION_LABELS: Record<string, string> = {
    THEORY: "LT",
    PRACTICE: "TH",
    EXAM: "THI",
    MAKEUP: "BÙ"
};

export default function ScheduleCalendar({ sessions, onDateClick, onSessionClick }: ScheduleCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [currentMonth]);

    const sessionMap = useMemo(() => {
        const map: Record<string, Session[]> = {};
        sessions.forEach(s => {
            const d = format(new Date(s.date), "yyyy-MM-dd");
            if (!map[d]) map[d] = [];
            map[d].push(s);
        });
        return map;
    }, [sessions]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(subMonths(currentMonth, 1));
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentMonth(addMonths(currentMonth, 1));
    };

    const weekDays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

    return (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                    <CalendarIcon size={18} className="text-indigo-600" />
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-tight">
                        {format(currentMonth, "MMMM yyyy", { locale: vi })}
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button 
                        onClick={() => setCurrentMonth(new Date())}
                        className="px-3 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-white rounded-lg transition-all"
                    >
                        Hôm nay
                    </button>
                    <button 
                        onClick={handleNextMonth}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-lg border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 bg-white border-b border-slate-50">
                {weekDays.map(day => (
                    <div key={day} className="py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-slate-100">
                {days.map((day, i) => {
                    const dateKey = format(day, "yyyy-MM-dd");
                    const daySessions = sessionMap[dateKey] || [];
                    const isOutside = !isSameMonth(day, currentMonth);
                    const isTodayDay = isToday(day);

                    return (
                        <div 
                            key={i} 
                            onClick={() => onDateClick(dateKey)}
                            className={cn(
                                "min-h-[100px] bg-white p-2 transition-all cursor-pointer hover:bg-slate-50/80 group relative",
                                isOutside && "bg-slate-50/40 opacity-40",
                                isTodayDay && "ring-1 ring-inset ring-indigo-500/20 bg-indigo-50/10"
                            )}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <span className={cn(
                                    "text-[11px] font-black w-6 h-6 flex items-center justify-center rounded-lg transition-colors",
                                    isTodayDay ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-slate-400 group-hover:text-slate-700"
                                )}>
                                    {format(day, "d")}
                                </span>
                                {daySessions.length > 0 && (
                                    <span className="text-[8px] font-bold text-indigo-400 bg-indigo-50 px-1 rounded">
                                        {daySessions.length} buổi
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1 overflow-hidden">
                                {daySessions.map((s, idx) => (
                                    <button
                                        key={s.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onSessionClick(s);
                                        }}
                                        className={cn(
                                            "w-full text-left px-1.5 py-1 rounded-md border text-[9px] font-bold truncate transition-all shadow-sm",
                                            "hover:scale-[1.02] active:scale-[0.98]",
                                            s.type === 'EXAM' ? "bg-rose-50 border-rose-100 text-rose-700" :
                                            s.type === 'THEORY' ? "bg-indigo-50 border-indigo-100 text-indigo-700" :
                                            "bg-emerald-50 border-emerald-100 text-emerald-700"
                                        )}
                                        title={`${s.type}: Tiết ${s.startShift}-${s.endShift}`}
                                    >
                                        <div className="flex items-center gap-1">
                                            <div className={cn("w-1 h-1 rounded-full shrink-0", SESSION_COLORS[s.type] || "bg-slate-400")} />
                                            <span>T.{s.startShift}-{s.endShift}</span>
                                        </div>
                                    </button>
                                ))}
                                {daySessions.length > 3 && (
                                    <div className="text-[8px] text-center font-bold text-slate-300 italic">
                                        + {daySessions.length - 3} buổi khác
                                    </div>
                                )}
                            </div>
                            
                            {/* Hover info for empty days */}
                            {!daySessions.length && !isOutside && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/40 pointer-events-none">
                                    <div className="p-1 px-2 bg-indigo-600 text-white rounded text-[8px] font-black uppercase tracking-tighter">
                                        + Thêm buổi
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="px-6 py-3 border-t border-slate-50 bg-slate-50/30 flex items-center gap-6">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Info size={12} className="text-slate-300" /> Chú thích:
                </span>
                <div className="flex items-center gap-4">
                    {Object.entries(SESSION_COLORS).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <div className={cn("w-2 h-2 rounded-full", color)} />
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{type === 'THEORY' ? "Lý thuyết" : type === 'PRACTICE' ? "Thực hành" : type === 'EXAM' ? "Thi" : "Khác"}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
