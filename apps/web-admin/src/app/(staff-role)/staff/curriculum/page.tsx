"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Search, X, Loader2, Check, Save, Zap, Award, Layers,
  AlertCircle, ChevronDown, Info, BookOpen, GraduationCap
} from "lucide-react";
import Cookies from "js-cookie";
import { motion, AnimatePresence } from "framer-motion";

const API = (p: string) => `/api${p}`;
const COHORTS = ["K17", "K18", "K19", "K20", "K21", "K22"];
const SEM_LABELS: Record<number, string> = {
  1: "Học kỳ 1", 2: "Học kỳ 2", 3: "Học kỳ 3", 4: "Học kỳ 4",
  5: "Học kỳ 5", 6: "Học kỳ 6", 7: "Học kỳ 7", 8: "Học kỳ 8",
};

/* ─── Toast ────────────────────────────────────────────────────────────── */
function Toast({ t }: { t: { type: string; msg: string } | null }) {
  return (
    <AnimatePresence>
      {t && (
        <motion.div
          initial={{ opacity: 0, y: -20, x: "-50%" }}
          animate={{ opacity: 1, y: 0, x: "-50%" }}
          exit={{ opacity: 0, y: -20, x: "-50%" }}
          className={`fixed top-5 left-1/2 z-[200] flex items-center gap-3 px-7 py-4 rounded-2xl shadow-2xl text-sm font-bold whitespace-nowrap
            ${t.type === "success" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}
        >
          {t.type === "success" ? <Check size={18} /> : <AlertCircle size={18} />}
          {t.msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─── Main Page ────────────────────────────────────────────────────────── */
export default function CurriculumPage() {
  const TOKEN = Cookies.get("staff_accessToken");
  const headers = useMemo(() => ({
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  }), [TOKEN]);

  /* state */
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState<any>(null);

  const [cohort, setCohort] = useState("K18");
  const [selectedMajor, setSelectedMajor] = useState<any>(null);
  const [activeSem, setActiveSem] = useState(1);
  const [search, setSearch] = useState("");

  const [majors, setMajors] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [realSemesters, setRealSemesters] = useState<any[]>([]);
  const [blueprint, setBlueprint] = useState<Record<number, any[]>>({}); // semNum -> subject[]
  const [applyResult, setApplyResult] = useState<any>(null);

  const showToast = useCallback((type: string, msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }, []);

  /* ── Fetchers ─────────────────────────────────────────── */
  const fetchBase = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, sRes, semRes] = await Promise.all([
        fetch(API("/departments/majors"), { headers }),
        fetch(API("/subjects"), { headers }),
        fetch(API("/semesters"), { headers }),
      ]);
      const mData = mRes.ok ? await mRes.json() : [];
      if (sRes.ok) setAllSubjects(await sRes.json());
      if (semRes.ok) setRealSemesters(await semRes.json());
      if (Array.isArray(mData) && mData.length > 0) {
        setMajors(mData);
        setSelectedMajor(mData[0]);
      }
    } finally { setLoading(false); }
  }, [headers]);

  useEffect(() => { fetchBase(); }, [fetchBase]);

  const loadBlueprint = useCallback(async (majorId: string, c: string) => {
    const empty: Record<number, any[]> = {};
    for (let i = 1; i <= 8; i++) empty[i] = [];
    try {
      const res = await fetch(API(`/semester-plan/blueprint?majorId=${majorId}&cohort=${c}`), { headers });
      if (res.ok) {
        const data = await res.json();
        data.forEach((item: any) => {
          const s = item.suggestedSemester;
          if (s >= 1 && s <= 8 && item.subject) empty[s].push(item.subject);
        });
      }
    } catch {}
    setBlueprint(empty);
  }, [headers]);

  useEffect(() => {
    if (selectedMajor?.id) loadBlueprint(selectedMajor.id, cohort);
  }, [selectedMajor, cohort, loadBlueprint]);

  /* ── Blueprint ops ───────────────────────────────────── */
  const currentSemSubs = blueprint[activeSem] || [];

  const otherSemOf = useCallback((subId: string): string | null => {
    for (const [k, v] of Object.entries(blueprint)) {
      if (parseInt(k) !== activeSem && v.some(s => s.id === subId))
        return SEM_LABELS[parseInt(k)];
    }
    return null;
  }, [blueprint, activeSem]);

  const toggleSub = useCallback((sub: any) => {
    const cur = blueprint[activeSem] || [];
    const alreadyHere = cur.some(s => s.id === sub.id);
    const other = otherSemOf(sub.id);
    if (other && !alreadyHere) {
      showToast("error", `Môn "${sub.name}" đã được xếp ở ${other}.`);
      return;
    }
    setBlueprint(prev => ({
      ...prev,
      [activeSem]: alreadyHere ? cur.filter(s => s.id !== sub.id) : [...cur, sub],
    }));
  }, [blueprint, activeSem, otherSemOf, showToast]);

  /* computed */
  const semCredits = (n: number) => (blueprint[n] || []).reduce((a, s) => a + (s.credits || 0), 0);
  const totalCredits = useMemo(() => Object.values(blueprint).flat().reduce((a, s) => a + (s.credits || 0), 0), [blueprint]);
  const filteredSubs = useMemo(() =>
    allSubjects.filter(s =>
      !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase())
    ), [allSubjects, search]);

  /* ── Save ─────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedMajor) return;
    setSubmitting(true);
    try {
      const items: any[] = [];
      Object.entries(blueprint).forEach(([sem, subs]) =>
        subs.forEach(s => items.push({ subjectId: s.id, suggestedSemester: parseInt(sem) }))
      );
      const res = await fetch(API("/semester-plan/blueprint"), {
        method: "POST", headers,
        body: JSON.stringify({ majorId: selectedMajor.id, cohort, items }),
      });
      if (res.ok) showToast("success", `Đã lưu ${items.length} môn cho ${selectedMajor.name} — ${cohort}`);
      else showToast("error", "Lỗi khi lưu kế hoạch.");
    } catch { showToast("error", "Lỗi kết nối."); }
    finally { setSubmitting(false); }
  };

  /* ── Apply ─────────────────────────────────────────────── */
  const handleApply = async (semId: string) => {
    if (!selectedMajor) return;
    const subjectIds = currentSemSubs.map(s => s.id);
    if (!subjectIds.length) { showToast("error", `${SEM_LABELS[activeSem]} chưa có môn học.`); return; }
    setApplying(true); setApplyResult(null);
    try {
      const items: any[] = [];
      Object.entries(blueprint).forEach(([sem, subs]) =>
        subs.forEach(s => items.push({ subjectId: s.id, suggestedSemester: parseInt(sem) }))
      );
      await fetch(API("/semester-plan/blueprint"), {
        method: "POST", headers,
        body: JSON.stringify({ majorId: selectedMajor.id, cohort, items }),
      });
      const res = await fetch(API("/semester-plan/apply"), {
        method: "POST", headers,
        body: JSON.stringify({ semesterId: semId, majorId: selectedMajor.id, cohort, subjectIds }),
      });
      if (res.ok) {
        const d = await res.json();
        setApplyResult(d);
        showToast("success", `✓ Tạo ${d.created} lớp · bỏ qua ${d.skipped} lớp đã tồn tại`);
      } else showToast("error", "Lỗi khi áp dụng.");
    } catch { showToast("error", "Lỗi kết nối."); }
    finally { setApplying(false); }
  };

  /* ─────────────────────────────────────────────────────── */
  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl animate-bounce">
          <Layers size={26} className="text-white" />
        </div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      <Toast t={toast} />

      {/* ── TOP BAR ──────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="px-6 py-3 flex items-center gap-6 flex-wrap">
          {/* Icon + Title */}
          <div className="flex items-center gap-3 mr-2">
            <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shadow-md">
              <Layers size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 leading-none">Kế hoạch Đào tạo</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">Xây dựng lộ trình theo học kỳ</p>
            </div>
          </div>

          <div className="w-px h-8 bg-slate-100 hidden md:block" />

          {/* Cohort chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Khóa</span>
            {COHORTS.map(c => (
              <button key={c} onClick={() => setCohort(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${cohort === c ? "bg-indigo-600 text-white shadow-md" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-slate-100 hidden md:block" />

          {/* Major dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ngành</span>
            <select value={selectedMajor?.id || ""}
              onChange={e => { const m = majors.find(x => x.id === e.target.value); if (m) setSelectedMajor(m); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 transition-all">
              {majors.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="w-px h-8 bg-slate-100 hidden md:block" />

          {/* Semester dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Kỳ</span>
            <select value={activeSem}
              onChange={e => { setActiveSem(parseInt(e.target.value)); setSearch(""); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 ring-indigo-200 transition-all min-w-[160px]">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <option key={n} value={n}>
                  {SEM_LABELS[n]} {(blueprint[n] || []).length > 0 ? `(${(blueprint[n] || []).length} môn · ${semCredits(n)} TC)` : "(chưa có môn)"}
                </option>
              ))}
            </select>
          </div>

          {/* Spacer + overall TC */}
          <div className="ml-auto flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black ${totalCredits >= 120 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <Award size={14} />
              {totalCredits} / 145 TC
            </div>
            <button onClick={handleSave} disabled={submitting || !selectedMajor}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50">
              {submitting ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
              Lưu kế hoạch
            </button>
          </div>
        </div>
      </div>

      {/* ── BODY: 2 cols ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Active Semester Detail ─────────────── */}
        <div className="w-72 shrink-0 bg-white border-r border-slate-100 flex flex-col overflow-y-auto">
          <div className="p-5 space-y-5">

            {/* Active semester summary */}
            <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200">
              <p className="text-[9px] font-black text-indigo-300 uppercase tracking-[0.25em] mb-1">{cohort} · {selectedMajor?.name}</p>
              <h3 className="text-lg font-black mb-3">{SEM_LABELS[activeSem]}</h3>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-3xl font-black leading-none">{currentSemSubs.length}</p>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase mt-0.5">Môn học</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black leading-none">{semCredits(activeSem)}</p>
                  <p className="text-[10px] text-indigo-300 font-bold uppercase mt-0.5">Tín chỉ</p>
                </div>
              </div>
            </div>

            {/* Selected chips for this sem */}
            {currentSemSubs.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Môn đã chọn</p>
                  <button onClick={() => setBlueprint(prev => ({ ...prev, [activeSem]: [] }))}
                    className="text-[9px] font-black text-rose-400 hover:text-rose-600 uppercase">Xóa tất cả</button>
                </div>
                <div className="space-y-1.5">
                  {currentSemSubs.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100 group">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-indigo-800 truncate">{s.name}</p>
                        <p className="text-[9px] font-black text-indigo-400 uppercase">{s.code} · {s.credits} TC</p>
                      </div>
                      <button onClick={() => toggleSub(s)}
                        className="ml-2 w-5 h-5 bg-indigo-100 text-indigo-400 rounded-full flex items-center justify-center hover:bg-rose-100 hover:text-rose-500 transition-all shrink-0">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
                <BookOpen size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-[10px] font-bold text-slate-400">Chưa có môn nào</p>
                <p className="text-[9px] text-slate-300 mt-0.5">Chọn môn từ danh sách bên phải</p>
              </div>
            )}

            {/* TC per semester overview */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Tổng quan kế hoạch</p>
              <div className="space-y-1">
                {[1,2,3,4,5,6,7,8].map(n => {
                  const cr = semCredits(n); const cnt = (blueprint[n] || []).length;
                  if (!cnt) return (
                    <div key={n} className={`flex justify-between py-1 text-[10px] ${activeSem === n ? "font-black text-indigo-600" : "text-slate-300 font-medium"}`}>
                      <span>{SEM_LABELS[n]}</span>
                      <span>—</span>
                    </div>
                  );
                  return (
                    <div key={n} className={`flex justify-between py-1 text-[10px] ${activeSem === n ? "font-black text-indigo-600" : "font-bold text-slate-500"}`}>
                      <span>{SEM_LABELS[n]}</span>
                      <span>{cnt} môn · <strong>{cr} TC</strong></span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200 flex justify-between">
                <span className="text-[9px] font-black text-slate-400 uppercase">Tổng toàn khóa</span>
                <span className={`text-sm font-black ${totalCredits >= 120 ? "text-emerald-600" : "text-amber-500"}`}>{totalCredits} TC</span>
              </div>
            </div>

            {/* Apply to real semester */}
            <div className="bg-slate-900 rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} className="text-amber-400" fill="currentColor" />
                <p className="font-black text-sm">Áp dụng vào kỳ thực</p>
              </div>
              <p className="text-slate-400 text-[10px] font-medium mb-3 leading-relaxed">
                Tự động tạo lớp, gán GV cho <strong className="text-white">{SEM_LABELS[activeSem]}</strong>.
              </p>
              <select defaultValue=""
                onChange={e => { if (e.target.value) { handleApply(e.target.value); (e.target as any).value = ""; } }}
                className="w-full bg-white/10 text-white text-[10px] font-bold rounded-xl px-3 py-2.5 outline-none border border-white/10 focus:border-white/30 transition-all">
                <option value="" disabled>Chọn học kỳ triển khai...</option>
                {realSemesters.map(s => <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>)}
              </select>
              {applying && (
                <div className="flex items-center gap-2 mt-2 text-slate-400 text-[10px] font-bold">
                  <Loader2 className="animate-spin" size={11} /> Đang xử lý...
                </div>
              )}
              {applyResult && !applying && (
                <div className="mt-2 p-2 bg-white/5 rounded-xl text-[10px] font-bold text-emerald-400">
                  ✓ Tạo {applyResult.created} lớp · {applyResult.skipped} đã tồn tại
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Subject Picker ─────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Search + quick actions */}
          <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input type="text"
                placeholder={`Tìm môn học trong ${SEM_LABELS[activeSem]}...`}
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200 placeholder:text-slate-400 transition-all" />
              {search && (
                <button onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-slate-200 rounded-lg flex items-center justify-center hover:bg-slate-300 transition-all">
                  <X size={11} />
                </button>
              )}
            </div>
            <span className="text-xs text-slate-400 font-bold shrink-0">{filteredSubs.length} môn</span>
            <button
              onClick={() => {
                const toAdd = filteredSubs.filter(s =>
                  !Object.entries(blueprint).some(([k, v]) => parseInt(k) !== activeSem && v.some(x => x.id === s.id))
                );
                setBlueprint(prev => ({ ...prev, [activeSem]: toAdd }));
              }}
              className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider shrink-0 transition-colors">
              Chọn tất cả
            </button>
            <button
              onClick={() => setBlueprint(prev => ({ ...prev, [activeSem]: [] }))}
              className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider shrink-0 transition-colors">
              Bỏ chọn
            </button>
          </div>

          {/* Subject grid */}
          <div className="flex-1 overflow-y-auto p-5">
            {filteredSubs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Search size={44} className="text-slate-200 mb-3" />
                <p className="text-sm font-bold text-slate-400">Không tìm thấy môn học</p>
                <p className="text-xs text-slate-300 mt-1">Thử thay đổi từ khóa tìm kiếm</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredSubs.map(s => {
                  const sel = currentSemSubs.some(x => x.id === s.id);
                  const otherSem = otherSemOf(s.id);
                  const blocked = !!otherSem && !sel;

                  return (
                    <motion.button key={s.id} layout
                      onClick={() => toggleSub(s)}
                      className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-150 group
                        ${sel ? "bg-indigo-50 border-indigo-400"
                          : blocked ? "bg-slate-50 border-slate-100 opacity-55"
                          : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md"}`}>

                      {/* Checkbox */}
                      <div className={`absolute top-3 right-3 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all
                        ${sel ? "bg-indigo-600 border-indigo-600" : blocked ? "border-slate-200 bg-slate-100" : "border-slate-200 group-hover:border-indigo-300"}`}>
                        {sel && <Check size={12} className="text-white" strokeWidth={3} />}
                      </div>

                      {/* Credits badge */}
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-lg mb-2 text-[10px] font-black
                        ${sel ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500"}`}>
                        {s.credits} TC
                      </div>

                      {/* Name */}
                      <p className={`text-[12px] font-bold leading-snug line-clamp-2 mb-1.5 pr-6
                        ${sel ? "text-indigo-800" : blocked ? "text-slate-500" : "text-slate-800"}`}>
                        {s.name}
                      </p>

                      {/* Code + dept */}
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{s.code}</p>
                      {s.department?.name && (
                        <p className="text-[9px] text-slate-300 font-bold mt-0.5 truncate">{s.department.name}</p>
                      )}

                      {/* Badge: already in other semester */}
                      {blocked && (
                        <div className="mt-2 flex items-center gap-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-2 py-1">
                          <Info size={10} />
                          <span className="text-[9px] font-black">{otherSem}</span>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom bar */}
          <div className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span><strong className="text-indigo-600">{currentSemSubs.length}</strong> môn đã chọn cho {SEM_LABELS[activeSem]}</span>
              <span>·</span>
              <span><strong className={totalCredits >= 120 ? "text-emerald-600" : "text-amber-500"}>{totalCredits}</strong> / 145 TC toàn khóa</span>
            </div>
            <button onClick={handleSave} disabled={submitting || !selectedMajor}
              className="flex items-center gap-2 px-7 py-2.5 bg-indigo-600 text-white rounded-xl font-black text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all">
              {submitting ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Lưu & Đồng bộ kế hoạch
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
