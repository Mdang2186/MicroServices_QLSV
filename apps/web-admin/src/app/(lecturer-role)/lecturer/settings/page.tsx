"use client";

import { 
    Settings, 
    Bell, 
    Lock, 
    Globe, 
    Save,
    UserCog,
    Languages,
    MonitorSmartphone
} from "lucide-react";
import { useState } from "react";

export default function LecturerSettingsPage() {
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20 mt-10">
            <div className="space-y-2">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                    <Settings size={32} className="text-uneti-blue" />
                    Cài đặt hệ thống
                </h1>
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest pl-12">Quản lý tùy chọn cá nhân & Bảo mật</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-slate-800">
                <div className="md:col-span-2 space-y-6">
                    {/* General Settings */}
                    <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-8">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <UserCog size={18} className="text-uneti-blue" />
                                Tùy chọn chung
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                            <Bell size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Thông báo hệ thống</p>
                                            <p className="text-[11px] font-medium text-slate-400">Nhận thông báo về lịch học và điểm danh</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setNotifications(!notifications)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${notifications ? 'bg-uneti-blue' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                            <Languages size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Ngôn ngữ hiển thị</p>
                                            <p className="text-[11px] font-medium text-slate-400">Tiếng Việt (Mặc định)</p>
                                        </div>
                                    </div>
                                    <button className="px-4 py-1.5 text-[11px] font-black text-uneti-blue border border-uneti-blue/20 rounded-lg uppercase tracking-widest hover:bg-uneti-blue/5 transition-all">Thay đổi</button>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                <MonitorSmartphone size={18} className="text-uneti-blue" />
                                Hiển thị & Giao diện
                            </h3>
                            
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 shadow-sm">
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">Chế độ tối (Dark Mode)</p>
                                            <p className="text-[11px] font-medium text-slate-400">Tối ưu cho làm việc ban đêm</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setDarkMode(!darkMode)}
                                        className={`w-12 h-6 rounded-full transition-all relative ${darkMode ? 'bg-slate-800' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${darkMode ? 'right-1' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4">
                        <button className="px-8 py-3 bg-uneti-blue text-white rounded-2xl text-[13px] font-black hover:bg-indigo-600 transition-all shadow-xl shadow-uneti-blue/20 flex items-center gap-2 active:scale-95">
                            <Save size={18} />
                            LƯU THAY ĐỔI
                        </button>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[32px] p-8 text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
                        <Lock size={32} className="text-blue-400" />
                        <div className="space-y-2">
                            <h4 className="text-lg font-black tracking-tight">Bảo mật tài khoản</h4>
                            <p className="text-[12px] font-medium text-slate-400 leading-relaxed">
                                Đảm bảo tài khoản của bạn luôn được bảo vệ bằng cách thay đổi mật khẩu định kỳ 3 tháng một lần.
                            </p>
                        </div>
                        <button className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all">
                            KIỂM TRA BẢO MẬT
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
