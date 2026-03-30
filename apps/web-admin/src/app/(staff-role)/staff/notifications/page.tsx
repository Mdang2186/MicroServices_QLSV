"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { 
    Bell, 
    Send, 
    Users, 
    AlertCircle, 
    CheckCircle2, 
    Info, 
    Clock,
    Megaphone,
    ShieldAlert,
    History,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StaffNotificationManagementPage() {
    const [user, setUser] = useState<any>(null);
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [type, setType] = useState("INFO");
    const [role, setRole] = useState("LECTURER");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [history, setHistory] = useState<any[]>([]);
    
    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        const u = Cookies.get("admin_user");
        if (u) try { setUser(JSON.parse(u)); } catch {}
    }, []);

    const fetchHistory = async () => {
        if (!user?.id || !TOKEN) return;
        try {
            const res = await fetch(`/api/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {}
    };

    useEffect(() => {
        fetchHistory();
    }, [user, TOKEN]);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !content) return;

        setLoading(true);
        setMessage({ text: "", type: "" });

        try {
            const res = await fetch(`/api/notifications/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({ role, title, content, type })
            });

            if (res.ok) {
                setMessage({ text: "Đã phát thông báo thành công!", type: "success" });
                setTitle("");
                setContent("");
                fetchHistory();
                setTimeout(() => setMessage({ text: "", type: "" }), 3000);
            } else {
                setMessage({ text: "Lỗi khi gửi thông báo.", type: "error" });
            }
        } catch (error) {
            setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại.", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const deleteNotification = async (id: string) => {
        if (!confirm("Xóa thông báo này?")) return;
        try {
            const res = await fetch(`/api/notifications/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setHistory(prev => prev.filter(n => n.id !== id));
            }
        } catch (error) {}
    };

    return (
        <div className="min-h-screen space-y-8 pb-20 max-w-6xl mx-auto px-4 sm:px-6 animate-in fade-in duration-700">
            <div className="flex items-center gap-3 pt-6 border-b border-slate-100 pb-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <Megaphone size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Trung tâm Thông báo Đào tạo</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Phát tin nội bộ tới Giảng viên và Sinh viên</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form Section */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm">
                        <form onSubmit={handleBroadcast} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Đối tượng nhận</label>
                                    <select 
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="LECTURER">GIẢNG VIÊN (LECTURER)</option>
                                        <option value="STUDENT">SINH VIÊN (STUDENT)</option>
                                        <option value="STAFF">CÁN BỘ PHÒNG ĐÀO TẠO (STAFF)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Loại thông báo</label>
                                    <div className="flex gap-2">
                                        {['INFO', 'REMINDER', 'WARNING', 'SUCCESS'].map((t) => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t)}
                                                className={cn(
                                                    "flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-tighter transition-all border",
                                                    type === t 
                                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100" 
                                                        : "bg-white text-slate-400 border-slate-100 hover:bg-slate-50"
                                                )}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tiêu đề thông báo</label>
                                <input 
                                    type="text"
                                    placeholder="VD: Nhắc nhở nhập điểm giữa kỳ đợt 1..."
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nội dung chi tiết</label>
                                <textarea 
                                    rows={5}
                                    placeholder="Nhập nội dung thông báo tại đây..."
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-[2rem] px-6 py-5 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-100 transition-all leading-relaxed"
                                    required
                                />
                            </div>

                            <AnimatePresence>
                                {message.text && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={cn(
                                            "p-4 rounded-2xl flex items-center gap-3",
                                            message.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
                                        )}
                                    >
                                        {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                        <p className="text-[10px] font-black uppercase tracking-widest">{message.text}</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <Button 
                                type="submit"
                                disabled={loading}
                                className="w-full h-16 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 transition-all active:scale-[0.98]"
                            >
                                {loading ? "ĐANG TIẾN HÀNH..." : <><Send size={18} className="mr-3" /> PHÁT THÔNG BÁO NGAY</>}
                            </Button>
                        </form>
                    </div>

                    <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex gap-4">
                        <ShieldAlert className="text-amber-500 shrink-0" size={24} />
                        <div className="space-y-1">
                            <h4 className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Lưu ý bảo mật</h4>
                            <p className="text-[10px] font-bold text-amber-700/70 leading-relaxed uppercase tracking-tight">
                                Thông báo Broadcast sẽ được gửi tới TẤT CẢ người dùng thuộc Role đã chọn. Hãy kiểm tra kỹ nội dung trước khi phát.
                            </p>
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 flex flex-col h-[700px] shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <History size={16} className="text-slate-400" />
                                <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Lịch sử gửi tin</h3>
                            </div>
                            <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-lg border border-slate-100">GẦN ĐÂY</span>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {history.length > 0 ? history.map((n, i) => (
                                <div key={n.id} className="p-5 rounded-3xl border border-slate-50 bg-slate-50/50 hover:bg-white hover:border-indigo-100 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={cn(
                                            "w-2 h-2 rounded-full mt-1.5",
                                            n.type === 'WARNING' ? "bg-rose-500" : n.type === 'REMINDER' ? "bg-amber-500" : "bg-indigo-500"
                                        )} />
                                        <button 
                                            onClick={() => deleteNotification(n.id)}
                                            className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-rose-500 transition-all p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-tight mb-2 line-clamp-1">{n.title}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 italic line-clamp-2 leading-relaxed mb-4">{n.content}</p>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100/50 text-[8px] font-black text-slate-300 uppercase">
                                        <span>ĐÃ GỬI</span>
                                        <span>{new Date(n.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            )) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-200 grayscale opacity-40">
                                    <Bell size={48} className="mb-4" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-center">Chưa có lịch sử <br/> gửi thông báo</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
