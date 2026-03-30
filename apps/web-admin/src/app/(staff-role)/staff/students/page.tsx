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
    Building2,
    UserPlus
} from "lucide-react";
import Modal from "@/components/modal";
import DataTable from "@/components/DataTable";

export default function StaffStudentsPage() {
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

    // Form states
    const [formData, setFormData] = useState({
        studentCode: "",
        fullName: "",
        email: "",
        intake: "",
        status: "STUDYING",
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
        region: "",
        policyBeneficiary: "",
        youthUnionDate: "",
        partyDate: "",
        ethnicity: "",
        religion: "",
        nationality: "Việt Nam",
        birthPlace: "",
        permanentAddress: "",
        bankName: "",
        bankBranch: "",
        bankAccountName: "",
        bankAccountNumber: "",
        gpa: 0,
        cpa: 0,
        totalEarnedCredits: 0,
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email cá nhân</label>
                        <input
                            type="email"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.emailPersonal}
                            onChange={(e) => setFormData({ ...formData, emailPersonal: e.target.value })}
                            placeholder="example@gmail.com"
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày nhập học</label>
                        <input
                            type="date"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.admissionDate}
                            onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                        />
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bậc đào tạo</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.educationLevel}
                            onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                            placeholder="Đại học"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loại hình</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.educationType}
                            onChange={(e) => setFormData({ ...formData, educationType: e.target.value })}
                            placeholder="Chính quy"
                        />
                    </div>
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
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chi nhánh</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.bankBranch}
                            onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                            placeholder="Chi nhánh Hà Đông"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tên tài khoản</label>
                        <input
                            type="text"
                            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10"
                            value={formData.bankAccountName}
                            onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                            placeholder="NGUYEN VAN A"
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
            const res = await fetch("/api/students", {
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
                setFormData({
                    studentCode: "", fullName: "", email: "", intake: "", status: "STUDYING", majorId: "", adminClassId: "", specializationId: "",
                    dob: "", phone: "", gender: "MALE", citizenId: "", address: "",
                    emailPersonal: "", idIssueDate: "", idIssuePlace: "", admissionDate: "", campus: "",
                    educationLevel: "", educationType: "", region: "", policyBeneficiary: "",
                    youthUnionDate: "", partyDate: "", ethnicity: "", religion: "", nationality: "Việt Nam",
                    birthPlace: "", permanentAddress: "", bankName: "", bankBranch: "",
                    bankAccountName: "", bankAccountNumber: "",
                    gpa: 0, cpa: 0, totalEarnedCredits: 0
                });
            }
        } catch (error) {
            alert("Lỗi khi thêm sinh viên");
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

    const openEditModal = (student: any) => {
        setSelectedStudent(student);
        setFormData({
            studentCode: student.studentCode || "",
            fullName: student.fullName || "",
            email: student.user?.email || student.email || "",
            intake: student.intake || "",
            status: student.status || "STUDYING",
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
            region: student.region || "",
            policyBeneficiary: student.policyBeneficiary || "",
            youthUnionDate: student.youthUnionDate ? new Date(student.youthUnionDate).toISOString().split('T')[0] : "",
            partyDate: student.partyDate ? new Date(student.partyDate).toISOString().split('T')[0] : "",
            ethnicity: student.ethnicity || "",
            religion: student.religion || "",
            nationality: student.nationality || "Việt Nam",
            birthPlace: student.birthPlace || "",
            permanentAddress: student.permanentAddress || "",
            bankName: student.bankName || "",
            bankBranch: student.bankBranch || "",
            bankAccountName: student.bankAccountName || "",
            bankAccountNumber: student.bankAccountNumber || "",
            gpa: student.gpa || 0,
            cpa: student.cpa || 0,
            totalEarnedCredits: student.totalEarnedCredits || 0,
        });
        setIsEditModalOpen(true);
    };

    const columns = [
        {
            header: "Hồ sơ Sinh viên",
            accessorKey: "fullName",
            cell: (s: any) => (
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-uneti-blue/5 flex items-center justify-center text-uneti-blue font-black text-[14px]">
                        {s.fullName?.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                        <p className="text-[14px] font-black text-slate-800 leading-snug">{s.fullName}</p>
                        <p className="text-[11px] font-medium text-slate-400 mt-1">{s.user?.email || s.emailPersonal || "Chưa có email"}</p>
                    </div>
                </div>
            )
        },
        {
            header: "Mã sinh viên",
            accessorKey: "studentCode",
            cell: (s: any) => (
                <span className="text-[11px] font-black text-uneti-blue bg-uneti-blue-light px-3 py-1.5 rounded-lg tracking-wider">
                    {s.studentCode}
                </span>
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
        { 
            header: "GPA", 
            accessorKey: "gpa", 
            cell: (s: any) => (
                <div className="flex flex-col gap-1">
                    <span className={`font-black ${s.gpa < 1.0 ? 'text-rose-600' : 'text-slate-800'}`}>
                        {s.gpa?.toFixed(2) || "0.00"}
                    </span>
                    {s.gpa > 0 && s.gpa < 1.0 && (
                        <span className="text-[9px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-1 py-0.5 rounded border border-rose-100 flex items-center gap-1">
                            <AlertTriangle size={10} /> Cảnh báo
                        </span>
                    )}
                </div>
            )
        },
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
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        <Building2 size={14} className="text-uneti-blue" />
                        <span>Giáo vụ</span>
                        <span className="text-uneti-blue">/ Quản lý sinh viên</span>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Hồ sơ sinh viên</h1>
                    <p className="text-[13px] font-medium text-slate-500">Quản lý và tiếp nhận thông tin học vụ sinh viên</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-[12px] font-black hover:bg-slate-50 transition-all shadow-sm uppercase tracking-wider">
                        <Download size={16} />
                        Xuất báo cáo
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-uneti-blue text-white rounded-xl text-[12px] font-black hover:shadow-xl hover:shadow-uneti-blue/20 transition-all shadow-lg shadow-uneti-blue/10 uppercase tracking-wider"
                    >
                        <Plus size={18} />
                        Tiếp nhận sinh viên
                    </button>
                </div>
            </div>

            <DataTable
                data={students}
                columns={columns}
                onRowClick={(s) => openEditModal(s)}
                searchKey="fullName"
                searchPlaceholder="Tìm theo tên sinh viên..."
                actions={(s) => (
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <button
                            onClick={() => openEditModal(s)}
                            className="p-2.5 text-uneti-blue hover:bg-uneti-blue-light rounded-xl transition-all"
                            title="Sửa hồ sơ"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => { setSelectedStudent(s); setIsDeleteModalOpen(true); }}
                            className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                            title="Xóa hồ sơ"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )}
            />

            {/* ADD MODAL */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                title="Tiếp nhận hồ sơ sinh viên mới"
                maxWidth="4xl"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 uppercase">Hủy bỏ</button>
                        <button
                            onClick={handleAddStudent}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            LƯU HỒ SƠ
                        </button>
                    </div>
                }
            >
                <form className="space-y-8 py-4 px-2" onSubmit={(e) => e.preventDefault()}>
                    {renderStudentForm()}
                </form>
            </Modal>

            {/* EDIT MODAL */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Cập nhật hồ sơ sinh viên"
                maxWidth="4xl"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 uppercase">Hủy bỏ</button>
                        <button
                            onClick={handleEditStudent}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-uneti-blue text-white rounded-2xl text-[12px] font-black hover:bg-slate-900 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={18} />}
                            CẬP NHẬT HỒ SƠ
                        </button>
                    </div>
                }
            >
                <form className="space-y-8 py-4 px-2" onSubmit={(e) => e.preventDefault()}>
                    {renderStudentForm()}
                </form>
            </Modal>

            {/* DELETE MODAL */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Xác nhận xóa hồ sơ"
                footer={
                    <div className="flex items-center justify-end gap-4 w-full">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2.5 text-[12px] font-black text-slate-400 hover:text-slate-600 uppercase">Hủy</button>
                        <button
                            onClick={confirmDelete}
                            disabled={formLoading}
                            className="px-8 py-2.5 bg-rose-600 text-white rounded-2xl text-[12px] font-black hover:bg-rose-700 transition-all flex items-center gap-2"
                        >
                            {formLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Trash2 size={18} />}
                            XÓA VĨNH VIỄN
                        </button>
                    </div>
                }
            >
                <div className="flex flex-col items-center text-center space-y-4 py-8">
                    <div className="w-20 h-20 rounded-[32px] bg-rose-50 flex items-center justify-center text-rose-600 shadow-inner">
                        <AlertTriangle size={40} />
                    </div>
                    <div className="space-y-1">
                        <p className="text-xl font-black text-slate-900 tracking-tight">Xóa hồ sơ sinh viên?</p>
                        <p className="text-[13px] font-bold text-slate-500 max-w-[300px] leading-relaxed">
                            Bạn đang chuẩn bị xóa thông tin của <span className="text-slate-900 font-black">{selectedStudent?.fullName}</span>.
                        </p>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
