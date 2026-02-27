"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("student_accessToken");
        const userStr = localStorage.getItem("student_user");

        if (!token || !userStr) {
            router.push("/login");
            return;
        }

        try {
            const user = JSON.parse(userStr);

            if (user.role === "STUDENT") {
                setAuthorized(true);
                return;
            }

            if (user.role === "ADMIN") {
                router.push("/admin/dashboard");
                return;
            }

            router.push("/login");
        } catch (e) {
            localStorage.clear();
            router.push("/login");
        }
    }, [router]);

    if (!authorized) {
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
    }

    return <>{children}</>;
}
