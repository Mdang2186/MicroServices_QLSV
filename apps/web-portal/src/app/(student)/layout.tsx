import StudentGuard from "@/components/auth/StudentGuard";
import StudentNavbar from "@/components/student/Navbar";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
    return (
        <StudentGuard>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <StudentNavbar />
                <main className="flex-1 flex flex-col overflow-hidden">
                    {children}
                </main>
            </div>
        </StudentGuard>
    );
}
