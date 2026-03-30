"use client";

import React from "react";
import {
    Bell,
    Search,
    User,
    ChevronDown,
    Menu,
    LogOut,
    Settings,
    UserCircle,
    Key,
    AlertTriangle
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import Image from "next/image";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import NotificationCenter from "./NotificationCenter";

interface HeaderProps {
    title: string;
    userName?: string;
    roleName: string;
    userImage?: string;
}

export default function Header({ title, userName: propUserName, roleName, userImage }: HeaderProps) {
    const { toggle, toggleCollapse, isCollapsed } = useSidebar();
    const router = useRouter();
    const [userData, setUserData] = React.useState<{ username?: string; image?: string; initials?: string }>({});
    const [dropdownOpen, setDropdownOpen] = React.useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

    // Close dropdown on outside click
    React.useEffect(() => {
        const handleOutsideClick = () => setDropdownOpen(false);
        if (dropdownOpen) {
            window.addEventListener("click", handleOutsideClick);
        }
        return () => window.removeEventListener("click", handleOutsideClick);
    }, [dropdownOpen]);

    React.useEffect(() => {
        if (!propUserName) {
            try {
                const userCookie = document.cookie.split("; ").find(row => row.startsWith("admin_user="));
                if (userCookie) {
                    const parsed = JSON.parse(decodeURIComponent(userCookie.split("=")[1]));
                    const name = parsed.fullName || parsed.username || "User";
                    // For lecturers, format as "Degree. Name" if degree is scientific (ThS, TS, etc.)
                    // Otherwise just show name or "Giảng viên Name"
                    const isScientificDegree = ["ThS", "TS", "PGS", "GS"].some(d => parsed.degree?.includes(d));
                    const displayName = isScientificDegree ? `${parsed.degree}. ${name}` : name;
                    
                    setUserData({
                        username: displayName,
                        image: parsed.avatar || parsed.image || parsed.avatarUrl,
                        initials: (name || "U").charAt(0).toUpperCase()
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
                    <NotificationCenter />

                    <div className="h-8 w-[1px] bg-slate-100 mx-1 hidden sm:block"></div>

                     {/* User Profile Dropdown */}
                    <div className="relative">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setDropdownOpen(!dropdownOpen); }}
                            className={`flex items-center gap-3 p-1 pl-1 pr-2 rounded-2xl transition-all group border border-transparent ${dropdownOpen ? 'bg-slate-50 border-slate-100' : 'hover:bg-slate-50 hover:border-slate-100'}`}
                        >
                            <div className={`w-9 h-9 rounded-xl bg-uneti-blue/10 flex items-center justify-center text-uneti-blue transition-all overflow-hidden relative border border-uneti-blue/5 ${dropdownOpen ? 'shadow-lg shadow-uneti-blue/20' : 'group-hover:shadow-lg group-hover:shadow-uneti-blue/20'}`}>
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
                            <ChevronDown size={14} className={`text-slate-300 transition-all hidden sm:block ${dropdownOpen ? 'rotate-180 text-slate-600' : 'group-hover:text-slate-600'}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {dropdownOpen && (
                            <div 
                                className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-200/50 py-2 animate-in fade-in zoom-in-95 duration-200 z-50 overflow-hidden"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="px-4 py-3 border-b border-slate-50 mb-1">
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tài khoản</p>
                                </div>
                                <button 
                                    onClick={() => router.push('/lecturer/profile')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-uneti-blue transition-colors"
                                >
                                    <UserCircle size={18} className="text-slate-400" />
                                    <span>Hồ sơ cá nhân</span>
                                </button>
                                <button 
                                    onClick={() => router.push(roleName.includes('ADMIN') ? '/admin/change-password' : roleName === 'LECTURER' ? '/lecturer/change-password' : '/staff/change-password')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-uneti-blue transition-colors"
                                >
                                    <Key size={18} className="text-slate-400" />
                                    <span>Đổi mật khẩu</span>
                                </button>
                                <button 
                                    onClick={() => router.push('/lecturer/settings')}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-bold text-slate-600 hover:bg-slate-50 hover:text-uneti-blue transition-colors"
                                >
                                    <Settings size={18} className="text-slate-400" />
                                    <span>Cài đặt hệ thống</span>
                                </button>
                                <div className="h-px bg-slate-50 my-1"></div>
                                <button 
                                    onClick={() => { setDropdownOpen(false); setShowLogoutConfirm(true); }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-black text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span>Đăng xuất</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-slate-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500/10"></div>
                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto shadow-inner">
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3 text-center">Xác nhận đăng xuất</h3>
                        <p className="text-[13px] font-medium text-slate-500 mb-8 text-center leading-relaxed">
                            Bạn có chắc chắn muốn kết thúc phiên làm việc hiện tại không?
                        </p>
                        <div className="flex flex-col gap-3">
                            <button 
                                onClick={() => {
                                    Cookies.remove("admin_accessToken");
                                    Cookies.remove("admin_role");
                                    Cookies.remove("admin_user");
                                    Cookies.remove("staff_accessToken");
                                    Cookies.remove("lecturer_accessToken");
                                    localStorage.clear();
                                    window.location.href = "/login";
                                }}
                                className="w-full py-3.5 bg-rose-600 text-white rounded-2xl text-[14px] font-black hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 active:scale-[0.98]"
                            >
                                Đăng xuất ngay
                            </button>
                            <button 
                                onClick={() => setShowLogoutConfirm(false)}
                                className="w-full py-3.5 bg-slate-50 text-slate-600 rounded-2xl text-[14px] font-black hover:bg-slate-100 transition-all active:scale-[0.98]"
                            >
                                Ở lại
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}
