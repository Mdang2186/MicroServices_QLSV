"use client";

import { cn } from "@/lib/utils";
import { LayoutDashboard, GraduationCap, CircleDollarSign, Activity } from "lucide-react";

interface Tab {
    id: string;
    label: string;
    icon: any;
}

interface DashboardTabsProps {
    activeTab: string;
    onTabChange: (id: string) => void;
    tabs?: Tab[];
}

export function DashboardTabs({ activeTab, onTabChange, tabs }: DashboardTabsProps) {
    const defaultTabs = [
        { id: "overview", label: "Tổng quan", icon: LayoutDashboard },
        { id: "academic", label: "Học thuật", icon: GraduationCap },
        { id: "operations", label: "Vận hành & Tài chính", icon: CircleDollarSign },
    ];

    const displayTabs = tabs || defaultTabs;

    return (
        <div className="flex items-center gap-1 bg-slate-100/50 p-1.5 rounded-[20px] w-fit border border-slate-100 shadow-inner group/tabs">
            {displayTabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "flex items-center gap-2.5 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300",
                        activeTab === tab.id
                            ? "bg-white text-uneti-blue shadow-lg shadow-uneti-blue/10 scale-[1.02] border border-slate-50"
                            : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                    )}
                >
                    <tab.icon size={14} className={cn(activeTab === tab.id ? "text-uneti-blue" : "text-slate-300")} />
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
