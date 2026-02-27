import React from "react";

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: any;
    trend?: string;
    trendLabel?: string;
    trendUp?: boolean;
    color?: "blue" | "green" | "purple" | "orange";
}


export function StatsCard({ title, value, icon: Icon, trend, trendLabel, trendUp = true, color = "blue" }: StatsCardProps) {
    const colorClasses = {
        blue: "bg-blue-100 text-blue-600",
        green: "bg-green-100 text-green-600",
        purple: "bg-purple-100 text-purple-600",
        orange: "bg-orange-100 text-orange-600",
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <h3 className="text-2xl font-bold mt-2 text-gray-900">{value}</h3>
                </div>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            {(trend || trendLabel) && (
                <div className="mt-4 flex items-center gap-2">
                    {trend && (
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                            {trend}
                        </span>
                    )}
                    {trendLabel && <span className="text-xs text-gray-400">{trendLabel}</span>}
                </div>
            )}
        </div>
    );
}
