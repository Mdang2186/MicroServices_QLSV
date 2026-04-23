"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import {
    BookOpen, Building2, Plus, Edit2, Trash2, Layers, X, AlertCircle, CheckCircle2, Search, Loader2, Users
} from "lucide-react";
import { SubjectFormModal } from "@/components/SubjectFormModal";

const STAFF_TOKEN_KEY = "staff_accessToken";
const ADMIN_TOKEN_KEY = "admin_accessToken";

function InputField({ label, ...props }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            <input {...props} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all placeholder:text-slate-300" />
        </div>
    );
}

function SelectField({ label, options, ...props }: any) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
            <select {...props} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition-all appearance-none cursor-pointer">
                <option value="">-- Chọn --</option>
                {options.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
        </div>
    );
}

function normalizeSearchText(value: any) {
    return `${value ?? ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

// Inline slide-in drawer for add/edit
function Drawer({ open, onClose, title, children, onSubmit, loading, error }: any) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" />
            <div className="w-[400px] bg-white shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Drawer header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <p className="text-sm font-black text-slate-800">{title}</p>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-all">
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>
                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-600">
                            <AlertCircle size={14} />
                            <p className="text-xs font-bold">{error}</p>
                        </div>
                    )}
                    {children}
                </div>
                {/* Drawer footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3">
                    <button onClick={onClose} className="flex-1 py-2.5 text-xs font-black text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50 transition-all uppercase">
                        Hủy
                    </button>
                    <button onClick={onSubmit} disabled={loading}
                        className="flex-[2] py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700 disabled:opacity-50 transition-all uppercase tracking-wider">
                        {loading ? <Loader2 className="animate-spin inline mr-1" size={13} /> : null}
                        {loading ? "Đang lưu..." : "Lưu thông tin"}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function StaffDepartmentsPage() {
    const [activeTab, setActiveTab] = useState<"faculties" | "majors" | "departments" | "subjects" | "adminClasses">("faculties");
    const [faculties, setFaculties] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [adminClasses, setAdminClasses] = useState<any[]>([]);
    const [cohorts, setCohorts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Filter state for majors/depts tabs
    const [filterFacultyId, setFilterFacultyId] = useState("");
    const [filterDepartmentId, setFilterDepartmentId] = useState("");
    const [filterCohortCode, setFilterCohortCode] = useState("");

    // Drawer states
    const [drawer, setDrawer] = useState<"faculty" | "major" | "dept" | "adminClass" | null>(null);
    const [editTarget, setEditTarget] = useState<any>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [drawerError, setDrawerError] = useState<string | null>(null);
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<any>(null);

    // Form states
    const [facultyForm, setFacultyForm] = useState({ name: "", code: "", deanName: "" });
    const [majorForm, setMajorForm] = useState({ name: "", code: "", facultyId: "", totalCreditsRequired: 120 });
    const [deptForm, setDeptForm] = useState({ name: "", code: "", facultyId: "", headName: "" });
    const [adminClassForm, setAdminClassForm] = useState({ name: "", code: "", majorId: "", cohort: "" });

    const [toast, setToast] = useState<string | null>(null);

    // Try both staff and admin token
    const TOKEN = Cookies.get(STAFF_TOKEN_KEY) || Cookies.get(ADMIN_TOKEN_KEY);
    const headers = useMemo(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`
    }), [TOKEN]);

    const showToast = (msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 3000);
    };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [facRes, majRes, deptRes, subRes, classesRes, cohortsRes] = await Promise.all([
                fetch("/api/faculties", { headers }),
                fetch("/api/majors", { headers }),
                fetch("/api/departments", { headers }),
                fetch("/api/subjects", { headers }),
                fetch("/api/admin-classes", { headers }),
                fetch("/api/cohorts", { headers })
            ]);
            if (facRes.ok) setFaculties(await facRes.json());
            if (majRes.ok) setMajors(await majRes.json());
            if (deptRes.ok) setDepartments(await deptRes.json());
            if (subRes.ok) setSubjects(await subRes.json());
            if (classesRes.ok) setAdminClasses(await classesRes.json());
            if (cohortsRes.ok) setCohorts(await cohortsRes.json());
        } catch { } finally { setLoading(false); }
    };

    // ── Generic submit ────────────────────────────────────────
    const submitFaculty = async () => {
        setActionLoading(true); setDrawerError(null);
        try {
            const url = editTarget ? `/api/faculties/${editTarget.id}` : "/api/faculties";
            const res = await fetch(url, { method: editTarget ? "PUT" : "POST", headers, body: JSON.stringify(facultyForm) });
            if (res.ok) { showToast(editTarget ? "Cập nhật Khoa thành công!" : "Thêm Khoa thành công!"); setDrawer(null); fetchData(); }
            else { const d = await res.json(); setDrawerError(d.message || "Lỗi."); }
        } catch { setDrawerError("Lỗi kết nối."); }
        finally { setActionLoading(false); }
    };

    const submitMajor = async () => {
        setActionLoading(true); setDrawerError(null);
        try {
            const url = editTarget ? `/api/majors/${editTarget.id}` : "/api/majors";
            const res = await fetch(url, { method: editTarget ? "PUT" : "POST", headers, body: JSON.stringify(majorForm) });
            if (res.ok) { showToast(editTarget ? "Cập nhật Ngành thành công!" : "Thêm Ngành thành công!"); setDrawer(null); fetchData(); }
            else { const d = await res.json(); setDrawerError(d.message || "Lỗi."); }
        } catch { setDrawerError("Lỗi kết nối."); }
        finally { setActionLoading(false); }
    };

    const submitDept = async () => {
        setActionLoading(true); setDrawerError(null);
        try {
            const url = editTarget ? `/api/departments/${editTarget.id}` : "/api/departments";
            const res = await fetch(url, { method: editTarget ? "PUT" : "POST", headers, body: JSON.stringify(deptForm) });
            if (res.ok) { showToast(editTarget ? "Cập nhật Bộ môn thành công!" : "Thêm Bộ môn thành công!"); setDrawer(null); fetchData(); }
            else { const d = await res.json(); setDrawerError(d.message || "Lỗi."); }
        } catch { setDrawerError("Lỗi kết nối."); }
        finally { setActionLoading(false); }
    };

    const submitAdminClass = async () => {
        setActionLoading(true); setDrawerError(null);
        try {
            const url = editTarget ? `/api/admin-classes/${editTarget.id}` : "/api/admin-classes";
            const res = await fetch(url, { method: editTarget ? "PUT" : "POST", headers, body: JSON.stringify(adminClassForm) });
            if (res.ok) { showToast(editTarget ? "Cập nhật Lớp thành công!" : "Thêm Lớp mới thành công!"); setDrawer(null); fetchData(); }
            else { const d = await res.json(); setDrawerError(d.message || "Lỗi."); }
        } catch { setDrawerError("Lỗi kết nối."); }
        finally { setActionLoading(false); }
    };

    const deleteItem = async (type: "faculties" | "majors" | "departments" | "admin-classes", id: string) => {
        if (!confirm("Xác nhận xóa?")) return;
        try {
            const res = await fetch(`/api/${type}/${id}`, { method: "DELETE", headers });
            if (res.ok) { showToast("Đã xóa thành công!"); fetchData(); }
            else { const d = await res.json(); alert(d.message || "Không thể xóa."); }
        } catch { alert("Lỗi kết nối."); }
    };

    const openDrawer = (type: "faculty" | "major" | "dept" | "adminClass", item?: any) => {
        setEditTarget(item || null);
        setDrawerError(null);
        if (type === "faculty") {
            setFacultyForm(item ? { name: item.name, code: item.code, deanName: item.deanName || "" } : { name: "", code: "", deanName: "" });
        } else if (type === "major") {
            setMajorForm(item
                ? { name: item.name, code: item.code, facultyId: item.facultyId, totalCreditsRequired: item.totalCreditsRequired }
                : { name: "", code: "", facultyId: faculties[0]?.id || "", totalCreditsRequired: 120 });
        } else if (type === "dept") {
            setDeptForm(item
                ? { name: item.name, code: item.code, facultyId: item.facultyId, headName: item.headName || "" }
                : { name: "", code: "", facultyId: faculties[0]?.id || "", headName: "" });
        } else {
            setAdminClassForm(item 
                ? { name: item.name || "", code: item.code, majorId: item.majorId, cohort: item.cohort || "" }
                : { name: "", code: "", majorId: majors[0]?.id || "", cohort: cohorts[0]?.code || "" });
        }
        setDrawer(type);
    };

    const deleteSubject = async (id: string) => {
        if (!confirm("Xác nhận xóa môn học?")) return;
        try {
            const res = await fetch(`/api/subjects/${id}`, { method: "DELETE", headers });
            if (res.ok) {
                showToast("Đã xóa môn học thành công!");
                fetchData();
            } else {
                const data = await res.json();
                alert(data.message || "Không thể xóa môn học.");
            }
        } catch {
            alert("Lỗi kết nối.");
        }
    };

    // ── Filtered data ─────────────────────────────────────────
    const filteredFaculties = useMemo(() => {
        const tokens = normalizeSearchText(search).split(" ").filter(Boolean);
        if (!tokens.length) return faculties;
        return faculties.filter(f => {
            const haystack = normalizeSearchText([f.name, f.code, f.deanName].join(" "));
            return tokens.every(token => haystack.includes(token));
        });
    }, [faculties, search]);

    const filteredMajors = useMemo(() => {
        let list = majors;
        if (filterFacultyId) list = list.filter(m => m.facultyId === filterFacultyId);
        const tokens = normalizeSearchText(search).split(" ").filter(Boolean);
        if (tokens.length) {
            list = list.filter(m => {
                const facultyName = faculties.find(f => f.id === m.facultyId)?.name || "";
                const haystack = normalizeSearchText([m.name, m.code, facultyName].join(" "));
                return tokens.every(token => haystack.includes(token));
            });
        }
        return list;
    }, [majors, faculties, filterFacultyId, search]);

    const filteredDepts = useMemo(() => {
        let list = departments;
        if (filterFacultyId) list = list.filter(d => d.facultyId === filterFacultyId || d.faculty?.id === filterFacultyId);
        const tokens = normalizeSearchText(search).split(" ").filter(Boolean);
        if (tokens.length) {
            list = list.filter(d => {
                const facultyName = faculties.find(f => f.id === d.facultyId || f.id === d.faculty?.id)?.name || "";
                const haystack = normalizeSearchText([d.name, d.code, d.headName, facultyName].join(" "));
                return tokens.every(token => haystack.includes(token));
            });
        }
        return list;
    }, [departments, faculties, filterFacultyId, search]);

    const filteredDepartmentsByFaculty = useMemo(() => {
        if (!filterFacultyId) return departments;
        return departments.filter(d => d.facultyId === filterFacultyId || d.faculty?.id === filterFacultyId);
    }, [departments, filterFacultyId]);

    const filteredSubjects = useMemo(() => {
        let list = subjects;
        if (filterFacultyId) {
            list = list.filter(subject => {
                const major = subject.major || majors.find(m => m.id === subject.majorId);
                const department = subject.department || departments.find(d => d.id === subject.departmentId);
                return (
                    major?.facultyId === filterFacultyId ||
                    department?.facultyId === filterFacultyId ||
                    department?.faculty?.id === filterFacultyId
                );
            });
        }
        if (filterDepartmentId) {
            list = list.filter(subject => subject.departmentId === filterDepartmentId || subject.department?.id === filterDepartmentId);
        }

        const tokens = normalizeSearchText(search).split(" ").filter(Boolean);
        if (tokens.length) {
            list = list.filter(subject => {
                const major = subject.major || majors.find(m => m.id === subject.majorId);
                const department = subject.department || departments.find(d => d.id === subject.departmentId);
                const faculty = faculties.find(f => f.id === major?.facultyId || f.id === department?.facultyId || f.id === department?.faculty?.id);
                const haystack = normalizeSearchText([
                    subject.code,
                    subject.name,
                    subject.description,
                    major?.code,
                    major?.name,
                    department?.code,
                    department?.name,
                    faculty?.code,
                    faculty?.name,
                ].join(" "));
                return tokens.every(token => haystack.includes(token));
            });
        }
        return list;
    }, [subjects, majors, departments, faculties, filterFacultyId, filterDepartmentId, search]);

    const filteredClasses = useMemo(() => {
        let list = adminClasses;
        if (filterCohortCode) list = list.filter(c => c.cohort === filterCohortCode);
        if (filterFacultyId) {
            list = list.filter(c => {
                const major = majors.find(m => m.id === c.majorId);
                return major?.facultyId === filterFacultyId;
            });
        }
        const tokens = normalizeSearchText(search).split(" ").filter(Boolean);
        if (tokens.length) {
            list = list.filter(c => {
                const majorName = majors.find(m => m.id === c.majorId)?.name || "";
                const haystack = normalizeSearchText([c.code, c.name, c.cohort, majorName].join(" "));
                return tokens.every(token => haystack.includes(token));
            });
        }
        return list;
    }, [adminClasses, majors, filterFacultyId, filterCohortCode, search]);

    const facultyOptions = faculties.map(f => ({ value: f.id, label: f.name }));
    const majorOptions = majors.map(m => ({ value: m.id, label: m.name }));
    const visibleCount =
        activeTab === "faculties"
            ? filteredFaculties.length
            : activeTab === "majors"
                ? filteredMajors.length
                : activeTab === "departments"
                    ? filteredDepts.length
                    : filteredSubjects.length;

    if (loading) return (
        <div className="flex h-full items-center justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600/20 border-t-indigo-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-xl shadow-2xl text-sm font-bold">
                    <CheckCircle2 size={16} /> {toast}
                </div>
            )}

            {/* ── HEADER ────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                <div>
                    <h1 className="text-base font-black text-slate-800">Quản lý Khoa - Ngành</h1>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cơ cấu tổ chức đào tạo</p>
                </div>
                <button
                    onClick={() => {
                        if (activeTab === "faculties") openDrawer("faculty");
                        else if (activeTab === "majors") openDrawer("major");
                        else if (activeTab === "departments") openDrawer("dept");
                        else if (activeTab === "adminClasses") openDrawer("adminClass");
                        else {
                            setEditingSubject(null);
                            setIsSubjectModalOpen(true);
                        }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200">
                    <Plus size={15} />
                    Thêm {activeTab === "faculties" ? "Khoa" : activeTab === "majors" ? "Ngành" : activeTab === "departments" ? "Bộ môn" : activeTab === "adminClasses" ? "Lớp" : "Môn học"}
                </button>
            </div>

            {/* ── TOOLBAR ───────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-100 shrink-0 flex-wrap">
                <div className="flex items-center bg-slate-100 rounded-xl p-1">
                    {(["faculties", "majors", "departments", "subjects", "adminClasses"] as const).map(tab => {
                        const label = tab === "faculties" ? "Khoa" : tab === "majors" ? "Ngành" : tab === "departments" ? "Bộ môn" : tab === "adminClasses" ? "Lớp danh nghĩa" : "Môn học";
                        const Icon = tab === "faculties" ? Building2 : tab === "subjects" ? BookOpen : tab === "adminClasses" ? Users : Layers;
                        const cnt = tab === "faculties" ? faculties.length : tab === "majors" ? majors.length : tab === "departments" ? departments.length : tab === "adminClasses" ? adminClasses.length : subjects.length;
                        return (
                            <button key={tab} onClick={() => { setActiveTab(tab); setSearch(""); setFilterFacultyId(""); setFilterDepartmentId(""); setFilterCohortCode(""); }}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all ${activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                                <Icon size={13} />{label}
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${activeTab === tab ? "bg-indigo-100 text-indigo-600" : "bg-slate-200 text-slate-400"}`}>{cnt}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="w-px h-6 bg-slate-200" />
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm kiếm..." className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200 w-52" />
                </div>
                {activeTab !== "faculties" && (
                    <select value={filterFacultyId} onChange={e => { setFilterFacultyId(e.target.value); setFilterDepartmentId(""); }} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200">
                        <option value="">Tất cả Khoa</option>
                        {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                )}
                {activeTab === "subjects" && (
                    <select value={filterDepartmentId} onChange={e => setFilterDepartmentId(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200">
                        <option value="">Tất cả Bộ môn</option>
                        {filteredDepartmentsByFaculty.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                )}
                {activeTab === "adminClasses" && (
                    <select value={filterCohortCode} onChange={e => setFilterCohortCode(e.target.value)} className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 outline-none focus:ring-2 ring-indigo-200">
                        <option value="">Tất cả Khóa</option>
                        {cohorts.map(c => <option key={c.id} value={c.code}>{c.name}</option>)}
                    </select>
                )}
                <span className="ml-auto text-[10px] text-slate-400 font-bold">{visibleCount} bản ghi</span>
            </div>

            {/* ── TABLE CONTAINER ── */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <div className="flex-1 overflow-y-auto">
                    {activeTab === "faculties" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trưởng Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredFaculties.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredFaculties.map(f => (
                                    <tr key={f.id} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{f.code}</span></td>
                                        <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{f.name}</td>
                                        <td className="px-6 py-3.5 text-sm text-slate-500">{f.deanName || "—"}</td>
                                        <td className="px-6 py-3.5 text-center"><span className="text-xs font-black text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{f._count?.majors ?? majors.filter(m => m.facultyId === f.id).length}</span></td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openDrawer("faculty", f)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem("faculties", f.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeTab === "majors" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thuộc Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">TC yêu cầu</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMajors.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredMajors.map(m => (
                                    <tr key={m.id} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{m.code}</span></td>
                                        <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{m.name}</td>
                                        <td className="px-6 py-3.5">{faculties.find(f => f.id === m.facultyId) ? <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{faculties.find(f => f.id === m.facultyId)?.name}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                                        <td className="px-6 py-3.5 text-center"><span className="text-xs font-black text-slate-600">{m.totalCreditsRequired}</span></td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openDrawer("major", m)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem("majors", m.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeTab === "departments" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã Bộ môn</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên Bộ môn</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Trưởng BM</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Thuộc Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredDepts.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredDepts.map(d => (
                                    <tr key={d.id} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{d.code}</span></td>
                                        <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{d.name}</td>
                                        <td className="px-6 py-3.5 text-sm text-slate-500">{d.headName || "—"}</td>
                                        <td className="px-6 py-3.5">{faculties.find(f => f.id === d.facultyId || f.id === d.faculty?.id) ? <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{faculties.find(f => f.id === d.facultyId || f.id === d.faculty?.id)?.name}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => openDrawer("dept", d)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem("departments", d.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeTab === "subjects" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã môn</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên môn học</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Bộ môn</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Thuộc Khoa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Tín chỉ</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredSubjects.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredSubjects.map(subject => {
                                    const major = subject.major || majors.find(m => m.id === subject.majorId);
                                    const department = subject.department || departments.find(d => d.id === subject.departmentId);
                                    const faculty = faculties.find(f => f.id === major?.facultyId || f.id === department?.facultyId || f.id === department?.faculty?.id);
                                    return (
                                        <tr key={subject.id} className="group hover:bg-slate-50/70 transition-colors">
                                            <td className="px-6 py-3.5"><span className="font-mono font-black text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{subject.code}</span></td>
                                            <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{subject.name}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{major?.name || "—"}</td>
                                            <td className="px-6 py-3.5 text-sm text-slate-500">{department?.name || "—"}</td>
                                            <td className="px-6 py-3.5 whitespace-nowrap">{faculty ? <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg whitespace-nowrap">{faculty.name}</span> : <span className="text-slate-300 text-xs">—</span>}</td>
                                            <td className="px-6 py-3.5 text-center"><span className="text-xs font-black text-slate-600">{subject.credits}</span></td>
                                            <td className="px-6 py-3.5">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button onClick={() => { setEditingSubject(subject); setIsSubjectModalOpen(true); }} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                    <button onClick={() => deleteSubject(subject.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                    {activeTab === "adminClasses" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã lớp</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khóa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sĩ số</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClasses.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredClasses.map(cls => (
                                    <tr key={cls.id} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono font-black text-[13px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{cls.code}</span>
                                            {cls.name && <span className="block mt-1 text-[11px] text-slate-400 font-medium">{cls.name}</span>}
                                        </td>
                                        <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{cls.cohort || "—"}</td>
                                        <td className="px-6 py-3.5"><span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{majors.find(m => m.id === cls.majorId)?.name || "—"}</span></td>
                                        <td className="px-6 py-3.5 text-center"><span className="text-xs font-black text-slate-600">{cls._count?.students || 0}</span></td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => window.location.href = `/staff/training-scores?classId=${cls.id}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Nhập điểm rèn luyện"><BookOpen size={14} /></button>
                                                <button onClick={() => openDrawer("adminClass", cls)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem("admin-classes", cls.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                    {activeTab === "adminClasses" && (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã lớp</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khóa</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngành</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sĩ số</th>
                                    <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredClasses.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">Chưa có dữ liệu</td></tr> : filteredClasses.map(cls => (
                                    <tr key={cls.id} className="group hover:bg-slate-50/70 transition-colors">
                                        <td className="px-6 py-3.5"><span className="font-mono font-black text-[13px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">{cls.code}</span>
                                            {cls.name && <span className="block mt-1 text-[11px] text-slate-400 font-medium">{cls.name}</span>}
                                        </td>
                                        <td className="px-6 py-3.5 text-sm font-bold text-slate-700">{cls.cohort || "—"}</td>
                                        <td className="px-6 py-3.5"><span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">{majors.find(m => m.id === cls.majorId)?.name || "—"}</span></td>
                                        <td className="px-6 py-3.5 text-center"><span className="text-xs font-black text-slate-600">{cls._count?.students || 0}</span></td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => window.location.href = `/staff/training-scores?classId=${cls.id}`} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Nhập điểm rèn luyện"><BookOpen size={14} /></button>
                                                <button onClick={() => openDrawer("adminClass", cls)} className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Edit2 size={14} /></button>
                                                <button onClick={() => deleteItem("admin-classes", cls.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <Drawer open={drawer === "faculty"} onClose={() => setDrawer(null)} title={editTarget ? "Chỉnh sửa Khoa" : "Thêm Khoa mới"} onSubmit={submitFaculty} loading={actionLoading} error={drawerError}>
                <InputField label="Mã Khoa" placeholder="VD: FIT" value={facultyForm.code} onChange={(e: any) => setFacultyForm(f => ({ ...f, code: e.target.value }))} />
                <InputField label="Tên Khoa" placeholder="VD: Công nghệ Thông tin" value={facultyForm.name} onChange={(e: any) => setFacultyForm(f => ({ ...f, name: e.target.value }))} />
                <InputField label="Trưởng Khoa" placeholder="VD: PGS.TS Nguyễn Văn A" value={facultyForm.deanName} onChange={(e: any) => setFacultyForm(f => ({ ...f, deanName: e.target.value }))} />
            </Drawer>
            <Drawer open={drawer === "major"} onClose={() => setDrawer(null)} title={editTarget ? "Chỉnh sửa Ngành" : "Thêm Ngành mới"} onSubmit={submitMajor} loading={actionLoading} error={drawerError}>
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Mã Ngành" placeholder="VD: CNTT01" value={majorForm.code} onChange={(e: any) => setMajorForm(f => ({ ...f, code: e.target.value }))} />
                    <InputField label="Số TC yêu cầu" type="number" value={majorForm.totalCreditsRequired} onChange={(e: any) => setMajorForm(f => ({ ...f, totalCreditsRequired: parseInt(e.target.value) }))} />
                </div>
                <InputField label="Tên Ngành đào tạo" placeholder="VD: Công nghệ thông tin" value={majorForm.name} onChange={(e: any) => setMajorForm(f => ({ ...f, name: e.target.value }))} />
                <SelectField label="Thuộc Khoa" options={facultyOptions} value={majorForm.facultyId} onChange={(e: any) => setMajorForm(f => ({ ...f, facultyId: e.target.value }))} />
            </Drawer>
            <Drawer open={drawer === "dept"} onClose={() => setDrawer(null)} title={editTarget ? "Chỉnh sửa Bộ môn" : "Thêm Bộ môn mới"} onSubmit={submitDept} loading={actionLoading} error={drawerError}>
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Mã Bộ môn" placeholder="VD: KT_PM" value={deptForm.code} onChange={(e: any) => setDeptForm(f => ({ ...f, code: e.target.value }))} />
                    <InputField label="Trưởng Bộ môn" placeholder="VD: TS. Nguyễn Văn A" value={deptForm.headName} onChange={(e: any) => setDeptForm(f => ({ ...f, headName: e.target.value }))} />
                </div>
                <InputField label="Tên Bộ môn" placeholder="VD: Kỹ thuật phần mềm" value={deptForm.name} onChange={(e: any) => setDeptForm(f => ({ ...f, name: e.target.value }))} />
                <SelectField label="Thuộc Khoa" options={facultyOptions} value={deptForm.facultyId} onChange={(e: any) => setDeptForm(f => ({ ...f, facultyId: e.target.value }))} />
            </Drawer>
            <Drawer open={drawer === "adminClass"} onClose={() => setDrawer(null)} title={editTarget ? "Chỉnh sửa Lớp" : "Thêm Lớp mới"} onSubmit={submitAdminClass} loading={actionLoading} error={drawerError}>
                <div className="grid grid-cols-2 gap-3">
                    <InputField label="Mã Lớp" placeholder="VD: K14DCNTT1" value={adminClassForm.code} onChange={(e: any) => setAdminClassForm(f => ({ ...f, code: e.target.value }))} />
                    <SelectField label="Khóa học" options={cohorts.map(c => ({ value: c.code, label: c.name }))} value={adminClassForm.cohort} onChange={(e: any) => setAdminClassForm(f => ({ ...f, cohort: e.target.value }))} />
                </div>
                <InputField label="Tên lớp tham khảo (Không bắt buộc)" placeholder="VD: Cử nhân CNTT 1" value={adminClassForm.name} onChange={(e: any) => setAdminClassForm(f => ({ ...f, name: e.target.value }))} />
                <SelectField label="Ngành học" options={majorOptions} value={adminClassForm.majorId} onChange={(e: any) => setAdminClassForm(f => ({ ...f, majorId: e.target.value }))} />
            </Drawer>
            <SubjectFormModal
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                editingSubject={editingSubject}
                majors={majors}
                departments={departments}
                subjects={subjects}
                headers={headers}
                onSuccess={(message) => {
                    showToast(message);
                    fetchData();
                }}
            />
        </div>
    );
}
