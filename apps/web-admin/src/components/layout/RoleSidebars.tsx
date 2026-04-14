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
    Calendar,
    Building2,
    Calculator,
    ClipboardList,
    FileSpreadsheet
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
            roleDescription="Quản trị hệ thống"
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
        { href: "/staff/semester-plan", icon: Calendar, label: "Quản lý kế hoạch" },
        { href: "/staff/students", icon: GraduationCap, label: "Quản lý Sinh viên" },
        { href: "/staff/courses", icon: BookOpen, label: "Quản lý Học phần" },
        { href: "/staff/departments", icon: Building2, label: "Khoa - Ngành" },
        { href: "/staff/lecturers", icon: Users, label: "Hồ sơ Giảng viên" },
        { href: "/staff/tuition", icon: Calculator, label: "Quản lý Học phí" },
        { href: "/staff/grades", icon: FileSpreadsheet, label: "Quản lý Điểm" },
        { href: "/staff/exams", icon: ClipboardList, label: "Tổ Chức Thi" },
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
