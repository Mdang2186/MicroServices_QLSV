"use client";

import React from "react";
import {
    BookOpen, ChevronDown, Users, ArrowUpRight, Pencil, ClipboardList, GraduationCap
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface SubjectRowProps {
    subject: any;
    courses: any[];
    selectedSemesterId: string;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onSetupClass: (subjectId: string) => void;
    onSelectClass: (subjectId: string, courseId: string) => void;
    selectedCourseId: string | null;
    onEditSubject?: (subject: any) => void;
}

export default function SubjectRow({
    subject, courses, selectedSemesterId, isExpanded,
    onToggleExpand, onSetupClass, onSelectClass, selectedCourseId, onEditSubject
}: SubjectRowProps) {
    const classesForSub = courses.filter(c =>
        c.subjectId === subject.id && (!selectedSemesterId || c.semesterId === selectedSemesterId)
    );
    const totalEnrolled = classesForSub.reduce((a, c) => a + (c._count?.enrollments || 0), 0);
    const totalSlots = classesForSub.reduce((a, c) => a + (c.maxSlots || 0), 0);
    const hasPractice = (subject.practiceHours ?? 0) > 0;

    const examTypeMap: Record<string, { label: string; color: string }> = {
        TU_LUAN: { label: "Tự luận", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
        TRAC_NGHIEM: { label: "Trắc nghiệm", color: "text-violet-600 bg-violet-50 border-violet-100" },
        THUC_HANH: { label: "Thực hành", color: "text-teal-600 bg-teal-50 border-teal-100" },
        VAN_DAP: { label: "Vấn đáp", color: "text-amber-600 bg-amber-50 border-amber-100" },
    };
    const examInfo = examTypeMap[subject.examType] ?? { label: subject.examType, color: "text-slate-500 bg-slate-50 border-slate-100" };

    return (
        <div className="flex flex-col mb-3 group/row">
            {/* Subject Header */}
            <div
                onClick={() => onToggleExpand(subject.id)}
                className={cn(
                    "px-6 py-5 bg-white border rounded-[28px] flex items-center justify-between cursor-pointer transition-all duration-300 shadow-sm",
                    isExpanded ? "border-uneti-blue/20 ring-4 ring-uneti-blue/5 shadow-lg rounded-b-none" : "border-slate-100 hover:border-uneti-blue/20 hover:shadow-md"
                )}
            >
                <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                        isExpanded ? "bg-uneti-blue text-white" : "bg-slate-50 text-slate-400 group-hover/row:bg-blue-50 group-hover/row:text-uneti-blue"
                    )}>
                        <BookOpen size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-[9px] font-black text-uneti-blue bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-widest border border-blue-100">
                                {subject.code}
                            </span>
                            <span className="text-[9px] font-black text-slate-400 uppercase">{subject.credits} TC</span>
                            {hasPractice && (
                                <span className="text-[9px] font-black text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded-md uppercase">
                                    TH {subject.practiceHours}h
                                </span>
                            )}
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase border", examInfo.color)}>
                                {examInfo.label}
                            </span>
                            {subject.examDuration && (
                                <span className="text-[9px] font-bold text-slate-400 uppercase">{subject.examDuration}p</span>
                            )}
                            <span className="w-1 h-1 rounded-full bg-slate-200" />
                            <span className="text-[9px] font-black text-slate-400 uppercase">
                                {classesForSub.length} Lớp
                            </span>
                            {totalSlots > 0 && (
                                <>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="text-[9px] font-bold text-slate-400">
                                        {totalEnrolled}/{totalSlots} SV
                                    </span>
                                </>
                            )}
                        </div>
                        <h3 className={cn(
                            "text-xs font-black uppercase tracking-tight line-clamp-1 transition-colors",
                            isExpanded ? "text-uneti-blue" : "text-slate-800"
                        )}>{subject.name}</h3>
                    </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-4">
                    {/* Edit subject */}
                    {onEditSubject && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onEditSubject(subject); }}
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-amber-50 hover:text-amber-600 text-slate-300 transition-all"
                            title="Sửa môn học"
                        >
                            <Pencil size={14} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onSetupClass(subject.id); }}
                        className="px-4 py-2 bg-uneti-blue/10 text-uneti-blue rounded-xl text-[10px] font-black uppercase hover:bg-uneti-blue hover:text-white transition-all"
                    >
                        + Mở lớp
                    </button>
                    <ChevronDown size={18} className={cn("text-slate-300 transition-all duration-500", isExpanded && "rotate-180 text-uneti-blue")} />
                </div>
            </div>

            {/* Expanded: Class list */}
            {isExpanded && (
                <div className="bg-white border border-uneti-blue/10 border-t-0 rounded-b-[28px] shadow-sm overflow-hidden">
                    {classesForSub.length === 0 ? (
                        <div className="py-6 text-center border-t border-dashed border-slate-100">
                            <p className="text-[9px] font-bold text-slate-300 italic uppercase tracking-widest">
                                Chưa có lớp học phần nào cho kỳ này
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {classesForSub.map(c => {
                                const fillPct = c.maxSlots > 0 ? Math.round((c._count?.enrollments || 0) / c.maxSlots * 100) : 0;
                                return (
                                    <div
                                        key={c.id}
                                        onClick={() => onSelectClass(subject.id, c.id)}
                                        className={cn(
                                            "flex items-center gap-4 px-6 py-4 cursor-pointer transition-all",
                                            selectedCourseId === c.id ? "bg-blue-50/60" : "hover:bg-slate-50/40"
                                        )}
                                    >
                                        {/* Status indicator */}
                                        <div className={cn(
                                            "w-2 h-2 rounded-full shrink-0",
                                            c.status === "OPEN" ? "bg-emerald-400" :
                                            c.status === "CLOSED" ? "bg-slate-300" : "bg-rose-400"
                                        )} />

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-black text-slate-800 uppercase">{c.name || c.code}</span>
                                                <span className={cn(
                                                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                                                    c.status === "OPEN" ? "text-emerald-600 border-emerald-100 bg-emerald-50"
                                                        : "text-slate-400 border-slate-100 bg-slate-50"
                                                )}>{c.status}</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-[9px] font-bold text-slate-400 uppercase">
                                                <span className="flex items-center gap-1">
                                                    <GraduationCap size={10} /> {c.lecturer?.fullName || "Chưa gán GV"}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span>{c._count?.sessions || 0} Buổi</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                                <span>{(c.adminClasses || []).map((ac: any) => ac.code).join(", ") || "Chưa gán lớp"}</span>
                                            </div>
                                            {/* Fill bar */}
                                            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                                <div className="h-full bg-uneti-blue/40 rounded-full transition-all"
                                                    style={{ width: `${fillPct}%` }} />
                                            </div>
                                        </div>

                                        <div className="text-right shrink-0">
                                            <p className="text-[12px] font-black text-uneti-blue">{c._count?.enrollments || 0}/{c.maxSlots}</p>
                                            <p className="text-[8px] font-black text-slate-300 uppercase">Sĩ số</p>
                                        </div>

                                        <ArrowUpRight size={14} className={selectedCourseId === c.id ? "text-uneti-blue" : "text-slate-200"} />
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
