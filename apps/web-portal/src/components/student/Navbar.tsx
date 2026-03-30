"use client";

import Link from "next/link";
import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Book, Calendar, GraduationCap, Home, LogOut, User, Settings, ChevronDown, GraduationCap as AcademicIcon, ClipboardCheck, Award, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
    { label: "Trang chủ", href: "/portal/dashboard", icon: Home },
    {
        label: "Học tập",
        href: "#",
        icon: AcademicIcon,
        children: [
            { label: "Kết quả học tập", href: "/portal/results", icon: GraduationCap },
            { label: "Thông tin điểm danh", href: "/portal/attendance", icon: ClipboardCheck },
            { label: "Kết quả rèn luyện", href: "/portal/training", icon: Award },
        ]
    },
    { label: "Đăng ký học", href: "/portal/enroll", icon: Book },
    { label: "Lịch học", href: "/portal/schedule", icon: Calendar },
    { label: "Học phí", href: "/portal/tuition", icon: CreditCard },
    { label: "Hồ sơ", href: "/portal/profile", icon: User },
    { label: "Đổi mật khẩu", href: "/portal/change-password", icon: Settings },
];

export default function StudentNavbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isStudyOpen, setIsStudyOpen] = useState(false);
    const [studentProfile, setStudentProfile] = useState<any>(null);

    useEffect(() => {
        const userCookie = Cookies.get("student_user");
        if (userCookie) {
            try {
                const user = JSON.parse(userCookie);
                setStudentProfile(user.student || user);
            } catch (e) {
                console.error("Failed to parse student user cookie", e);
            }
        }
    }, []);

    const handleLogout = () => {
        Cookies.remove("student_accessToken");
        Cookies.remove("student_role");
        Cookies.remove("student_user");
        localStorage.removeItem("student_accessToken");
        localStorage.removeItem("student_user");
        router.push("/login");
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link href="/portal/dashboard" className="flex items-center space-x-2">
                        <GraduationCap className="h-5 w-5 text-blue-600" />
                        <span className="font-extrabold text-gray-900 tracking-tight text-base">Student Portal</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href || (item.children?.some(child => pathname === child.href));

                            if (item.children) {
                                return (
                                    <div
                                        key={item.label}
                                        className="relative"
                                        onMouseEnter={() => setIsStudyOpen(true)}
                                        onMouseLeave={() => setIsStudyOpen(false)}
                                    >
                                        <button
                                            className={cn(
                                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-full hover:bg-gray-100",
                                                isActive ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600"
                                            )}
                                        >
                                            {item.label}
                                            <ChevronDown className={cn("h-3 w-4 transition-transform", isStudyOpen && "rotate-180")} />
                                        </button>

                                        <AnimatePresence>
                                            {isStudyOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 5 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 5 }}
                                                    className="absolute left-0 mt-1 w-48 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-slate-200 border border-slate-100"
                                                >
                                                    {item.children.map((child) => (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={cn(
                                                                "flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all",
                                                                pathname === child.href
                                                                    ? "bg-blue-50 text-blue-600"
                                                                    : "text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                                                            )}
                                                        >
                                                            <child.icon className="h-3.5 w-3.5" />
                                                            {child.label}
                                                        </Link>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            }

                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center px-3 py-1.5 text-xs font-bold transition-all rounded-full hover:bg-gray-100",
                                        isActive ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:text-blue-600"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* User Section */}
                <div className="flex items-center gap-3">
                    <div className="hidden md:flex flex-col items-end mr-1">
                        <span className="text-xs font-bold text-gray-900 leading-tight">
                            {studentProfile?.fullName || "Sinh viên"}
                        </span>
                        <span className="text-[9px] font-black uppercase text-blue-600 tracking-wider bg-blue-50 px-1.5 py-0.5 rounded-full ring-1 ring-blue-100">
                            {studentProfile?.studentCode || "MSSV"}
                        </span>
                    </div>

                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-blue-200">
                        {studentProfile?.fullName?.charAt(0) || "S"}
                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    >
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </nav>
    );
}
