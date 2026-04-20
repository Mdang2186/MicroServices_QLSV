"use client";

import { useState, useEffect } from "react";
import { X, Users, CreditCard, Send, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface BulkFeeAssignDialogProps {
  onClose: () => void;
  semesterId: string;
  onSuccess: () => void;
}

export default function BulkFeeAssignDialog({ onClose, semesterId, onSuccess }: BulkFeeAssignDialogProps) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState("");
  const [studentCodesRaw, setStudentCodesRaw] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<any | null>(null);

  useEffect(() => {
    fetch("/api/students/tuition/fixed-fee-configs")
      .then(r => r.json())
      .then(setConfigs);
  }, []);

  const handleApply = async () => {
    if (!selectedConfigId || !studentCodesRaw.trim()) return;

    // Parse codes: split by newline or comma, filter empty
    const studentCodes = studentCodesRaw
      .split(/[\n,]/)
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (studentCodes.length === 0) return;

    setIsProcessing(true);
    setResults(null);

    try {
      const res = await fetch("/api/students/tuition/bulk-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId,
          configId: selectedConfigId,
          studentCodes,
        }),
      });
      const data = await res.json();
      setResults(data);
      if (data.success) {
        onSuccess();
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi hệ thống khi xử lý hàng loạt");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] rounded-[32px] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấp khoản phí hàng loạt</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Dán danh sách mã sinh viên từ Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-all"><X size={20} /></button>
        </div>

        <div className="p-8 overflow-y-auto space-y-6">
          {results ? (
            <div className="space-y-6 animate-in fade-in zoom-in duration-300">
              <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex items-start gap-4">
                <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
                <div className="space-y-1">
                  <h4 className="text-sm font-black text-emerald-900 uppercase">Hoàn tất xử lý</h4>
                  <p className="text-xs text-emerald-700 font-bold">
                    Đã thêm mới <span className="text-lg">{results.createdCount}</span> khoản phí. 
                    Bỏ qua <span className="text-lg">{results.skippedCount}</span> (đã có).
                  </p>
                </div>
              </div>

              {results.missingCodes?.length > 0 && (
                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="text-rose-500" size={18} />
                    <h4 className="text-[10px] font-black text-rose-900 uppercase tracking-widest">Không tìm thấy {results.missingCodes.length} mã SV:</h4>
                  </div>
                  <div className="bg-white/50 p-4 rounded-2xl text-[11px] font-mono text-rose-600 break-all leading-relaxed border border-rose-100 max-h-[150px] overflow-y-auto">
                    {results.missingCodes.join(", ")}
                  </div>
                </div>
              )}

              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-600 transition-all"
              >
                Đóng cửa sổ
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bước 1: Chọn khoản phí mục tiêu</label>
                <select 
                  value={selectedConfigId}
                  onChange={e => setSelectedConfigId(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-[20px] text-sm font-black text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">-- Chọn một cấu hình phí --</option>
                  {configs.map(c => (
                    <option key={c.id} value={c.id}>{c.feeName} ({c.amount.toLocaleString()} đ)</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Bước 2: Dán danh sách Mã Sinh Viên</label>
                <textarea 
                  rows={8}
                  placeholder="Paste mã sinh viên tại đây (mỗi dòng một mã)..."
                  value={studentCodesRaw}
                  onChange={e => setStudentCodesRaw(e.target.value)}
                  className="w-full px-5 py-5 bg-slate-50 border border-slate-100 rounded-[24px] text-[13px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300 resize-none min-h-[200px]"
                />
                <p className="text-[10px] text-slate-400 font-medium pl-1 italic">Hệ thống chấp nhận mã ngăn cách bởi dấu phẩy hoặc xuống dòng.</p>
              </div>

              <button 
                onClick={handleApply}
                disabled={!selectedConfigId || !studentCodesRaw.trim() || isProcessing}
                className="w-full py-5 bg-blue-600 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isProcessing ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                {isProcessing ? "Đang xử lý dữ liệu..." : "Thực hiện cấp phí"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
