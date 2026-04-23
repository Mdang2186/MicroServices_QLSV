"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    
    const [email, setEmail] = useState("");
    const [sessionToken, setSessionToken] = useState("");
    
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
            const res = await api.post("/api/auth/forgot-password", { email });
            setSessionToken(res.data.sessionToken);
            setSuccess(res.data.message || "Mã xác nhận 6 số đã được gửi đến email của bạn.");
            setStep(2);
        } catch (err: any) {
            console.error("Forgot Password Error:", err);
            setError(err.response?.data?.message || "Đã có lỗi xảy ra. Vui lòng thử lại sau.");
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
            await api.post("/api/auth/reset-password", { sessionToken, otp, newPassword });

            setSuccess("Đổi mật khẩu thành công! Đang chuyển hướng...");
            setTimeout(() => {
                router.push("/login");
            }, 3000);
        } catch (err: any) {
            console.error("Reset Password Error:", err);
            setError(err.response?.data?.message || "Không thể đặt lại mật khẩu. Mã OTP có thể đã hết hạn hoặc không đúng.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
            <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
                <h2 className="mb-6 text-center text-3xl font-bold text-gray-800">Quên mật khẩu</h2>
                <p className="mb-8 text-center text-gray-500">
                    {step === 1 ? "Nhập email của bạn để nhận mã xác nhận" : "Nhập mã xác nhận và thiết lập mật khẩu mới"}
                </p>

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

                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-6">
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
                            className={`w-full rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                            {loading ? "Đang gửi..." : "Nhận mã xác nhận"}
                        </button>
                    </form>
                )}

                {step === 2 && !success.includes("thành công") && (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Mã xác nhận (OTP)</label>
                            <input
                                type="text"
                                required
                                maxLength={6}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono tracking-widest text-center text-lg uppercase"
                                placeholder="000000"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Mật khẩu mới</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-gray-700">Xác nhận mật khẩu</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${loading ? "cursor-not-allowed opacity-70" : ""}`}
                        >
                            {loading ? "Đang xử lý..." : "Khôi phục mật khẩu"}
                        </button>
                        
                        <div className="text-center mt-3">
                            <button 
                                type="button" 
                                onClick={() => { setStep(1); setSuccess(""); setError(""); }}
                                className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                            >
                                Đổi email khác
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 text-center text-sm text-gray-600">
                    <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Quay lại đăng nhập
                    </Link>
                </div>
            </div>
        </div>
    );
}
