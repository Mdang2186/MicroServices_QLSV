"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import {
    BookOpen,
    Plus,
    Edit2,
    Trash2,
    ChevronRight,
    CheckCircle2,
    X
} from "lucide-react";
import DataTable from "@/components/DataTable";
import { SubjectFormModal } from "@/components/SubjectFormModal";

export default function StaffSubjectsPage() {
    const [subjects, setSubjects] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);
    
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const TOKEN = Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");
    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`
    }), [TOKEN]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [subRes, majRes, deptRes] = await Promise.all([
                fetch("/api/subjects", { headers }),
                fetch("/api/majors", { headers }),
                fetch("/api/departments", { headers })
            ]);
            if (subRes.ok) setSubjects(await subRes.json());
            if (majRes.ok) setMajors(await majRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleModalSuccess = (msg: string) => {
        setSuccessMsg(msg);
        fetchData();
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa môn học này?")) return;
        try {
            const res = await fetch(`/api/subjects/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                setSuccessMsg("Đã xóa môn học thành công!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || "Không thể xóa môn học");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        }
    };

    const columns = [
        { header: "Mã môn", accessorKey: "code" },
        { header: "Tên môn học", accessorKey: "name" },
        { 
            header: "Ngành", 
            accessorKey: "majorId", 
            cell: (item: any) => majors.find(m => m.id === item.majorId)?.name || "N/A"
        },
        { header: "Tín chỉ", accessorKey: "credits" },
        { 
            header: "Bộ môn", 
            accessorKey: "departmentId",
            cell: (item: any) => departments.find(d => d.id === item.departmentId)?.name || "—"
        },
        { 
            header: "Khối lượng LT/TH", 
            accessorKey: "theoryHours",
            cell: (item: any) => `${item.theoryHours}/${item.practiceHours}`
        },
        {
            header: "Tiên quyết / Học trước",
            accessorKey: "prerequisiteCount",
            cell: (item: any) => `${item.prerequisiteCount || 0} / ${item.precedingCount || 0}`,
        },
    ];

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
                        <BookOpen size={14} className="text-uneti-blue" />
                        <span>Hệ thống</span>
                        <ChevronRight size={10} />
                        <span className="text-uneti-blue">Danh mục môn học</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Quản lý Môn học</h1>
                    <p className="text-[13px] font-medium text-slate-500">Khối lượng học tập, học phần tiên quyết và học phần học trước</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setEditingSubject(null);
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm môn học mới
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {successMsg && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={18} />
                    <p className="text-xs font-bold">{successMsg}</p>
                    <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={14} /></button>
                </div>
            )}

            {/* List */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DataTable
                    data={subjects}
                    columns={columns}
                    searchKey="name"
                    searchPlaceholder="Tìm kiếm tên môn học hoặc mã môn..."
                    actions={(item) => (
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setEditingSubject(item);
                                    setIsModalOpen(true);
                                }}
                                className="p-2 text-slate-400 hover:text-uneti-blue transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDelete(item.id)}
                                className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                />
            </div>

            <SubjectFormModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                editingSubject={editingSubject}
                majors={majors}
                departments={departments}
                subjects={subjects}
                headers={headers}
                onSuccess={handleModalSuccess}
            />
        </div>
    );
}
