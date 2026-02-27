"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
// We might need a shared api client, or just use fetch for now if shared lib isn't set up in this app
// web-portal used '@/lib/api'. Let's see if web-admin has it. Probaly not.
// We'll use fetch for now to localhost:3000/api/auth/login (Gateway)

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = Cookies.get("admin_accessToken");
        if (token) {
            router.push("/dashboard");
        }
    }, [router]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            // Assuming API Gateway is at localhost:3000
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Login failed");
            }

            const data = await res.json();
            const { accessToken, role, ...userData } = data;

            if (role !== "ADMIN_STAFF" && role !== "SUPER_ADMIN" && role !== "ADMIN") {
                throw new Error("Unauthorized: Access restricted to Administrators.");
            }

            // Save token
            Cookies.set("admin_accessToken", accessToken, { expires: 1 });
            Cookies.set("admin_role", role, { expires: 1 });
            Cookies.set("admin_user", JSON.stringify({ role, ...userData }), { expires: 1 });

            // Redirect
            router.push("/dashboard");

        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.message || "Login failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-900 p-4">
            <div className="w-full max-w-md rounded-xl bg-gray-800 p-8 shadow-2xl border border-gray-700">
                <h2 className="mb-2 text-center text-3xl font-bold text-white">Admin Portal</h2>
                <p className="mb-8 text-center text-gray-400">Restricted Access</p>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-900/50 border border-red-500/50 p-3 text-sm text-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">Email Address</label>
                        <input
                            type="email"
                            required
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="admin@school.edu"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-300">Password</label>
                        <input
                            type="password"
                            required
                            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${loading ? "cursor-not-allowed opacity-70" : ""
                            }`}
                    >
                        {loading ? "Authenticating..." : "Login to Dashboard"}
                    </button>
                </form>
            </div>
        </div>
    );
}
