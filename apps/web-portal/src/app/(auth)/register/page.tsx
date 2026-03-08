"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
        router.push("/login"); // Registration is disabled
    }, [router]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Registration Disabled</h2>
                <p className="text-gray-600">Please contact the administration to create an account.</p>
                <div className="mt-6">
                    <button
                        onClick={() => window.location.href = "/login"}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        </div>
    );
}
