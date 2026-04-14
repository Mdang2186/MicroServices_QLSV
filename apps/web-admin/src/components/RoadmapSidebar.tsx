"use client";
import React, { useState } from "react";
import { 
  ChevronRight, ChevronDown, Filter, 
  Layers, Calendar, Bookmark, CheckCircle2 
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface RoadmapSidebarProps {
  majors: any[];
  selectedMajorId: string;
  onMajorChange: (id: string) => void;
  cohorts: string[];
  selectedCohort: string;
  onCohortChange: (c: string) => void;
  semesters: any[];
  selectedSemesterId: string;
  onSemesterChange: (id: string, cohort: string, conceptualIndex: number) => void;
}

const COHORT_START_YEARS: Record<string, number> = {
  K17: 2023, K18: 2024, K19: 2025, K20: 2026, K21: 2027, K22: 2028,
};

export default function RoadmapSidebar({
  majors,
  selectedMajorId,
  onMajorChange,
  cohorts,
  selectedCohort,
  onCohortChange,
  semesters,
  selectedSemesterId,
  onSemesterChange
}: RoadmapSidebarProps) {
  const [expandedCohorts, setExpandedCohorts] = useState<string[]>([selectedCohort]);
  const [expandedYears, setExpandedYears] = useState<string[]>([]);

  const toggleCohort = (c: string) => {
    setExpandedCohorts(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c]);
  };

  const toggleYear = (y: string) => {
    setExpandedYears(p => p.includes(y) ? p.filter(x => x !== y) : [...p, y]);
  };

  const currentMajor = majors.find(m => m.id === selectedMajorId);

  return (
    <div className="w-80 shrink-0 bg-white border-r border-slate-100 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-50">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
            <Filter size={18} strokeWidth={2.5} />
          </div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Academic Roadmap</h2>
        </div>

        <div className="relative group">
          <select 
            value={selectedMajorId}
            onChange={(e) => onMajorChange(e.target.value)}
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 outline-none hover:border-indigo-200 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            {majors.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-indigo-600 transition-colors">
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* Tree content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
        {cohorts.map(c => {
          const isExp = expandedCohorts.includes(c);
          const startYear = COHORT_START_YEARS[c] || 2024;
          const endYear = startYear + 4;

          return (
            <div key={c} className="space-y-1">
              {/* Cohort Item */}
              <button 
                onClick={() => toggleCohort(c)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-4 rounded-2xl transition-all group",
                  isExp ? "bg-slate-50 text-indigo-600" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <div className="flex items-center gap-3">
                  <Layers size={18} className={isExp ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"} />
                  <span className="text-xs font-black uppercase tracking-wider">Khóa {c} ({startYear} - {endYear})</span>
                </div>
                {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} className="text-slate-300" />}
              </button>

              {/* Years under Cohort */}
              {isExp && (
                <div className="pl-6 space-y-1 animate-in slide-in-from-top-2 duration-200">
                  {[1, 2, 3, 4].map(y => {
                    const yearKey = `${c}-Y${y}`;
                    const isYearExp = expandedYears.includes(yearKey);
                    const yearStart = startYear + y - 1;
                    const yearEnd = yearStart + 1;
                    
                    // Filter semesters that match this year for this cohort
                    const yearSems = semesters.filter(s => s.year === yearStart || (s.name && s.name.includes(`${yearStart}-${yearEnd}`)));

                    return (
                      <div key={yearKey} className="space-y-1">
                        <button 
                          onClick={() => toggleYear(yearKey)}
                          className={cn(
                            "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all border border-transparent",
                            isYearExp ? "bg-white border-slate-100 shadow-sm text-emerald-600" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Calendar size={16} className={isYearExp ? "text-emerald-500" : "text-slate-400"} />
                            <span className="text-[11px] font-bold">NĂM {y} ({yearStart} - {yearEnd})</span>
                          </div>
                          {isYearExp ? <ChevronDown size={14} /> : <ChevronRight size={14} className="text-slate-200" />}
                        </button>

                        {/* Semesters under Year */}
                        {isYearExp && (
                          <div className="pl-4 space-y-1 border-l-2 border-slate-50 ml-6 pb-2">
                            {[1, 2].map(num => {
                                const semNum = (y - 1) * 2 + num;
                                // Find if this semester is already created/linked
                                // For now we just show "Học kỳ 1", "Học kỳ 2" based on year progress
                                // Direct mapping from the chronologically sorted 'semesters' prop
                                const sem = semesters[semNum - 1];
                                const semId = sem?.id;

                                const isActive = selectedSemesterId === semId && selectedCohort === c;

                                return (
                                    <button 
                                        key={`${yearKey}-S${num}`}
                                        onClick={() => {
                                            if (semId) onSemesterChange(semId, c, semNum);
                                        }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                                            isActive 
                                              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105 z-10" 
                                              : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/50"
                                        )}
                                    >
                                        <Bookmark size={14} className={isActive ? "text-indigo-200" : "text-amber-400"} />
                                        <span className="text-[11px] font-black uppercase tracking-tight">Học kỳ {num}</span>
                                        {isActive && <CheckCircle2 size={12} className="ml-auto text-indigo-200" />}
                                    </button>
                                )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-slate-50 border-t border-slate-100">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Đang chọn</p>
            <p className="text-xs font-black text-slate-800 line-clamp-1">{currentMajor?.name || "???"}</p>
            <p className="text-[10px] font-bold text-indigo-600 mt-1">{selectedCohort} · Học kỳ triển khai</p>
        </div>
      </div>
    </div>
  );
}
