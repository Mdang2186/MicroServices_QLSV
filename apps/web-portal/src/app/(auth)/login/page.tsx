"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
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
        <div className="relative w-full max-w-md">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
                <div className="w-[160px] h-[160px] mb-5 flex items-center justify-center">
                    <img 
                        src="/uneti-logo.png" 
                        alt="UNETI Logo" 
                        className="w-full h-full object-contain"
                    />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-blue-900 tracking-tight text-center">
                    CỔNG THÔNG TIN SINH VIÊN
                </h1>
                <p className="text-blue-700 font-semibold text-[13px] sm:text-sm mt-1.5 text-center px-4 uppercase tracking-wide">
                    TRƯỜNG ĐẠI HỌC KINH TẾ - KỸ THUẬT CÔNG NGHIỆP
                </p>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
                {successMessage && (
                    <div className="mb-5 rounded-xl bg-green-50 border border-green-200 p-3 text-sm text-green-600 flex items-center gap-2 font-medium">
                        <span>✅</span> {successMessage}
                    </div>
                )}
                {error && (
                    <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2 font-medium">
                        <span>⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-5">
                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Mã sinh viên hoặc email</label>
                        <input
                            type="text"
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                            placeholder="Mã SV (VD: 22103100001) hoặc email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="mb-1.5 block text-sm font-bold text-slate-700">Mật khẩu</label>
                        <input
                            type="password"
                            required
                            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                        <div className="mt-2 text-right">
                            <Link href="/forgot-password" title="Quên mật khẩu" className="text-xs font-bold text-blue-600 hover:text-blue-700 underline decoration-blue-600/30 underline-offset-4">
                                Quên mật khẩu?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-bold transition-all hover:bg-blue-700 active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 shadow-md shadow-blue-600/20 ${loading ? "cursor-not-allowed opacity-70" : ""}`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                Đang xác thực...
                            </span>
                        ) : (
                            "Đăng nhập"
                        )}
                    </button>
                </form>
            </div>
            
            <p className="mt-6 text-center text-xs font-semibold text-slate-500">
                Sử dụng tài khoản nội bộ UNETI được cấp để đăng nhập vào hệ thống cổng thông tin sinh viên.
            </p>
        </div>
    );
}

export default function LoginPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-white p-4">
            <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
                <LoginForm />
            </Suspense>
        </div>
    );
}
