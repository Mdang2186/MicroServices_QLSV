"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const userStr = localStorage.getItem("user");

        if (!token || !userStr) {
            router.push("/login"); // Redirect to login
            return;
        }

        try {
            const user = JSON.parse(userStr);
            if (user.role !== "ADMIN") {
                router.push("/portal/dashboard"); // Redirect students to their portal
                return;
            }
            setAuthorized(true);
        } catch (e) {
            localStorage.clear();
            router.push("/login");
        }
    }, [router]);

    if (!authorized) {
        // You can add a loading spinner here
        return <div className="flex h-screen w-full items-center justify-center">Loading...</div>;
    }

    return <>{children}</>;
}
