"use client";

import { ShieldCheck, ChevronRight, Activity, Zap, Building2, GraduationCap, Compass, CalendarDays, Search, Users, BookOpen } from "lucide-react";
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
    onDateChange?: (date: string) => void;
    onSemesterChange?: (semesterId: string) => void;
    onKeywordChange?: (keyword: string) => void;
    onFacultyChange?: (id: string) => void;
    onMajorChange?: (id: string) => void;
    onIntakeChange?: (id: string) => void;
    onQuickAction?: (action: string) => void;
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

export function DashboardHeader({ 
    roleName, 
    userName, 
    userId, 
    onDateChange, 
    onSemesterChange,
    onKeywordChange,
    onFacultyChange, 
    onMajorChange, 
    onIntakeChange,
    onQuickAction 
}: DashboardHeaderProps) {
    const [faculties, setFaculties] = useState<FilterItem[]>([]);
    const [majors, setMajors] = useState<FilterItem[]>([]);
    const [intakes, setIntakes] = useState<FilterItem[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);

    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [keyword, setKeyword] = useState<string>("");
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("all");
    const [selectedMajorId, setSelectedMajorId] = useState<string>("all");
    const [selectedIntake, setSelectedIntake] = useState<string>("all");

    useEffect(() => {
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

    const handleDateChange = (date: string) => {
        setSelectedDate(date);
        onDateChange?.(date);
    };

    const handleKeywordChange = (val: string) => {
        setKeyword(val);
        onKeywordChange?.(val);
    };

    const handleSemesterChange = (semesterId: string) => {
        setSelectedSemesterId(semesterId);
        onSemesterChange?.(semesterId);
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
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Top Bar: Profile & Date */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-900 font-extrabold uppercase tracking-[0.2em] mb-1">
                        <ShieldCheck size={14} className="text-uneti-blue" />
                        <span>{roleName}</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Bảng điều khiển</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hệ thống Điều hành</h1>
                        <div className="bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1.5 border border-emerald-100/50">
                            <Activity size={10} className="text-emerald-500 animate-pulse" />
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Real-time</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white p-2 rounded-[24px] border border-slate-100 shadow-sm">
                    {onDateChange ? (
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                            <CalendarDays size={16} className="text-uneti-blue" />
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-black text-slate-950 uppercase tracking-widest outline-none cursor-pointer"
                            />
                        </div>
                    ) : (
                        <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100/50">
                            <CalendarDays size={16} className="text-uneti-blue" />
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-transparent border-none text-[11px] font-black text-slate-950 uppercase tracking-widest outline-none cursor-pointer"
                            />
                        </div>
                    )}
                    <div className="h-8 w-[1px] bg-slate-100 hidden sm:block"></div>
                    <div className="hidden sm:flex flex-col items-end px-4">
                        <p className="text-[9px] font-black text-slate-950 uppercase tracking-widest leading-none mb-1">{userName}</p>
                        <p className="text-[10px] font-bold text-slate-900 leading-none">{userId}</p>
                    </div>
                </div>
            </div>

            {/* Main Filters & Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
                {/* Filters Column */}
                <div className="xl:col-span-8 bg-white p-4 rounded-[32px] border border-slate-100 shadow-sm flex flex-wrap items-center gap-4">
                    {/* Universal Search */}
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                            type="text" 
                            placeholder="Tìm kiếm sinh viên, lớp học, từ khóa..."
                            value={keyword}
                            onChange={(e) => handleKeywordChange(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-[11px] font-bold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-uneti-blue/10 transition-all outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {/* Faculty */}
                        <div className="relative">
                            <select
                                value={selectedFacultyId}
                                onChange={(e) => handleFacultyChange(e.target.value)}
                                className="appearance-none bg-slate-50 pl-10 pr-10 py-3 rounded-2xl text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer outline-none min-w-[140px]"
                            >
                                <option value="all">Tất cả Khoa</option>
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-uneti-blue" size={14} />
                        </div>

                        {/* Major */}
                        <div className="relative">
                            <select
                                value={selectedMajorId}
                                onChange={(e) => handleMajorChange(e.target.value)}
                                className="appearance-none bg-slate-50 pl-10 pr-10 py-3 rounded-2xl text-[10px] font-black text-slate-950 uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer outline-none min-w-[140px]"
                            >
                                <option value="all">Tất cả Ngành</option>
                                {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                            <Compass className="absolute left-3.5 top-1/2 -translate-y-1/2 text-uneti-blue" size={14} />
                        </div>

                         {/* Intake */}
                         <div className="relative">
                            <select
                                value={selectedIntake}
                                onChange={(e) => handleIntakeChange(e.target.value)}
                                className="appearance-none bg-slate-50 pl-10 pr-10 py-3 rounded-2xl text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-100 transition-all cursor-pointer outline-none min-w-[120px]"
                            >
                                <option value="all">Khóa học</option>
                                {intakes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                            <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 text-uneti-blue" size={14} />
                        </div>
                    </div>
                </div>

                {/* Quick Actions Column */}
                <div className="xl:col-span-4 bg-slate-900 p-4 rounded-[32px] shadow-lg flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 pl-2">
                        <div className="w-8 h-8 rounded-xl bg-uneti-blue flex items-center justify-center text-white shadow-lg shadow-uneti-blue/20">
                            <Zap size={16} />
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-[9px] font-black text-uneti-blue uppercase tracking-widest leading-none mb-1">Thao tác nhanh</p>
                            <p className="text-[10px] font-bold text-white leading-none capitalize">Xử lý ngay</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {[
                            { id: 'student', label: 'Sinh viên', icon: Users },
                            { id: 'class', label: 'Lớp học', icon: BookOpen },
                        ].map(btn => (
                            <button
                                key={btn.id}
                                onClick={() => onQuickAction?.(btn.id)}
                                className="px-4 py-2.5 bg-white/10 hover:bg-uneti-blue text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all group"
                            >
                                <btn.icon size={12} className="group-hover:scale-120 transition-transform" />
                                <span className="hidden sm:inline">{btn.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
