"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ClipboardList, 
  GitMerge, 
  Zap, 
  PlayCircle, 
  ChevronRight, 
  ChevronLeft,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Filter
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// Stage Components (We will create these next)
import Stage1Blueprint from "@/components/ems/Stage1Blueprint";
import Stage2Coordination from "@/components/ems/Stage2Coordination";
import Stage3Zap from "@/components/ems/Stage3Zap";
import Stage4Management from "@/components/ems/Stage4Management";
import SemesterPlanWorkspace from "../semester-plan/SemesterPlanWorkspace";

const STAGES = [
  { id: 1, title: "Lập Blueprint", icon: ClipboardList, desc: "Chọn môn học từ khung chương trình" },
  { id: 2, title: "Trạm Điều Phối", icon: GitMerge, desc: "Gộp lớp & Cấu hình thông số" },
  { id: 3, title: "ZAP Mechanism", icon: Zap, desc: "Chốt & Xếp lịch tự động" },
  { id: 4, title: "Quản Lý Vận Hành", icon: PlayCircle, desc: "Điểm danh & Nhập điểm" },
];

export default function EMSTrainingPlanPage() {
  return <SemesterPlanWorkspace />;

  const [currentStage, setCurrentStage] = useState(1);
  const [filters, setFilters] = useState({
    cohort: "K19",
    majorId: "",
    semester: 1
  });
  const [isLoading, setIsLoading] = useState(false);

  // Global Context for Planning (passed down to stages)
  const [planningData, setPlanningData] = useState({
    selectedSubjects: [] as any[],
    mergedClasses: [] as any[],
    isZapped: false
  });

  const nextStage = () => setCurrentStage(prev => Math.min(prev + 1, 4));
  const prevStage = () => setCurrentStage(prev => Math.max(prev - 1, 1));

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 lg:p-10 font-sans text-slate-900">
      <Toaster position="top-right" />
      
      {/* Header & Wizard Progress */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
              <span className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg shadow-indigo-600/20">
                <Layers className="w-6 h-6" />
              </span>
              Hệ thống Điều phối & Quản lý Đào tạo (EMS)
            </h1>
            <p className="text-slate-500 mt-2 font-medium">Mô hình Controlled Automation (Tự động có kiểm soát) — UNETI Portal</p>
          </div>
          
          <div className="flex items-center gap-3">
            <StageIndicator currentStage={currentStage} />
          </div>
        </div>

        {/* Wizard Steps Navigation */}
        <div className="grid grid-cols-4 gap-4">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = currentStage === stage.id;
            const isCompleted = currentStage > stage.id;

            return (
              <div 
                key={stage.id}
                className={`relative p-5 rounded-2xl border-2 transition-all duration-300 ${
                  isActive 
                    ? "bg-white border-indigo-600 shadow-xl shadow-indigo-600/10 scale-[1.02] z-10" 
                    : isCompleted
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-slate-100 opacity-60"
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive ? "bg-indigo-600 text-white shadow-lg" : isCompleted ? "bg-indigo-200 text-indigo-700" : "bg-slate-100 text-slate-400"
                  }`}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Giai đoạn 0{stage.id}</span>
                    <h3 className={`font-bold text-sm ${isActive ? "text-slate-900" : "text-slate-500"}`}>{stage.title}</h3>
                  </div>
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="active-indicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-indigo-600 rounded-full"
                  />
                )}
              </div>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 min-h-[600px] overflow-hidden flex flex-col">
        <div className="flex-1 p-8 lg:p-12">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {currentStage === 1 && (
                <Stage1Blueprint 
                  filters={filters} 
                  setFilters={setFilters} 
                  onSubjectsUpdate={(subjects) => setPlanningData(p => ({ ...p, selectedSubjects: subjects }))}
                  selectedSubjects={planningData.selectedSubjects}
                />
              )}
              {currentStage === 2 && (
                <Stage2Coordination 
                  filters={filters}
                  selectedSubjects={planningData.selectedSubjects}
                  onMergedUpdate={(merged) => setPlanningData(p => ({ ...p, mergedClasses: merged }))}
                  mergedClasses={planningData.mergedClasses}
                />
              )}
              {currentStage === 3 && (
                <Stage3Zap 
                  planningData={planningData}
                  onZapSuccess={() => {
                    setPlanningData(p => ({ ...p, isZapped: true }));
                    nextStage();
                  }}
                />
              )}
              {currentStage === 4 && (
                <Stage4Management 
                  filters={filters}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <footer className="px-12 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={prevStage}
            disabled={currentStage === 1 || isLoading}
            className="px-6 py-3 rounded-xl font-bold text-slate-600 flex items-center gap-2 hover:bg-slate-100 transition-all disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" /> Quay lại
          </button>

          <div className="flex items-center gap-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none">
              {STAGES[currentStage - 1].desc}
            </p>
            {currentStage < 3 && planningData.selectedSubjects.length > 0 && (
              <button 
                onClick={nextStage}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg"
              >
                Tiếp tục <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {currentStage === 4 && (
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg"
              >
                <CheckCircle2 className="w-4 h-4" /> Hoàn tất quy trình
              </button>
            )}
          </div>
        </footer>
      </main>
    </div>
  );
}

function StageIndicator({ currentStage }: { currentStage: number }) {
  return (
    <div className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100">
      {[1, 2, 3, 4].map(s => (
        <div 
          key={s} 
          className={`h-2 rounded-full transition-all duration-500 ${
            s === currentStage ? "w-8 bg-indigo-600" : s < currentStage ? "w-4 bg-indigo-400" : "w-2 bg-slate-200"
          }`} 
        />
      ))}
    </div>
  );
}

function Layers(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" viewBox="0 0 24 24" fill="none" 
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
