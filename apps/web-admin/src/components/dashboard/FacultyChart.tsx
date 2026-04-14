"use client";

import { Activity, Building2 } from "lucide-react";

interface FacultyData {
    name: string;
    value: number;
}

interface FacultyChartProps {
    data: FacultyData[];
    title?: string;
    iconType?: "building" | "compass" | "graduation";
    totalLabel?: string;
}

export function FacultyChart({ data, title = "Phân bổ Ghi danh Khoa", iconType = "building", totalLabel = "Tổng cộng hệ thống" }: FacultyChartProps) {
    const total = data.reduce((acc, curr) => acc + curr.value, 0);

    const Icon = iconType === "building" ? Building2 : iconType === "compass" ? Activity : Activity; // I'll fix icons properly below

    return (
        <div className="bg-white rounded-[40px] p-8 shadow-xl shadow-slate-200/20 border border-slate-100 min-h-[400px] flex flex-col relative overflow-hidden group">
            {/* Background Accent */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-uneti-blue/5 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>

            <div className="flex items-center justify-between mb-8 relative z-10">
                <div className="space-y-1">
                    <h2 className="text-[10px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2">
                        {iconType === "building" && <Building2 size={16} className="text-uneti-blue" />}
                        {iconType === "compass" && <Activity size={16} className="text-uneti-blue" />}
                        {iconType === "graduation" && <Activity size={16} className="text-uneti-blue" />}
                        {title}
                    </h2>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Thống kê theo dữ liệu nguồn</p>
                </div>
            </div>

            <div className="flex-1 space-y-6 relative z-10">
                {data.length > 0 ? (
                    data.map((f, i) => {
                        const percentage = total > 0 ? Math.round((f.value / total) * 100) : 0;
                        const maxVal = data[0]?.value || 1;
                        const barWidth = Math.round((f.value / maxVal) * 100);

                        return (
                            <div key={i} className="space-y-2 group/bar">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[11px] font-black text-slate-700 uppercase tracking-tighter group-hover/bar:text-uneti-blue transition-colors truncate max-w-[160px]">
                                        {f.name}
                                    </span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                                            {f.value.toLocaleString()} SV
                                        </span>
                                        <span className="text-[11px] font-black text-uneti-blue tabular-nums bg-uneti-blue-light/50 px-2 py-0.5 rounded-lg min-w-[40px] text-center">
                                            {percentage}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-3 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100 p-0.5 shadow-inner">
                                    <div
                                        className="h-full bg-gradient-to-r from-uneti-blue to-uneti-blue/80 rounded-full transition-all duration-1000 group-hover/bar:shadow-[0_0_12px_rgba(0,102,179,0.4)]"
                                        style={{ width: `${barWidth}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 py-20">
                        <Activity size={48} strokeWidth={1} className="animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-6 text-center">
                            Đang thu thập dữ liệu <br />
                            Phân bổ hệ thống...
                        </p>
                    </div>
                )}
            </div>

            {/* Quick Summary Footer */}
            {data.length > 0 && (
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between gap-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-tight">{totalLabel}</span>
                    <span className="text-[13px] font-black text-slate-900 tracking-tight whitespace-nowrap">{total.toLocaleString()} Sinh viên</span>
                </div>
            )}
        </div>
    );
}
