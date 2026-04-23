"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    
    // Step 1 states
    const [email, setEmail] = useState("");
    const [sessionToken, setSessionToken] = useState("");
    
    // Step 2 states
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendCode = async (e: React.FormEvent) => {
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

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Không thể gửi thư xác nhận");
            }

            setSessionToken(data.sessionToken);
            setSuccess("Mã xác nhận 6 số đã được gửi đến email của bạn.");
            setStep(2);
        } catch (err: any) {
            console.error("Forgot Password Error:", err);
            setError(err.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu xác nhận không khớp.");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionToken, otp, newPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.message || "Failed to reset password");
            }

            setSuccess("Đổi mật khẩu thành công! Đang chuyển hướng...");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            setError(err.message || "Không thể đặt lại mật khẩu. Mã OTP có thể đã hết hạn hoặc không đúng.");
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
                    <p className="text-blue-300/60 text-sm mt-1 text-center px-4">
                        {step === 1 ? "Nhập email của bạn để nhận mã xác nhận" : "Nhập mã xác nhận và mật khẩu mới"}
                    </p>
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

                    {step === 1 && (
                        <form onSubmit={handleSendCode} className="space-y-6">
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
                                {loading ? "Đang gửi..." : "Nhận mã xác nhận"}
                            </button>
                        </form>
                    )}

                    {step === 2 && !success.includes("thành công") && (
                        <form onSubmit={handleResetPassword} className="space-y-6">
                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Mã xác nhận (OTP)</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={6}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors font-mono tracking-widest text-center text-lg"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm font-semibold text-white/70">Xác nhận mật khẩu</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full rounded-xl bg-emerald-600 px-4 py-3 text-white font-bold transition-all hover:bg-emerald-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg shadow-emerald-900/40 ${loading ? "cursor-not-allowed opacity-60" : ""}`}
                            >
                                {loading ? "Đang xử lý..." : "Khôi phục mật khẩu"}
                            </button>

                            <div className="text-center mt-3">
                                <button 
                                    type="button" 
                                    onClick={() => { setStep(1); setSuccess(""); setError(""); }}
                                    className="text-xs text-white/40 hover:text-white/60 transition-colors"
                                >
                                    Đổi email khác
                                </button>
                            </div>
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
