"use client";

import { useState } from "react";
import Link from "next/link";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            await api.post("/api/auth/forgot-password", { email });
            setSuccess("If an account exists with this email, you will receive a password reset link shortly.");
        } catch (err: any) {
            console.error("Forgot Password Error:", err);
            setError(err.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">Forgot Password</h2>
                <p className="mb-8 text-center text-gray-500">Enter your email to receive a reset link</p>

                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 border border-red-400 p-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 rounded-lg bg-green-100 border border-green-400 p-3 text-sm text-green-700">
                        {success}
                    </div>
                )}

                {!success && (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                type="email"
                                required
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-70" : ""
                                }`}
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}

                <div className="mt-6 text-center text-sm text-gray-600">
                    Remember your password?{" "}
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
