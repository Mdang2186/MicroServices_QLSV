"use client";

import React from "react";
import {
    Bell,
    Search,
    User,
    ChevronDown,
    Menu
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";

interface HeaderProps {
    title: string;
    userName?: string;
    roleName: string;
    userImage?: string;
}

export default function Header({ title, userName: propUserName, roleName, userImage }: HeaderProps) {
    const { toggle, toggleCollapse, isCollapsed } = useSidebar();
    const [userData, setUserData] = React.useState<{ username?: string; image?: string; initials?: string }>({});

    React.useEffect(() => {
        if (!propUserName) {
            try {
                const userCookie = document.cookie.split("; ").find(row => row.startsWith("admin_user="));
                if (userCookie) {
                    const parsed = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
                    setUserData({
                        username: parsed.username || parsed.fullName,
                        image: parsed.avatar || parsed.image,
                        initials: (parsed.username || parsed.fullName || "U").charAt(0).toUpperCase()
                    });
                }
            } catch (e) {
                console.error("Failed to parse user cookie", e);
            }
        }
    }, [propUserName]);

    const displayUserName = propUserName || userData.username || "User";
    const displayImage = userImage || userData.image;
    const displayInitials = (displayUserName.charAt(0) || "U").toUpperCase();

    return (
        <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30 shadow-sm shadow-slate-200/20 transition-all duration-300">
            <div className="flex items-center gap-5">
                {/* Desktop Collapse Toggle */}
                <button
                    onClick={toggleCollapse}
                    className="hidden lg:flex p-2.5 text-slate-500 hover:bg-slate-50 hover:text-uneti-blue rounded-xl transition-all active:scale-95 group"
                    aria-label="Toggle Sidebar Collapse"
                >
                    <Menu size={20} className={`transition-transform duration-300 ${isCollapsed ? "rotate-180" : ""}`} />
                </button>

                {/* Mobile Menu Toggle */}
                <button
                    onClick={toggle}
                    className="lg:hidden p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all active:scale-95"
                    aria-label="Toggle Sidebar"
                >
                    <Menu size={22} />
                </button>

                {/* Mobile Logo/Branding */}
                <div className="flex lg:hidden items-center gap-2">
                    <div className="w-8 h-8 relative flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src="/images/logo_uneti.png"
                            alt="UNETI"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>

                <div className="h-6 w-px bg-slate-100 mx-1 hidden lg:block"></div>

                <h2 className="text-[15px] font-black text-slate-800 lg:block hidden tracking-tight uppercase">
                    {title}
                </h2>
            </div>

            <div className="flex items-center gap-3 lg:gap-6">
                {/* Search - Desktop only */}
                <div className="hidden md:flex items-center relative group">
                    <Search size={16} className="absolute left-3.5 text-slate-400 group-focus-within:text-uneti-blue transition-colors" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm nhanh..."
                        className="pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:bg-white focus:border-uneti-blue/20 transition-all w-72"
                    />
                    <div className="absolute right-3 hidden group-focus-within:flex items-center gap-1">
                        <span className="text-[10px] font-black text-slate-300 border border-slate-100 px-1.5 py-0.5 rounded-md">ESC</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 lg:gap-4">
                    {/* Notifications */}
                    <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-uneti-blue rounded-xl transition-all relative group">
                        <Bell size={20} className="group-hover:shake" />
                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
                    </button>

                    <div className="h-8 w-[1px] bg-slate-100 mx-1 hidden sm:block"></div>

                    {/* User Profile */}
                    <button className="flex items-center gap-3 p-1 pl-1 pr-2 hover:bg-slate-50 rounded-2xl transition-all group border border-transparent hover:border-slate-100">
                        <div className="w-9 h-9 rounded-xl bg-uneti-blue/10 flex items-center justify-center text-uneti-blue group-hover:shadow-lg group-hover:shadow-uneti-blue/20 transition-all overflow-hidden relative border border-uneti-blue/5">
                            {displayImage ? (
                                <Image
                                    src={displayImage}
                                    alt={displayUserName}
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <span className="text-[13px] font-black">{displayInitials}</span>
                            )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <p className="text-[13px] font-black text-slate-900 leading-none tracking-tight">{displayUserName}</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{roleName}</p>
                        </div>
                        <ChevronDown size={14} className="text-slate-300 group-hover:text-slate-600 transition-colors hidden sm:block" />
                    </button>
                </div>
            </div>
        </header>
    );
}
