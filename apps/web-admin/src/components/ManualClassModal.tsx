"use client";

import React, { useState, useEffect } from "react";
import { X, Plus, Save } from "lucide-react";
import { toast } from "react-hot-toast";

interface ManualClassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    semesterId: string;
    course?: any; // New prop for editing
}

export default function ManualClassModal({ isOpen, onClose, onSuccess, semesterId, course }: ManualClassModalProps) {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [adminClasses, setAdminClasses] = useState<any[]>([]);
    const [selectedAdminClassIds, setSelectedAdminClassIds] = useState<string[]>([]);
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        subjectId: "",
        semesterId: semesterId,
        maxSlots: 60,
        status: "OPEN"
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSubjects();
            fetchAdminClasses();
            
            if (course) {
                setFormData({
                    code: course.code,
                    name: course.name,
                    subjectId: course.subjectId,
                    semesterId: course.semesterId,
                    maxSlots: course.maxSlots,
                    status: course.status
                });
                setSelectedAdminClassIds(course.adminClasses?.map((ac: any) => ac.id) || []);
            } else {
                setFormData({
                    code: "",
                    name: "",
                    subjectId: "",
                    semesterId: semesterId,
                    maxSlots: 60,
                    status: "OPEN"
                });
                setSelectedAdminClassIds([]);
            }
        }
    }, [isOpen, semesterId, course]);

    const fetchAdminClasses = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/admin-classes");
            const data = await res.json();
            setAdminClasses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching admin classes:", error);
        }
    };

    const fetchSubjects = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/subjects"); // Corrected Gateway Path
            const data = await res.json();
            setSubjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Error fetching subjects:", error);
            setSubjects([]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = course 
                ? `http://localhost:3000/api/courses/${course.id}`
                : "http://localhost:3000/api/courses";
            const method = course ? "PUT" : "POST";

            const res = await fetch(url, { 
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    adminClassIds: selectedAdminClassIds
                })
            });
            if (res.ok) {
                toast.success(course ? "Đã cập nhật lớp học phần!" : "Đã thêm lớp học phần mới!");
                onSuccess();
                onClose();
            } else {
                toast.error(course ? "Lỗi khi cập nhật" : "Lỗi khi thêm lớp học phần");
            }
        } catch (error) {
            toast.error("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        {course ? <Save className="text-uneti-blue" size={20} /> : <Plus className="text-uneti-blue" size={20} />}
                        {course ? "Cập nhật lớp học phần" : "Thêm lớp học phần thủ công"}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Chọn môn học</label>
                        <select 
                            required
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-uneti-blue/20 font-medium text-slate-700"
                            value={formData.subjectId}
                            onChange={(e) => {
                                const sub = subjects.find(s => s.id === e.target.value);
                                setFormData({ ...formData, subjectId: e.target.value, name: sub?.name || "", code: `${sub?.code}-MANUAL` });
                            }}
                        >
                            <option value="">-- Chọn môn học --</option>
                            {Array.isArray(subjects) && subjects.map(s => <option key={s.id} value={s.id}>[{s.code}] {s.name}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Mã lớp</label>
                            <input 
                                required
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-uneti-blue/20 font-medium text-slate-700"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Sĩ số tối đa</label>
                            <input 
                                type="number"
                                required
                                className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-uneti-blue/20 font-medium text-slate-700"
                                value={formData.maxSlots}
                                onChange={(e) => setFormData({ ...formData, maxSlots: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Tên lớp hiển thị</label>
                        <input 
                            required
                            className="w-full px-4 py-3 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-uneti-blue/20 font-medium text-slate-700"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">Gán lớp hành chính (Cohort)</label>
                        <div className="max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-2 custom-scrollbar">
                            {adminClasses.map(ac => (
                                <button
                                    key={ac.id}
                                    type="button"
                                    onClick={() => setSelectedAdminClassIds(prev => 
                                        prev.includes(ac.id) ? prev.filter(id => id !== ac.id) : [...prev, ac.id]
                                    )}
                                    className={`px-2 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                        selectedAdminClassIds.includes(ac.id) 
                                        ? 'bg-uneti-blue text-white border-uneti-blue' 
                                        : 'bg-white text-slate-400 border-slate-200 hover:border-uneti-blue/30'
                                    }`}
                                >
                                    {ac.code}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-uneti-blue text-white rounded-2xl font-bold shadow-lg shadow-uneti-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            <Save size={20} />
                            {loading ? "Đang xử lý..." : "Lưu lớp học phần"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
