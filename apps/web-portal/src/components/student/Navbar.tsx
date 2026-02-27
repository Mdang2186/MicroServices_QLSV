"use client";

import Link from "next/link";
import Cookies from "js-cookie";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Book, Calendar, GraduationCap, Home, LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
    { label: "Dashboard", href: "/portal/dashboard", icon: Home },
    { label: "Register Courses", href: "/portal/courses", icon: Book },
    { label: "Schedule", href: "/portal/schedule", icon: Calendar },
    { label: "Results", href: "/portal/results", icon: GraduationCap },
];

export default function StudentNavbar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        // Use consistent cleanup
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
                        <GraduationCap className="h-6 w-6 text-student-primary" />
                        <span className="font-bold text-gray-900">Student Portal</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex gap-6">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center text-sm font-medium transition-colors hover:text-student-primary",
                                        isActive ? "text-student-primary font-bold" : "text-gray-500"
                                    )}
                                >
                                    {item.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>

                {/* Mobile Menu & User */}
                <div className="flex items-center gap-4">
                    <div className="hidden md:flex flex-col items-end">
                        <span className="text-sm font-medium text-gray-900">Student Name</span>
                        <span className="text-xs text-gray-500">Student ID</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleLogout}
                        className="text-gray-500 hover:text-red-500"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </nav>
    );
}
