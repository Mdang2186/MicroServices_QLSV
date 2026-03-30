"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
    User, 
    Mail, 
    Phone, 
    GraduationCap, 
    Building2, 
    ShieldCheck, 
    Calendar,
    Edit3,
    Camera
} from "lucide-react";

export default function LecturerProfilePage() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const c = Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 mt-10">
            {/* Profile Header Card */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden relative">
                <div className="h-32 bg-gradient-to-r from-uneti-blue to-indigo-600"></div>
                
                <div className="px-8 pb-8">
                    <div className="relative -mt-16 mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-6">
                            <div className="relative group">
                                <div className="w-32 h-32 rounded-[40px] bg-white p-1.5 shadow-2xl relative z-10">
                                    <div className="w-full h-full rounded-[34px] bg-slate-50 flex items-center justify-center text-uneti-blue text-4xl font-black border border-slate-100 overflow-hidden relative">
                                        {(user.fullName || user.username || "U").charAt(0).toUpperCase()}
                                        {user.image && (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={user.image} alt={user.fullName} className="absolute inset-0 w-full h-full object-cover" />
                                        )}
                                    </div>
                                </div>
                                <button className="absolute bottom-2 right-2 z-20 w-8 h-8 rounded-xl bg-white text-slate-500 shadow-lg flex items-center justify-center hover:bg-uneti-blue hover:text-white transition-all border border-slate-100">
                                    <Camera size={16} />
                                </button>
                            </div>
                            
                            <div className="text-center md:text-left space-y-1 pb-2">
                                <p className="text-[10px] font-black text-uneti-blue uppercase tracking-[0.3em]">{user.degree || "Giảng viên"}</p>
                                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.fullName || user.username}</h1>
                                <p className="text-[13px] font-bold text-slate-400">@{user.username}</p>
                            </div>
                        </div>

                        <button className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-2xl text-[13px] font-black hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 active:scale-95 self-center md:self-end">
                            <Edit3 size={16} />
                            CHỈNH SỬA HỒ SƠ
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email Công vụ</p>
                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Mail size={14} className="text-slate-400" />
                                {user.email || "chưa cập nhật"}
                            </p>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Phone size={14} className="text-slate-400" />
                                {user.phone || "09x.xxx.xxxx"}
                            </p>
                        </div>
                        <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100/50 space-y-1">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Đơn vị công tác</p>
                            <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Building2 size={14} className="text-slate-400" />
                                Khoa CNTT
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                        <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                            <ShieldCheck size={20} className="text-uneti-blue" />
                            Thông tin định danh
                        </h2>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Mã số cán bộ</p>
                                    <p className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">{user.username}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Học hàm / Học vị</p>
                                    <p className="text-sm font-bold text-slate-700 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">{user.degree || "Thạc sĩ"}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trạng thái tài khoản</p>
                                    <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 w-fit">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                        <span className="text-[11px] font-black text-emerald-600 uppercase">Đang hoạt động</span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Ngày tham gia hệ thống</p>
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                        <Calendar size={14} className="text-slate-400" />
                                        01/01/2024
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-blue-600 rounded-[32px] p-8 text-white shadow-xl shadow-blue-200/50 space-y-4 relative overflow-hidden">
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        <GraduationCap size={40} className="text-blue-200" />
                        <h3 className="text-xl font-black tracking-tight">Cố vấn học tập</h3>
                        <p className="text-[13px] font-medium text-blue-100 leading-relaxed opacity-80">
                            Bạn đang là cố vấn cho lớp <b>DHTI15A1HN</b>.
                        </p>
                        <button className="pt-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
                            XEM CHI TIẾT LỚP CỐ VẤN <Edit3 size={14} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
