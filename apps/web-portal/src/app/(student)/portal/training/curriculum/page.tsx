"use client";

import React, { useEffect, useMemo, useState } from "react";
import { StudentService } from "@/services/student.service";
import {
  CheckCircle2,
  ChevronDown,
  Search,
  BookOpen,
  Info,
} from "lucide-react";
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

const sumPassedCredits = (items: any[] = []) =>
  items
    .filter((item) => item.isPassed)
    .reduce((total, item) => total + Number(item.credits || 0), 0);

const PeriodChip = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "theory" | "practice";
}) => (
  <span
    className={`inline-flex min-w-[72px] items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tone === "theory"
      ? "border-blue-100 bg-blue-50 text-blue-700"
      : "border-indigo-100 bg-indigo-50 text-indigo-700"
      }`}
  >
    {label}: {value}
  </span>
);



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
        <p className="text-sm font-black uppercase tracking-widest text-slate-400">Đang đồng bộ chương trình khung...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg p-20 text-center">
        <Info className="mx-auto h-16 w-16 text-slate-200" />
        <h2 className="mt-4 text-xl font-black text-slate-700">Chưa có dữ liệu chương trình</h2>
        <p className="mt-2 text-slate-500 font-medium">Bạn chưa được gán vào một khung chương trình đào tạo chuẩn. Vui lòng liên hệ phòng đào tạo.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-700 space-y-6 p-6 text-slate-700">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm mã môn hoặc tên học phần..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-medium outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Curriculum Content */}
      <div className="space-y-4">
        {(data?.semesters || []).map((semester: any) => {
          const isExpanded = expandedSemesters[semester.semester] !== false;

          const filteredItems = (semester.items || []).filter((item: any) => {
            const search = searchTerm.toLowerCase();
            return (
              (item.name || item.subjectName || "").toLowerCase().includes(search) ||
              (item.code || item.subjectCode || "").toLowerCase().includes(search)
            );
          });

          if (searchTerm && filteredItems.length === 0) return null;

          return (
            <div key={semester.semester} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <button
                onClick={() => toggleSemester(semester.semester)}
                className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-slate-50"
              >
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                  Học kỳ {semester.semester}
                </h3>
                <div className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 overflow-x-auto">
                  <table className="w-full min-w-[800px] border-collapse text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="w-16 px-6 py-3 text-center">STT</th>
                        <th className="px-6 py-3 text-left">Mã học phần</th>
                        <th className="px-6 py-3 text-left">Tên học phần</th>
                        <th className="w-24 px-6 py-3 text-center">Tín chỉ</th>
                        <th className="w-32 px-6 py-3 text-center">Trạng thái</th>
                        <th className="w-24 px-6 py-3 text-center">Kết quả</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item: any, index: number) => (
                        <tr
                          key={`${semester.semester}-${item.subjectId || item.id || index}`}
                          className="hover:bg-slate-50/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-center text-slate-400">
                            {index + 1}
                          </td>
                          <td className="px-6 py-4 font-mono text-xs font-bold text-slate-600">
                            {item.code || item.subjectCode}
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-800">
                            {item.name || item.subjectName}
                          </td>
                          <td className="px-6 py-4 text-center text-slate-600">
                            {item.credits}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.isRequired ? (
                              <span className="text-[10px] font-bold uppercase text-slate-400">Bắt buộc</span>
                            ) : (
                              <span className="text-[10px] font-bold uppercase text-amber-500">Tự chọn</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {item.isPassed ? (
                              <span className="text-xs font-bold text-slate-900">Đạt</span>
                            ) : (
                              <span className="text-xs font-medium text-slate-400">Chưa</span>
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
    </div>
  );
}
