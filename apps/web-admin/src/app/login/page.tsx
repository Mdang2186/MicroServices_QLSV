"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const token = Cookies.get("admin_accessToken");
        const role = Cookies.get("admin_role");
        if (token && role) router.push(getDashboardPath(role));
    }, [router]);

    function getDashboardPath(role: string) {
        switch (role) {
            case 'SUPER_ADMIN': return '/admin/dashboard';
            case 'ACADEMIC_STAFF': return '/staff/dashboard';
            case 'LECTURER': return '/lecturer/dashboard';
            default: return '/login';
        }
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || "Đăng nhập thất bại");
            }

            const data = await res.json();
            const { accessToken, role, ...userData } = data;

            if (!['SUPER_ADMIN', 'ACADEMIC_STAFF', 'LECTURER'].includes(role)) {
                throw new Error("Tài khoản không có quyền truy cập hệ thống Admin & Giảng viên.");
            }

            Cookies.set("admin_accessToken", accessToken, { expires: 1, path: "/" });
            Cookies.set("admin_role", role, { expires: 1, path: "/" });
            Cookies.set("admin_user", JSON.stringify({ role, ...userData }), { expires: 1, path: "/" });

            router.push(getDashboardPath(role));
        } catch (err: any) {
            setError(err.message || "Đăng nhập thất bại.");
        } finally {
            setLoading(false);
        }
    };

    // Determine label/hint based on typed value
    const isEmail = email.includes('@');
    const roleHint = email.startsWith('9') ? '🛡️ Admin' : email.startsWith('8') ? '🗂️ Phòng ĐT' : email.startsWith('3') ? '🧑‍🏫 Giảng viên' : null;

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#060e1e] via-[#0a1628] to-[#0e1f45] p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -top-24 -right-24"></div>
                <div className="absolute w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl -bottom-24 -left-24"></div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/50 mb-4 text-2xl font-black text-white">U</div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">UNETI Admin</h1>
                    <p className="text-blue-300/60 text-sm mt-1">Hệ thống quản lý đào tạo & nhân sự</p>
                </div>

                <div className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl p-8 shadow-2xl">
                    {error && (
                        <div className="mb-5 rounded-xl bg-red-900/40 border border-red-500/30 p-3 text-sm text-red-300 flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-white/70">
                                Mã số hoặc Email
                                {roleHint && <span className="ml-2 text-xs font-bold text-blue-400 bg-blue-900/40 px-2 py-0.5 rounded-full">{roleHint}</span>}
                            </label>
                            <input
                                type="text"
                                required
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                placeholder="Mã số (VD: 90000000001) hoặc email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {!isEmail && (
                                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] text-white/30">
                                    <span className={`px-2 py-1 rounded border ${email.startsWith('9') ? 'border-blue-500 text-blue-400' : 'border-white/5'} text-center`}>9... = Admin</span>
                                    <span className={`px-2 py-1 rounded border ${email.startsWith('8') ? 'border-emerald-500 text-emerald-400' : 'border-white/5'} text-center`}>8... = Phòng ĐT</span>
                                    <span className={`px-2 py-1 rounded border ${email.startsWith('3') ? 'border-amber-500 text-amber-400' : 'border-white/5'} text-center`}>3... = GV</span>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-white/70">Mật khẩu</label>
                            <input
                                type="password"
                                required
                                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-white/20 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <div className="mt-2 text-right">
                                <Link href="/forgot-password" title="Quên mật khẩu" className="text-xs font-medium text-blue-400/60 hover:text-blue-400 underline decoration-blue-400/20 underline-offset-4">
                                    Quên mật khẩu?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full rounded-xl bg-blue-600 px-4 py-3 text-white font-bold transition-all hover:bg-blue-500 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-transparent shadow-lg shadow-blue-900/40 ${loading ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Đang xác thực...
                                </span>
                            ) : "Đăng nhập"}
                        </button>
                    </form>

                    {/* Role guide */}
                    <div className="mt-6 pt-5 border-t border-white/5">
                        <p className="text-[11px] text-center text-white/30 uppercase tracking-widest mb-3">Phân quyền hệ thống</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { color: "bg-blue-600", label: "Admin", desc: "9xxxxxxxxxx" },
                                { color: "bg-emerald-600", label: "ĐT", desc: "8xxxxxxxxxx" },
                                { color: "bg-amber-500", label: "GV", desc: "3xxxxxxxxxx" },
                            ].map((r) => (
                                <div key={r.label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-white/3">
                                    <div className={`w-5 h-5 ${r.color} rounded-full`}></div>
                                    <span className="text-[10px] font-bold text-white/60">{r.label}</span>
                                    <span className="text-[9px] text-white/30">{r.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <p className="mt-6 text-center text-xs text-white/20">
                    Trang dành riêng cho cán bộ & giảng viên UNETI • Sinh viên sử dụng{" "}
                    <a href="http://localhost:4000/login" className="text-blue-400/60 hover:text-blue-400 underline">Web Portal</a>
                </p>
            </div>
        </div>
    );
}
