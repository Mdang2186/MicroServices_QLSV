import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { AdminSidebar } from "../../components/layout/RoleSidebars";
import Header from "../../components/layout/Header";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout
            sidebar={<AdminSidebar />}
            header={
                <Header
                    title="Quản trị hệ thống"
                    roleName="ADMINISTRATOR"
                />
            }
        >
            {children}
        </DashboardLayout>
    );
}
