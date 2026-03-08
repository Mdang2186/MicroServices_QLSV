"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";

export default function ChangePasswordTemplate() {
    const router = useRouter();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (newPassword.length < 6) {
            setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Mật khẩu mới xác nhận không khớp.");
            return;
        }

        setLoading(true);

        try {
            const token = Cookies.get("admin_accessToken");
            const res = await fetch("http://localhost:3000/api/auth/change-password", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ oldPassword, newPassword }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Đổi mật khẩu thất bại");
            }

            setSuccess("Đổi mật khẩu thành công!");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err: any) {
            console.error("Change Password Error:", err);
            setError(err.message || "Vui lòng kiểm tra lại mật khẩu hiện tại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Đổi mật khẩu</h1>
                    <p className="text-slate-500 text-sm mt-1">Cập nhật mật khẩu để bảo mật tài khoản của bạn</p>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8">
                    {error && (
                        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600 flex items-center gap-3">
                            <span className="text-lg">⚠️</span> {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-600 flex items-center gap-3">
                            <span className="text-lg">✅</span> {success}
                        </div>
                    )}

                    <form onSubmit={handleChange} className="space-y-6">
                        <div className="grid gap-6">
                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu hiện tại</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                />
                            </div>

                            <hr className="border-slate-100" />

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu mới</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    minLength={6}
                                />
                                <p className="mt-2 text-[11px] text-slate-400">Yêu cầu tối thiểu 6 ký tự</p>
                            </div>

                            <div>
                                <label className="mb-2 block text-sm font-semibold text-slate-700">Xác nhận mật khẩu mới</label>
                                <input
                                    type="password"
                                    required
                                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4">
                            <button
                                type="button"
                                onClick={() => router.back()}
                                className="px-6 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className={`px-6 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 ${loading ? "cursor-not-allowed opacity-70" : ""}`}
                            >
                                {loading ? "Đang xử lý..." : "Cập nhật mật khẩu"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
