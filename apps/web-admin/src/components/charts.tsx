"use client";

import React from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

export const EnrollmentChart = ({ trends }: { trends: any[] }) => {
    // Reformat data slightly 
    const data = trends.map(t => ({
        name: t.name,
        'Ghi danh': t.enrollments
    }));

    return (
        <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={data}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorEnrollment" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="Ghi danh"
                        stroke="#6366f1"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorEnrollment)"
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export const AttendancePieChart = ({ distribution, rate }: { distribution: any[], rate: number }) => {

    // Process color correctly from DB format
    const data = distribution.map(d => ({
        name: d.name.replace("Poor (< 5)", "Kém (< 5)")
            .replace("Average (5-6)", "Khá (5-6)")
            .replace("Good (7-8)", "Giỏi (7-8)")
            .replace("Excellent (9-10)", "Xuất sắc (9-10)"),
        value: d.value,
        color: d.color
    }));

    return (
        <div className="h-64 w-full relative flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Central Rate Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none md:pr-[120px]">
                <span className="text-3xl font-extrabold text-slate-800 tracking-tighter">{rate}%</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Lên Lớp</span>
            </div>
        </div>
    );
};

export const GpaPieChart = ({ distribution }: { distribution: any[] }) => {
    return (
        <div className="h-64 w-full relative flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                    >
                        {distribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Legend
                        layout="vertical"
                        verticalAlign="middle"
                        align="right"
                        iconType="circle"
                        iconSize={10}
                        wrapperStyle={{ fontSize: '13px', color: '#475569', fontWeight: '500' }}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
