"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BookOpen, Settings, LogOut, GraduationCap, Building2, UserCog, Menu, X } from "lucide-react";

export default function StaffSidebar() {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    const navItems = [
        { href: "/staff/dashboard", icon: LayoutDashboard, label: "Bảng điều khiển" },
        { href: "/staff/students", icon: GraduationCap, label: "Quản lý Sinh viên" },
        { href: "/staff/courses", icon: BookOpen, label: "Học phần - Lớp" },
        { href: "/staff/departments", icon: Building2, label: "Khoa - Ngành" },
        { href: "/staff/lecturers", icon: Users, label: "Hồ sơ Giảng viên" },
    ];

    return (
        <>
            {/* Mobile Header Topbar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-40">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-uneti-blue flex items-center justify-center text-white shrink-0">
                        <UserCog size={16} />
                    </div>
                    <span className="font-bold text-sm text-slate-800 uppercase tracking-tight">UNETI Staff</span>
                </div>
                <button onClick={() => setIsOpen(true)} className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg">
                    <Menu size={20} />
                </button>
            </div>

            {/* Backdrop Overlay for Mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-40 lg:hidden transition-all"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[260px] bg-white border-r border-[#eef2f6] flex flex-col h-screen overflow-y-auto transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:flex-shrink-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="p-6 pb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-uneti-blue flex items-center justify-center text-white shrink-0 shadow-lg shadow-uneti-blue/20">
                            <UserCog size={20} />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-800 leading-tight uppercase tracking-tight">UNETI Staff</h1>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Phòng Đào Tạo</p>
                        </div>
                    </div>

                    {/* Close button for mobile */}
                    <button
                        className="lg:hidden p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-lg transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <X size={18} />
                    </button>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-6">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsOpen(false)}
                                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                                    ? "bg-uneti-blue-light text-uneti-blue font-bold shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"
                                    }`}
                            >
                                <item.icon size={18} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-uneti-blue" : "text-slate-400 group-hover:text-slate-600"} />
                                <span className="text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-4 pb-6 mt-auto space-y-1">
                    <Link
                        href="/staff/change-password"
                        onClick={() => setIsOpen(false)}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group ${pathname === "/staff/change-password"
                            ? "bg-uneti-blue-light text-uneti-blue font-bold shadow-sm"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium"
                            }`}
                    >
                        <Settings size={18} strokeWidth={2} className={pathname === "/staff/change-password" ? "text-uneti-blue" : "text-slate-400 group-hover:text-slate-600"} />
                        <span className="text-sm">Đổi mật khẩu</span>
                    </Link>
                    <button className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-rose-500 hover:bg-rose-50 font-medium transition-all duration-200 group" onClick={() => {
                        document.cookie = "admin_accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        document.cookie = "admin_role=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        document.cookie = "admin_user=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
                        window.location.href = "/login";
                    }}>
                        <LogOut size={18} strokeWidth={2} className="text-rose-400 group-hover:text-rose-600" />
                        <span className="text-sm">Đăng xuất</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
