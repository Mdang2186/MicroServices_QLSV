import React from "react";
import DashboardLayout from "../../components/layout/DashboardLayout";
import { LecturerSidebar } from "../../components/layout/RoleSidebars";
import Header from "../../components/layout/Header";

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardLayout
            sidebar={<LecturerSidebar />}
            header={
                <Header
                    title="Cổng thông tin Giảng viên"
                    roleName="LECTURER"
                />
            }
        >
            {children}
        </DashboardLayout>
    );
}
