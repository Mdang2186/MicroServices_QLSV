"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Cookies from "js-cookie";
import { getDashboardPath, isWebAdminRole, normalizeRole } from "@/lib/roles";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = Cookies.get("admin_accessToken");
    const role = normalizeRole(Cookies.get("admin_role"));

    if (token && role) {
      Cookies.set("admin_role", role, { expires: 1, path: "/" });
      router.replace(getDashboardPath(role));
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
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
      const normalizedRole = normalizeRole(role);

      if (!isWebAdminRole(normalizedRole)) {
        throw new Error(
          "Tài khoản không có quyền truy cập hệ thống Admin & Giảng viên.",
        );
      }

      Cookies.remove("student_accessToken");
      Cookies.remove("student_role");
      Cookies.remove("student_user");
      Cookies.remove("accessToken");
      Cookies.remove("user");
      if (typeof window !== "undefined") {
        localStorage.removeItem("student_accessToken");
        localStorage.removeItem("student_user");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
      }
      Cookies.set("admin_accessToken", accessToken, { expires: 1, path: "/" });
      Cookies.set("admin_role", normalizedRole, { expires: 1, path: "/" });
      Cookies.set(
        "admin_user",
        JSON.stringify({ role: normalizedRole, ...userData }),
        { expires: 1, path: "/" },
      );

      router.replace(getDashboardPath(normalizedRole));
    } catch (err: any) {
      setError(err.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  // Determine label/hint based on typed value
  const isEmail = email.includes("@");
  const roleHint = email.startsWith("9")
    ? "🛡️ Admin"
    : email.startsWith("8")
      ? "🗂️ Phòng ĐT"
      : email.startsWith("3")
        ? "🧑‍🏫 Giảng viên"
        : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-4">
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
            CỔNG THÔNG TIN ĐÀO TẠO
          </h1>
          <p className="text-blue-700 font-semibold text-[13px] sm:text-sm mt-1.5 text-center px-4 uppercase tracking-wide">
            TRƯỜNG ĐẠI HỌC KINH TẾ - KỸ THUẬT CÔNG NGHIỆP
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-8 shadow-xl shadow-slate-200/50">
          {error && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600 flex items-center gap-2 font-medium">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mã số hoặc Email
                {roleHint && (
                  <span className="ml-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                    {roleHint}
                  </span>
                )}
              </label>
              <input
                type="text"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                placeholder="Mã số (VD: 90000000001) hoặc email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-slate-700">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="mt-2 text-right">
                <Link
                  href="/forgot-password"
                  title="Quên mật khẩu"
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 underline decoration-blue-600/30 underline-offset-4"
                >
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
          Trang dành riêng cho cán bộ & giảng viên UNETI<br className="sm:hidden" /> <span className="hidden sm:inline">•</span> Sinh viên sử dụng{" "}
          <a
            href="http://localhost:4000/login"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            Web Portal
          </a>
        </p>
      </div>
    </div>
  );
}
