"use client";

import { Zap, Users, GraduationCap, BookOpen, CircleDollarSign } from "lucide-react";

interface OperationalInsightsProps {
    stats: any;
}

export function OperationalInsights({ stats }: OperationalInsightsProps) {
    const items = [
        { label: "Sinh viên", value: stats?.semesterStudents || 0, icon: Users, sub: "Đang tham gia" },
        { label: "Doanh thu", value: `${((stats?.semesterRevenue || 0) / 1e9).toFixed(1)}B`, icon: CircleDollarSign, sub: "Học phí dự kiến" },
        { label: "Tỉ lệ Slots", value: `${stats?.registrationProgress || 0}%`, icon: BookOpen, sub: "Đăng ký học phần" },
        { label: "Vào điểm", value: `${stats?.gradeProgress || 0}%`, icon: GraduationCap, sub: "Tiến độ nhập điểm" },
    ];

    return (
        <div className="bg-white rounded-[40px] p-6 shadow-xl shadow-slate-200/20 border border-slate-100">
            <h2 className="text-[10px] font-black text-slate-900 tracking-widest uppercase flex items-center gap-2 mb-6">
                <Zap size={14} className="text-uneti-blue" />
                Chỉ số Học kỳ
            </h2>
            <div className="grid grid-cols-2 gap-4">
                {items.map((insight, i) => (
                    <div key={i} className="bg-slate-50/50 p-4 rounded-3xl border border-slate-50 hover:bg-white hover:shadow-lg transition-all group">
                        <insight.icon size={14} className="text-slate-300 group-hover:text-uneti-blue mb-2 transition-colors" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{insight.label}</p>
                        <p className="text-sm font-black text-slate-800 tabular-nums">{insight.value}</p>
                        <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tight mt-1 group-hover:text-slate-400 transition-colors">{insight.sub}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
