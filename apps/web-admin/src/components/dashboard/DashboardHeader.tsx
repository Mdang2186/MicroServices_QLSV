"use client";

import { ShieldCheck, ChevronRight, Activity, Zap, Building2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Semester {
    id: string;
    name: string;
    isCurrent: boolean;
}

interface Faculty {
    id: string;
    name: string;
}

interface DashboardHeaderProps {
    roleName: string;
    userName: string;
    userId?: string;
    onSemesterChange: (id: string) => void;
    onFacultyChange?: (id: string) => void;
}

export function DashboardHeader({ roleName, userName, userId, onSemesterChange, onFacultyChange }: DashboardHeaderProps) {
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");

    useEffect(() => {
        // Fetch Semesters
        fetch("/api/students/dashboard/semesters")
            .then(r => r.json())
            .then(data => {
                setSemesters(data);
                const current = data.find((s: Semester) => s.isCurrent);
                if (current) setSelectedSemesterId(current.id);
            })
            .catch(console.error);

        // Fetch Faculties if callback provided
        if (onFacultyChange) {
            fetch("/api/students/dashboard/faculties") // Corrected path
                .then(r => r.json())
                .then(data => setFaculties(Array.isArray(data) ? data : []))
                .catch(() => setFaculties([]));
        }
    }, [onFacultyChange]);

    const handleSemesterChange = (id: string) => {
        setSelectedSemesterId(id);
        onSemesterChange(id);
    };

    const handleFacultyChange = (id: string) => {
        setSelectedFacultyId(id);
        onFacultyChange?.(id);
    };

    const now = new Date().toLocaleDateString("vi-VN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Breadcrumb & Global Info */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
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
                    {/* Faculty Selector (Optional) */}
                    {onFacultyChange && (
                        <div className="relative group">
                            <select 
                                value={selectedFacultyId}
                                onChange={(e) => handleFacultyChange(e.target.value)}
                                className="appearance-none bg-white pl-10 pr-12 py-3 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
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

                    {/* Semester Selector */}
                    <div className="relative group">
                        <select 
                            value={selectedSemesterId}
                            onChange={(e) => handleSemesterChange(e.target.value)}
                            className="appearance-none bg-white px-6 py-3 pr-12 rounded-2xl border border-slate-100 shadow-sm text-[11px] font-black text-slate-600 uppercase tracking-widest hover:border-uneti-blue focus:outline-none focus:ring-2 focus:ring-uneti-blue/20 transition-all cursor-pointer"
                        >
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

            {/* Welcome Banner */}
            <div className="relative group overflow-hidden rounded-[32px] bg-white border border-slate-100 shadow-xl shadow-slate-200/20 p-8 sm:p-10">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-uneti-blue/5 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-8">
                        <div className="relative">
                            <div className="w-20 h-20 rounded-[30px] bg-uneti-blue text-white flex items-center justify-center font-black text-3xl shadow-2xl shadow-uneti-blue/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                {userName?.charAt(0).toUpperCase() || "U"}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 border-4 border-white rounded-full shadow-sm"></div>
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">
                                Chào buổi làm việc, <br />
                                <span className="text-uneti-blue">{userName}</span>
                            </h2>
                            {userId && (
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mt-2">
                                    <Zap size={14} className="text-emerald-500" />
                                    Mã định danh: {userId}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
