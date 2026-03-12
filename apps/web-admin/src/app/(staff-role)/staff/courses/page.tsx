"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    BookOpen,
    Search,
    Plus,
    Edit3,
    Trash2,
    Filter,
    Users,
    Calendar,
    ChevronRight,
    ArrowRight,
    BookMarked,
    Clock,
    MapPin,
    AlertCircle
} from "lucide-react";
import Modal from "@/components/modal";

export default function StaffCoursesPage() {
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [formLoading, setFormLoading] = useState(false);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/courses", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setCourses(data);
            }
        } catch (error) {
            console.error("Failed to fetch courses", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredCourses = courses.filter(c =>
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.instructor?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header / Breadcrumbs */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <BookOpen size={14} className="text-uneti-blue" />
                        <span>Giáo vụ</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Học phần - Lớp</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Học phần</h1>
                    <p className="text-[13px] font-medium text-slate-500">Phân bổ lớp học phần, tín chỉ và giảng viên phụ trách</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Mở lớp học mới
                    </button>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: "Tổng số lớp", value: courses.length, icon: BookMarked, color: "blue" },
                    { label: "Đang mở", value: courses.filter(c => c.status === 'Active').length, icon: Clock, color: "emerald" },
                    { label: "Đã đủ (Max)", value: courses.filter(c => c.enrolled >= c.capacity).length, icon: Users, color: "rose" },
                    { label: "Chưa phân lịch", value: courses.filter(c => c.schedule === 'TBD').length, icon: Calendar, color: "indigo" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-5 rounded-[20px] border border-slate-100 flex items-center gap-4 shadow-sm">
                        <div className={`w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600`}>
                            <s.icon size={18} />
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-lg font-black text-slate-900 leading-tight">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content: Search + Grid */}
            <div className="space-y-6">
                <div className="flex items-center gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm theo tên học phần, mã lớp hoặc giảng viên..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-transparent rounded-[18px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="hidden sm:flex items-center gap-2 px-5 py-3 bg-slate-50 text-slate-600 rounded-[18px] hover:bg-slate-100 transition-all text-[11px] font-black uppercase tracking-widest border border-slate-100">
                        <Filter size={18} />
                        Lọc khoa
                    </button>
                </div>

                {filteredCourses.length === 0 ? (
                    <div className="bg-white rounded-[40px] py-32 flex flex-col items-center justify-center text-center border border-slate-100 shadow-sm">
                        <div className="w-20 h-20 rounded-[32px] bg-slate-50 flex items-center justify-center mb-6 text-slate-200">
                            <BookOpen size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight uppercase">Không có dữ liệu lớp học</h3>
                        <p className="text-[13px] font-bold text-slate-400 mt-2 max-w-xs leading-relaxed">Dữ liệu học phần chưa được khởi tạo cho học kỳ này.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredCourses.map((c, i) => {
                            const ratio = (c.enrolled / c.capacity) * 100;
                            return (
                                <div key={i} className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all group overflow-hidden relative border-l-[6px] border-l-uneti-blue">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-uneti-blue-light text-uneti-blue font-black text-[9px] px-2.5 py-1 rounded-lg tracking-widest uppercase border border-uneti-blue/5">
                                                    {c.code}
                                                </span>
                                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg tracking-widest uppercase ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                    {c.status}
                                                </span>
                                            </div>
                                            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug group-hover:text-uneti-blue transition-colors">
                                                {c.title}
                                            </h3>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-uneti-blue group-hover:text-white transition-all duration-500">
                                            <Edit3 size={18} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <Users size={16} className="text-slate-400" />
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Giảng viên</p>
                                                    <p className="text-[13px] font-bold text-slate-700">{c.instructor}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Clock size={16} className="text-slate-400" />
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Thời gian</p>
                                                    <p className="text-[13px] font-bold text-slate-700 truncate max-w-[180px]">{c.schedule}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <MapPin size={16} className="text-slate-400" />
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Phòng học</p>
                                                    <p className="text-[13px] font-bold text-slate-700">{c.rawSchedules?.[0]?.room || 'Chưa xếp'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <AlertCircle size={16} className="text-slate-400" />
                                                <div className="flex flex-col">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sĩ số</p>
                                                    <p className="text-[13px] font-black text-slate-900">{c.enrolled} / {c.capacity}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">
                                            <span>Mức độ lấp đầy</span>
                                            <span className={ratio >= 90 ? "text-rose-600" : "text-uneti-blue"}>{Math.round(ratio)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${ratio >= 90 ? 'bg-rose-500' : 'bg-uneti-blue'}`}
                                                style={{ width: `${ratio}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-lg">
                                            <span className="text-[9px] font-black text-slate-400 uppercase mt-0.5">Thời lượng:</span>
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{c.duration}</span>
                                        </div>
                                        <button className="flex items-center gap-2 text-uneti-blue text-[11px] font-black uppercase tracking-widest group/link">
                                            Chi tiết lớp
                                            <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ADD MODAL - Mockup for now */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Mở lớp học phần mới"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                        <button className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10">XÁC NHẬN MỞ LỚP</button>
                    </div>
                }
            >
                <div className="py-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã lớp HP</label>
                            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transiton-all outline-none" placeholder="261_CNTT01" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học phần (Subject)</label>
                            <select className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transiton-all outline-none appearance-none">
                                <option>Lập trình Web nâng cao</option>
                                <option>Cơ sở dữ liệu phân tán</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Giảng viên phụ trách</label>
                        <select className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transiton-all outline-none appearance-none">
                            <option>ThS. Nguyễn Văn B</option>
                            <option>TS. Trần Thị C</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sĩ số tối đa</label>
                            <input type="number" className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 transiton-all outline-none" defaultValue={40} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Học kỳ</label>
                            <input type="text" className="w-full px-5 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none" value="HK1 (2025-2026)" disabled />
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
