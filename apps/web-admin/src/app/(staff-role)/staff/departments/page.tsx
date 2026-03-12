"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    Building2,
    Search,
    Plus,
    Edit2,
    Trash2,
    Filter,
    ChevronRight,
    ArrowRight,
    BookOpen,
    Users,
    Layers,
    Check,
    AlertCircle
} from "lucide-react";
import Modal from "@/components/modal";

export default function StaffDepartmentsPage() {
    const [majors, setMajors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchMajors();
    }, []);

    const fetchMajors = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/majors", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setMajors(data);
            }
        } catch (error) {
            console.error("Failed to fetch majors", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredMajors = majors.filter(m =>
        m.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Building2 size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Khoa - Ngành</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Cơ cấu tổ chức</h1>
                    <p className="text-[13px] font-medium text-slate-500">Quản lý danh sách các Khoa và Ngành đào tạo của Nhà trường</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm Ngành mới
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: "Tổng số Ngành", value: majors.length, icon: Layers, color: "blue" },
                    { label: "Số lượng Khoa", value: 4, icon: Building2, color: "indigo" },
                    { label: "Tổng Sinh viên", value: "2.5k+", icon: Users, color: "emerald" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                            <s.icon size={24} strokeWidth={1.5} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                            <p className="text-2xl font-black text-slate-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* List Grid */}
            <div className="space-y-6">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-uneti-blue" size={18} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm tên ngành hoặc mã khoa..."
                            className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-transparent rounded-[20px] text-[13px] font-bold focus:ring-4 focus:ring-uneti-blue/5 focus:bg-white transition-all outline-none"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMajors.map((m, i) => (
                        <div key={i} className="bg-white rounded-[32px] border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all group flex flex-col justify-between border-t-8 border-t-uneti-blue">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="w-12 h-12 rounded-2xl bg-uneti-blue-light text-uneti-blue flex items-center justify-center font-black text-lg">
                                        {m.name?.substring(0, 1)}
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="p-2 text-slate-400 hover:text-uneti-blue transition-colors">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 leading-tight group-hover:text-uneti-blue transition-colors">{m.name}</h3>
                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">Khoa Công nghệ Thông tin</p>
                                </div>
                                <p className="text-[13px] font-medium text-slate-500 line-clamp-2 leading-relaxed">
                                    {m.description || "Chương trình đào tạo kỹ sư chất lượng cao theo tiêu chuẩn quốc tế."}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Users size={14} className="text-slate-400" />
                                    <span className="text-[11px] font-black text-slate-600">850 SV</span>
                                </div>
                                <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-uneti-blue rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-uneti-blue hover:text-white transition-all group/btn">
                                    Chi tiết
                                    <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ADD MODAL */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Khởi tạo Ngành đào tạo"
                footer={
                    <div className="flex items-center justify-end gap-3 w-full px-2">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy bỏ</button>
                        <button className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10">LƯU CẤU TRÚC</button>
                    </div>
                }
            >
                <div className="py-6 space-y-6 px-2">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tên Ngành đào tạo</label>
                        <input type="text" className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold focus:ring-4 focus:ring-uneti-blue/5 outline-none" placeholder="Ví dụ: Khoa học máy tính" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Thuộc Khoa</label>
                        <select className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none appearance-none">
                            <option>Khoa Công nghệ Thông tin</option>
                            <option>Khoa Kinh tế</option>
                            <option>Khoa Điện tử</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả tóm tắt</label>
                        <textarea className="w-full px-6 py-4 bg-slate-50 border-transparent rounded-[20px] text-[14px] font-bold outline-none h-24 resize-none" placeholder="Nhập mô tả ngành học..." />
                    </div>
                </div>
            </Modal>
        </div>
    );
}
