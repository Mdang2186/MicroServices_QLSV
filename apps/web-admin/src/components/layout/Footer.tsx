"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="mt-auto py-8 px-6 lg:px-8 border-t border-slate-50 bg-white/50 backdrop-blur-sm">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col items-center md:items-start gap-1">
                    <p className="text-[13px] font-bold text-slate-500">
                        © {currentYear} <span className="text-uneti-blue font-black tracking-tighter">UNETI<span className="text-uneti-blue">.</span></span> Hệ thống quản lý sinh viên.
                    </p>
                    <p className="text-[11px] font-medium text-slate-400">
                        Phát triển bởi <span className="text-slate-600 font-bold">Khoa Công nghệ Thông tin</span>
                    </p>
                </div>

                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-6">
                        <Link href="#" className="text-[11px] font-black text-slate-400 hover:text-uneti-blue transition-colors uppercase tracking-widest">Tài liệu</Link>
                        <Link href="#" className="text-[11px] font-black text-slate-400 hover:text-uneti-blue transition-colors uppercase tracking-widest">Hỗ trợ</Link>
                    </div>
                    <div className="h-4 w-px bg-slate-100"></div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Stable</span>
                        <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md">v2.1.0</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
