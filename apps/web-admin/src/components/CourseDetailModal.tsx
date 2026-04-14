import { Book, Users, Calendar, MapPin, CheckCircle2, Clock, Edit3, Trash2 } from "lucide-react";
import Modal from "@/components/modal";

interface CourseDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    course: any;
    onEdit?: (course: any) => void;
    onDelete?: (id: string) => void;
    onManage?: (id: string) => void;
}

export default function CourseDetailModal({ isOpen, onClose, course, onEdit, onDelete, onManage }: CourseDetailModalProps) {
    if (!course) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Chi tiết học phần"
            maxWidth="2xl"
        >
            <div className="space-y-8">
                {/* Header Profile */}
                <div className="flex items-start gap-6 p-6 bg-slate-50 rounded-[30px]">
                    <div className="w-16 h-16 bg-uneti-blue rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-uneti-blue/20">
                        <Book size={32} />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-uneti-blue/10 text-uneti-blue text-[10px] font-black rounded-lg uppercase tracking-wider">
                                {course.subject?.code || "N/A"}
                            </span>
                            <span className="text-[11px] font-bold text-slate-400">
                                {course.subject?.credits || 0} Tín chỉ
                            </span>
                        </div>
                        <h2 className="text-[20px] font-black text-slate-800 leading-tight">
                            {course.subject?.name || course.name}
                        </h2>
                        <p className="text-[13px] font-bold text-slate-500">
                            Mã lớp: <span className="font-mono text-uneti-blue">{course.code}</span>
                        </p>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-2">
                    <div className="p-4 bg-white border border-slate-100 rounded-[25px] space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Users size={12} /> Sĩ số
                        </p>
                        <p className="text-[16px] font-black text-slate-800">{course.currentSlots}/{course.maxSlots}</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-[25px] space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Clock size={12} /> Số tiết
                        </p>
                        <p className="text-[16px] font-black text-slate-800">{course.totalPeriods} Tiết</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-[25px] space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle2 size={12} /> Trạng thái
                        </p>
                        <p className="text-[13px] font-black text-emerald-500 uppercase">{course.status === 'OPEN' ? 'Đang mở' : 'Đã khóa'}</p>
                    </div>
                    <div className="p-4 bg-white border border-slate-100 rounded-[25px] space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Calendar size={12} /> Học kỳ
                        </p>
                        <p className="text-[14px] font-black text-slate-800">{course.semester?.name || course.semesterCode || "N/A"}</p>
                    </div>
                </div>

                {/* Logistics */}
                <div className="space-y-4 px-2">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Thông tin điều hành</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-4 p-5 bg-slate-50 border border-transparent rounded-[25px] hover:border-slate-200 transition-all">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                <Users size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Giảng viên</p>
                                <p className="text-[14px] font-bold text-slate-800">{course.lecturer?.fullName || "Chưa phân công"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 bg-slate-50 border border-transparent rounded-[25px] hover:border-slate-200 transition-all">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                                <MapPin size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Địa điểm</p>
                                <p className="text-[14px] font-bold text-slate-800">
                                    Cơ sở {course.subject?.department?.faculty?.name || course.subject?.department?.faculty?.code || "N/A"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-3 px-2">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Mô tả học phần</h3>
                    <div className="p-6 bg-slate-50 border border-transparent rounded-[30px] min-h-[100px]">
                        <p className="text-[13px] leading-relaxed text-slate-600 font-medium">
                            {course.subject?.description || "Không có mô tả chi tiết cho học phần này."}
                        </p>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 px-2 pt-2 border-t border-slate-50 mt-4">
                    <button 
                        onClick={() => onManage?.(course.id)}
                        className="flex-[1.5] flex items-center justify-center gap-2 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[20px] font-black transition-all text-[13px] shadow-lg shadow-indigo-100 uppercase tracking-widest"
                    >
                         Quản lý học phần
                    </button>
                    <button 
                        onClick={() => onEdit?.(course)}
                        className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[20px] font-bold transition-all"
                    >
                        <Edit3 size={18} />
                    </button>
                    <button 
                        onClick={() => onDelete?.(course.id)}
                        className="p-3.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-[20px] font-bold transition-all"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>
        </Modal>
    );
}
