import React, { useState, useMemo } from 'react';
import { 
  Building2, GraduationCap, Users, Calendar, 
  ChevronRight, ChevronDown, Search, FolderOpen,
  LayoutList
} from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming this exists, if not I will use simple template strings

interface CourseTreeSidebarProps {
  selectedSemesterId: string;
  setSelectedSemesterId: (id: string) => void;
  selectedFacultyId: string;
  setSelectedFacultyId: (id: string) => void;
  selectedMajorId: string;
  setSelectedMajorId: (id: string) => void;
  selectedCohort: string;
  setSelectedCohort: (cohort: string) => void;
  semesters: any[];
  onRefresh?: () => void;
}

const COHORTS = ["K17", "K18", "K19", "K20", "K21", "K22"];
const COHORT_START_YEARS: Record<string, number> = {
  K17: 2023, K18: 2024, K19: 2025, K20: 2026, K21: 2027, K22: 2028,
};

export default function CourseTreeSidebar({ 
  selectedSemesterId,
  setSelectedSemesterId,
  selectedFacultyId,
  setSelectedFacultyId,
  selectedMajorId,
  setSelectedMajorId,
  selectedCohort,
  setSelectedCohort,
  semesters,
  onRefresh
}: CourseTreeSidebarProps) {
  const [faculties, setFaculties] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  
  React.useEffect(() => {
    const fetchStructure = async () => {
        try {
            const [fRes, mRes] = await Promise.all([
                fetch('/api/faculties').then(r => r.json()),
                fetch('/api/majors').then(r => r.json())
            ]);
            setFaculties(fRes);
            setMajors(mRes);
        } catch (e) {
            console.error("Tree fetch failed", e);
        }
    };
    fetchStructure();
  }, []);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const toggle = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredFaculties = useMemo(() => {
    if (!searchTerm) return faculties;
    const s = searchTerm.toLowerCase();
    return faculties.filter(f => 
       f.name.toLowerCase().includes(s) || 
       f.code.toLowerCase().includes(s) ||
       majors.some(m => m.facultyId === f.id && m.name.toLowerCase().includes(s))
    );
  }, [faculties, majors, searchTerm]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-100 min-w-[320px] w-[320px] shrink-0">
      {/* Sidebar Header */}
      <div className="p-6 border-b border-slate-50 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <LayoutList size={14} className="text-indigo-600" />
            Lộ trình học tập
          </h2>
          {onRefresh && (
            <button onClick={onRefresh} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400">
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          )}
        </div>
        
        <div className="relative">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm Faculty/Major..."
            className="w-full pl-10 pr-4 py-3 bg-slate-50 border-transparent rounded-2xl text-[12px] font-bold outline-none focus:ring-4 focus:ring-indigo-600/5 transition-all placeholder:text-slate-400/70"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-1">
          {filteredFaculties.map(faculty => (
            <div key={faculty.id} className="space-y-1">
              <button
                onClick={() => { toggle(faculty.id); setSelectedFacultyId(faculty.id); }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2.5 rounded-2xl transition-all group",
                  selectedFacultyId === faculty.id ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-600"
                )}
              >
                {expanded.includes(faculty.id) ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                <Building2 size={16} className={selectedFacultyId === faculty.id ? "text-indigo-600" : "text-slate-400"} />
                <span className="text-[13px] font-black truncate">{faculty.name}</span>
              </button>

              {expanded.includes(faculty.id) && (
                <div className="ml-4 pl-4 border-l-2 border-slate-100 space-y-1 py-1">
                  {majors.filter(m => m.facultyId === faculty.id).map(major => (
                    <div key={major.id} className="space-y-1">
                      <button
                        onClick={() => { toggle(major.id); setSelectedMajorId(major.id); setSelectedFacultyId(faculty.id); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all",
                          selectedMajorId === major.id ? "bg-indigo-600 text-white shadow-md shadow-indigo-100/50" : "hover:bg-slate-50 text-slate-600"
                        )}
                      >
                        {expanded.includes(major.id) ? <ChevronDown size={12} className="opacity-60" /> : <ChevronRight size={12} className="opacity-60" />}
                        <GraduationCap size={14} />
                        <span className="text-[12px] font-bold truncate">{major.name}</span>
                      </button>

                      {expanded.includes(major.id) && (
                        <div className="ml-4 pl-4 border-l-2 border-slate-50 space-y-1 py-1">
                          {COHORTS.map(c => {
                            const isCohortExp = expanded.includes(`${major.id}-${c}`);
                            const isCohortSelected = selectedCohort === c && selectedMajorId === major.id;
                            
                            return (
                              <div key={`${major.id}-${c}`} className="space-y-1">
                                <button
                                  onClick={() => { toggle(`${major.id}-${c}`); setSelectedCohort(c); }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all",
                                    isCohortSelected ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-500"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    {isCohortExp ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                    <Users size={14} className={isCohortSelected ? "text-indigo-600" : "text-slate-400"} />
                                    <span className="text-[12px] font-black uppercase tracking-tight">Khóa {c}</span>
                                  </div>
                                </button>

                                {isCohortExp && (
                                  <div className="ml-4 pl-4 border-l border-slate-100 space-y-1 py-1">
                                    {[1, 2, 3, 4].map(y => {
                                      const yearKey = `${major.id}-${c}-Y${y}`;
                                      const isYearExp = expanded.includes(yearKey);
                                      const startYear = (COHORT_START_YEARS[c] || 2024) + y - 1;
                                      
                                      return (
                                        <div key={yearKey} className="space-y-1">
                                          <button
                                            onClick={() => toggle(yearKey)}
                                            className={cn(
                                              "w-full flex items-center justify-between px-3 py-1.5 rounded-lg transition-all",
                                              isYearExp ? "text-indigo-600 font-black" : "text-slate-400 font-bold hover:bg-slate-50"
                                            )}
                                          >
                                            <div className="flex items-center gap-2">
                                              {isYearExp ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                              <span className="text-[10px] uppercase">Năm {y} ({startYear})</span>
                                            </div>
                                          </button>

                                          {isYearExp && (
                                            <div className="ml-4 space-y-1">
                                              {[1, 2].map(num => {
                                                const conceptualIdx = (y - 1) * 2 + num;
                                                const startYr = COHORT_START_YEARS[c] || 2024;
                                                
                                                // Correct mapping: Find real semester ID from chronologically sorted list
                                                const cohortSems = [...semesters]
                                                    .filter(s => s.year >= startYr)
                                                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
                                                
                                                const sem = cohortSems[conceptualIdx - 1];
                                                const semId = sem?.id;
                                                const isSemSelected = selectedSemesterId === semId && selectedCohort === c;

                                                return (
                                                  <button
                                                    key={conceptualIdx}
                                                    onClick={() => {
                                                      if (semId) {
                                                        setSelectedSemesterId(semId);
                                                        setSelectedCohort(c);
                                                        setSelectedMajorId(major.id);
                                                      }
                                                    }}
                                                    className={cn(
                                                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left",
                                                      isSemSelected ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200/50" : "hover:text-indigo-600 text-slate-400"
                                                    )}
                                                  >
                                                    <Calendar size={10} />
                                                    <span className="text-[10px] font-black uppercase">Học kỳ {num}</span>
                                                    {sem && isSemSelected && <span className="ml-auto text-[8px] opacity-70">S{conceptualIdx}</span>}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
