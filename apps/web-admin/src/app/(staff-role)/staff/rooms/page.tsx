"use client";

import { useEffect, useState, useMemo } from "react";
import Cookies from "js-cookie";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Trash2,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Edit,
  X,
  Save,
  MapPin,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { CompactLecturerHeader } from "@/components/dashboard/CompactLecturerHeader";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Room {
  id: string;
  name: string;
  building: string | null;
  capacity: number;
  examCapacity: number;
  type: string;
  campus: string | null;
}

interface RoomScheduleItem {
  id: string;
  type: "LECTURE" | "EXAM";
  date: string;
  startShift: number;
  endShift: number;
  subjectName: string;
  classCode: string;
  courseClassId?: string;
  note: string | null;
  hasConflict?: boolean;
  conflicts?: string[];
}

export default function RoomsPage() {
  const token = Cookies.get("admin_accessToken") || "";
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : undefined;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [schedule, setSchedule] = useState<RoomScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "";
    text: string;
  }>({
    type: "",
    text: "",
  });

  const [formData, setFormData] = useState<Partial<Room>>({
    name: "",
    building: "",
    campus: "",
    capacity: 50,
    examCapacity: 30,
    type: "THEORY",
  });

  useEffect(() => {
    const userCookie = Cookies.get("admin_user");
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch {
        setUser(null);
      }
    }
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/rooms", { headers: authHeaders });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Không thể tải danh sách phòng.");
      setRooms(Array.isArray(data) ? data : []);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRooms();
  }, [token]);

  const filteredRooms = useMemo(() => {
    return rooms.filter(
      (room) =>
        room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.building?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        room.campus?.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [rooms, searchQuery]);

  const scheduleConflictCount = useMemo(
    () => schedule.filter((item) => item.hasConflict).length,
    [schedule],
  );

  const handleOpenModal = (room?: Room) => {
    if (room) {
      setSelectedRoom(room);
      setFormData(room);
    } else {
      setSelectedRoom(null);
      setFormData({
        name: "",
        building: "",
        campus: "",
        capacity: 50,
        examCapacity: 30,
        type: "THEORY",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = selectedRoom ? `/api/rooms/${selectedRoom.id}` : "/api/rooms";
    const method = selectedRoom ? "PUT" : "POST";

    const payload = {
      ...formData,
      capacity: Number(formData.capacity),
      examCapacity: Number(formData.examCapacity),
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Thao tác thất bại.");
      }

      setMessage({
        type: "success",
        text: selectedRoom ? "Đã cập nhật phòng." : "Đã tạo phòng mới.",
      });
      setIsModalOpen(false);
      void fetchRooms();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;

    try {
      const response = await fetch(`/api/rooms/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Không thể xóa phòng.");
      }

      setMessage({ type: "success", text: "Đã xóa phòng." });
      void fetchRooms();
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
    }
  };

  const handleViewSchedule = async (room: Room) => {
    setSelectedRoom(room);
    setIsScheduleOpen(true);
    setScheduleLoading(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}/schedule`, {
        headers: authHeaders,
      });

      let data;
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Phản hồi không hợp lệ từ server: ${response.status}`);
      }

      if (!response.ok)
        throw new Error(data.message || `Lỗi server (${response.status})`);
      setSchedule(data);
    } catch (error: any) {
      setMessage({ type: "error", text: error.message });
      setSchedule([]); // Clear schedule on error
    } finally {
      setScheduleLoading(false);
    }
  };

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] space-y-4 bg-slate-50 px-1 pb-16 text-slate-700">
      <CompactLecturerHeader
        userName={user?.fullName || "Cán bộ Đào tạo"}
        userId={`CB-${user?.username || "UNETI"}`}
        minimal
        title="Quản lý Phòng học & Địa điểm"
        onSemesterChange={() => {}}
        selectedSemesterId={""}
        semesterOptions={[]}
        semesterFilter="all"
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 px-3">
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tổng số phòng
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rooms.length}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              <Building2 size={16} />
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Hệ thống ghi nhận trên toàn cơ sở.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Phòng lý thuyết
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {rooms.filter((r) => r.type === "THEORY").length}
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-blue-50 text-blue-500">
              <BookOpen size={16} />
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Dành cho giảng dạy và thi tự luận.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Hội trường / Sân
              </p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">
                {
                  rooms.filter(
                    (r) => r.type !== "THEORY" && r.type !== "PRACTICE",
                  ).length
                }
              </p>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-amber-50 text-amber-500">
              <Sparkles size={16} />
            </div>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Phục vụ thi đông người hoặc thi thể chất.
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-white px-4 py-3 text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-all group"
        >
          <Plus
            size={24}
            className="mb-1 group-hover:scale-110 transition-transform"
          />
          <span className="text-[11px] font-bold uppercase tracking-wider">
            Thêm phòng mới
          </span>
        </button>
      </div>

      <section className="mx-3 space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Tra cứu nhanh
            </p>
            <div className="mt-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên phòng, tòa nhà, cơ sở..."
                className="w-full min-w-[320px] pl-10 pr-4 py-2 rounded-md border border-slate-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {message.text && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg border px-4 py-2 shadow-sm animate-in fade-in",
                message.type === "success"
                  ? "bg-emerald-50 border-emerald-100 text-emerald-900"
                  : "bg-rose-50 border-rose-100 text-rose-900",
              )}
            >
              {message.type === "success" ? (
                <CheckCircle2 size={14} />
              ) : (
                <AlertCircle size={14} />
              )}
              <p className="text-[11px] font-bold">{message.text}</p>
            </div>
          )}
        </div>

        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead className="sticky top-0 z-10 bg-white border-b border-slate-100">
              <tr className="text-left">
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Tên phòng
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Tòa nhà / Cơ sở
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                  Loại phòng
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 text-center">
                  Sức chứa học
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 text-center">
                  Sức chứa thi
                </th>
                <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-4">
                      <div className="h-4 bg-slate-50 rounded" />
                    </td>
                  </tr>
                ))
              ) : filteredRooms.length > 0 ? (
                filteredRooms.map((room) => (
                  <tr
                    key={room.id}
                    className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors group"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Building2 size={14} />
                        </div>
                        <span className="text-[13px] font-black text-slate-900">
                          {room.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-bold text-slate-700">
                          {room.building || "—"}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                          {room.campus || "Cơ sở UNETI"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          "inline-flex px-2 py-0.5 rounded-sm border text-[10px] font-black uppercase tracking-wider",
                          room.type === "THEORY"
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : room.type === "PRACTICE"
                              ? "bg-purple-50 text-purple-700 border-purple-100"
                              : "bg-slate-50 text-slate-600 border-slate-200",
                        )}
                      >
                        {room.type === "THEORY"
                          ? "Lý thuyết"
                          : room.type === "PRACTICE"
                            ? "Thực hành"
                            : "Khác"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-600">
                        <Users size={12} className="text-slate-300" />
                        {room.capacity}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="inline-flex items-center gap-1.5 text-[12px] font-black text-blue-700 bg-blue-50 px-2 py-1 rounded italic border border-blue-100">
                        <CheckCircle2 size={12} />
                        {room.examCapacity}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewSchedule(room)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Xem lịch sử dụng"
                        >
                          <Calendar size={14} />
                        </button>
                        <button
                          onClick={() => handleOpenModal(room)}
                          className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                          title="Chỉnh sửa"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(room.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-slate-400 text-xs font-bold italic tracking-wider"
                  >
                    Không tìm thấy phòng nào phù hợp với yêu cầu tra cứu của
                    bạn.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal CRUD Room */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900 italic underline decoration-blue-500 underline-offset-4">
                {selectedRoom ? "Chỉnh sửa phòng" : "Thêm phòng mới"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Tên phòng *
                </label>
                <input
                  required
                  type="text"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none font-medium"
                  placeholder="Ví dụ: P.201, Hội trường A"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Tòa nhà
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none"
                    placeholder="Ví dụ: Nhà A, Khu B"
                    value={formData.building || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, building: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Cơ sở
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none"
                    value={formData.campus || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, campus: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Loại phòng
                </label>
                <select
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none appearance-none bg-white font-medium"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({ ...formData, type: e.target.value })
                  }
                >
                  <option value="THEORY">Phòng lý thuyết</option>
                  <option value="PRACTICE">Phòng thực hành</option>
                  <option value="EXAM_HALL">Hội trường</option>
                  <option value="SPORTS">Sân / Bãi</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">
                    Sức chứa học *
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none font-bold"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-blue-700 font-black italic tracking-tight">
                    Sức chứa thi *
                  </label>
                  <input
                    required
                    type="number"
                    className="w-full px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/50 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm outline-none font-black italic tabular-nums text-blue-900"
                    value={formData.examCapacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        examCapacity: parseInt(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 rounded-2xl h-12 text-sm font-bold uppercase tracking-wide border-2"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-slate-900 hover:bg-black rounded-2xl h-12 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-slate-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Drawer */}
      {isScheduleOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-[4px] animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-slate-200">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-600" />
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight italic uppercase">
                  Lịch phòng: {selectedRoom?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 font-bold flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> {selectedRoom?.building} •{" "}
                  <MapPin className="w-3 h-3" /> {selectedRoom?.campus}
                </p>
                {scheduleConflictCount > 0 && (
                  <p className="mt-3 inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Phát hiện {scheduleConflictCount} mục đang chồng ca trong
                    cùng phòng
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsScheduleOpen(false)}
                className="p-2 border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:border-slate-400 transition-all bg-slate-50 shadow-sm"
              >
                <X className="w-5 h-5 transition-transform hover:rotate-90 duration-300" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              {scheduleLoading ? (
                <div className="flex flex-col items-center justify-center h-40 space-y-4">
                  <div className="relative">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                    <div className="absolute inset-0 bg-blue-600/10 rounded-full blur-xl animate-pulse" />
                  </div>
                  <span className="text-sm font-black text-slate-400 italic tracking-widest uppercase animate-pulse">
                    Đang nạp dữ liệu...
                  </span>
                </div>
              ) : schedule.length > 0 ? (
                <div className="space-y-8 relative">
                  <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-slate-200/50" />

                  {Array.from(new Set(schedule.map((s) => s.date))).map(
                    (date) => (
                      <div key={date} className="space-y-4 relative z-10">
                        <div className="flex items-center gap-4">
                          <div className="min-w-[48px] h-[48px] rounded-2xl bg-slate-900 border-4 border-white flex flex-col items-center justify-center text-white shadow-xl">
                            <span className="text-[10px] font-black leading-none uppercase">
                              {new Date(date).toLocaleDateString("vi-VN", {
                                month: "short",
                              })}
                            </span>
                            <span className="text-lg font-black leading-none">
                              {new Date(date).getDate()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <div className="text-sm font-black text-slate-900 tracking-tight italic">
                              {new Date(date).toLocaleDateString("vi-VN", {
                                weekday: "long",
                              })}
                            </div>
                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                              {new Date(date).toLocaleDateString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-4 pl-14">
                          {schedule
                            .filter((s) => s.date === date)
                            .map((item) => (
                              <div
                                key={item.id}
                                className={cn(
                                  "p-5 rounded-3xl border-2 transition-all flex flex-col gap-3 relative overflow-hidden group hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200/50",
                                  item.type === "EXAM"
                                    ? "bg-yellow-50 border-yellow-200 shadow-sm shadow-yellow-100/60"
                                    : "bg-white border-slate-200 shadow-sm shadow-slate-100/50",
                                  item.hasConflict &&
                                    "border-rose-300 bg-rose-50 shadow-rose-100/70",
                                )}
                              >
                                {item.type === "EXAM" && (
                                  <div className="absolute top-0 right-0 px-4 py-1.5 bg-yellow-200 text-yellow-800 text-[10px] font-black uppercase rounded-bl-2xl shadow-sm italic tracking-widest">
                                    Lịch thi
                                  </div>
                                )}
                                {item.hasConflict && (
                                  <div className="absolute top-0 left-0 px-4 py-1.5 bg-rose-500 text-white text-[10px] font-black uppercase rounded-br-2xl shadow-sm tracking-widest">
                                    Trùng ca
                                  </div>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1.5 flex-1">
                                    <div className="text-sm font-black text-slate-900 leading-snug group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                                      {item.subjectName}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 rounded-lg px-2 py-1 inline-block">
                                        {item.classCode}
                                      </div>
                                      {item.type === "LECTURE" && item.courseClassId ? (
                                        <Link
                                          href={`/staff/courses/${item.courseClassId}`}
                                          className="text-[9px] font-black uppercase tracking-widest text-uneti-blue transition-colors hover:text-slate-900"
                                        >
                                          Xem học phần
                                        </Link>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end shrink-0">
                                    <div className="text-xs font-black bg-slate-900 border-2 border-slate-900 text-white px-3 py-1.5 rounded-2xl shadow-lg shadow-slate-200 flex items-center gap-1.5">
                                      <Calendar className="w-3 h-3" />
                                      <span>
                                        T{item.startShift} - T{item.endShift}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {item.note && (
                                  <div className="text-[12px] text-slate-500 font-medium italic bg-slate-50/50 p-3 rounded-2xl border border-dashed border-slate-200">
                                    {item.note}
                                  </div>
                                )}
                                {item.hasConflict &&
                                  item.conflicts &&
                                  item.conflicts.length > 0 && (
                                    <div className="rounded-2xl border border-rose-200 bg-white/80 p-3 text-[11px] font-bold text-rose-700">
                                      Trùng với: {item.conflicts.join(", ")}
                                    </div>
                                  )}
                              </div>
                            ))}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center space-y-6">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 relative">
                    <Calendar className="w-10 h-10" />
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="space-y-2 max-w-[240px]">
                    <p className="text-slate-900 font-black italic uppercase tracking-tighter text-lg underline decoration-blue-500 decoration-4 underline-offset-8">
                      Phòng trống băng
                    </p>
                    <p className="text-slate-400 text-xs font-bold italic tracking-wide">
                      Thời gian này chưa có bất kỳ lịch học hay lịch thi nào
                      được ghi nhận tại phòng.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
