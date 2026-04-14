"use client";
import React from "react";
import { X, BookOpen, Info, ShieldCheck, Zap, ArrowRight, MessageSquare, Save } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

interface OperationalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OperationalGuideModal({ isOpen, onClose }: OperationalGuideModalProps) {
  if (!isOpen) return null;

  const sections = [
    {
      title: "1. Triết lý Vận hành: \"Lập một lần - Dùng mãi mãi\"",
      icon: <BookOpen className="text-indigo-600" size={18} />,
      content: "Để tránh làm mất dữ liệu hoặc phải nhập liệu thủ công mỗi năm, hệ thống chia dữ liệu làm 2 lớp: \n- **Lớp Khung (Blueprint):** Lộ trình chuẩn (ví dụ: CNTT kỳ 1 học môn A, B). \n- **Lớp Thực thi (Instance):** Kế hoạch thực tế cho từng Khóa (ví dụ: K19 kỳ 5)."
    },
    {
      title: "2. Quy trình 4 Bước Lập kế hoạch An toàn",
      icon: <ArrowRight className="text-emerald-600" size={18} />,
      steps: [
        { label: "Bước 1: Lọc đối tượng mục tiêu", text: "Chọn Khoa/Ngành và Khóa sinh viên (Cohort) để xác định đúng chương trình đào tạo." },
        { label: "Bước 2: Duyệt Cây thư mục", text: "Giao diện phân cấp: Khóa > Năm học > Học kỳ > Môn học > Lớp học phần." },
        { label: "Bước 3: Kế thừa & Kích hoạt", text: "Nhấn \"Kế thừa từ Khung chuẩn\" để copy môn học từ bảng Curriculum sang CourseClass." },
        { label: "Bước 4: Tự động hóa Lịch học", text: "Cấu hình số buổi/tuần và nhấn \"Tạo lịch tự động\". Hệ thống tự tìm phòng trống và giảng viên." }
      ]
    },
    {
      title: "3. Các tiện ích & Bảo vệ Dữ liệu",
      icon: <ShieldCheck className="text-amber-600" size={18} />,
      items: [
        "**Chống ghi đè:** Hệ thống bỏ qua các môn đã có lịch dạy thay vì ghi đè.",
        "**Tự động đẩy Sinh viên:** Tự động đăng ký toàn bộ sinh viên trong khóa vào lớp học phần.",
        "**Logic Remainder+1:** Tự động gộp các tiết học dư vào tuần cuối cùng của kỳ học."
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-[40px] w-full max-w-2xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col border border-slate-100">
        {/* Header */}
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Hướng dẫn Vận hành</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Hệ thống Lập kế hoạch Đào tạo Thông minh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2.5 hover:bg-white rounded-2xl border border-transparent hover:border-slate-200 transition-all text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {sections.map((section, idx) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  {section.icon}
                </div>
                <h4 className="text-sm font-black text-slate-800">{section.title}</h4>
              </div>

              {section.content && (
                <div className="pl-11 pr-4">
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line" dangerouslySetInnerHTML={{ __html: section.content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }} />
                </div>
              )}

              {section.steps && (
                <div className="pl-11 space-y-4 border-l-2 border-slate-50 ml-4 pb-2">
                  {section.steps.map((step, sIdx) => (
                    <div key={sIdx} className="relative pl-7">
                      <div className="absolute left-[-5px] top-1.5 w-2 h-2 rounded-full bg-slate-200" />
                      <p className="text-[11px] font-black text-indigo-600 uppercase tracking-wider mb-1">{step.label}</p>
                      <p className="text-xs text-slate-600">{step.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {section.items && (
                <div className="pl-11 grid grid-cols-1 gap-3">
                  {section.items.map((item, iIdx) => (
                    <div key={iIdx} className="flex gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50">
                      <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-slate-600 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-900">$1</strong>') }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="bg-indigo-600 rounded-[32px] p-6 text-white text-center relative overflow-hidden shadow-xl shadow-indigo-100">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500 rounded-full blur-2xl opacity-50" />
            <p className="text-xs font-bold mb-2">Ghi chú quan trọng</p>
            <p className="text-[11px] opacity-90 leading-relaxed">
              Luôn nhấn nút <strong className="font-black underline">"Lưu Blueprint"</strong> sau khi thay đổi khung đào tạo chung để đảm bảo tính kế thừa cho các khóa sau.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                <ShieldCheck size={14} />
                Hệ thống an toàn dữ liệu UNETI V2.1
            </div>
            <button
                onClick={onClose}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
                Đã hiểu
            </button>
        </div>
      </div>
    </div>
  );
}
