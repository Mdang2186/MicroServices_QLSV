"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GitBranch, User, Layers, Info, CheckCircle, AlertTriangle, ChevronDown, Loader2 } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const API = (path: string) => `/api${path}`;

interface Stage2Props {
  filters: { cohort: string; majorId: string; semester: number };
  selectedSubjects: any[];
  onMergedUpdate: (m: any[]) => void;
  mergedClasses: any[];
}

export default function Stage2Coordination({ filters, selectedSubjects, onMergedUpdate, mergedClasses }: Stage2Props) {
  const [adminClasses, setAdminClasses] = useState<any[]>([]);
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const TOKEN = Cookies.get("staff_accessToken");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${TOKEN}` };
        const [resClasses, resLecturers] = await Promise.all([
          fetch(API(`/admin-classes?majorId=${filters.majorId}&cohort=${filters.cohort}`), { headers }),
          fetch(API("/courses/lecturers/by-faculty"), { headers })
        ]);
        if (resClasses.ok) setAdminClasses(await resClasses.json());
        if (resLecturers.ok) setLecturers(await resLecturers.json());
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    fetchData();
  }, [filters.majorId, filters.cohort, TOKEN]);

  // Logic Mapping (1-to-1): Create one CourseClass per AdminClass logically represented for configuration
  useEffect(() => {
    if (selectedSubjects.length === 0 || adminClasses.length === 0) return;
    
    if (mergedClasses.length === 0) {
      const initial = selectedSubjects.map(subj => {
        const totalPeriods = (subj.credits || 0) * 15;
        return {
          subjectId: subj.id,
          subject: subj,
          adminClasses: adminClasses, // Keeping the list for reference, but mapping is 1-to-1
          classCount: adminClasses.length,
          lecturerId: "",
          sessionsPerWeek: 1,
          periodsPerSession: subj.credits >= 3 ? 3 : 2, 
          totalPeriods,
          status: "READY"
        };
      });
      onMergedUpdate(initial);
    }
  }, [selectedSubjects, adminClasses, mergedClasses.length, onMergedUpdate]);

  const updateMergedItem = (subjectId: string, field: string, value: any) => {
    onMergedUpdate(mergedClasses.map(item => 
      item.subjectId === subjectId ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <GitBranch className="text-indigo-600" /> Trạm Điều Phối EMS
          </h2>
          <p className="text-sm text-slate-500 font-medium">Cấu hình thông số chi tiết cho {filters.cohort} — {mergedClasses.length} Nhóm học phần</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-xl flex items-center gap-3">
            <Info className="text-amber-500 w-5 h-5" />
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest leading-none">
              Gợi ý: 1 tín chỉ = 15 tiết. Tổng tiết = Credits * 15.
            </p>
          </div>
          
          <button 
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch(API("/ems/apply-coordination"), {
                  method: "POST",
                  headers: { 
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${TOKEN}` 
                  },
                  body: JSON.stringify({
                    semesterId: "current", // Fallback or dynamic
                    majorId: filters.majorId,
                    cohort: filters.cohort,
                    items: mergedClasses
                  })
                });
                if (res.ok) toast.success("Đã thiết lập trạng thái PLANNING cho các lớp.");
                else toast.error("Lỗi khi thiết lập điều phối.");
              } catch (err) { console.error(err); }
              setLoading(false);
            }}
            disabled={loading || mergedClasses.length === 0}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl hover:bg-indigo-600 transition-all flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers size={16} />} Thiết lập GĐ 2
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin Môn & Lớp gộp</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Giảng viên phụ trách</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Buổi/Tuần</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tiết/Buổi</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Khớp khung (15 tuần)</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {mergedClasses.map((item) => {
                const calculatedTotal = item.sessionsPerWeek * item.periodsPerSession * 15;
                const isMatch = calculatedTotal === item.totalPeriods;
                const progress = Math.min((calculatedTotal / item.totalPeriods) * 100, 100);

                return (
                  <tr key={item.subjectId} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{item.subject.code}</span>
                        <h4 className="font-bold text-slate-900">{item.subject.name}</h4>
                        <div className="flex items-center gap-1.5 mt-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-500" />
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight">
                            <span>Gồm lớp: <span className="text-slate-900">{item.adminClasses?.map((c: any) => c.code).join(", ") || "N/A"}</span></span>
                          </p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-4 py-6">
                      <div className="relative group min-w-[200px]">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" size={14} />
                        <select 
                          value={item.lecturerId}
                          onChange={e => updateMergedItem(item.subjectId, "lecturerId", e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-transparent rounded-xl text-xs font-bold focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                        >
                          <option value="">Chưa gán GV...</option>
                          {lecturers.filter(l => l.departmentId === item.subject.departmentId).map(l => (
                            <option key={l.id} value={l.id}>{l.fullName}</option>
                          ))}
                        </select>
                      </div>
                    </td>

                    <td className="px-4 py-6 text-center">
                      <input 
                        type="number"
                        min="1" max="5"
                        value={item.sessionsPerWeek}
                        onChange={e => updateMergedItem(item.subjectId, "sessionsPerWeek", parseInt(e.target.value))}
                        className="w-16 px-2 py-2.5 bg-slate-50 text-center border-transparent rounded-xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                      />
                    </td>

                    <td className="px-4 py-6 text-center">
                      <input 
                        type="number"
                        min="1" max="10"
                        value={item.periodsPerSession}
                        onChange={e => updateMergedItem(item.subjectId, "periodsPerSession", parseInt(e.target.value))}
                        className="w-16 px-2 py-2.5 bg-slate-50 text-center border-transparent rounded-xl text-xs font-black focus:bg-white focus:ring-4 focus:ring-indigo-600/5 transition-all outline-none"
                      />
                    </td>

                    <td className="px-4 py-6">
                      <div className="flex flex-col gap-2 min-w-[120px]">
                         <div className="flex justify-between items-end">
                            <span className={`text-[10px] font-black uppercase ${isMatch ? "text-green-600" : "text-rose-500"}`}>
                               {(calculatedTotal / 15).toFixed(1)} / {item.subject.credits} TC 
                               <span className="ml-1 opacity-40 font-bold">({calculatedTotal} tiết)</span>
                            </span>
                            {isMatch ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                         </div>
                         <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${isMatch ? "bg-green-500" : (calculatedTotal > item.totalPeriods ? "bg-amber-500" : "bg-rose-500")}`}
                              style={{ width: `${progress}%` }}
                            />
                         </div>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-right">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black rounded-lg uppercase tracking-widest border border-indigo-100">
                        {item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {mergedClasses.length === 0 && (
            <div className="py-20 flex flex-col items-center opacity-20">
               <GitBranch size={48} className="mb-4" />
               <p className="text-[10px] font-black uppercase tracking-widest">Dữ liệu đang được tổng hợp...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
