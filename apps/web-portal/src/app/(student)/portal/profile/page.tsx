"use client";

import { useEffect, useState } from "react";
import { 
    User, Phone, MapPin, Mail, CreditCard, 
    Building, BookOpen, GraduationCap, Users, 
    Calendar, Shield, Flag, Award, HeartHandshake, Briefcase,
    Loader2, Save
} from "lucide-react";
import { StudentService } from "@/services/student.service";
import api from "@/lib/api";
import { getStudentUserId, readStudentSessionUser } from "@/lib/student-session";

export default function StudentProfilePage() {
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Editable fields
    const [formData, setFormData] = useState({
        phone: "",
        emailPersonal: "",
        address: "",
        permanentAddress: "",
        bankName: "",
        bankBranch: "",
        bankAccountName: "",
        bankAccountNumber: "",
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const user = readStudentSessionUser();
            const userId = getStudentUserId(user);
            if (!userId) {
                setLoading(false);
                return;
            }

            const data = await StudentService.getProfile(userId);
            if (data && data.id) {
                setStudent(data);
                setFormData({
                    phone: data.phone || "",
                    emailPersonal: data.emailPersonal || "",
                    address: data.address || "",
                    permanentAddress: data.permanentAddress || "",
                    bankName: data.bankName || "",
                    bankBranch: data.bankBranch || "",
                    bankAccountName: data.bankAccountName || "",
                    bankAccountNumber: data.bankAccountNumber || "",
                });
            }
        } catch (error) {
            console.error("Lỗi khi tải thông tin", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await api.put(`/api/students/${student.id}`, {
                phone: formData.phone,
                emailPersonal: formData.emailPersonal,
                address: formData.address,
                permanentAddress: formData.permanentAddress,
                bankName: formData.bankName,
                bankBranch: formData.bankBranch,
                bankAccountName: formData.bankAccountName,
                bankAccountNumber: formData.bankAccountNumber,
            });
            if (res.status === 200) {
                alert("Cập nhật thông tin thành công!");
                fetchProfile();
            } else {
                alert("Cập nhật thất bại. Vui lòng thử lại.");
            }
        } catch (error) {
            alert("Lỗi kết nối.");
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "---";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const StatusBadge = ({ status }: { status: string }) => {
        if (status === "STUDYING" || status === "ACTIVE") {
            return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold">Đang học tập</span>;
        }
        if (status === "RESERVED") return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md text-[10px] font-bold">Bảo lưu</span>;
        if (status === "DROPOUT") return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">Thôi học</span>;
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-bold">{status}</span>;
    };

    const genderMap = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-10 h-10 border-[3px] border-uneti-blue/10 border-t-uneti-blue rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!student) {
        return <div className="p-8 text-center text-slate-500">Không tìm thấy thông tin sinh viên</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <User className="text-uneti-blue" size={26} />
                    Hồ sơ Tổng hợp Sinh viên
                </h1>
                <p className="text-[14px] text-slate-500 mt-1">Quản lý toàn bộ thông tin cá nhân, học vụ, nhân khẩu và tài khoản.</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Left Column: Readonly Info (Academic & Summary) */}
                <div className="w-full lg:w-1/3 xl:w-1/4 flex-shrink-0 space-y-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-uneti-blue/20 to-uneti-blue/5"></div>
                        <div className="relative pt-6 flex flex-col items-center">
                            <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-4xl font-black text-uneti-blue">
                                {student.fullName?.charAt(0)}
                            </div>
                            <h2 className="mt-4 text-xl font-black text-slate-800 text-center">{student.fullName}</h2>
                            <span className="mt-2 px-3 py-1 bg-uneti-blue/10 text-uneti-blue text-[11px] font-bold rounded-lg uppercase tracking-wider">
                                {student.studentCode}
                            </span>
                            <div className="mt-3">
                                <StatusBadge status={student.status} />
                            </div>
                        </div>

                        <div className="mt-8 space-y-4">
                            <div className="flex items-start gap-3">
                                <BookOpen className="text-slate-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Ngành học</p>
                                    <p className="text-[14px] font-bold text-slate-700">{student.major?.name || "---"}</p>
                                </div>
                            </div>
                            {student.specialization && (
                                <div className="flex items-start gap-3">
                                    <Users className="text-slate-400 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Chuyên ngành</p>
                                        <p className="text-[14px] font-bold text-slate-700">{student.specialization?.name || "---"}</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex items-start gap-3">
                                <GraduationCap className="text-slate-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Lớp / Khóa</p>
                                    <p className="text-[14px] font-bold text-slate-700">{student.adminClass?.code || "Chưa xếp lớp"} / {student.intake || "---"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Award className="text-slate-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Bậc / Loại hình đào tạo</p>
                                    <p className="text-[14px] font-bold text-slate-700">{student.educationLevel || "Đại học"} - {student.educationType || "Chính quy"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Building className="text-slate-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Cơ sở (Campus)</p>
                                    <p className="text-[14px] font-bold text-slate-700">{student.campus || "Hà Nội"}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="text-slate-400 mt-0.5" size={16} />
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Ngày nhập học</p>
                                    <p className="text-[14px] font-bold text-slate-700">{formatDate(student.admissionDate)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100">
                        <h3 className="text-[13px] font-black text-emerald-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            Thống kê học tập
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-wider mb-1">CPA</p>
                                <p className="text-3xl font-black text-emerald-700">{student.cpa?.toFixed(2) || "0.00"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-emerald-600/60 uppercase tracking-wider mb-1">Tín chỉ Tích lũy</p>
                                <p className="text-3xl font-black text-emerald-700">{student.totalEarnedCredits || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Detailed Flex layout */}
                <div className="flex-1 min-w-0 space-y-6">
                    {/* Basic Identity Details */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                            <User className="text-slate-400" size={20} />
                            Cơ sở dữ liệu Cá nhân & Nhân khẩu
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Ngày sinh</p>
                                <p className="text-[15px] font-bold text-slate-800">{formatDate(student.dob)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Giới tính</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.gender ? (genderMap as any)[student.gender] : "---"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Nơi sinh</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.birthPlace || "---"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Quốc tịch</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.nationality || "---"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Dân tộc</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.ethnicity || "---"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Tôn giáo</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.religion || "---"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Số CCCD</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.citizenId || "---"}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Ngày cấp - Nơi cấp CCCD</p>
                                <p className="text-[15px] font-bold text-slate-800">
                                    {formatDate(student.idIssueDate)} tại {student.idIssuePlace || "---"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Political & Region details */}
                    <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
                            <Flag className="text-slate-400" size={20} />
                            Đoàn - Đảng & Chính sách
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Khu vực ưu tiên</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.region || "---"}</p>
                            </div>
                            <div className="sm:col-span-2">
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Diện ưu tiên chính sách</p>
                                <p className="text-[15px] font-bold text-slate-800">{student.policyBeneficiary || "Không"}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Ngày vào Đoàn</p>
                                <p className="text-[15px] font-bold text-slate-800">{formatDate(student.youthUnionDate)}</p>
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">Ngày vào Đảng</p>
                                <p className="text-[15px] font-bold text-slate-800">{formatDate(student.partyDate)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Contact & Bank - Editable Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contact Info */}
                        <div className="bg-blue-50/50 rounded-2xl p-6 md:p-8 border border-blue-100/50 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-blue-200/50 pb-4">
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <Phone className="text-uneti-blue" size={20} />
                                    Thông tin liên hệ
                                </h3>
                                <span className="text-[11px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Tự cập nhật</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">SĐT Cá nhân</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="0987..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">Email Cá nhân</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.emailPersonal}
                                        onChange={(e) => setFormData({ ...formData, emailPersonal: e.target.value })}
                                        placeholder="email@example.com"
                                    />
                                </div>
                                <div className="space-y-1.5 break-words">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">
                                        Nơi ở hiện nay (Tạm trú)
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all resize-none"
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        placeholder="Số nhà, đường, phường/xã..."
                                    />
                                </div>
                                <div className="space-y-1.5 break-words">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">
                                        Hộ khẩu thường trú
                                    </label>
                                    <textarea
                                        rows={2}
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all resize-none"
                                        value={formData.permanentAddress}
                                        onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                                        placeholder="Nơi đăng ký hộ khẩu thường trú..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bank Info */}
                        <div className="bg-blue-50/50 rounded-2xl p-6 md:p-8 border border-blue-100/50 shadow-sm space-y-5">
                            <div className="flex items-center justify-between border-b border-blue-200/50 pb-4">
                                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                                    <CreditCard className="text-uneti-blue" size={20} />
                                    Thông tin Ngân hàng
                                </h3>
                                <span className="text-[11px] bg-blue-100 text-blue-700 px-2.5 py-1 rounded font-bold uppercase tracking-wider">Tự cập nhật</span>
                            </div>
                            
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">Tên Ngân hàng</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.bankName}
                                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                        placeholder="Ví dụ: Vietcombank, BIDV, MB..."
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">Chi nhánh nạp tiền</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.bankBranch}
                                        onChange={(e) => setFormData({ ...formData, bankBranch: e.target.value })}
                                        placeholder="Ví dụ: Chi nhánh Hoàng Mai"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">Tên Chủ tài khoản</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.bankAccountName}
                                        onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                                        placeholder="VI DU: NGUYEN VAN A"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[12px] font-black text-slate-500 uppercase tracking-widest block">Số Tài khoản</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[14px] font-bold outline-none focus:border-uneti-blue focus:ring-4 focus:ring-uneti-blue/10 transition-all"
                                        value={formData.bankAccountNumber}
                                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                                        placeholder="Nhập số tài khoản..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-uneti-blue text-white px-10 py-4 rounded-xl font-black uppercase tracking-wider text-[14px] shadow-lg shadow-uneti-blue/30 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Đang lưu dữ liệu...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5" />
                                    Lưu Thay Đổi Thông Tin
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
