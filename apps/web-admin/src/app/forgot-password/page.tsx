"use client";

import { useState } from "react";
import Link from "next/link";

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
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Failed to send reset link");
            }

            setSuccess("Nếu email tồn tại trong hệ thống, bạn sẽ sớm nhận được link đặt lại mật khẩu.");
        } catch (err: any) {
            console.error("Forgot Password Error:", err);
            setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#060e1e] via-[#0a1628] to-[#0e1f45] p-4">
            <div className="relative w-full max-w-md">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50 mb-4 text-2xl font-black text-white">U</div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Quên mật khẩu</h1>
                    <p className="text-blue-300/60 text-sm mt-1 text-center px-4">Nhập email của bạn để nhận hướng dẫn khôi phục mật khẩu</p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-5 rounded-xl bg-red-900/40 border border-red-500/30 p-3 text-sm text-red-300 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-5 rounded-xl bg-emerald-900/40 border border-emerald-500/30 p-3 text-sm text-emerald-300 flex items-center gap-2">
                            <span>✅</span> {success}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Email liên kết</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                    placeholder="your-email@uneti.edu.vn"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-bold transition-all hover:bg-blue-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg shadow-blue-900/40 ${loading ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                {loading ? "Đang gửi..." : "Gửi link khôi phục"}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center text-sm">
                        <Link href="/login" className="text-blue-400 font-medium hover:text-blue-300 underline transition-colors">
                            Quay lại đăng nhập
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
