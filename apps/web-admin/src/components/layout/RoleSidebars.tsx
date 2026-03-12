"use client";

import React from "react";
import Sidebar, { NavItem } from "./Sidebar";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    UserCog,
    ShieldCheck,
    ClipboardCheck,
    Calendar,
    Building2
} from "lucide-react";

export function AdminSidebar() {
    const navItems: NavItem[] = [
        { href: "/admin/dashboard", icon: LayoutDashboard, label: "Bảng điều khiển" },
        { href: "/admin/students", icon: GraduationCap, label: "Quản lý Sinh viên" },
        { href: "/admin/lecturers", icon: Users, label: "Quản lý Giảng viên" },
        { href: "/admin/staff", icon: UserCog, label: "Nhân viên Đào tạo" },
        { href: "/admin/users", icon: ShieldCheck, label: "Tra cứu Hệ thống" },
    ];

    return (
        <Sidebar
            brandName="UNETI Admin"
            roleDescription="Hệ thống quản lý"
            brandIcon={ShieldCheck}
            navItems={navItems}
            changePasswordPath="/admin/change-password"
        />
    );
}

export function LecturerSidebar() {
    const navItems: NavItem[] = [
        { href: "/lecturer/dashboard", icon: LayoutDashboard, label: "Bảng điều khiển" },
        { href: "/lecturer/courses", icon: BookOpen, label: "Lớp học phần" },
        { href: "/lecturer/schedule", icon: Calendar, label: "Lịch giảng dạy" },
        { href: "/lecturer/attendance", icon: ClipboardCheck, label: "Điểm danh SV" },
        { href: "/lecturer/grades", icon: GraduationCap, label: "Quản lý Điểm" },
    ];

    return (
        <Sidebar
            brandName="UNETI Lecturer"
            roleDescription="Giảng viên Portal"
            brandIcon={GraduationCap}
            navItems={navItems}
            changePasswordPath="/lecturer/change-password"
        />
    );
}

export function StaffSidebar() {
    const navItems: NavItem[] = [
        { href: "/staff/dashboard", icon: LayoutDashboard, label: "Bảng điều khiển" },
        { href: "/staff/students", icon: GraduationCap, label: "Quản lý Sinh viên" },
        { href: "/staff/courses", icon: BookOpen, label: "Học phần - Lớp" },
        { href: "/staff/departments", icon: Building2, label: "Khoa - Ngành" },
        { href: "/staff/lecturers", icon: Users, label: "Hồ sơ Giảng viên" },
    ];

    return (
        <Sidebar
            brandName="UNETI Staff"
            roleDescription="Phòng Đào Tạo"
            brandIcon={UserCog}
            navItems={navItems}
            changePasswordPath="/staff/change-password"
        />
    );
}
