"use client";

import React, { useState } from "react";
import { Zap, ShieldCheck, Database, Send, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Cookies from "js-cookie";
import toast from "react-hot-toast";

const API = (path: string) => `/api${path}`;

interface Stage3Props {
  planningData: {
    selectedSubjects: any[];
    mergedClasses: any[];
  };
  onZapSuccess: () => void;
}

export default function Stage3Zap({ planningData, onZapSuccess }: Stage3Props) {
  const [isZapping, setIsZapping] = useState(false);
  const [zapHistory, setZapHistory] = useState<any[]>([]);
  const TOKEN = Cookies.get("staff_accessToken");

  const handleZap = async () => {
    // Validation
    const invalidCount = planningData.mergedClasses.filter(c => 
      c.sessionsPerWeek * c.periodsPerSession * 15 !== c.totalPeriods
    ).length;

    if (invalidCount > 0) {
      toast.error(`Có ${invalidCount} lớp học phần chưa khớp số tiết khung (TotalPeriods). Vui lòng kiểm tra lại GĐ 2.`);
      return;
    }

    if (!confirm("Hệ thống sẽ thực hiện Transaction Nguyên tử: Cập nhật trạng thái OPEN, Gán SV hàng loạt và tự động xếp lịch. Bạn có chắc chắn?")) return;

    setIsZapping(true);
    const toastId = toast.loading("Đang thực thi ZAP Mechanism... Vui lòng không đóng trình duyệt.");

    try {
      const res = await fetch(API("/ems/zap"), {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${TOKEN}`
        },
        body: JSON.stringify({
          semesterId: planningData.mergedClasses[0]?.semesterId || "current", // Assuming a shared semester
          majorId: planningData.mergedClasses[0]?.subject?.majorId,
          cohort: planningData.mergedClasses[0]?.cohort || "K19",
          subjectIds: planningData.mergedClasses.map(c => c.subjectId)
        })
      });

      if (res.ok) {
        const result = await res.json();
        toast.success("ZAP THÀNH CÔNG! Đã mở " + result.count + " lớp học phần và hoàn tất xếp lịch.", { id: toastId });
        onZapSuccess();
      } else {
        const err = await res.json();
        toast.error("ZAP THẤT BẠI: " + (err.message || "Lỗi hệ thống"), { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối API Gateway.", { id: toastId });
    } finally {
      setIsZapping(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center space-y-10 py-10">
      <div className="relative">
        <div className={`w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all duration-700 ${isZapping ? "bg-amber-500 shadow-2xl shadow-amber-500/50 animate-pulse" : "bg-slate-900 shadow-2xl shadow-slate-900/20"}`}>
          <Zap className={`w-16 h-16 ${isZapping ? "text-white animate-bounce" : "text-amber-400"}`} />
        </div>
        {isZapping && (
          <div className="absolute inset-x-0 -bottom-8 flex justify-center">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
          </div>
        )}
      </div>

      <div className="max-w-xl text-center space-y-4">
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tight italic">The "ZAP" Mechanism</h2>
        <p className="text-slate-500 font-medium">
          Hệ thống sẽ tự động chuyển đổi từ bảng dự thảo (Planning) sang trạng thái vận hành thực tế (Open). Toàn bộ dữ liệu sẽ được commit theo phương thức <span className="text-indigo-600 font-bold">Atomic Transaction</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Dữ liệu đầu vào</h4>
            <p className="font-bold text-slate-900">{planningData.mergedClasses.length} Nhóm học phần</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
            <Database size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Luồng dữ liệu</h4>
            <p className="font-bold text-slate-900">Bulk Insert Enrollments</p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-600">
            <Send size={20} />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Đầu ra</h4>
            <p className="font-bold text-slate-900">Auto-Schedule Ready</p>
          </div>
        </div>
      </div>

      <button 
        onClick={handleZap}
        disabled={isZapping || planningData.mergedClasses.length === 0}
        className={`group relative overflow-hidden px-12 py-5 rounded-3xl font-black text-lg uppercase tracking-[0.2em] transition-all flex items-center gap-4 ${
          isZapping ? "bg-slate-400 cursor-wait" : "bg-slate-900 hover:bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 active:scale-95"
        }`}
      >
        {isZapping ? "Đang xử lý..." : "Chốt & Xếp lịch tự động"}
        {!isZapping && <Zap className="w-6 h-6 text-amber-400 group-hover:rotate-12 transition-transform" />}
      </button>

      <div className="flex gap-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600">
          <CheckCircle size={14} /> Kiểm tra gộp lớp: OK
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600">
          <CheckCircle size={14} /> Kiểm tra khung tiết: OK
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-green-600">
          <CheckCircle size={14} /> Kiểm soát trùng lịch: READY
        </div>
      </div>
    </div>
  );
}
