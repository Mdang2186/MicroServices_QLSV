"use client";

import { useState, useEffect } from "react";
import { X, Plus, Save, Trash2, CreditCard, Calendar, Info, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FixedFeeConfigDialogProps {
  onClose: () => void;
  academicYear?: number;
}

export default function FixedFeeConfigDialog({ onClose, academicYear }: FixedFeeConfigDialogProps) {
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    feeName: "",
    feeCode: "",
    amount: 0,
    academicYear: academicYear || new Date().getFullYear(),
    isMandatory: true,
    displayOrder: 100,
    dueDate: "",
  });

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/students/tuition/fixed-fee-configs${academicYear ? `?academicYear=${academicYear}` : ""}`);
      const data = await res.json();
      setConfigs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, [academicYear]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.feeName || !formData.amount) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/students/tuition/fixed-fee-configs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...formData, id: isEditing.id } : formData),
      });
      if (res.ok) {
        setIsEditing(null);
        setFormData({
          feeName: "",
          feeCode: "",
          amount: 0,
          academicYear: academicYear || new Date().getFullYear(),
          isMandatory: true,
          displayOrder: 100,
          dueDate: "",
        });
        fetchConfigs();
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message || "Không thể lưu cấu hình"}`);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối máy chủ");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc muốn xóa cấu hình này?")) return;
    try {
      const res = await fetch(`/api/students/tuition/fixed-fee-configs/${id}`, { method: "DELETE" });
      if (res.ok) fetchConfigs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white w-full max-w-5xl shadow-2xl flex flex-col max-h-[90vh] rounded-[32px] overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <CreditCard size={20} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cấu hình khoản thu cố định</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-0.5">Năm học {academicYear || 'Tất cả'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-rose-500 bg-white p-2 rounded-full shadow-sm border border-slate-100 transition-all"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Form */}
          <div className="w-full lg:w-[350px] p-8 border-r border-slate-100 bg-slate-50/30 overflow-y-auto">
            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Plus size={14} /> {isEditing ? "Cập nhật khoản thu" : "Thêm khoản thu mới"}
            </h4>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Tên khoản thu</label>
                <input 
                  type="text" 
                  value={formData.feeName}
                  onChange={e => setFormData({...formData, feeName: e.target.value})}
                  placeholder="Vd: Bảo hiểm y tế 2026"
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Mã phí</label>
                  <input 
                    type="text" 
                    value={formData.feeCode}
                    onChange={e => setFormData({...formData, feeCode: e.target.value})}
                    placeholder="BHYT2026"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Số tiền (đ)</label>
                  <input 
                    type="number" 
                    value={formData.amount}
                    onChange={e => setFormData({...formData, amount: Number(e.target.value)})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-black text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Hạn nộp (Tùy chọn)</label>
                <input 
                  type="date" 
                  value={formData.dueDate}
                  onChange={e => setFormData({...formData, dueDate: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[12px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm">
                <input 
                  type="checkbox" 
                  id="isMandatory"
                  checked={formData.isMandatory}
                  onChange={e => setFormData({...formData, isMandatory: e.target.checked})}
                  className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <label htmlFor="isMandatory" className="text-[11px] font-black text-slate-600 uppercase tracking-widest cursor-pointer">Bắt buộc đóng</label>
              </div>

              <button 
                onClick={handleSave}
                disabled={!formData.feeName || !formData.amount || isSaving}
                className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-[20px] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isSaving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                {isEditing ? (isSaving ? "Đang cập nhật..." : "Cập nhật") : (isSaving ? "Đang lưu..." : "Lưu cấu hình")}
              </button>
              
              {isEditing && (
                <button 
                  onClick={() => {
                    setIsEditing(null);
                    setFormData({
                      feeName: "",
                      feeCode: "",
                      amount: 0,
                      academicYear: academicYear || new Date().getFullYear(),
                      isMandatory: true,
                      displayOrder: 100,
                      dueDate: "",
                    });
                  }}
                  className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </div>

          {/* Right: List */}
          <div className="flex-1 p-8 overflow-y-auto">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Danh sách đã thiết lập</h4>
            
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Đang tải cấu hình...</span>
              </div>
            ) : configs.length === 0 ? (
              <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                <Info size={48} />
                <span className="text-[11px] font-black uppercase tracking-widest">Chưa có khoản thu nào được cấu hình cho năm này</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {configs.map(config => (
                  <div key={config.id} className="group bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-xl hover:shadow-slate-200/40 transition-all border-l-4 border-l-indigo-500">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-[13px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{config.feeName}</div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{config.feeCode}</div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setIsEditing(config);
                            setFormData({
                              feeName: config.feeName,
                              feeCode: config.feeCode || "",
                              amount: config.amount,
                              academicYear: config.academicYear,
                              isMandatory: config.isMandatory,
                              displayOrder: config.displayOrder || 100,
                              dueDate: config.dueDate ? new Date(config.dueDate).toISOString().split('T')[0] : "",
                            });
                          }}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <Save size={14} />
                        </button>
                        <button 
                          onClick={() => handleDelete(config.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                      <div className="text-lg font-black text-slate-900">{config.amount.toLocaleString()} <span className="text-[10px] font-light opacity-40">đ</span></div>
                      {config.dueDate && (
                        <div className="flex items-center gap-1.5 text-rose-500 py-1 px-3 bg-rose-50 rounded-lg">
                          <Calendar size={10} />
                          <span className="text-[9px] font-black uppercase tracking-widest">{new Date(config.dueDate).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
