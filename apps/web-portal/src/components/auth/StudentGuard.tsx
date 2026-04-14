"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearStudentSession, readStudentSessionUser } from "@/lib/student-session";

export default function StudentGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("student_accessToken") || localStorage.getItem("accessToken");
        const user = readStudentSessionUser();

        if (!token || !user) {
            router.push("/login");
            return;
        }

        if (user.role === "STUDENT") {
            setAuthorized(true);
            return;
        }

        if (user.role === "ADMIN" || user.role === "SUPER_ADMIN" || user.role === "ACADEMIC_STAFF" || user.role === "LECTURER") {
            clearStudentSession();
            window.location.href = "http://localhost:4005/login";
            return;
        }

        clearStudentSession();
        router.push("/login");
    }, [router]);

    if (!authorized) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
    }

    return <>{children}</>;
}
