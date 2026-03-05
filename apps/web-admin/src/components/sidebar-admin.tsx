"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, GraduationCap, UserCog, ShieldCheck, Menu, X } from "lucide-react";

export default function AdminSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { href: "/admin/dashboard", icon: LayoutDashboard, label: "Bảng điều khiển" },
        { href: "/admin/students", icon: GraduationCap, label: "Sinh viên" },
        { href: "/admin/lecturers", icon: BookOpen, label: "Giảng viên" },
        { href: "/admin/staff", icon: UserCog, label: "Nhân viên ĐT" },
        { href: "/admin/users", icon: Users, label: "Tra cứu User" },
    ];

    return (
        <>
            {/* Mobile Header Topbar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                        <ShieldCheck size={18} />
                    </div>
                    <span className="font-bold text-slate-800">UNETI Admin</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                    <Menu size={24} />
                </button>
            </div>

            {/* Backdrop Overlay for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-800/20 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-[#eef2f6] flex flex-col h-screen overflow-y-auto transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-8 pb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
                            <ShieldCheck size={22} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-800 leading-tight">UNETI Admin</h1>
                            <p className="text-xs text-slate-500">Quản trị viên</p>
                        </div>
                    </div>

                    {/* Close button for mobile */}
                    <button
                        className="lg:hidden p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 px-5 space-y-2 mt-4">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3.5 px-4 py-3 rounded-2xl transition-all duration-200 ${isActive
                                        ? "bg-blue-50 text-blue-600 font-semibold"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium"
                                    }`}
                            >
                                <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-5 pb-8 mt-auto space-y-2">
                    <Link
                        href="/admin/settings"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-3.5 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium transition-all duration-200"
                    >
                        <Settings size={20} strokeWidth={2} />
                        <span>Cài đặt hệ thống</span>
                    </Link>
                    <button className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 font-medium transition-all duration-200" onClick={() => {
                        document.cookie = "admin_accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        document.cookie = "admin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        document.cookie = "admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        window.location.href = "/login";
                    }}>
                        <LogOut size={20} strokeWidth={2} />
                        <span>Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
