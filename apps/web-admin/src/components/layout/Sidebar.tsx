"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "./SidebarContext";
import {
    LayoutDashboard,
    LogOut,
    Settings,
    Menu,
    X,
    LucideIcon,
    ChevronRight
} from "lucide-react";

export interface NavItem {
    href: string;
    icon: LucideIcon;
    label: string;
}

interface SidebarProps {
    brandName: string;
    roleDescription: string;
    navItems: NavItem[];
    brandIcon: LucideIcon;
    logoutPath?: string;
    changePasswordPath: string;
    onLogout?: () => void;
}

export default function Sidebar({
    brandName,
    roleDescription,
    navItems,
    brandIcon: BrandIcon,
    logoutPath = "/login",
    changePasswordPath,
    onLogout
}: SidebarProps) {
    const pathname = usePathname();
    const { isOpen, setIsOpen, isCollapsed } = useSidebar();

    const handleLogout = () => {
        if (onLogout) {
            onLogout();
        } else {
            // Default logout logic matching existing files
            document.cookie = "admin_accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            document.cookie = "admin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            document.cookie = "admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
            window.location.href = logoutPath;
        }
    };

    return (
        <>
            {/* Backdrop Overlay for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[4px] z-40 lg:hidden transition-all duration-500 ease-in-out animate-in fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col h-screen overflow-hidden transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:translate-x-0 lg:static lg:flex-shrink-0 ${isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                    } ${isCollapsed ? "w-[72px]" : "w-[260px]"}`}
            >
                {/* Brand Section */}
                <div className={`p-4 flex items-center ${isCollapsed ? "justify-center" : "justify-between"}`}>
                    <Link href="/" className="flex items-center gap-3 group overflow-hidden">
                        <div className="relative w-9 h-9 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src="/images/logo_uneti.png"
                                alt="UNETI"
                                className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                            />
                        </div>
                        {!isCollapsed && (
                            <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                                <h1 className="text-base font-black text-slate-900 tracking-tighter leading-none truncate">
                                    UNETI<span className="text-uneti-blue"></span>
                                </h1>
                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 truncate">
                                    {roleDescription}
                                </p>
                            </div>
                        )}
                    </Link>

                    {/* Close button for mobile */}
                    {!isCollapsed && (
                        <button
                            className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-900 rounded-lg transition-all active:scale-90"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close menu"
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Nav Items */}
                <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
                    {!isCollapsed && (
                        <p className="px-3 text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 mt-2 opacity-60 animate-in fade-in duration-500">
                            Menu chính
                        </p>
                    )}
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                title={isCollapsed ? item.label : ""}
                                className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? "bg-uneti-blue text-white shadow-lg shadow-uneti-blue/20"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-uneti-blue"
                                    }`}
                            >
                                <div className={`flex items-center ${isCollapsed ? "justify-center w-full" : "gap-3"} relative z-10`}>
                                    <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? "" : "group-hover:scale-110"}`}>
                                        <item.icon
                                            size={20}
                                            strokeWidth={isActive ? 2.5 : 2}
                                            className={isActive ? "text-white" : "text-slate-400 group-hover:text-uneti-blue"}
                                        />
                                    </div>
                                    {!isCollapsed && (
                                        <span className={`text-[13px] font-bold tracking-tight truncate animate-in fade-in slide-in-from-left-1 duration-300 ${isActive ? "text-white" : "text-slate-600 group-hover:text-uneti-blue"
                                            }`}>
                                            {item.label}
                                        </span>
                                    )}
                                </div>
                                {isActive && !isCollapsed && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white opacity-60 animate-pulse" />
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className={`p-3 space-y-1 mt-auto border-t border-slate-50 bg-slate-50/50 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                    <Link
                        href={changePasswordPath}
                        onClick={() => setIsOpen(false)}
                        title={isCollapsed ? "Bảo mật" : ""}
                        className={`flex items-center px-3 py-2.5 rounded-xl transition-all duration-200 group ${pathname === changePasswordPath
                            ? "bg-slate-900 text-white shadow-md"
                            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            } ${isCollapsed ? "justify-center w-full" : "gap-3"}`}
                    >
                        <Settings
                            size={18}
                            strokeWidth={2}
                            className={pathname === changePasswordPath ? "text-white" : "text-slate-400 group-hover:text-uneti-blue"}
                        />
                        {!isCollapsed && <span className="text-[13px] font-bold truncate">Bảo mật</span>}
                    </Link>
                    <button
                        className={`w-full flex items-center py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 font-bold transition-all duration-200 active:scale-[0.98] group ${isCollapsed ? "justify-center" : "px-3 gap-3"
                            }`}
                        onClick={handleLogout}
                        title={isCollapsed ? "Đăng xuất" : ""}
                    >
                        <LogOut size={18} strokeWidth={2} className="text-rose-500 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        {!isCollapsed && <span className="text-[13px] truncate">Đăng xuất</span>}
                    </button>

                </div>
            </aside>
        </>
    );
}
