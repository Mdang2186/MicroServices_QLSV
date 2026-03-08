import React from "react";
import AdminSidebar from "../../components/sidebar-admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
            <AdminSidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 scroll-smooth">
                    {children}
                </main>
            </div>
        </div>
    );
}
