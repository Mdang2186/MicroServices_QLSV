import AdminGuard from "@/components/auth/AdminGuard";
import AdminSidebar from "@/components/admin/Sidebar";
import AdminTopbar from "@/components/admin/Topbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex h-screen w-full overflow-hidden bg-slate-50">
                {/* Sidebar */}
                <AdminSidebar />

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    <AdminTopbar />
                    <main className="flex-1 overflow-auto p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AdminGuard>
    );
}
