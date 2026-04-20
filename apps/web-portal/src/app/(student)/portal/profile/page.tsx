"use client";

import { useEffect, useState } from "react";
import {
    Phone, Mail, CreditCard, 
    Calendar, Shield, Globe, MapPinned, 
    Loader2, Save, Fingerprint, Landmark,
    Check, X, Lock, User, GraduationCap, Award, Info, Users
} from "lucide-react";
import { StudentService } from "@/services/student.service";
import api from "@/lib/api";
import { readStudentSessionUser } from "@/lib/student-session";
import { resolveCurrentStudentContext } from "@/lib/current-student";
import { cn } from "@/lib/utils";

// --- Components ---

const ModalSectionHeader = ({ title, color }: { title: string, color: string }) => (
    <div className="flex items-center gap-2 mb-6">
        <span className={cn("w-1.5 h-6 rounded-full", color)}></span>
        <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">{title}</h3>
    </div>
);

const ModalField = ({ label, value, className = "", icon: Icon }: { label: string, value: string | number, className?: string, icon?: any }) => (
    <div className={cn("space-y-2", className)}>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold text-slate-800 min-h-[46px] flex items-center gap-3">
            {Icon && <Icon size={14} className="text-slate-300 shrink-0" />}
            <span className="truncate">{value || "---"}</span>
        </div>
    </div>
);

const ModalInputField = ({ label, value, onChange, placeholder, type = "text", icon: Icon }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <div className="relative">
            <input
                type={type}
                className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all border border-transparent focus:border-blue-600/10"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
            {Icon && <Icon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />}
        </div>
    </div>
);

const ModalTextareaField = ({ label, value, onChange, placeholder }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
        <textarea
            rows={2}
            className="w-full px-5 py-3 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/5 transition-all resize-none border border-transparent focus:border-blue-600/10"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    </div>
);

// --- Main Page ---

