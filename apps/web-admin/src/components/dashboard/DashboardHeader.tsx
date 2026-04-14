"use client";

import { ShieldCheck, ChevronRight, Activity, Zap, Building2, GraduationCap, Compass } from "lucide-react";
import { useEffect, useState } from "react";

interface Semester {
    id: string;
    name: string;
    isCurrent: boolean;
}

interface FilterItem {
    id: string;
    name: string;
}

interface DashboardHeaderProps {
    roleName: string;
    userName: string;
    userId?: string;
    onSemesterChange: (id: string) => void;
    onFacultyChange?: (id: string) => void;
    onMajorChange?: (id: string) => void;
    onIntakeChange?: (id: string) => void;
}

async function readJsonSafely(response: Response) {
    const rawText = await response.text();
    if (!rawText) return null;
    try {
        return JSON.parse(rawText);
    } catch {
        return null;
    }
}

export function DashboardHeader({ roleName, userName, userId, onSemesterChange, onFacultyChange, onMajorChange, onIntakeChange }: DashboardHeaderProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [faculties, setFaculties] = useState<FilterItem[]>([]);
    const [majors, setMajors] = useState<FilterItem[]>([]);
    const [intakes, setIntakes] = useState<FilterItem[]>([]);

    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
    const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
    const [selectedIntake, setSelectedIntake] = useState<string>("all");

    useEffect(() => {
        // Fetch Semesters
        fetch("/api/students/dashboard/semesters")
            .then(async (response) => {
                const payload = await readJsonSafely(response);
                return response.ok && Array.isArray(payload) ? payload : [];
            })
            .then(data => {
                setSemesters(data);
                const current = data.find((s: Semester) => s.isCurrent);
                if (current) {
                    setSelectedSemesterId(current.id);
                    onSemesterChange(current.id);
                }
            })
            .catch(console.error);

        // Fetch Faculties
        if (onFacultyChange) {
            fetch("/api/students/dashboard/faculties")
                .then(async (response) => {
                    const payload = await readJsonSafely(response);
                    setFaculties(response.ok && Array.isArray(payload) ? payload : []);
                })
                .catch(() => setFaculties([]));
        }

        // Fetch Intakes
        if (onIntakeChange) {
            fetch("/api/students/dashboard/intakes")
                .then(async (response) => {
                    const payload = await readJsonSafely(response);
                    setIntakes(response.ok && Array.isArray(payload) ? payload : []);
                })
                .catch(() => setIntakes([]));
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Dependent fetch for Majors based on Faculty
    useEffect(() => {
        if (onMajorChange) {
            const url = selectedFacultyId && selectedFacultyId !== "all" 
                ? `/api/students/dashboard/majors?facultyId=${selectedFacultyId}` 
                : `/api/students/dashboard/majors`;
            fetch(url)
                .then(async (response) => {
                    const payload = await readJsonSafely(response);
                    setMajors(response.ok && Array.isArray(payload) ? payload : []);
                })
                .catch(() => setMajors([]));
        }
    }, [selectedFacultyId, onMajorChange]);

    const handleSemesterChange = (id: string) => {
        setSelectedSemesterId(id);
        onSemesterChange(id);
    };

    const handleFacultyChange = (id: string) => {
        setSelectedFacultyId(id);
        setSelectedMajorId("all"); // Reset major when faculty changes
        onFacultyChange?.(id);
        onMajorChange?.("all");
    };

    const handleMajorChange = (id: string) => {
        setSelectedMajorId(id);
        onMajorChange?.(id);
    };

    const handleIntakeChange = (id: string) => {
        setSelectedIntake(id);
        onIntakeChange?.(id);
    };

    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Breadcrumb & Global Info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1 mb-8 border-b pb-6 border-slate-100">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <ShieldCheck size={14} className="text-uneti-blue" />
                        <span>{roleName}</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Bảng điều khiển</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hệ thống Điều hành</h1>
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                            <Activity size={12} className="text-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest leading-none">Real-time</span>
                        </div>
                    </div>
                    <p className="text-[13px] font-medium text-slate-500 italic opacity-80">{now}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Semester Selector */}
                    <div className="relative group">
                        <select
                            value={selectedSemesterId}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className="appearance-none bg-white px-6 py-3 pr-12 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
                        >
                            <option value="">-- Chọn Kỳ học --</option>
                            {semesters.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.isCurrent ? "(Hiện tại)" : ""}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sub Filters Row */}
            <div className="flex flex-wrap items-center gap-4">
                 {/* Faculty Selector */}
                 {onFacultyChange && (
                    <div className="relative group min-w-[200px]">
                        <select
                            value={selectedFacultyId}
                            onChange={(e) => handleFacultyChange(e.target.value)}
                            className="w-full appearance-none bg-white pl-10 pr-12 py-3 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
                        >
                            <option value="all">Tất cả Khoa</option>
                            {faculties.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-uneti-blue">
                            <Building2 size={14} />
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                )}

                {/* Major Selector */}
                {onMajorChange && (
                    <div className="relative group min-w-[200px]">
                        <select
                            value={selectedMajorId}
                            onChange={(e) => handleMajorChange(e.target.value)}
                            className="w-full appearance-none bg-white pl-10 pr-12 py-3 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
                        >
                            <option value="all">Tất cả Ngành</option>
                            {majors.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-uneti-blue">
                            <Compass size={14} />
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                )}

                {/* Intake Selector */}
                {onIntakeChange && (
                    <div className="relative group min-w-[160px]">
                        <select
                            value={selectedIntake}
                            onChange={(e) => handleIntakeChange(e.target.value)}
                            className="w-full appearance-none bg-white pl-10 pr-12 py-3 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
                        >
                            <option value="all">Tất cả Khóa</option>
                            {intakes.map(i => (
                                <option key={i.id} value={i.id}>{i.name}</option>
                            ))}
                        </select>
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-uneti-blue">
                            <GraduationCap size={14} />
                        </div>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronRight size={14} className="rotate-90" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
