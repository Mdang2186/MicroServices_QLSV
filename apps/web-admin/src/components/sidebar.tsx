"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "./icons";
import { useEffect, useState } from "react";
import Cookies from "js-cookie";

const Sidebar = () => {
    const pathname = usePathname();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const userCookie = Cookies.get("admin_user");
        if (userCookie) {
            try {
                setUser(JSON.parse(userCookie));
            } catch (e) {
                console.error("Failed to parse user");
            }
        }
    }, []);

    const menuItems = [
        { name: "Dashboard", href: "/dashboard", icon: Icons.Dashboard },
        { name: "Students", href: "/students", icon: Icons.Student },
        { name: "Courses", href: "/courses", icon: Icons.Course },
        { name: "Attendance", href: "/attendance", icon: Icons.Attendance },
        { name: "Grades", href: "/grades", icon: Icons.Grade },
        { name: "Reports", href: "/reports", icon: Icons.Report },
        { name: "Schedule", href: "/schedule", icon: Icons.Schedule },
        { name: "Messages", href: "/messages", icon: Icons.Message, badge: 2 },
        { name: "Settings", href: "/settings", icon: Icons.Setting },
    ];

    return (
        <div className="w-64 bg-[#0f172a] text-white min-h-screen flex flex-col font-sans">
            <div className="p-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="font-bold text-lg">E</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight">EduAdmin</h1>
            </div>

            <div className="px-4 py-2">
                <nav className="space-y-1">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between px-3 py-3 rounded-lg transition-all duration-200 group ${isActive
                                    ? "bg-[#3b82f6] text-white shadow-lg shadow-blue-500/20"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-100"}`} />
                                    <span className="font-medium text-sm">{item.name}</span>
                                </div>
                                {item.badge && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto p-4 border-t border-gray-800">
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-blue-200 font-bold">
                        {user?.username?.substring(0, 2).toUpperCase() || "AD"}
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm font-semibold truncate text-gray-100">{user?.username || "Admin User"}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email || "admin@edu.com"}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
