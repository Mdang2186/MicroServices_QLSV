"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import {
    Users,
    Plus,
    Edit2,
    Trash2,
    GraduationCap,
    Download,
    AlertTriangle,
    Check,
    ShieldCheck,
    Key,
    UserPlus,
    Mail,
    Phone,
    CheckCircle2
} from "lucide-react";
import Modal from "@/components/modal";
import DataTable from "@/components/DataTable";

export default function AdminStudentsPage() {
    const [students, setStudents] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [adminClasses, setAdminClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Create Account toggle
    const [createAccount, setCreateAccount] = useState(true);

    // Form states
    const [formData, setFormData] = useState({
        studentCode: "",
        fullName: "",
        email: "",
        intake: "",
        status: "ACTIVE",
        majorId: "",
        adminClassId: "",
        specializationId: "",
        dob: "",
        phone: "",
        gender: "MALE",
        citizenId: "",
        address: "",
        emailPersonal: "",
        idIssueDate: "",
        idIssuePlace: "",
        admissionDate: "",
        campus: "",
        educationLevel: "",
        educationType: "",
        ethnicity: "",
        religion: "",
        nationality: "",
        birthPlace: "",
        permanentAddress: "",
        bankName: "",
        bankBranch: "",
        bankAccountName: "",
        bankAccountNumber: "",
        gpa: 0,
        cpa: 0,
        totalEarnedCredits: 0,
        youthUnionDate: "",
        partyDate: "",
        region: "",
        policyBeneficiary: "",
    });

    const TOKEN = Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchStudents();
        fetchMajors();
        fetchAdminClasses();
    }, []);

    const fetchMajors = async () => {
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
        }
    };

    const fetchAdminClasses = async () => {
        try {
            const res = await fetch("/api/admin-classes", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAdminClasses(data);
            }
        } catch (error) {
            console.error("Failed to fetch admin classes", error);
        }
    };

    const fetchStudents = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/students", {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                setStudents(data);
            }
        } catch (error) {
            console.error("Failed to fetch students", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            // Admin can choose to create account or just info
            const endpoint = createAccount ? "/api/auth/students" : "/api/students";

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    ...formData,
                    dob: formData.dob ? new Date(formData.dob).toISOString() : new Date().toISOString(),
                    admissionDate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : undefined,
                    idIssueDate: formData.idIssueDate ? new Date(formData.idIssueDate).toISOString() : undefined,
                    youthUnionDate: formData.youthUnionDate ? new Date(formData.youthUnionDate).toISOString() : undefined,
                    partyDate: formData.partyDate ? new Date(formData.partyDate).toISOString() : undefined,
                })
            });

            if (res.ok) {
                await fetchStudents();
                setIsAddModalOpen(false);
                resetForm();
            } else {
                const err = await res.json();
                alert(err.message || "Lỗi khi thêm sinh viên");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        } finally {
            setFormLoading(false);
        }
    };

    const handleEditStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const res = await fetch(`/api/students/${selectedStudent.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    ...formData,
                    dob: formData.dob ? new Date(formData.dob).toISOString() : undefined,
                    admissionDate: formData.admissionDate ? new Date(formData.admissionDate).toISOString() : undefined,
                    idIssueDate: formData.idIssueDate ? new Date(formData.idIssueDate).toISOString() : undefined,
                    youthUnionDate: formData.youthUnionDate ? new Date(formData.youthUnionDate).toISOString() : undefined,
                    partyDate: formData.partyDate ? new Date(formData.partyDate).toISOString() : undefined,
                })
            });
            if (res.ok) {
                await fetchStudents();
                setIsEditModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi cập nhật");
        } finally {
            setFormLoading(false);
        }
    };

    const confirmDelete = async () => {
        setFormLoading(true);
        try {
            const res = await fetch(`/api/students/${selectedStudent.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                setStudents(students.filter(s => s.id !== selectedStudent.id));
                setIsDeleteModalOpen(false);
            }
        } catch (error) {
            alert("Lỗi khi xóa sinh viên");
        } finally {
            setFormLoading(false);
        }
    };

    const handleCreateAccountForExisting = async (student: any) => {
        if (!confirm(`Tạo tài khoản học viên cho ${student.fullName}?`)) return;

        setLoading(true);
        try {
            const res = await fetch("/api/auth/students", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify({
                    studentCode: student.studentCode,
                    fullName: student.fullName,
                    email: student.email || `${student.studentCode}@uneti.edu.vn`,
                    dob: student.dob,
                    majorId: student.majorId,
                })
            });
            if (res.ok) {
                alert("Đã tạo tài khoản thành công! Mật khẩu mặc định: 123456");
                await fetchStudents();
            } else {
                const err = await res.json();
                alert(err.message || "Lỗi khi tạo tài khoản");
            }
        } catch (error) {
            alert("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            studentCode: "", fullName: "", email: "", intake: "", status: "STUDYING", majorId: "", adminClassId: "", specializationId: "",
            dob: "", phone: "", gender: "MALE", citizenId: "", address: "",
            emailPersonal: "", idIssueDate: "", idIssuePlace: "", admissionDate: "", campus: "",
            educationLevel: "", educationType: "", ethnicity: "", religion: "", nationality: "Việt Nam",
            birthPlace: "", permanentAddress: "", bankName: "", bankBranch: "",
            bankAccountName: "", bankAccountNumber: "",
            gpa: 0, cpa: 0, totalEarnedCredits: 0,
            youthUnionDate: "", partyDate: "", region: "", policyBeneficiary: "",
        });
        setCreateAccount(true);
    };

    const openEditModal = (student: any) => {
        setSelectedStudent(student);
        setFormData({
            studentCode: student.studentCode || "",
            fullName: student.fullName || "",
            email: student.user?.email || student.email || "",
            intake: student.intake || "",
            status: student.status || "ACTIVE",
            majorId: student.majorId || "",
            adminClassId: student.adminClassId || "",
            specializationId: student.specializationId || "",
            dob: student.dob ? new Date(student.dob).toISOString().split('T')[0] : "",
            phone: student.phone || "",
            gender: student.gender || "MALE",
            citizenId: student.citizenId || "",
            address: student.address || "",
            emailPersonal: student.emailPersonal || "",
            idIssueDate: student.idIssueDate ? new Date(student.idIssueDate).toISOString().split('T')[0] : "",
            idIssuePlace: student.idIssuePlace || "",
            admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : "",
            campus: student.campus || "",
            educationLevel: student.educationLevel || "",
            educationType: student.educationType || "",
            ethnicity: student.ethnicity || "",
            religion: student.religion || "",
            nationality: student.nationality || "",
            birthPlace: student.birthPlace || "",
            permanentAddress: student.permanentAddress || "",
            bankName: student.bankName || "",
            bankBranch: student.bankBranch || "",
            bankAccountName: student.bankAccountName || "",
            bankAccountNumber: student.bankAccountNumber || "",
            gpa: student.gpa || 0,
            cpa: student.cpa || 0,
            totalEarnedCredits: student.totalEarnedCredits || 0,
            youthUnionDate: student.youthUnionDate ? new Date(student.youthUnionDate).toISOString().split('T')[0] : "",
            partyDate: student.partyDate ? new Date(student.partyDate).toISOString().split('T')[0] : "",
            region: student.region || "",
            policyBeneficiary: student.policyBeneficiary || "",
        });
        setIsEditModalOpen(true);
    };

    const stats = {
        total: students.length,
        active: students.filter(s => s.status === 'ACTIVE' || s.status === 'STUDYING').length,
        graduated: students.filter(s => s.status === 'GRADUATED').length,
    };

    const renderStudentForm = () => (
        <div className="space-y-8 py-4 px-2">
            {/* section: Thông tin cơ bản */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-uneti-blue rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Thông tin cơ bản</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã sinh viên</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.studentCode}
                            onChange={(e) => setFormData({ ...formData, studentCode: e.target.value })}
                            placeholder="SV26001"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Họ và tên</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            placeholder="Nguyễn Văn A"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày sinh</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.dob}
                            onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giới tính</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        >
                            <option value="MALE">Nam</option>
                            <option value="FEMALE">Nữ</option>
                            <option value="OTHER">Khác</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số điện thoại</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="0123..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email (Tài khoản học tập)</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="example@uneti.edu.vn"
                        />
                    </div>
                </div>
            </div>

            {/* section: Thông tin định danh */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-amber-500 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Thông tin định danh</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số CCCD</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.citizenId}
                            onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                            placeholder="001..."
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày cấp</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.idIssueDate}
                            onChange={(e) => setFormData({ ...formData, idIssueDate: e.target.value })}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi cấp</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                        value={formData.idIssuePlace}
                        onChange={(e) => setFormData({ ...formData, idIssuePlace: e.target.value })}
                        placeholder="Cục Cảnh sát quản lý hành chính về trật tự xã hội"
                    />
                </div>
            </div>

            {/* section: Thông tin học vấn */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Thông tin học vấn</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khóa học</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.intake}
                            onChange={(e) => setFormData({ ...formData, intake: e.target.value })}
                            placeholder="K20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên ngành</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                            value={formData.majorId}
                            onChange={(e) => setFormData({ ...formData, majorId: e.target.value, specializationId: "" })}
                        >
                            <option value="">Chọn ngành học</option>
                            {majors.map((m: any) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lớp danh nghĩa</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                            value={formData.adminClassId}
                            onChange={(e) => setFormData({ ...formData, adminClassId: e.target.value })}
                        >
                            <option value="">Chọn lớp danh nghĩa</option>
                            {adminClasses
                                .filter((c: any) => !formData.majorId || c.majorId === formData.majorId)
                                .map((c: any) => (
                                    <option key={c.id} value={c.id}>{c.code}</option>
                                ))}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chuyên ngành hẹp</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none disabled:opacity-50"
                            value={formData.specializationId}
                            onChange={(e) => setFormData({ ...formData, specializationId: e.target.value })}
                            disabled={!formData.majorId}
                        >
                            <option value="">Chọn chuyên ngành hẹp</option>
                            {majors.find(m => m.id === formData.majorId || m.name === formData.majorId)?.specializations?.map((s: any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cơ sở</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                            value={formData.campus}
                            onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                        >
                            <option value="">Chọn cơ sở</option>
                            <option value="Hà Nội">Hà Nội</option>
                            <option value="Nam Định">Nam Định</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái hồ sơ</label>
                        <select
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        >
                            <option value="STUDYING">⚡ Đang học tập</option>
                            <option value="RESERVED">⏸️ Bảo lưu</option>
                            <option value="DROPOUT">❌ Thôi học</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* section: Kết quả học tập */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Kết quả học tập</h3>
                </div>
                <div className="grid grid-cols-3 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">GPA (Hệ 4)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.gpa}
                            onChange={(e) => setFormData({ ...formData, gpa: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CPA</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.cpa}
                            onChange={(e) => setFormData({ ...formData, cpa: parseFloat(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tín chỉ tích lũy</label>
                        <input
                            type="number"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.totalEarnedCredits}
                            onChange={(e) => setFormData({ ...formData, totalEarnedCredits: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>
            </div>

            {/* section: Thông tin nhân thân */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Thông tin nhân thân</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dân tộc</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.ethnicity}
                            onChange={(e) => setFormData({ ...formData, ethnicity: e.target.value })}
                            placeholder="Kinh"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tôn giáo</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.religion}
                            onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                            placeholder="Không"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Quốc tịch</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.nationality}
                            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nơi sinh</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.birthPlace}
                            onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                            placeholder="Hà Nội"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Địa chỉ tạm trú</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Số nhà, phố, tỉnh..."
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hộ khẩu thường trú</label>
                    <input
                        type="text"
                        className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                        value={formData.permanentAddress}
                        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                        placeholder="Số nhà, phố, tỉnh..."
                    />
                </div>
            </div>

            {/* section: Thông tin Đoàn - Đảng & Chính sách */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Thông tin Đoàn - Đảng & Chính sách</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào Đoàn</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.youthUnionDate}
                            onChange={(e) => setFormData({ ...formData, youthUnionDate: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày vào Đảng</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.partyDate}
                            onChange={(e) => setFormData({ ...formData, partyDate: e.target.value })}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Khu vực</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            placeholder="Khu vực 1, 2, 2NT, 3"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đối tượng chính sách</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.policyBeneficiary}
                            onChange={(e) => setFormData({ ...formData, policyBeneficiary: e.target.value })}
                            placeholder="Con thương binh, hộ nghèo..."
                        />
                    </div>
                </div>
            </div>

            {/* section: Tài khoản ngân hàng */}
            <div className="space-y-4 pt-4 pb-8">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                    <span className="w-1.5 h-6 bg-slate-900 rounded-full"></span>
                    <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-wider">Tài khoản ngân hàng</h3>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên ngân hàng</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            placeholder="Vietcombank"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Số tài khoản</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.bankAccountNumber}
                            onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                            placeholder="123456789"
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const columns = [
        {
            header: "Sinh viên",
            accessorKey: "fullName",
            cell: (s: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-uneti-blue/10 flex items-center justify-center text-uneti-blue font-black text-[16px]">
                        {s.fullName?.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[14px] font-black text-slate-800 leading-snug">{s.fullName}</p>
                        <div className="flex items-center gap-2 mt-1">
                            {s.userId ? (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                    <ShieldCheck size={12} /> Đã cấp TK
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                    <AlertTriangle size={12} /> Chỉ hồ sơ
                                </span>
                            )}
                            <span className="text-[11px] font-medium text-slate-400">{s.studentCode}</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            header: "Khóa / Lớp / Ngành",
            accessorKey: "intake",
            cell: (s: any) => (
                <div className="flex flex-col gap-1">
                    <span className="text-[13px] font-bold text-slate-700">{s.intake || "---"} - {s.adminClass?.code || "Chưa xếp lớp"}</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                        {s.major?.name || "Chưa chọn ngành"}
                        {s.specialization?.name ? ` (${s.specialization.name})` : ''}
                    </span>
                </div>
            )
        },
        {
            header: "Trạng thái",
            accessorKey: "status",
            cell: (s: any) => (
                <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm flex items-center gap-2 w-fit ${s.status === 'ACTIVE' || s.status === 'STUDYING'
                    ? 'bg-emerald-500 text-white'
                    : s.status === 'DROPOUT' ? 'bg-rose-500 text-white'
                        : 'bg-slate-900 text-white'
                    }`}>
                    <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    {s.status === 'ACTIVE' || s.status === 'STUDYING' ? 'Đang học' : s.status === 'DROPOUT' ? 'Bỏ học' : s.status}
                </span>
            )
        },
        { header: "Ngày sinh", accessorKey: "dob", cell: (s: any) => s.dob ? new Date(s.dob).toLocaleDateString('vi-VN') : "---" },
        { header: "Giới tính", accessorKey: "gender", cell: (s: any) => s.gender === 'MALE' ? 'Nam' : s.gender === 'FEMALE' ? 'Nữ' : 'Khác' },
        { header: "Số điện thoại", accessorKey: "phone" },
        { header: "CCCD", accessorKey: "citizenId" },
        { header: "Email Cá nhân", accessorKey: "emailPersonal" },
        { header: "Địa chỉ", accessorKey: "address" },
        { header: "Cơ sở", accessorKey: "campus" },
        { header: "Bậc đào tạo", accessorKey: "educationLevel" },
        { header: "Loại hình", accessorKey: "educationType" },
        { header: "Dân tộc", accessorKey: "ethnicity" },
        { header: "Tôn giáo", accessorKey: "religion" },
        { header: "Quốc tịch", accessorKey: "nationality" },
        { header: "Ngân hàng", accessorKey: "bankName" },
        { header: "Số tài khoản", accessorKey: "bankAccountNumber" },
        { header: "GPA", accessorKey: "gpa", cell: (s: any) => s.gpa?.toFixed(2) || "0.00" },
        { header: "CPA", accessorKey: "cpa", cell: (s: any) => s.cpa?.toFixed(2) || "0.00" },
        { header: "Tín chỉ", accessorKey: "totalEarnedCredits", cell: (s: any) => s.totalEarnedCredits || "0" }
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
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <GraduationCap className="text-uneti-blue" size={32} />
                        Quản trị Sinh viên
                    </h1>
                    <p className="text-[13px] font-medium text-slate-500 italic">"Hệ thống quản lý thông tin và tài khoản sinh viên tập trung"</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <Download size={16} />
                        Xuất Excel
                    </button>
                    <button
                        onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                        className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-black hover:bg-uneti-blue transition-all shadow-lg uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Thêm sinh viên
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                    { label: "Tổng sinh viên", value: stats.total, icon: Users, color: "blue" },
                    { label: "Đang học tập", value: stats.active, icon: CheckCircle2, color: "emerald" },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform duration-500"></div>
                        <div className="relative z-10 flex flex-col justify-between h-full">
                            <div className={`w-12 h-12 rounded-2xl bg-${s.color === 'blue' ? 'uneti-blue-light' : s.color + '-50'} flex items-center justify-center text-${s.color === 'blue' ? 'uneti-blue' : s.color + '-600'} mb-4`}>
                                <s.icon size={22} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                                <p className="text-3xl font-black text-slate-900">{s.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <DataTable
                data={students}
                columns={columns}
                onRowClick={(s) => openEditModal(s)}
                searchKey="fullName"
                searchPlaceholder="Tìm kiếm theo tên..."
                actions={(s) => (
                    <div className="flex items-center justify-end gap-2">
                        {!s.userId && (
                            <button
                                onClick={() => handleCreateAccountForExisting(s)}
                                className="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Cấp tài khoản"
                            >
                                <UserPlus size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => openEditModal(s)}
                            className="p-2.5 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all"
                            title="Chỉnh sửa"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => { setSelectedStudent(s); setIsDeleteModalOpen(true); }}
                            className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Xóa"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            />

            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Thêm sinh viên mới"
                maxWidth="4xl"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy</button>
                        <button
                            onClick={handleAddStudent}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            XÁC NHẬN THÊM
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4 px-2" onSubmit={(e) => e.preventDefault()}>
                    {/* Role Control */}
                    <div className="bg-slate-50 p-4 rounded-3xl border border-slate-100 flex items-center justify-between mx-2 mb-4 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-colors ${createAccount ? 'bg-uneti-blue text-white' : 'bg-slate-200 text-slate-500'}`}>
                                <Key size={20} />
                            </div>
                            <div>
                                <p className="text-[12px] font-black text-slate-800">Cấp tài khoản đăng nhập</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cho phép sinh viên vào hệ thống</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setCreateAccount(!createAccount)}
                            className={`w-14 h-7 rounded-full transition-all relative ${createAccount ? 'bg-uneti-blue' : 'bg-slate-300'}`}
                        >
                            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all ${createAccount ? 'right-1' : 'left-1'}`}></div>
                        </button>
                    </div>
                    {renderStudentForm()}
                </form>
            </Modal>

            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật sinh viên"
                maxWidth="4xl"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase">Hủy</button>
                        <button
                            onClick={handleEditStudent}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            CẬP NHẬT
                        </button>
                    </div>
                }
            >
                <form className="space-y-6 py-4 px-2" onSubmit={(e) => e.preventDefault()}>
                    {renderStudentForm()}
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400">Hủy</button>
                        <button onClick={confirmDelete} className="px-8 py-2.5 bg-rose-600 text-white rounded-2xl text-[12px] font-black hover:bg-rose-700 transition-all uppercase">Xóa vĩnh viễn</button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-8">
                    <div className="w-20 h-20 rounded-[32px] bg-rose-50 flex items-center justify-center text-rose-600">
                        <AlertTriangle size={40} />
                    </div>
                    <p className="text-[15px] font-bold text-slate-600">
                        Hành động này sẽ xóa vĩnh viễn hồ sơ và tài khoản của <br /> <span className="text-slate-900 font-black">{selectedStudent?.fullName}</span>.
                    </p>
                </div>
            </Modal>
        </div>
    );
}
