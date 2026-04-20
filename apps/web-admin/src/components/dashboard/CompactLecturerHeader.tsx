"use client";

import { ShieldCheck, ChevronRight, Zap, GraduationCap, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Semester {
    id: string;
    selectionKey?: string;
    code?: string;
    name: string;
    isCurrent: boolean;
    startDate?: string;
    endDate?: string;
}

function normalizeLabel(value?: string) {
    return `${value || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}

function formatSemesterOptionLabel(semester: Semester) {
    const code = `${semester.code || ""}`.trim();
    const name = `${semester.name || ""}`.trim();
    const codeTail = code.split("_").pop() || code;

    if (!code) return name || "Học kỳ";
    if (!name) return code;
    if (
        normalizeLabel(name).includes(normalizeLabel(code)) ||
        normalizeLabel(name).includes(normalizeLabel(codeTail))
    ) {
        return name;
    }
    return `${name} (${code})`;
}

function isPastOrCurrentSemester(semester: Semester) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = semester.startDate ? new Date(semester.startDate) : null;
    const endDate = semester.endDate ? new Date(semester.endDate) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);

    if (semester.isCurrent) return true;
    if (startDate && startDate <= today) return true;
    if (endDate && endDate <= today) return true;

    return false;
}

interface CompactLecturerHeaderProps {
    userName: string;
    userId?: string;
    minimal?: boolean;
    title?: string;
    onSemesterChange: (id: string) => void;
    selectedSemesterId?: string;
    semesterOptions?: Semester[];
    hideSemester?: boolean;
    semesterFilter?: "past-current" | "all";
}

export function CompactLecturerHeader({
    userName,
    userId,
    minimal = false,
    title,
    onSemesterChange,
    selectedSemesterId: selectedSemesterIdProp,
    semesterOptions: semesterOptionsProp,
    hideSemester = false,
    semesterFilter = "past-current",
}: CompactLecturerHeaderProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");

    const fetchSemesters = async () => {
        if (semesterOptionsProp?.length) {
            const filteredSemesters =
                semesterFilter === "all"
                    ? semesterOptionsProp
                    : semesterOptionsProp.filter(isPastOrCurrentSemester);
            const safeSemesters = filteredSemesters.length > 0 ? filteredSemesters : semesterOptionsProp;
            setSemesters(safeSemesters);
            const current =
                (selectedSemesterIdProp
                    ? safeSemesters.find((s) => (s.selectionKey || s.id) === selectedSemesterIdProp)
                    : null) || semesterOptionsProp[0];
            if (current) {
                const value = current.selectionKey || current.id;
                setSelectedSemesterId(value);
                onSemesterChange(value);
            }
            return;
        }

        try {
            const r = await fetch("/api/semesters");
            const data = await r.json();
            if (Array.isArray(data)) {
                const filteredSemesters =
                    semesterFilter === "all"
                        ? data
                        : data.filter((semester: Semester) =>
                            isPastOrCurrentSemester(semester),
                        );
                const safeSemesters = filteredSemesters.length > 0 ? filteredSemesters : data;
                setSemesters(safeSemesters);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const current =
                    (selectedSemesterIdProp
                        ? safeSemesters.find((s: Semester) => (s.selectionKey || s.id) === selectedSemesterIdProp)
                        : null) ||
                    safeSemesters.find((s: Semester) => {
                        const startDate = s.startDate ? new Date(s.startDate) : null;
                        const endDate = s.endDate ? new Date(s.endDate) : null;
                        if (!startDate || !endDate) return false;
                        startDate.setHours(0, 0, 0, 0);
                        endDate.setHours(0, 0, 0, 0);
                        return today >= startDate && today <= endDate;
                    }) ||
                    safeSemesters.find((s: Semester) => s.isCurrent) ||
                    safeSemesters[0];
                if (current) {
                    const value = current.selectionKey || current.id;
                    setSelectedSemesterId(value);
                    onSemesterChange(value);
                }
            }
        } catch (err) {
            console.error("Failed to fetch semesters:", err);
        }
    };

    useEffect(() => {
        fetchSemesters();
    }, [selectedSemesterIdProp, semesterOptionsProp]);

    useEffect(() => {
        if (selectedSemesterIdProp) {
            setSelectedSemesterId(selectedSemesterIdProp);
        }
    }, [selectedSemesterIdProp]);

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

            {!hideSemester && (
                <div className="flex items-center gap-3 self-end md:self-center">
                    <div className="relative">
                        <select 
                            value={selectedSemesterId}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className="min-w-[280px] appearance-none bg-slate-50 pl-9 pr-10 py-2.5 rounded-xl border border-slate-100 text-[11px] font-black text-slate-600 hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/10 transition-all cursor-pointer shadow-sm"
                        >
                            {semesters.map(s => (
                                <option key={s.selectionKey || s.id} value={s.selectionKey || s.id}>
                                    {formatSemesterOptionLabel(s)}{s.isCurrent ? " ★" : ""}
                                </option>
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
            )}
        </div>
    );
}
