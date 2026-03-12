"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
            setError("Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.");
        }
    }, [token]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!token) return;

        if (password.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to reset password");
            }

            setSuccess("Đổi mật khẩu thành công!");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            setError(err.message || "Không thể đặt lại mật khẩu. Link có thể đã hết hạn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#060e1e] via-[#0a1628] to-[#0e1f45] p-4">
            <div className="relative w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50 mb-4 text-2xl font-black text-white">U</div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Đặt lại mật khẩu</h1>
                    <p className="text-blue-300/60 text-sm mt-1 text-center">Tạo mật khẩu mới cho tài khoản của bạn</p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-5 rounded-xl bg-red-900/40 border border-red-500/30 p-3 text-sm text-red-300 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-5 rounded-xl bg-emerald-900/40 border border-emerald-500/30 p-3 text-sm text-emerald-300 flex items-center gap-2">
                            <span>✅</span> {success} Đang chuyển hướng...
                        </div>
                    )}

                    {!success && !error && (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !token}
                                className={`w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-bold transition-all hover:bg-blue-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg shadow-blue-900/40 ${loading || !token ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                {loading ? "Đang xử lý..." : "Đặt lại mật khẩu"}
                            </button>
                        </form>
                    )}

                    {(success || error) && (
                        <div className="mt-6 text-center text-sm">
                            <Link href="/login" className="text-blue-400 font-medium hover:text-blue-300 underline">
                                Quay lại đăng nhập
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="text-center text-white p-8">Đang tải...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
