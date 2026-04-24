"use client";
import React, { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import {
  CheckCircle2,
  ChevronDown,
  Search,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveCurrentStudentContext } from "@/lib/current-student";

const buildExpandedState = (payload: any) => {
  const highestPassedSemester =
    payload?.semesters?.reduce((max: number, semester: any) => {
      const hasPassed = (semester?.items || []).some((item: any) => item.isPassed);
      return hasPassed ? Math.max(max, Number(semester.semester || 0)) : max;
    }, 0) || 0;

  const boundary =
    Number(payload?.currentConceptualSemester || 0) ||
    (highestPassedSemester > 0 ? highestPassedSemester + 1 : 2);

  return Object.fromEntries(
    (payload?.semesters || []).map((semester: any) => [
      semester.semester,
      Number(semester.semester || 0) <= boundary,
    ]),
  );
};

export default function CurriculumPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSemesters, setExpandedSemesters] = useState<Record<number, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const context = await resolveCurrentStudentContext();
        if (context.studentId) {
          const payload = await StudentService.getCurriculumProgress(context.studentId);
          setData(payload);
          setExpandedSemesters(buildExpandedState(payload));
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleSemester = (semesterNumber: number) => {
    setExpandedSemesters((current) => ({
      ...current,
      [semesterNumber]: !current[semesterNumber],
    }));
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Đang đồng bộ chương trình...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg p-20 text-center">
        <Info className="mx-auto h-16 w-16 text-slate-200" />
        <h2 className="mt-4 text-xl font-black text-slate-700">Chưa có dữ liệu</h2>
        <p className="mt-2 text-slate-500 font-medium text-sm">Vui lòng liên hệ phòng đào tạo để được gán chương trình chuẩn.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl animate-in fade-in duration-500 space-y-5 text-slate-700 min-h-screen">
      {/* Linear Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
        <div className="space-y-0.5">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Chương trình đào tạo</h1>
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Khung chương trình chuẩn chuyên ngành</p>
        </div>

        <div className="flex items-center gap-8 text-[11px] font-bold border-l-0 md:border-l border-slate-100 md:pl-8 uppercase whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 tracking-tighter text-[9px]">Tổng tín chỉ</span>
            <span className="text-slate-900">{data.stats?.totalCredits || 0} TC</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 tracking-tighter text-[9px]">Đã đạt</span>
            <span className="text-emerald-600">{data.stats?.passed || 0} TC</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-slate-400 tracking-tighter text-[9px]">Bắt buộc</span>
            <span className="text-blue-600">{data.stats?.passedMandatory || 0}/{data.stats?.mandatory || 0} TC</span>
          </div>
        </div>
      </div>

      {/* Slim Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
        <input
          type="text"
          placeholder="Tìm học phần (mã hoặc tên)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full h-9 rounded-md border border-slate-200 bg-white pl-9 pr-4 text-xs font-medium outline-none focus:border-blue-400 transition-all placeholder:text-slate-200"
        />
      </div>

      {/* Table Sections */}
      <div className="space-y-4">
        {(data?.semesters || []).map((semester: any) => {
          const isExpanded = expandedSemesters[semester.semester] !== false;
          const filteredItems = (semester.items || []).filter((item: any) => {
            const s = searchTerm.toLowerCase();
            const name = (item.name || item.subjectName || "").toLowerCase();
            const code = (item.code || item.subjectCode || "").toLowerCase();
            return name.includes(s) || code.includes(s);
          });

          if (searchTerm && filteredItems.length === 0) return null;

          return (
            <div key={semester.semester} className="border border-slate-200 bg-white rounded-md overflow-hidden">
              <button
                onClick={() => toggleSemester(semester.semester)}
                className="flex w-full items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-100 bg-slate-50/30"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-900 uppercase">Học kỳ {semester.semester}</span>
                  <span className="text-[10px] text-slate-400 font-bold tracking-tight">({semester.totalCredits || 0} TC)</span>
                </div>
                <ChevronDown size={14} className={cn("text-slate-300 transition-transform duration-300", isExpanded && "rotate-180")} />
              </button>

              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-white text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100">
                        <th className="w-10 py-2.5 px-3 text-center border-r border-slate-50">#</th>
                        <th className="w-28 py-2.5 px-3 text-left border-r border-slate-50">Mã HP</th>
                        <th className="py-2.5 px-3 text-left border-r border-slate-50">Tên học phần</th>
                        <th className="w-14 py-2.5 px-3 text-center border-r border-slate-50">STC</th>
                        <th className="w-14 py-2.5 px-3 text-center border-r border-slate-50">LT</th>
                        <th className="w-14 py-2.5 px-3 text-center border-r border-slate-50">TH</th>
                        <th className="w-24 py-2.5 px-3 text-center border-r border-slate-50">Loại</th>
                        <th className="w-24 py-2.5 px-3 text-center">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {filteredItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="py-2 px-3 text-center text-slate-300 border-r border-slate-50">{idx + 1}</td>
                          <td className="py-2 px-3 font-bold text-slate-600 border-r border-slate-50 tracking-tighter">{item.code || item.subjectCode}</td>
                          <td className="py-2 px-3 border-r border-slate-50 uppercase">
                            <div className="font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{item.name || item.subjectName}</div>
                            {item.prerequisites?.length > 0 && (
                              <div className="text-[9px] text-slate-400 italic mt-0.5 tracking-tighter">Tiên quyết: {item.prerequisites.join(", ")}</div>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700 border-r border-slate-50">{item.credits}</td>
                          <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-50 font-medium">{item.theoryPeriods || 0}</td>
                          <td className="py-2 px-3 text-center text-slate-400 border-r border-slate-50 font-medium">{item.practicePeriods || 0}</td>
                          <td className="py-2 px-3 text-center border-r border-slate-50 whitespace-nowrap">
                             <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize", item.isRequired ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-amber-50/50 border-amber-100 text-amber-600")}>
                                {item.isRequired ? "Cơ bản" : "Tự chọn"}
                             </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {item.isPassed ? (
                              <span className="text-emerald-500 font-bold uppercase text-[9px] flex items-center justify-center gap-1">
                                <CheckCircle2 size={10} /> Đạt
                              </span>
                            ) : (
                                <span className="text-slate-200 font-medium uppercase text-[9px]">Chưa đạt</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Thin Footer */}
      <footer className="pt-6 flex flex-wrap gap-x-8 gap-y-2 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-50">
        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-slate-200"></div> Học phần cơ bản</div>
        <div className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 bg-amber-500"></div> Học phần tự chọn</div>
        <div className="flex items-center gap-1.5 border-l border-slate-100 pl-8"><Info size={10} /> LT: Lý thuyết, TH: Thực hành</div>
      </footer>
    </div>
  );
}
