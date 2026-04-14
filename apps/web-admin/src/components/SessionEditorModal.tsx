"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, Clock, Save, Trash2, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

interface SessionEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    courseClass: any;
    onSuccess: () => void;
}

export default function SessionEditorModal({ isOpen, onClose, courseClass, onSuccess }: SessionEditorModalProps) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && courseClass) {
            fetchSessions();
            fetchRooms();
        }
    }, [isOpen, courseClass]);

    const fetchSessions = async () => {
        try {
            const res = await fetch(`http://localhost:3000/api/course-service/courses/${courseClass.id}/sessions`);
            const data = await res.json();
            setSessions(data);
        } catch (error) {
            toast.error("Lỗi khi tải danh sách buổi học");
        }
    };

    const fetchRooms = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/course-service/room");
            const data = await res.json();
            setRooms(data);
        } catch (error) {
            console.error("Error fetching rooms:", error);
        }
    };

    const handleUpdateSession = async (sessionId: string, updates: any) => {
        try {
            await fetch(`http://localhost:3000/api/course-service/courses/sessions/${sessionId}/reschedule`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updates)
            });
            toast.success("Đã cập nhật buổi học");
            fetchSessions();
        } catch (error) {
            toast.error("Lỗi khi cập nhật");
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!window.confirm("Xóa buổi học này?")) return;
        try {
            await fetch(`http://localhost:3000/api/course-service/courses/sessions/${sessionId}`, { method: "DELETE" });
            toast.success("Đã xóa buổi học");
            fetchSessions();
        } catch (error) {
            toast.error("Lỗi khi xóa");
        }
    };

    const handleAddManualSession = async () => {
        try {
            await fetch(`http://localhost:3000/api/course-service/courses/${courseClass.id}/manual-session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    date: new Date().toISOString().split('T')[0],
                    startShift: 1,
                    endShift: 3,
                    type: "LECTURE"
                })
            });
            toast.success("Đã thêm buổi học mới");
            fetchSessions();
        } catch (error) {
            toast.error("Lỗi khi thêm buổi học");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Clock className="text-uneti-blue" size={20} />
                            Quản lý lịch học: {courseClass.name}
                        </h2>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">{courseClass.code}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleAddManualSession}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all"
                        >
                            <Plus size={16} /> Thêm buổi học
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                            <X size={20} className="text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 gap-4">
                        {sessions.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                    <Calendar size={32} />
                                </div>
                                <p className="text-slate-400 font-medium">Chưa có buổi học nào được xếp lịch</p>
                            </div>
                        )}
                        {sessions.map((session, index) => (
                            <div key={session.id} className="group bg-slate-50/50 hover:bg-white p-4 rounded-2xl border border-slate-100 transition-all flex flex-col md:flex-row md:items-center gap-4">
                                <div className="flex items-center gap-3 md:w-48">
                                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-400 font-bold border border-slate-100 shrink-0">
                                        {index + 1}
                                    </div>
                                    <input 
                                        type="date" 
                                        className="bg-transparent border-none font-bold text-slate-700 focus:ring-0 text-sm p-0"
                                        value={new Date(session.date).toISOString().split('T')[0]}
                                        onChange={(e) => handleUpdateSession(session.id, { date: e.target.value })}
                                    />
                                </div>

                                <div className="flex items-center gap-4 flex-1">
                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100">
                                        <Clock size={14} className="text-slate-400" />
                                        <select 
                                            className="text-xs font-bold border-none bg-transparent p-0 focus:ring-0"
                                            value={session.startShift}
                                            onChange={(e) => handleUpdateSession(session.id, { startShift: parseInt(e.target.value) })}
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(s => <option key={s} value={s}>Tiết {s}</option>)}
                                        </select>
                                        <span className="text-slate-300">→</span>
                                        <select 
                                            className="text-xs font-bold border-none bg-transparent p-0 focus:ring-0"
                                            value={session.endShift}
                                            onChange={(e) => handleUpdateSession(session.id, { endShift: parseInt(e.target.value) })}
                                        >
                                            {Array.from({length: 12}, (_, i) => i + 1).map(s => <option key={s} value={s}>Tiết {s}</option>)}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex-1">
                                        <MapPin size={14} className="text-slate-400" />
                                        <select 
                                            className="text-xs font-bold border-none bg-transparent p-0 focus:ring-0 w-full"
                                            value={session.roomId || ""}
                                            onChange={(e) => handleUpdateSession(session.id, { roomId: e.target.value })}
                                        >
                                            <option value="">-- Chưa xếp phòng --</option>
                                            {rooms.map(r => <option key={r.id} value={r.id}>{r.code} ({r.type})</option>)}
                                        </select>
                                    </div>

                                    <div className={`px-2 py-1 rounded-md text-[9px] font-black uppercase ${
                                        session.type === 'EXAM' ? 'bg-amber-100 text-amber-600' : 'bg-uneti-blue/5 text-uneti-blue'
                                    }`}>
                                        {session.type}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-all">
                                    <button 
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                    <button onClick={onClose} className="px-6 py-2.5 bg-slate-800 text-white rounded-xl font-bold shadow-lg hover:bg-slate-700 transition-all">
                        Hoàn tất
                    </button>
                </div>
            </div>
        </div>
    );
}
