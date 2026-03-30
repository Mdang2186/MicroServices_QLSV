"use client";

import React, { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
    Bell, 
    CheckCircle2, 
    Info, 
    AlertCircle, 
    Clock, 
    ChevronRight,
    Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const formatRelativeTime = (date: string | Date) => {
    const now = new Date();
    const then = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return "vừa xong";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    return then.toLocaleDateString('vi-VN');
};

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const u = Cookies.get("admin_user");
        if (u) try { setUser(JSON.parse(u)); } catch {}
    }, []);

    const fetchNotifications = async () => {
        if (!user?.id || !TOKEN) return;
        try {
            const res = await fetch(`/api/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
            }
        } catch (error) {}
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, [user, TOKEN]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const getIcon = (type: string) => {
        switch (type) {
            case 'REMINDER': return <Clock className="text-amber-500" size={14} />;
            case 'SUCCESS': return <CheckCircle2 className="text-emerald-500" size={14} />;
            case 'WARNING': return <AlertCircle className="text-rose-500" size={14} />;
            default: return <Info className="text-blue-500" size={14} />;
        }
    };

    const markAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {}
    };

    return (
        <div className="relative">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition-all relative group"
            >
                <Bell size={20} className={cn(unreadCount > 0 && "group-hover:animate-bounce")} />
                {unreadCount > 0 && (
                    <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white tabular-nums shadow-sm">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-3 w-80 bg-white border border-slate-100 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                            <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Thông báo mới</h3>
                                {unreadCount > 0 && (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                        {unreadCount} chưa đọc
                                    </span>
                                )}
                            </div>

                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {loading ? (
                                    <div className="p-8 flex items-center justify-center">
                                        <Loader2 className="animate-spin text-slate-300" size={24} />
                                    </div>
                                ) : notifications.length > 0 ? (
                                    notifications.map((n) => (
                                        <div 
                                            key={n.id}
                                            onClick={() => {
                                                if (!n.isRead) markAsRead(n.id, { stopPropagation: () => {} } as any);
                                                setIsOpen(false);
                                                // Navigate logic if needed
                                            }}
                                            className={cn(
                                                "p-4 border-b border-slate-50 last:border-none cursor-pointer transition-colors flex gap-3",
                                                n.isRead ? "bg-white" : "bg-indigo-50/30 hover:bg-indigo-50/50"
                                            )}
                                        >
                                            <div className="shrink-0 mt-0.5">
                                                {getIcon(n.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center justify-between">
                                                    <p className={cn("text-[11px] font-black leading-tight uppercase", n.isRead ? "text-slate-600" : "text-slate-900")}>
                                                        {n.title}
                                                    </p>
                                                    <span className="text-[8px] font-bold text-slate-300 whitespace-nowrap uppercase">
                                                        {formatRelativeTime(n.createdAt)}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed italic">
                                                    {n.content}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-12 text-center text-slate-300">
                                        <Bell className="mx-auto mb-3 opacity-20" size={32} />
                                        <p className="text-[10px] font-black uppercase tracking-widest">Không có thông báo</p>
                                    </div>
                                )}
                            </div>

                            <button 
                                onClick={() => {
                                    setIsOpen(false);
                                    const role = user?.role === 'LECTURER' ? 'lecturer' : 'staff';
                                    window.location.href = `/${role}/notifications`;
                                }}
                                className="w-full py-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-white hover:bg-slate-50 border-t border-slate-50 transition-colors flex items-center justify-center gap-2"
                            >
                                Xem tất cả <ChevronRight size={12} />
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
