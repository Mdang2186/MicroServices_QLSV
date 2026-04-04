"use client";

import { ShieldCheck, ChevronRight, Zap, GraduationCap, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Semester {
    id: string;
    name: string;
    isCurrent: boolean;
}

interface CompactLecturerHeaderProps {
    userName: string;
    userId?: string;
    minimal?: boolean;
    title?: string;
    onSemesterChange: (id: string) => void;
}

export function CompactLecturerHeader({ userName, userId, minimal = false, title, onSemesterChange }: CompactLecturerHeaderProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    useEffect(() => {
        let isMounted = true;
        
        fetch("/api/students/dashboard/semesters")
            .then(r => r.ok ? r.json() : [])
            .then(data => {
                if (!isMounted || !Array.isArray(data)) return;
                setSemesters(data);
                const current = data.find((s: Semester) => s.isCurrent) || data[0];
                if (current) {
                    setSelectedSemesterId(current.id);
                    onSemesterChange(current.id);
                }
            })
            .catch(err => {
                console.error("Failed to fetch semesters:", err);
                if (isMounted) setSemesters([]);
            });
            
        return () => { isMounted = false; };
    }, []);

    const handleSemesterChange = (id: string) => {
        setSelectedSemesterId(id);
        onSemesterChange(id);
    };

    return (
        <div className={cn(
            "flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-100 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-500",
            minimal ? "p-3 px-5 py-2.5" : "p-4"
        )}>
            {!minimal ? (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-uneti-blue text-white flex items-center justify-center font-black text-xl shadow-lg shadow-uneti-blue/20">
                        {userName?.charAt(0).toUpperCase() || "L"}
                    </div>
                    <div className="space-y-0.5">
                        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            <ShieldCheck size={12} className="text-uneti-blue" />
                            <span>Giảng viên Portal</span>
                            <ChevronRight size={8} />
                            <span className="text-uneti-blue">Bảng điều khiển</span>
                        </div>
                        <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">
                            Chào {userName}
                        </h1>
                        {userId && (
                            <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 opacity-80">
                                <Zap size={12} className="text-emerald-500" />
                                {userId}
                            </p>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-4 py-1">
                    <div className="p-2 rounded-lg bg-uneti-blue-light text-uneti-blue">
                        <Zap size={16} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Chức năng</span>
                        <h1 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                            {title || "Quản lý hệ thống"}
                        </h1>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 self-end md:self-center">
                <div className="relative">
                    <select 
                        value={selectedSemesterId}
                        onChange={(e) => handleSemesterChange(e.target.value)}
                        className="appearance-none bg-slate-50 pl-9 pr-10 py-2.5 rounded-xl border border-slate-100 text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/10 transition-all cursor-pointer shadow-sm"
                    >
                        {semesters.map(s => (
                            <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "★" : ""}</option>
                        ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-uneti-blue">
                        <CalendarDays size={14} />
                    </div>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <ChevronRight size={14} className="rotate-90" />
                    </div>
                </div>
            </div>
        </div>
    );
}
