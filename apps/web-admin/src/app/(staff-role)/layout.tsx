import React from "react";
import StaffSidebar from "../../components/sidebar-staff";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
            <StaffSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    );
}
