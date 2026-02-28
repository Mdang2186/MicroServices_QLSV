"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Users, BookOpen, GraduationCap, Settings, LogOut, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";

const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Schedule", href: "/admin/schedule", icon: Calendar },
    { label: "Students", href: "/admin/students", icon: Users },
    { label: "Courses", href: "/admin/courses", icon: BookOpen },
    { label: "Grades", href: "/admin/grades", icon: GraduationCap },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = () => {
        localStorage.clear();
        router.push("/login");
    };

    return (
        <aside className="flex h-full w-64 flex-col bg-admin-primary text-admin-primary-foreground shadow-xl">
            {/* Logo */}
            <div className="flex h-16 items-center px-6 border-b border-slate-700">
                <span className="text-xl font-bold tracking-tight">University Admin</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3 py-6">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-slate-800 text-white shadow-sm"
                                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom Actions */}
            <div className="border-t border-slate-700 p-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-slate-800/50 hover:text-red-300"
                >
                    <LogOut className="h-5 w-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
