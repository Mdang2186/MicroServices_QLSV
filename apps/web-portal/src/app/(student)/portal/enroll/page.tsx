"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import {
    BookOpen,
    CheckCircle2,
    AlertCircle,
    Clock,
    Search,
    ChevronRight,
    Calendar,
    Layers,
    Info,
    Check,
    X,
    Plus
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SubjectStatus {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    credits: number;
    suggestedSemester: number;
    isMandatory: boolean;
    isPassed: boolean;
    isEnrolled: boolean;
    isEligible: boolean;
    missingPrereqs: string[];
}

interface CourseClass {
    id: string;
    code: string;
    name: string;
    maxSlots: number;
    currentSlots: number;
    lecturer?: {
        fullName: string;
    };
    schedules: {
        dayOfWeek: number;
        startShift: number;
        endShift: number;
        room?: {
            name: string;
        };
    }[];
}

export default function EnrollPage() {
    const [status, setStatus] = useState<SubjectStatus[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSemester, setSelectedSemester] = useState<number | 'all'>('all');
    const [selectedSubject, setSelectedSubject] = useState<SubjectStatus | null>(null);
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [registering, setRegistering] = useState<string | null>(null);
    const [studentId, setStudentId] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem("student_user");
        if (userStr) {
            const user = JSON.parse(userStr);
            // Try profileId first (new), then fallback to id if we haven't re-logged in
            // But EnrollmentService needs studentId. 
            // If profileId is missing, we might need a workaround or tell user to re-login.
            if (user.profileId) {
                setStudentId(user.profileId);
            } else {
                // Workaround: In a real app we'd fetch profileId from userId
                // For this session, we'll try to use the id and let the backend throw if it's not a studentId
                // Or we can try to find the studentId via an API if we had one.
                setStudentId(user.id);
            }
        }
    }, []);

    useEffect(() => {
        if (studentId) {
            fetchStatus();
        }
    }, [studentId]);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/api/enrollments/registration-status/${studentId}`);
            setStatus(res.data);
        } catch (err) {
            console.error("Failed to fetch registration status", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClasses = async (subject: SubjectStatus) => {
        try {
            setLoadingClasses(true);
            setSelectedSubject(subject);
            const res = await api.get(`/api/enrollments/subject/${subject.subjectId}/classes`);
            setClasses(res.data);
        } catch (err) {
            console.error("Failed to fetch classes", err);
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleRegister = async (classId: string) => {
        try {
            setRegistering(classId);
            setMessage(null);
            await api.post("/api/enrollments", { studentId, classId });
            setMessage({ type: 'success', text: 'Đăng ký môn học thành công!' });
            fetchStatus(); // Refresh status
            // Refresh classes slots
            if (selectedSubject) fetchClasses(selectedSubject);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || 'Đăng ký thất bại. Vui lòng thử lại.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setRegistering(null);
        }
    };

    const semesters = Array.from(new Set(status.map(s => s.suggestedSemester))).sort((a, b) => a - b);

    const filteredStatus = status.filter(s =>
        selectedSemester === 'all' || s.suggestedSemester === selectedSemester
    );

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[#003366]">Đăng ký học phần</h1>
                    <p className="text-gray-500 text-sm">Chọn môn học từ chương trình khung để đăng ký lớp</p>
                </div>
                <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm">
                    <button
                        onClick={() => setSelectedSemester('all')}
                        className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedSemester === 'all' ? 'bg-[#003366] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        Tất cả
                    </button>
                    {semesters.map(sem => (
                        <button
                            key={sem}
                            onClick={() => setSelectedSemester(sem)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${selectedSemester === sem ? 'bg-[#003366] text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            HK {sem}
                        </button>
                    ))}
                </div>
            </div>

            {message && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-xl border flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}
                >
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span className="font-medium">{message.text}</span>
                    <button onClick={() => setMessage(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Subject List */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-gray-50/50 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <BookOpen className="w-5 h-5 text-[#003366]" />
                                Danh sách môn học
                            </h2>
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{filteredStatus.length} môn học</span>
                        </div>

                        {loading ? (
                            <div className="p-12 flex flex-col items-center justify-center gap-4">
                                <div className="w-10 h-10 border-4 border-[#003366]/20 border-t-[#003366] rounded-full animate-spin"></div>
                                <p className="text-gray-400 text-sm font-medium">Đang tải dữ liệu...</p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredStatus.map((subject) => (
                                    <div
                                        key={subject.subjectId}
                                        onClick={() => !subject.isPassed && fetchClasses(subject)}
                                        className={`px-6 py-4 flex items-center justify-between transition-all cursor-pointer ${selectedSubject?.subjectId === subject.subjectId ? 'bg-blue-50/50 border-l-4 border-l-[#003366]' : 'hover:bg-gray-50 border-l-4 border-l-transparent'
                                            } ${subject.isPassed ? 'opacity-60 grayscale' : ''}`}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs font-bold text-[#003366] px-1.5 py-0.5 bg-blue-50 rounded italic">{subject.subjectCode}</span>
                                                <h3 className="font-semibold text-gray-900 truncate">{subject.subjectName}</h3>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {subject.credits} tín chỉ</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Học kỳ {subject.suggestedSemester}</span>
                                                {subject.isMandatory ? (
                                                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">Bắt buộc</span>
                                                ) : (
                                                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">Tự chọn</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {subject.isPassed && (
                                                <span className="flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                                                    <Check className="w-3 h-3" /> ĐÃ ĐẠT
                                                </span>
                                            )}
                                            {subject.isEnrolled && (
                                                <span className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-bold shadow-sm shadow-blue-200">
                                                    ĐÃ ĐĂNG KÝ
                                                </span>
                                            )}
                                            {!subject.isPassed && !subject.isEnrolled && (
                                                subject.isEligible ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[10px] font-bold">
                                                        ĐỦ ĐIỀU KIỆN
                                                    </span>
                                                ) : (
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className="px-3 py-1 bg-red-50 text-red-600 border border-red-100 rounded-full text-[10px] font-bold">
                                                            CHƯA ĐỦ ĐIỀU KIỆN
                                                        </span>
                                                        <span className="text-[9px] text-red-400">Thiếu: {subject.missingPrereqs.join(', ')}</span>
                                                    </div>
                                                )
                                            )}
                                            <ChevronRight className={`w-5 h-5 text-gray-300 transition-transform ${selectedSubject?.subjectId === subject.subjectId ? 'rotate-90 text-[#003366]' : ''}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Class Selection Drawer-like Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border shadow-sm sticky top-6">
                        <div className="px-6 py-4 border-b bg-gray-50/50">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2">
                                <Search className="w-5 h-5 text-[#003366]" />
                                Lớp học phần
                            </h2>
                        </div>

                        <div className="p-6">
                            {!selectedSubject ? (
                                <div className="text-center py-12 space-y-4">
                                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                                        <Info className="w-8 h-8 text-gray-300" />
                                    </div>
                                    <div>
                                        <p className="text-gray-800 font-semibold">Chưa chọn môn học</p>
                                        <p className="text-gray-400 text-xs mt-1">Vui lòng chọn môn học bên trái để xem danh sách lớp đang mở</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 leading-tight">{selectedSubject.subjectName}</h3>
                                        <p className="text-xs text-gray-500 mt-1 font-medium">{selectedSubject.subjectCode} • {selectedSubject.credits} tín chỉ</p>
                                    </div>

                                    {loadingClasses ? (
                                        <div className="py-20 flex flex-col items-center justify-center gap-3">
                                            <div className="w-8 h-8 border-3 border-[#003366]/20 border-t-[#003366] rounded-full animate-spin"></div>
                                            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">Đang tìm lớp...</p>
                                        </div>
                                    ) : classes.length === 0 ? (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                                            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                                            <p className="text-amber-800 text-sm font-bold">Không có lớp mở</p>
                                            <p className="text-amber-700/60 text-xs mt-1">Hiện tại không có lớp học phần nào đang mở cho môn học này.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {classes.map((cls) => (
                                                <div key={cls.id} className="group relative rounded-xl border border-gray-100 bg-gray-50/30 p-4 transition-all hover:bg-white hover:border-blue-200 hover:shadow-md">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <div>
                                                            <div className="text-xs font-black text-[#003366] mb-0.5 tracking-tight">{cls.code}</div>
                                                            <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                                                                <User className="w-3 h-3" />
                                                                {cls.lecturer?.fullName || 'Chưa xếp GV'}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`text-xs font-bold ${cls.currentSlots >= cls.maxSlots ? 'text-red-600' : 'text-emerald-600'}`}>
                                                                {cls.currentSlots}/{cls.maxSlots}
                                                            </div>
                                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">Số lượng</div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-4 bg-white rounded-lg p-2 border border-gray-100/50">
                                                        {cls.schedules.map((sch, idx) => (
                                                            <div key={idx} className="flex items-center gap-3 text-xs">
                                                                <div className="w-12 py-0.5 bg-gray-100 rounded text-center font-bold text-gray-600">Thứ {sch.dayOfWeek}</div>
                                                                <div className="flex-1 text-gray-500 font-medium">
                                                                    Tiết {sch.startShift}-{sch.endShift} • {sch.room?.name || 'TBA'}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button
                                                        onClick={() => handleRegister(cls.id)}
                                                        disabled={registering !== null || cls.currentSlots >= cls.maxSlots}
                                                        className={`w-full py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 ${cls.currentSlots >= cls.maxSlots
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'bg-[#003366] text-white hover:bg-[#004488] active:scale-[0.98]'
                                                            }`}
                                                    >
                                                        {registering === cls.id ? (
                                                            <>
                                                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                                ĐANG ĐĂNG KÝ...
                                                            </>
                                                        ) : cls.currentSlots >= cls.maxSlots ? (
                                                            'LỚP ĐÃ ĐẦY'
                                                        ) : (
                                                            <>
                                                                <Plus className="w-3 h-3" />
                                                                ĐĂNG KÝ NGAY
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
