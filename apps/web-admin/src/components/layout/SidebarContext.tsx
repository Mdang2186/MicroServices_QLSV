"use client";

import React, { createContext, useContext, useState } from "react";

interface SidebarContextType {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    toggle: () => void;
    isCollapsed: boolean;
    setIsCollapsed: (isCollapsed: boolean) => void;
    toggleCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    const toggle = () => setIsOpen((prev) => !prev);
    const toggleCollapse = () => setIsCollapsed((prev) => !prev);

    return (
        <SidebarContext.Provider value={{
            isOpen,
            setIsOpen,
            toggle,
            isCollapsed,
            setIsCollapsed,
            toggleCollapse
        }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error("useSidebar must be used within a SidebarProvider");
    }
    return context;
}
