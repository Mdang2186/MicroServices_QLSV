"use client";

import React from "react";
import Footer from "./Footer";
import { SidebarProvider, useSidebar } from "./SidebarContext";

interface DashboardLayoutProps {
    children: React.ReactNode;
    sidebar: React.ReactNode;
    header: React.ReactNode;
}

function LayoutContent({ children, sidebar, header }: DashboardLayoutProps) {
    const { isCollapsed } = useSidebar();

    return (
        <div className="flex h-screen overflow-hidden bg-[#f8fafc] text-slate-800 font-sans">
            {sidebar}

            <div className={`flex-1 flex flex-col min-w-0 overflow-hidden relative transition-all duration-300`}>
                {header}

                <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth bg-[#f8fafc]">
                    <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-180px)] animate-in fade-in duration-700">
                        {children}
                    </div>
                    <Footer />
                </main>
            </div>
        </div>
    );
}

export default function DashboardLayout(props: DashboardLayoutProps) {
    return (
        <SidebarProvider>
            <LayoutContent {...props} />
        </SidebarProvider>
    );
}
