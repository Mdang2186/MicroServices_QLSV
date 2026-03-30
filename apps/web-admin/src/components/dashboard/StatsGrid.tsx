"use client";

import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
    label: string;
    value: string | number;
    icon: any;
    color: string;
    sub: string;
    trend?: {
        value: string;
        type: "up" | "down" | "neutral";
    };
}

interface StatsGridProps {
    stats: StatItem[];
}

export function StatsGrid({ stats }: StatsGridProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
                <div key={i} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
                    <div className={cn(
                        "absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-2xl group-hover:scale-110 transition-transform duration-500",
                        s.color === 'blue' ? 'bg-uneti-blue/5' : `bg-${s.color}-500/5`
                    )}></div>
                    
                    <div className="flex items-center justify-between mb-6 relative z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{s.label}</span>
                        <div className={cn(
                            "p-2.5 rounded-xl shadow-inner",
                            s.color === 'blue' ? 'bg-uneti-blue-light text-uneti-blue' : `bg-${s.color}-50 text-${s.color}-600`
                        )}>
                            <s.icon size={18} />
                        </div>
                    </div>

                    <div className="relative z-10 space-y-2">
                        <div className="flex items-baseline justify-between gap-2">
                            <h3 className="text-3xl font-black text-slate-900 tracking-tight tabular-nums">{s.value}</h3>
                            {s.trend && (
                                <div className={cn(
                                    "flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight",
                                    s.trend.type === "up" ? "bg-emerald-50 text-emerald-600" : 
                                    s.trend.type === "down" ? "bg-rose-50 text-rose-600" : "bg-slate-50 text-slate-400"
                                )}>
                                    {s.trend.type === "up" && <ArrowUpRight size={10} />}
                                    {s.trend.type === "down" && <ArrowDownRight size={10} />}
                                    {s.trend.type === "neutral" && <Minus size={10} />}
                                    {s.trend.value}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1.5">
                            <TrendingUp size={10} className="text-slate-300" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{s.sub}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
