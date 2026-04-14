"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { clearStudentSession, persistStudentSession } from "@/lib/student-session";

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
            setSuccessMessage("Đăng ký thành công. Vui lòng đăng nhập.");
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

            if (role === "STUDENT") {
                persistStudentSession(accessToken, { role, ...userData });
                router.push("/portal/dashboard");
            } else if (["SUPER_ADMIN", "ADMIN", "ACADEMIC_STAFF", "LECTURER"].includes(role)) {
                clearStudentSession();
                window.location.href = "http://localhost:4005/login";
            } else {
                throw new Error("Tài khoản này không được hỗ trợ trên cổng sinh viên.");
            }
        } catch (err: any) {
            console.error("Login Error:", err);
            setError(err.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản và mật khẩu.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">Đăng nhập cổng sinh viên</h2>
                <p className="mb-8 text-center text-gray-500">Sử dụng mã sinh viên hoặc email để truy cập hệ thống</p>

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
                        <label className="mb-1 block text-sm font-medium text-gray-700">Mã sinh viên hoặc email</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mã SV (VD: 22103100001) hoặc email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu</label>
                        <input
                            type="password"
                            required
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" title="Quên mật khẩu" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                                Quên mật khẩu?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-70" : ""
                            }`}
                    >
                        {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                </form>

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
