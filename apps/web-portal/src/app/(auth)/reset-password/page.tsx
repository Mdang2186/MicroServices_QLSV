"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams.get("token");

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) {
            setError("Invalid or missing reset token.");
        }
    }, [token]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) {
            setError("Invalid or missing reset token.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            await api.post("/api/auth/reset-password", {
                token,
                newPassword: password
            });
            setSuccess("Your password has been reset successfully.");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">Reset Password</h2>
                <p className="mb-8 text-center text-gray-500">Enter your new password below</p>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-lg bg-green-100 border border-green-400 p-3 text-sm text-green-700">
                        {success} Redirecting to login...
                    </div>
                )}

                {!success && !error && (
                    <form onSubmit={handleReset} className="space-y-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">New Password</label>
                            <input
                                type="password"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Confirm New Password</label>
                            <input
                                type="password"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !token}
                            className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading || !token ? "cursor-not-allowed opacity-70" : ""
                                }`}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                )}

                {(success || error) && (
                    <div className="mt-6 text-center text-sm text-gray-600">
                        <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                            Back to Sign in
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
