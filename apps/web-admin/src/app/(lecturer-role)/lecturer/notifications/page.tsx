"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
    Bell, 
    CheckCircle2, 
    Info, 
    AlertCircle, 
    Clock, 
    Trophy,
    MessageSquare,
    Calendar,
    ChevronRight,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const u = Cookies.get("admin_user");
        if (u) try { setUser(JSON.parse(u)); } catch {}
    }, []);

    useEffect(() => {
        if (!user?.id || !TOKEN) return;

        fetch(`/api/notifications/user/${user.id}`, {
            headers: { Authorization: `Bearer ${TOKEN}` }
        })
        .then(r => r.ok ? r.json() : [])
        .then(data => setNotifications(data))
        .finally(() => setLoading(false));
    }, [user, TOKEN]);

    const markAsRead = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}/read`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
            }
        } catch (error) {}
    };

    const markAllAsRead = async () => {
        try {
            const res = await fetch(`/api/notifications/user/${user.id}/read-all`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }
        } catch (error) {}
    };

    const deleteNotification = async (id: string) => {
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setNotifications(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {}
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'REMINDER': return <Clock className="text-amber-500" size={18} />;
            case 'SUCCESS': return <CheckCircle2 className="text-emerald-500" size={18} />;
            case 'WARNING': return <AlertCircle className="text-rose-500" size={18} />;
            default: return <Info className="text-blue-500" size={18} />;
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-8 pb-20 max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between pt-6">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Bell className="text-indigo-600" />
                        THÔNG BÁO
                    </h1>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                        Cập nhật các hoạt động và nhắc nhở từ hệ thống
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={markAllAsRead}
                    disabled={!notifications.some(n => !n.isRead)}
                    className="h-10 rounded-xl px-5 text-[10px] font-black uppercase text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                >
                    Đánh dấu đã đọc hết
                </Button>
            </div>

            <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                    {notifications.length > 0 ? (
                        notifications.map((msg) => (
                            <motion.div
                                key={msg.id}
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className={cn(
                                    "group relative bg-white border rounded-2xl p-5 transition-all hover:shadow-md",
                                    msg.isRead ? "border-slate-100 opacity-70" : "border-indigo-100 shadow-sm shadow-indigo-50"
                                )}
                            >
                                {!msg.isRead && (
                                    <div className="absolute top-5 right-5 h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)] animate-pulse" />
                                )}
                                
                                <div className="flex gap-4">
                                    <div className={cn(
                                        "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors",
                                        msg.isRead ? "bg-slate-50 border-slate-100" : "bg-indigo-50 border-indigo-100"
                                    )}>
                                        {getIcon(msg.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h3 className={cn(
                                                "text-sm font-black tracking-tight uppercase",
                                                msg.isRead ? "text-slate-600" : "text-slate-800"
                                            )}>
                                                {msg.title}
                                            </h3>
                                            <span className="text-[9px] font-bold text-slate-400 capitalize">
                                                {formatRelativeTime(msg.createdAt)}
                                            </span>
                                        </div>
                                        <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                                            {msg.content}
                                        </p>
                                        <div className="flex items-center gap-4 pt-2">
                                            {!msg.isRead && (
                                                <button 
                                                    onClick={() => markAsRead(msg.id)}
                                                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                >
                                                    Đánh dấu đã đọc
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => deleteNotification(msg.id)}
                                                className="text-[9px] font-black text-rose-400 uppercase tracking-widest hover:text-rose-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={10} /> Xóa
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center opacity-30">
                            <Bell size={64} className="mb-4 text-slate-300" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Không có thông báo mới</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
