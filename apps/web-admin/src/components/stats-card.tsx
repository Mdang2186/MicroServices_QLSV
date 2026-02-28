import React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    trendLabel?: string;
    trendUp?: boolean;
    color?: "blue" | "green" | "purple" | "orange" | "red" | "indigo" | "cyan" | "emerald";
}

export function StatsCard({ title, value, icon: Icon, trend, trendLabel, trendUp = true, color = "blue" }: StatsCardProps) {
    const colorClasses = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        green: "bg-emerald-50 text-emerald-600 border-emerald-100",
        purple: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
        orange: "bg-amber-50 text-amber-600 border-amber-100",
        red: "bg-rose-50 text-rose-600 border-rose-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
        cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
    };

    return (
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-lg transition-all duration-300 group">
            {/* Background decorative blob */}
            <div className={cn("absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20 transition-transform group-hover:scale-110", colorClasses[color].split(" ")[0])} />

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
                    <h3 className="text-3xl font-extrabold mt-2 text-slate-900 tracking-tight">{value}</h3>
                </div>
                <div className={cn(`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm`, colorClasses[color])}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>

            {(trend || trendLabel) && (
                <div className="mt-5 flex items-center gap-2 relative z-10">
                    {trend && (
                        <span className={cn(
                            "text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1",
                            trendUp ? 'text-emerald-700 bg-emerald-100/80 border border-emerald-200' : 'text-rose-700 bg-rose-100/80 border border-rose-200'
                        )}>
                            {trendUp ? '↑' : '↓'} {trend}
                        </span>
                    )}
                    {trendLabel && <span className="text-xs font-medium text-slate-400">{trendLabel}</span>}
                </div>
            )}
        </div>
    );
}
