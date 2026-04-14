"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Filter, BookOpen, CheckCircle2, Save, Loader2, Plus, Trash2, Copy, AlertCircle } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const API = (path: string) => `/api${path}`;

interface Stage1Props {
  filters: { cohort: string; majorId: string; semester: number };
  setFilters: (f: any) => void;
  onSubjectsUpdate: (s: any[]) => void;
  selectedSubjects: any[];
}

export default function Stage1Blueprint({ filters, setFilters, onSubjectsUpdate, selectedSubjects }: Stage1Props) {
  const [majors, setMajors] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [curriculums, setCurriculums] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const TOKEN = Cookies.get("staff_accessToken");

  // Fetch Majors
  useEffect(() => {
    const fetchMajors = async () => {
      try {
        const res = await fetch(API("/courses/majors"), {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        if (res.ok) setMajors(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchMajors();
  }, [TOKEN]);

  // Fetch ALL subjects for the major (for selection)
  useEffect(() => {
    if (!filters.majorId) return;
    const fetchAllSubjects = async () => {
      try {
        const res = await fetch(API(`/courses/subjects?majorId=${filters.majorId}`), {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        if (res.ok) setAllSubjects(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchAllSubjects();
  }, [filters.majorId, TOKEN]);

  // Fetch Existing Curriculum
  useEffect(() => {
    if (!filters.majorId) return;
    const fetchCurriculum = async () => {
      setLoading(true);
      try {
        const res = await fetch(API(`/ems/blueprint?majorId=${filters.majorId}&cohort=${filters.cohort}`), {
          headers: { Authorization: `Bearer ${TOKEN}` }
        });
        const data = await res.json();
        setCurriculums(Array.isArray(data) ? data : []);
        
        // Auto-select subjects that belong to the current active semester tab
        const currentSemesterSubjects = data
          .filter((item: any) => item.suggestedSemester === filters.semester)
          .map((item: any) => item.subject);
        onSubjectsUpdate(currentSemesterSubjects);
      } catch (err) { 
        console.error(err); 
      } finally {
        setLoading(false);
      }
    };
    fetchCurriculum();
  }, [filters.majorId, filters.cohort, TOKEN]); // Note: removing filters.semester to avoid reset on tab switch

  // Update selected subjects when changing semester tab (but keep them persistent in a roadmap state)
  const [roadmap, setRoadmap] = useState<Record<number, any[]>>({});

  useEffect(() => {
    if (curriculums.length > 0) {
      const newRoadmap: Record<number, any[]> = {};
      [1, 2, 3, 4, 5, 6, 7, 8].forEach(s => {
        newRoadmap[s] = curriculums
          .filter(item => item.suggestedSemester === s)
          .map(item => item.subject);
      });
      setRoadmap(newRoadmap);
    }
  }, [curriculums]);

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter(subj => {
      return subj.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             subj.code.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [allSubjects, searchTerm]);

  const toggleSubject = (subject: any) => {
    const currentSemSubjects = roadmap[filters.semester] || [];
    const exists = currentSemSubjects.find(s => s.id === subject.id);
    
    let updated;
    if (exists) {
      updated = currentSemSubjects.filter(s => s.id !== subject.id);
    } else {
      updated = [...currentSemSubjects, subject];
    }
    
    const newRoadmap = { ...roadmap, [filters.semester]: updated };
    setRoadmap(newRoadmap);
    onSubjectsUpdate(updated); // Notify parent for the coordination stage
  };

  const handleSaveBlueprint = async () => {
    if (!filters.majorId) return toast.error("Vui lòng chọn ngành");
    
    const saveItems = Object.entries(roadmap).flatMap(([sem, subjects]) => 
      subjects.map(s => ({
        subjectId: s.id,
        suggestedSemester: parseInt(sem)
      }))
    );

    if (saveItems.length === 0) return toast.error("Blueprint trống");

    setSaving(true);
    try {
      const res = await fetch(API("/ems/blueprint"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}` 
        },
        body: JSON.stringify({
          majorId: filters.majorId,
          cohort: filters.cohort,
          items: saveItems
        })
      });

      if (res.ok) {
        toast.success(`Kế hoạch đào tạo ${filters.cohort} đã được lưu thành công!`);
      } else {
        toast.error("Lỗi khi lưu kế hoạch");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối");
    } finally {
      setSaving(false);
    }
  };

  const currentSubjects = roadmap[filters.semester] || [];

  return (
    <div className="space-y-8">
      {/* Top Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Kỳ nhập học</label>
          <select 
            value={filters.cohort}
            onChange={e => setFilters({ ...filters, cohort: e.target.value })}
            className="w-full px-5 py-3 bg-white border-transparent rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
          >
            {["K17", "K18", "K19", "K20"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Ngành đào tạo</label>
          <select 
            value={filters.majorId}
            onChange={e => setFilters({ ...filters, majorId: e.target.value })}
            className="w-full px-5 py-3 bg-white border-transparent rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
          >
            <option value="">Chọn ngành...</option>
            {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Học kỳ (Lộ trình)</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
              <button 
                key={s}
                onClick={() => setFilters({ ...filters, semester: s })}
                className={`w-10 h-10 rounded-xl font-bold text-sm transition-all ${
                  filters.semester === s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20" : "bg-white text-slate-400 hover:bg-slate-100"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tìm kiếm môn học</label>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Mã hoặc tên môn..."
              className="w-full pl-12 pr-4 py-3 bg-white border-transparent rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
            />
          </div>
        </div>
      </div>
      {/* Main Content: Subjects List */}
      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 uppercase tracking-tight">Cổng lập kế hoạch Roadmap (8 Học kỳ)</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Đang quản lý {Object.values(roadmap).flat().length} môn học trong lộ trình
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleSaveBlueprint}
            disabled={saving || Object.values(roadmap).flat().length === 0}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-30 disabled:grayscale"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save size={16} />} 
            {saving ? "Đang lưu..." : "Lưu Blueprint MASTER"}
          </button>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Đang đồng bộ Roadmap...</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12 text-center">Chọn</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã môn</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên môn học</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tín chỉ</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Phòng học (DK)</th>
                  <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      {searchTerm ? "Không tìm thấy môn học phù hợp" : "Đang tải dữ liệu môn học..."}
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((subject: any) => (
                    <tr 
                      key={subject.id}
                      className={`group transition-all hover:bg-indigo-50/30 ${currentSubjects.find(s => s.id === subject.id) ? "bg-indigo-50/50" : ""}`}
                    >
                      <td className="px-8 py-5 text-center">
                        <button 
                          onClick={() => toggleSubject(subject)}
                          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                            currentSubjects.find(s => s.id === subject.id) 
                              ? "bg-indigo-600 border-indigo-600 text-white" 
                              : "border-slate-200 group-hover:border-indigo-400"
                          }`}
                        >
                          {currentSubjects.find(s => s.id === subject.id) && <CheckCircle2 size={14} />}
                        </button>
                      </td>
                      <td className="px-4 py-5 font-mono text-xs font-bold text-slate-500 uppercase">{subject.code}</td>
                      <td className="px-4 py-5 font-bold text-slate-900">{subject.name}</td>
                      <td className="px-4 py-5 text-center">
                        <span className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-600">{subject.credits}</span>
                      </td>
                      <td className="px-4 py-5 text-center text-xs font-bold text-slate-500">
                        {subject.theoryHours > 0 ? "Lý thuyết" : "Thực hành"}
                      </td>
                      <td className="px-4 py-5 font-bold text-xs uppercase tracking-widest">
                        {currentSubjects.find(s => s.id === subject.id) ? (
                            <span className="text-indigo-600">Đã chọn HK{filters.semester}</span>
                        ) : (
                            <span className="text-slate-300">Chưa chọn</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
