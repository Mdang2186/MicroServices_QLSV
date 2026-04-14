"use client";

import React, { useState } from "react";
import { X, Zap, Loader2, Settings2 } from "lucide-react";

interface AutoScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: { periodsPerSession: number; sessionsPerWeek: number }) => void;
  isExecuting: boolean;
}

export default function AutoScheduleModal({
  isOpen,
  onClose,
  onConfirm,
  isExecuting,
}: AutoScheduleModalProps) {
  const [config, setConfig] = useState({
    periodsPerSession: 3,
    sessionsPerWeek: 1,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 antialiased">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <Settings2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 leading-none">Thông số thuật toán</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Scheduling Config</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="bg-indigo-50/50 rounded-[24px] p-5 border border-indigo-100/50">
            <p className="text-[11px] font-bold text-indigo-600 leading-relaxed italic">
              "Hệ thống sẽ tự động tìm kiếm phòng học còn trống và giảng viên phù hợp dựa trên các tham số dưới đây. Mọi xung đột lịch dạy sẽ được tự động xử lý."
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số tiết/buổi</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.periodsPerSession}
                  onChange={(e) => setConfig({ ...config, periodsPerSession: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Tiết</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Số buổi/tuần</label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={config.sessionsPerWeek}
                  onChange={(e) => setConfig({ ...config, sessionsPerWeek: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-4 text-sm font-black text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Buổi</span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => onConfirm(config)}
              disabled={isExecuting}
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.25em] hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {isExecuting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang tính toán lịch...
                </>
              ) : (
                <>
                  <Zap size={18} className="fill-current" />
                  Thực thi xếp lịch
                </>
              )}
            </button>
            <p className="text-center text-[9px] font-bold text-slate-300 mt-4 uppercase tracking-widest">
              Lưu ý: Hành động này có thể tốn vài giây để hoàn tất.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