export default function StudentProfilePage() {
    const [student, setStudent] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Editable data
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

    // Security Verification State
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [verifyingPassword, setVerifyingPassword] = useState(false);
    const [authError, setAuthError] = useState("");

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const context = await resolveCurrentStudentContext();
            if (!context.studentId) return;

            const data =
                context.profile ||
                (await StudentService.getProfileByStudentId(context.studentId).catch(() => null));
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

    const handleSaveTrigger = () => {
        setAuthError("");
        setConfirmPassword("");
        setIsPasswordModalOpen(true);
    };

    const executeSaveWithVerification = async () => {
        if (!confirmPassword) {
            setAuthError("Vui lòng nhập mật khẩu để xác nhận.");
            return;
        }

        setVerifyingPassword(true);
        setAuthError("");

        try {
            const user = readStudentSessionUser();
            const identifier = user?.username || user?.email;

            if (!identifier) {
                setAuthError("Không tìm thấy thông tin phiên đăng nhập.");
                setVerifyingPassword(false);
                return;
            }

            try {
                const loginRes = await api.post("/api/auth/login", {
                    username: identifier,
                    password: confirmPassword
                });

                if (loginRes.status !== 200 && loginRes.status !== 201) {
                    setAuthError("Mật khẩu không chính xác. Vui lòng thử lại.");
                    setVerifyingPassword(false);
                    return;
                }
            } catch (authErr) {
                setAuthError("Mật khẩu không chính xác hoặc lỗi hệ thống.");
                setVerifyingPassword(false);
                return;
            }

            setSaving(true);
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
                setIsPasswordModalOpen(false);
                fetchProfile();
            } else {
                setAuthError("Cập nhật thất bại. Vui lòng thử lại.");
            }
        } catch (error: any) {
            console.error("Error during verification/save:", error);
            setAuthError("Đã có lỗi xảy ra. Vui lòng thử lại sau.");
        } finally {
            setVerifyingPassword(false);
            setSaving(false);
        }
    };

    const handleReset = () => {
        if (student) {
            setFormData({
                phone: student.phone || "",
                emailPersonal: student.emailPersonal || "",
                address: student.address || "",
                permanentAddress: student.permanentAddress || "",
                bankName: student.bankName || "",
                bankBranch: student.bankBranch || "",
                bankAccountName: student.bankAccountName || "",
                bankAccountNumber: student.bankAccountNumber || "",
            });
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "---";
        return new Date(dateString).toLocaleDateString("vi-VN");
    };

    const genderMap = { MALE: "Nam", FEMALE: "Nữ", OTHER: "Khác" };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="w-10 h-10 border-[3px] border-slate-100 border-t-blue-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!student) {
        return <div className="p-8 text-center text-slate-500">Không tìm thấy thông tin sinh viên</div>;
    }

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 animate-in fade-in zoom-in-95 duration-500 relative">
            {/* The "Modal" Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 overflow-hidden border border-slate-100">
                {/* Header Area */}
                <div className="px-10 py-8 flex justify-between items-center border-b border-slate-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-600/20">
                            {student.fullName?.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight">{student.fullName}</h1>
                            <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{student.studentCode} • {student.status}</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors cursor-pointer">
                        <X size={20} />
                    </div>
                </div>

                <div className="p-10 space-y-12">
                    
                    {/* section: Kết quả học tập */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Kết quả học tập" color="bg-blue-600" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <ModalField label="GPA (Hệ 4)" value={student.gpa?.toFixed(2)} icon={Award} />
                            <ModalField label="CPA Toàn khóa" value={student.cpa?.toFixed(2)} icon={GraduationCap} />
                            <ModalField label="Tín chỉ tích lũy" value={student.totalEarnedCredits} icon={Check} />
                        </div>
                    </div>

                    {/* section: Nhân khẩu & Định danh */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Thông tin nhân khẩu & Định danh" color="bg-amber-500" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                            <ModalField label="Ngày sinh" value={formatDate(student.dob)} icon={Calendar} />
                            <ModalField label="Giới tính" value={(genderMap as any)[student.gender] || "Nam"} icon={User} />
                            <ModalField label="Nơi sinh" value={student.birthPlace} icon={MapPinned} />
                            <ModalField label="Dân tộc" value={student.ethnicity || "Kinh"} />
                            <ModalField label="Tôn giáo" value={student.religion || "Không"} />
                            <ModalField label="Quốc tịch" value={student.nationality || "Việt Nam"} icon={Globe} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                            <ModalField label="Số CCCD" value={student.citizenId} icon={Shield} />
                            <ModalField label="Ngày cấp & Nơi cấp" value={`${formatDate(student.idIssueDate)} tại ${student.idIssuePlace}`} />
                        </div>
                    </div>

                    {/* section: Học vấn & Đào tạo */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Thông tin học vấn & Đào tạo" color="bg-emerald-500" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ModalField label="Ngày nhập học" value={formatDate(student.admissionDate)} icon={Calendar} />
                            <ModalField label="Cơ sở đào tạo" value={student.campus} icon={MapPinned} />
                            <ModalField label="Hệ đào tạo" value={student.educationLevel} />
                            <ModalField label="Loại hình đào tạo" value={student.educationType} />
                            <ModalField label="Khóa học" value={student.intake} />
                            <ModalField label="Lớp hành chính" value={student.adminClass?.code} />
                            <ModalField label="Ngành học" value={student.major?.name} className="md:col-span-2" />
                            <ModalField label="Chuyên ngành" value={student.specialization?.name} className="md:col-span-2" />
                        </div>
                    </div>

                    {/* section: Chính sách & Đoàn thể */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Thông tin ưu tiên & Đoàn thể" color="bg-indigo-500" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ModalField label="Khu vực ưu tiên" value={student.region} />
                            <ModalField label="Diện chính sách" value={student.policyBeneficiary || "Không"} />
                            <ModalField label="Ngày vào Đoàn" value={formatDate(student.youthUnionDate)} />
                            <ModalField label="Ngày vào Đảng" value={formatDate(student.partyDate)} />
                        </div>
                    </div>

                    {/* section: Liên hệ & Địa chỉ (Editable) */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Thông tin liên hệ & Địa chỉ" color="bg-amber-600" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ModalInputField 
                                label="Số điện thoại" 
                                value={formData.phone} 
                                onChange={(val: string) => setFormData({ ...formData, phone: val })}
                                placeholder="09..."
                                icon={Phone}
                            />
                            <ModalInputField 
                                label="Email cá nhân" 
                                value={formData.emailPersonal} 
                                onChange={(val: string) => setFormData({ ...formData, emailPersonal: val })}
                                placeholder="email@..."
                                icon={Mail}
                            />
                            <ModalTextareaField 
                                label="Nơi ở hiện nay (Tạm trú)" 
                                value={formData.address} 
                                onChange={(val: string) => setFormData({ ...formData, address: val })}
                                placeholder="Địa chỉ tạm trú..."
                            />
                            <ModalTextareaField 
                                label="Hộ khẩu thường trú" 
                                value={formData.permanentAddress} 
                                onChange={(val: string) => setFormData({ ...formData, permanentAddress: val })}
                                placeholder="Địa chỉ thường trú..."
                            />
                        </div>
                    </div>

                    {/* section: Ngân hàng (Editable) */}
                    <div className="space-y-6">
                        <ModalSectionHeader title="Tài khoản thụ hưởng & Ngân hàng" color="bg-slate-900" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <ModalInputField 
                                label="Tên ngân hàng" 
                                value={formData.bankName} 
                                onChange={(val: string) => setFormData({ ...formData, bankName: val })}
                                placeholder="Ví dụ: Vietcombank"
                                icon={Landmark}
                            />
                            <ModalInputField 
                                label="Chi nhánh ngân hàng" 
                                value={formData.bankBranch} 
                                onChange={(val: string) => setFormData({ ...formData, bankBranch: val })}
                                placeholder="Ví dụ: Chi nhánh Hà Nội"
                                icon={MapPinned}
                            />
                            <ModalInputField 
                                label="Chủ tài khoản" 
                                value={formData.bankAccountName} 
                                onChange={(val: string) => setFormData({ ...formData, bankAccountName: val })}
                                placeholder="HO TEN CHU TK"
                                icon={User}
                            />
                            <ModalInputField 
                                label="Số tài khoản" 
                                value={formData.bankAccountNumber} 
                                onChange={(val: string) => setFormData({ ...formData, bankAccountNumber: val })}
                                placeholder="Số tài khoản..."
                                icon={CreditCard}
                            />
                        </div>
                    </div>

                    {/* Footer / Actions */}
                    <div className="flex items-center justify-end gap-6 pt-4">
                        <button 
                            onClick={handleReset}
                            className="text-[14px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                        >
                            Hủy bỏ các thay đổi
                        </button>
                        <button 
                            onClick={handleSaveTrigger}
                            disabled={saving}
                            className={cn(
                                "flex items-center gap-2 px-10 py-5 bg-[#0F4C81] text-white rounded-2xl text-[14px] font-black uppercase tracking-widest transition-all",
                                saving ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-900 shadow-xl shadow-blue-900/20 active:scale-95"
                            )}
                        >
                            <Save size={18} />
                            Xác nhận cập nhật hồ sơ
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Confirm Modal */}
            {isPasswordModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-50">
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">Xác thực danh tính</h2>
                            <button 
                                onClick={() => setIsPasswordModalOpen(false)}
                                className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
                                <Lock className="text-blue-600" size={28} />
                            </div>
                            <p className="text-sm font-medium text-slate-600 text-center leading-relaxed">
                                Để bảo vệ thông tin cá nhân và tài chính, vui lòng nhập mật khẩu tài khoản của bạn để xác nhận cập nhật.
                            </p>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mật khẩu của bạn</label>
                                <div className="relative">
                                    <input 
                                        type="password"
                                        className="w-full px-5 py-4 bg-slate-50 border-transparent rounded-2xl text-[14px] font-bold text-slate-800 outline-none focus:bg-white focus:ring-4 focus:ring-blue-600/10 transition-all border border-transparent focus:border-blue-600/20"
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && executeSaveWithVerification()}
                                        autoFocus
                                    />
                                    <Shield className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                                </div>
                                {authError && (
                                    <p className="text-[11px] font-bold text-red-500 mt-2 pl-1 animate-bounce text-center">{authError}</p>
                                )}
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button 
                                    onClick={() => setIsPasswordModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl text-[13px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                                >
                                    Bỏ qua
                                </button>
                                <button 
                                    disabled={verifyingPassword}
                                    onClick={executeSaveWithVerification}
                                    className="flex-1 px-6 py-4 bg-[#0F4C81] text-white rounded-2xl text-[13px] font-black uppercase tracking-widest hover:bg-blue-900 shadow-xl shadow-blue-900/10 transition-all flex items-center justify-center gap-2"
                                >
                                    {verifyingPassword ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                                    {verifyingPassword ? "Đang kiểm tra..." : "Xác nhận ngay"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
