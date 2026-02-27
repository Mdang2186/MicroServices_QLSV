"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import api from "@/lib/api";

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (searchParams.get("registered") === "true") {
            setSuccessMessage("Registration successful! Please sign in.");
        }
    }, [searchParams]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Use custom api instance which handles base URL
            const response = await api.post("/api/auth/login", {
                email,
                password,
            });

            const { accessToken, role, ...userData } = response.data;

            // Save token and user in Cookies (for Middleware)
            Cookies.set("student_accessToken", accessToken, { expires: 1 }); // 1 day
            Cookies.set("student_role", role, { expires: 1 });
            Cookies.set("student_user", JSON.stringify({ role, ...userData }), { expires: 1 });

            // Legacy support
            localStorage.setItem("student_accessToken", accessToken);
            localStorage.setItem("student_user", JSON.stringify({ role, ...userData }));

            // Update Zustand Store (if imported, but for now simple redirect is enough for MVP)

            // Role-Based Redirect
            if (role === "SUPER_ADMIN" || role === "ADMIN_STAFF" || role === "ADMIN") {
                // Admin portal is a separate app, usually on a different port or subdomain in prod.
                // For monorepo local dev, we might need a full URL if it's a different Next.js app.
                // Assuming web-admin is running on port 3001 or similar.
                // IF web-admin is a separate Next.js app, we should redirect to its URL.
                // For now, let's assume standard client-side routing if they are merged, 
                // OR external link if they are separate. 
                // Given the folder structure implies separate apps, we might need to redirect to the admin app URL.
                // Let's assume for MVP they are on same domain or we just redirect to a known Admin URL.
                // Ideally: window.location.href = "http://localhost:3002"; (if web-admin is there)

                // For this specific file in WEB-PORTAL, an Admin shouldn't really be logging in here if it's strictly for students.
                // But if it's a shared login:
                window.location.href = "http://localhost:4005"; // Redirect to Web Admin
            } else if (role === "STUDENT") {
                router.push("/portal/dashboard");
            } else if (role === "LECTURER") {
                router.push("/portal/dashboard"); // Or lecturer specific dashboard
            } else {
                // Fallback
                router.push("/");
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.response?.data?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">Welcome Back</h2>
                <p className="mb-8 text-center text-gray-500">Sign in to your account</p>

                {successMessage && (
                    <div className="mb-4 rounded-lg bg-green-100 border border-green-400 p-3 text-sm text-green-700">
                        {successMessage}
                    </div>
                )}
                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Email Address or Student ID</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="you@example.com or SV001"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-70" : ""
                            }`}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account?{" "}
                    <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign up
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
