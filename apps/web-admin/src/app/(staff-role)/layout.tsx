import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { StaffSidebar } from "../../components/layout/RoleSidebars";
import Header from "../../components/layout/Header";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout
            sidebar={<StaffSidebar />}
            header={
                <Header
                    title="Quản lý Đào tạo"
                    roleName="ACADEMIC STAFF"
                />
            }
        >
            {children}
        </DashboardLayout>
    );
}
