import React from "react";
import StaffSidebar from "../../components/sidebar-staff";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-[#f4f7fe] text-slate-800 font-sans">
            <StaffSidebar />
            <main className="flex-1 min-w-0 overflow-x-hidden overflow-y-auto pt-16 lg:pt-0">
                {children}
            </main>
        </div>
    );
}
