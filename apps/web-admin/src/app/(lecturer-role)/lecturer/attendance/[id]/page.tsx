"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useParams, useRouter } from "next/navigation";
import {
    Calendar as CalendarIcon,
    Save,
    AlertCircle,
    CheckCircle2,
    Search,
    Info,
    CheckSquare,
    SearchX,
    ChevronLeft,
    ChevronRight,
    Zap,
    QrCode,
    X,
    MapPin,
    ShieldCheck,
    Clock3,
    UserCheck,
    UserX,
    AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { io, Socket } from "socket.io-client";

export default function LecturerAttendancePage() {
    const { id: classId } = useParams();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [courseClass, setCourseClass] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<"ALL" | "PRESENT" | "ABSENT_EXCUSED" | "ABSENT_UNEXCUSED">("ALL");
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [isQrModalOpen, setIsQrModalOpen] = useState(false);
    const [qrCodeData, setQrCodeData] = useState<{ otp: string, sessionId: string; radiusMeters?: number; hasLocationAnchor?: boolean } | null>(null);
    const [geoAnchor, setGeoAnchor] = useState<{ latitude: number; longitude: number; accuracyMeters?: number } | null>(null);
    const [geoError, setGeoError] = useState("");
    const [qrLiveFeed, setQrLiveFeed] = useState<any[]>([]);
    const [socket, setSocket] = useState<Socket | null>(null);
    const [recentlyScanId, setRecentlyScanId] = useState<string | null>(null);
    const [showConfirmSave, setShowConfirmSave] = useState(false);
    const [pendingSaveData, setPendingSaveData] = useState<any[]>([]);

    const parseAttendanceNote = (note?: string | null) => {
        if (!note) return { manualNote: "", meta: {} as any };
        try {
            const parsed = JSON.parse(note);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return {
                    manualNote: `${parsed.manualNote || ""}`,
                    meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
                };
            }
        } catch {
            // Legacy plain text note
        }
        return { manualNote: `${note}`, meta: {} as any };
    };

    const normalizeAttendance = (attendance: any) => {
        if (!attendance) return null;
        const parsed = parseAttendanceNote(attendance.note);
        return {
            ...attendance,
            note: parsed.manualNote,
            ...parsed.meta,
        };
    };

    const getCurrentPosition = () =>
        new Promise<GeolocationPosition>((resolve, reject) => {
            if (typeof navigator === "undefined" || !navigator.geolocation) {
                reject(new Error("Thiết bị không hỗ trợ định vị."));
                return;
            }

            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            });
        });

    const formatAttendanceMethod = (attendance: any) => {
        if (!attendance?.method) return "Thủ công";
        if (attendance.method === "QR_GEO") return "QR + GPS";
        if (attendance.method === "QR") return "QR";
        return "Thủ công";
    };

    const toYYYYMMDD = (d: Date) => {
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    const isDateInSchedule = (checkDate: Date) => {
        if (!courseClass?.sessions) return false;
        return courseClass.sessions.some((s: any) => new Date(s.date).toDateString() === checkDate.toDateString());
    };

    const getPeriodsForDate = (checkDate: Date) => {
        if (!courseClass?.sessions) return 0;
        const sessions = courseClass.sessions.filter((s: any) => new Date(s.date).toDateString() === checkDate.toDateString());
        return sessions.reduce((acc: number, s: any) => acc + Number(s.endShift) - Number(s.startShift) + 1, 0);
    };

    const currentSession = courseClass?.sessions?.find((s: any) => {
        const sessionDate = new Date(s.date).toISOString().split('T')[0];
        const selectedDate = new Date(date).toISOString().split('T')[0];
        return sessionDate === selectedDate;
    });
    const currentSessionId = currentSession?.id;

    useEffect(() => {
        if (!isQrModalOpen || !currentSessionId) return;
        let cancelled = false;
        let newSocket: Socket | null = null;
        let interval: ReturnType<typeof setInterval> | null = null;

        setQrCodeData(null);
        setGeoError("");
        setGeoAnchor(null);
        setQrLiveFeed([]);

        const connectSocket = (anchor?: { latitude?: number; longitude?: number; accuracyMeters?: number } | null) => {
            newSocket = io("http://localhost:3004", {
                transports: ['websocket'],
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
            });
            setSocket(newSocket);

            const emitOtp = () => {
                if (newSocket?.connected) {
                    newSocket.emit("generate_otp", {
                        sessionId: currentSessionId,
                        latitude: anchor?.latitude,
                        longitude: anchor?.longitude,
                        accuracyMeters: anchor?.accuracyMeters,
                        radiusMeters: 150,
                    });
                }
            };

            newSocket.on('connect', emitOtp);

            newSocket.on('connect_error', (err) => {
                console.error("Socket connect error:", err);
                setGeoError("Không thể kết nối đến máy chủ điểm danh. Đang thử lại...");
            });

            newSocket.on('otp_generated', (res: any) => {
                setQrCodeData(res.data);
                setGeoError(""); // Clear any previous connection errors
            });

            newSocket.on('student_scanned', (data: any) => {
                setEnrollments(prev => prev.map(e =>
                    e.id === data.enrollmentId
                        ? {
                            ...e,
                            currentStatus: 'PRESENT',
                            currentAttendance: {
                                ...(e.currentAttendance || {}),
                                status: 'PRESENT',
                                method: data.method,
                                markedAt: data.markedAt,
                                distanceMeters: data.distanceMeters,
                                isLocationVerified: data.isLocationVerified,
                            },
                        }
                        : e
                ));
                setRecentlyScanId(data.enrollmentId);
                setTimeout(() => setRecentlyScanId(null), 3000);
                setQrLiveFeed((prev) => [
                    {
                        studentName: data.studentName,
                        studentCode: data.studentCode,
                        distanceMeters: data.distanceMeters,
                        markedAt: data.markedAt,
                    },
                    ...prev,
                ].slice(0, 5));
                setMessage({
                    text: `${data.studentName || "Sinh viên"} đã điểm danh thành công.`,
                    type: "success",
                });
                setTimeout(() => setMessage({ text: "", type: "" }), 3000);
            });

            interval = setInterval(emitOtp, 10000);
        };

        (async () => {
            try {
                const position = await getCurrentPosition();
                if (cancelled) return;

                const anchor = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracyMeters: position.coords.accuracy,
                };
                setGeoAnchor(anchor);
                connectSocket(anchor);
            } catch (error: any) {
                if (!cancelled) {
                    setGeoError((error?.message || "Không lấy được vị trí hiện tại của giảng viên.") + " QR vẫn được phát nhưng sẽ không kiểm tra GPS.");
                    connectSocket(null);
                }
            }
        })();

        return () => {
            cancelled = true;
            if (interval) clearInterval(interval);
            newSocket?.disconnect();
        };
    }, [isQrModalOpen, currentSessionId]);

    const TOKEN = Cookies.get("lecturer_accessToken") || Cookies.get("admin_accessToken");

    useEffect(() => {
        const c = Cookies.get("lecturer_user") || Cookies.get("admin_user");
        if (c) try { setUser(JSON.parse(c)); } catch { }
    }, []);

    useEffect(() => {
        if (!classId || !TOKEN) return;

        const fetchData = async () => {
            try {
                const [enrollmentRes, classRes] = await Promise.all([
                    fetch(`/api/enrollments/admin/classes/${classId}/enrollments`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    }),
                    fetch(`/api/courses/classes/${classId}`, {
                        headers: { Authorization: `Bearer ${TOKEN}` }
                    })
                ]);

                if (enrollmentRes.ok && classRes.ok) {
                    const data = await enrollmentRes.json();
                    const classData = await classRes.json();
                    setCourseClass(classData);

                    const transformed = data.map((e: any) => {
                        const existingAtt = normalizeAttendance(e.attendances?.find((a: any) => a.date.startsWith(date)));
                        return {
                            ...e,
                            currentStatus: existingAtt?.status || "PRESENT",
                            note: existingAtt?.note || "",
                            currentAttendance: existingAtt || null,
                        };
                    });
                    setEnrollments(transformed);
                }
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId, TOKEN, date]);

    const handleStatusChange = (enrollmentId: string, status: string) => {
        setEnrollments(prev => prev.map(e =>
            e.id === enrollmentId ? { ...e, currentStatus: status } : e
        ));
    };

    const handleSaveRequest = () => {
        // Mark unattended students as ABSENT_UNEXCUSED before saving
        const prepared = enrollments.map(e => {
            if (e.currentStatus === 'PRESENT' && !e.currentAttendance) {
                return { ...e, currentStatus: 'ABSENT_UNEXCUSED' };
            }
            return e;
        });
        const willMarkAbsent = prepared.filter(e => e.currentStatus === 'ABSENT_UNEXCUSED' && !enrollments.find(orig => orig.id === e.id && orig.currentStatus === 'ABSENT_UNEXCUSED')).length;
        if (willMarkAbsent > 0) {
            setPendingSaveData(prepared);
            setShowConfirmSave(true);
        } else {
            doSave(prepared);
        }
    };

    const doSave = async (data: any[]) => {
        setSaving(true);
        setShowConfirmSave(false);
        setMessage({ text: "", type: "" });

        // Update UI state immediately
        setEnrollments(data);

        try {
            const body = {
                date,
                classId,
                sessionId: currentSessionId,
                method: "MANUAL",
                attendances: data.map(e => ({
                    enrollmentId: e.id,
                    status: e.currentStatus,
                    note: e.note
                }))
            };

            const res = await fetch(`/api/enrollments/attendance/bulk`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const savedAt = new Date().toISOString();
                setEnrollments((prev) =>
                    prev.map((item) => ({
                        ...item,
                        currentAttendance: {
                            ...(item.currentAttendance || {}),
                            status: item.currentStatus,
                            note: item.note,
                            method: item.currentAttendance?.method || "MANUAL",
                            markedAt: item.currentAttendance?.markedAt || savedAt,
                            isLocationVerified: item.currentAttendance?.isLocationVerified || false,
                        },
                    }))
                );

                // Send notifications to students
                const subjectName = courseClass?.subject?.name || courseClass?.name || 'Môn học';
                const dateStr = new Date(date).toLocaleDateString('vi-VN');
                for (const e of data) {
                    const userId = e.student?.user?.id || e.student?.userId;
                    if (!userId) continue;
                    const statusLabel = e.currentStatus === 'PRESENT' ? 'Có mặt'
                        : e.currentStatus === 'ABSENT_EXCUSED' ? 'Vắng có phép'
                        : 'Vắng không phép';
                    fetch('/api/notifications', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
                        body: JSON.stringify({
                            userId,
                            title: `Điểm danh: ${subjectName}`,
                            content: `Giảng viên đã cập nhật điểm danh ngày ${dateStr}. Trạng thái của bạn: ${statusLabel}.`,
                            type: 'ATTENDANCE',
                        }),
                    }).catch(() => {});
                }

                setMessage({ text: `Đã lưu điểm danh cho ${data.length} sinh viên. Thông báo đã được gửi.`, type: "success" });
                setTimeout(() => setMessage({ text: "", type: "" }), 4000);
            } else {
                throw new Error("Lỗi khi lưu dữ liệu");
            }
        } catch (error) {
            setMessage({ text: "Có lỗi xảy ra, vui lòng thử lại.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    const currentPeriods = getPeriodsForDate(new Date(date));

    const filtered = enrollments.filter(e => {
        const matchesSearch = e.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.student?.studentCode?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "ALL" || e.currentStatus === filterStatus;
        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 md:p-8 space-y-6 bg-[#fbfcfd]">


            {/* Compact Action Bar */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center justify-between gap-6">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-[9px] font-black text-uneti-blue uppercase tracking-[0.2em] mb-1">
                        <Zap size={12} />
                        <span>Thông tin học phần</span>
                    </div>
                    <h1 className="text-sm font-black text-slate-800 uppercase tracking-tight truncate">
                        {courseClass?.name || courseClass?.subject?.name}
                    </h1>
                    <div className="flex items-center gap-3 mt-1 underline decoration-uneti-blue/20 decoration-2 underline-offset-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase italic leading-none">{courseClass?.code}</span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter leading-none">{courseClass?.semester?.name}</span>
                    </div>
                </div>

                <div className="flex items-center gap-8 shrink-0">
                    {(() => {
                        const total = enrollments.length;
                        const excused = enrollments.filter(e => e.currentStatus === 'ABSENT_EXCUSED').length;
                        const unexcused = enrollments.filter(e => e.currentStatus === 'ABSENT_UNEXCUSED').length;
                        const present = total - excused - unexcused;
                        const rate = total > 0 ? Math.round((present / total) * 100) : 0;

                        return (
                            <>
                                <div className="flex flex-col items-end">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Tỷ lệ chuyên cần</p>
                                    <div className="flex items-center gap-2">
                                        <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600" style={{ width: `${rate}%` }} />
                                        </div>
                                        <span className="text-sm font-black text-slate-800 tabular-nums">{rate}%</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Thông tin vắng</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-black text-rose-600 tabular-nums">{unexcused}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">KP</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-black text-emerald-600 tabular-nums">{excused}</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase">CP</span>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    <div className="relative" onClick={(e) => { e.stopPropagation(); setIsCalendarOpen(!isCalendarOpen); }}>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 text-right">Ngày học</p>
                        <div className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-slate-100">
                            <CalendarIcon size={14} className="text-indigo-500" />
                            <span className="text-sm font-black text-slate-800">{new Date(date).toLocaleDateString('vi-VN')}</span>
                        </div>
                        {isCalendarOpen && (
                            <div className="absolute top-full right-0 mt-2 z-50 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 w-[280px]" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16} /></button>
                                    <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider">Tháng {viewDate.getMonth() + 1}, {viewDate.getFullYear()}</span>
                                    <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={16} /></button>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                    {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                        <div key={d} className="text-[9px] font-black text-slate-300 uppercase">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: 42 }).map((_, i) => {
                                        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
                                        const startIdx = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
                                        const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), i - startIdx + 1);
                                        const isSelected = toYYYYMMDD(d) === date;
                                        const isCurrentMonth = d.getMonth() === viewDate.getMonth();
                                        const hasSchedule = isDateInSchedule(d);

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => { if (isCurrentMonth) { setDate(toYYYYMMDD(d)); setIsCalendarOpen(false); } }}
                                                className={cn(
                                                    "aspect-square flex flex-col items-center justify-center rounded-xl text-[11px] font-bold cursor-pointer relative transition-all",
                                                    !isCurrentMonth && "text-slate-100 cursor-default",
                                                    isCurrentMonth && isSelected && "bg-indigo-600 text-white shadow-xl scale-110 z-10",
                                                    isCurrentMonth && !isSelected && "hover:bg-indigo-50 text-slate-600"
                                                )}
                                            >
                                                {d.getDate()}
                                                {hasSchedule && isCurrentMonth && (
                                                    <div className={cn("h-1 w-1 rounded-full absolute bottom-1", isSelected ? "bg-white" : "bg-indigo-500 animate-pulse")}></div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {currentSessionId && (
                            <Button
                                onClick={() => setIsQrModalOpen(true)}
                                variant="outline"
                                className="h-10 px-4 text-xs font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm rounded-xl uppercase tracking-wider transition-all flex items-center gap-2 mr-2"
                            >
                                <QrCode size={16} />
                                QR Điểm danh
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            onClick={() => router.back()}
                            className="h-9 px-3 text-[10px] font-black text-slate-400 hover:text-slate-600 hover:bg-slate-50 uppercase tracking-widest transition-all"
                        >
                            Quay lại
                        </Button>
                        <Button
                            onClick={handleSaveRequest}
                            disabled={saving}
                            className="h-10 px-6 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100/50 rounded-xl uppercase tracking-wider transition-all active:scale-95 flex items-center gap-2"
                        >
                            {saving ? <div className="h-4 w-4 animate-spin border-2 border-white/20 border-t-white rounded-full" /> : <Save size={16} />}
                            Lưu kết quả
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Table Card */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-180px)] min-h-[500px]">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-30">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Danh sách lớp học</h2>
                            {!currentSessionId && (
                                <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter flex items-center gap-1 mt-0.5">
                                    <AlertCircle size={10} /> Không có lịch học hôm nay
                                </span>
                            )}
                        </div>

                        <div className="hidden lg:flex items-center gap-1 p-1 bg-slate-50 rounded-xl border border-slate-100">
                            {[
                                { id: "ALL", label: "Tất cả", color: "indigo" },
                                { id: "ABSENT_EXCUSED", label: "Nghỉ có phép", color: "emerald" },
                                { id: "ABSENT_UNEXCUSED", label: "Không phép", color: "rose" }
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => setFilterStatus(opt.id as any)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        filterStatus === opt.id
                                            ? `bg-white text-${opt.color}-600 shadow-sm`
                                            : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="relative w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm sinh viên..."
                            className="w-full pl-12 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-y-auto flex-1 scrollbar-hide">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 bg-white z-20 shadow-sm">
                            <tr className="bg-slate-50/80 backdrop-blur-sm">
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">STT</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Thông tin cá nhân</th>
                                <th className="py-4 px-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Lớp hành chính</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-slate-500 uppercase tracking-widest w-36">Trạng thái</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-emerald-600 uppercase tracking-widest w-36 underline decoration-emerald-100 decoration-2 underline-offset-4">Nghỉ có phép</th>
                                <th className="py-4 px-4 text-center text-[9px] font-black text-rose-600 uppercase tracking-widest w-36 underline decoration-rose-100 decoration-2 underline-offset-4">Không phép</th>
                                <th className="py-4 px-8 text-left text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Ghi chú</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((e, idx) => {
                                const isScanned = recentlyScanId === e.id;
                                const hasAttendance = !!e.currentAttendance;
                                const status = e.currentStatus;
                                return (
                                <tr key={e.id} className={cn(
                                    "border-b border-slate-50 transition-all group",
                                    isScanned ? "bg-emerald-50 animate-pulse" : "hover:bg-slate-50/30"
                                )}>
                                    <td className="py-4 px-8">
                                        <span className="text-[11px] font-black text-slate-200 tabular-nums">{(idx + 1).toString().padStart(2, '0')}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-9 w-9 rounded-xl border-2 flex items-center justify-center text-[11px] font-black shadow-sm transition-all",
                                                isScanned ? "bg-emerald-500 border-emerald-400 text-white" : "bg-white border-slate-100 text-slate-400 group-hover:rotate-6 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-100"
                                            )}>
                                                {e.student?.fullName?.charAt(0)}
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="text-xs font-black text-slate-800 tracking-tight">{e.student?.fullName}</p>
                                                <p className="text-[10px] font-bold text-indigo-600 bg-indigo-100/50 px-2 py-0.5 rounded uppercase w-fit">{e.student?.studentCode}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 font-black text-slate-500 text-[11px]">
                                        {e.student?.adminClass?.code || "N/A"}
                                    </td>
                                    {/* Status Badge Column */}
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            {status === 'PRESENT' && hasAttendance ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black uppercase tracking-tight">
                                                    <UserCheck size={11} />
                                                    Có mặt
                                                    {e.currentAttendance?.method?.startsWith('QR') && (
                                                        <span className="ml-1 px-1 rounded bg-indigo-100 text-indigo-600">QR</span>
                                                    )}
                                                </span>
                                            ) : status === 'PRESENT' && !hasAttendance ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 text-[9px] font-black uppercase tracking-tight">
                                                    <AlertTriangle size={11} />
                                                    Chưa ĐD
                                                </span>
                                            ) : status === 'ABSENT_UNEXCUSED' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-tight">
                                                    <UserX size={11} />
                                                    Vắng KP
                                                </span>
                                            ) : status === 'ABSENT_EXCUSED' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 text-[9px] font-black uppercase tracking-tight">
                                                    <CheckSquare size={11} />
                                                    Vắng CP
                                                </span>
                                            ) : null}
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT_EXCUSED' ? 'PRESENT' : 'ABSENT_EXCUSED')}
                                                className={cn(
                                                    "h-7 w-7 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm",
                                                    e.currentStatus === 'ABSENT_EXCUSED'
                                                        ? "bg-emerald-600 border-emerald-600 text-white"
                                                        : "bg-white border-slate-200 hover:border-emerald-400 text-transparent"
                                                )}
                                            >
                                                <CheckSquare size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex justify-center">
                                            <button
                                                onClick={() => handleStatusChange(e.id, e.currentStatus === 'ABSENT_UNEXCUSED' ? 'PRESENT' : 'ABSENT_UNEXCUSED')}
                                                className={cn(
                                                    "h-7 w-7 rounded-xl border-2 transition-all flex items-center justify-center shadow-sm",
                                                    e.currentStatus === 'ABSENT_UNEXCUSED'
                                                        ? "bg-rose-600 border-rose-600 text-white"
                                                        : "bg-white border-slate-200 hover:border-rose-400 text-transparent"
                                                )}
                                            >
                                                <CheckSquare size={16} strokeWidth={3} />
                                            </button>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                placeholder="Thêm lý do vắng..."
                                                className="w-full bg-slate-50/50 border border-slate-200 rounded-xl px-3 py-2 text-[10px] font-bold text-slate-600 focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none transition-all shadow-inner"
                                                value={e.note || ""}
                                                onChange={(ev) => {
                                                    const val = ev.target.value;
                                                    setEnrollments(prev => prev.map(enr =>
                                                        enr.id === e.id ? { ...enr, note: val } : enr
                                                    ));
                                                }}
                                            />
                                            {e.currentAttendance && (
                                                <div className="flex flex-wrap gap-1.5 text-[9px] font-bold">
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                                        {formatAttendanceMethod(e.currentAttendance)}
                                                    </span>
                                                    {e.currentAttendance?.markedAt && (
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 flex items-center gap-1">
                                                            <Clock3 size={9} />
                                                            {new Date(e.currentAttendance.markedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                                        </span>
                                                    )}
                                                    {e.currentAttendance?.isLocationVerified && (
                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center gap-1">
                                                            <ShieldCheck size={9} />
                                                            GPS{typeof e.currentAttendance?.distanceMeters === "number" ? ` ${Math.round(e.currentAttendance.distanceMeters)}m` : ""}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>);
                            })}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                            <SearchX size={48} className="text-slate-200 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
                                Không tìm thấy dữ liệu tìm kiếm
                            </p>
                        </div>
                    )}
                </div>

                <div className="px-10 py-5 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest sticky bottom-0 bg-white z-30">
                    <span>Thời gian thực: {new Date().toLocaleTimeString('vi-VN')}</span>
                    <div className="flex items-center gap-2 text-indigo-500">
                        <Info size={14} strokeWidth={3} />
                        <span>Nhấn 'Lưu kết quả' để đồng bộ dữ liệu</span>
                    </div>
                </div>
            </div>

            {/* Confirm Save Dialog */}
            <AnimatePresence>
                {showConfirmSave && (
                    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-slate-100"
                        >
                            <div className="flex flex-col items-center text-center">
                                <div className="h-14 w-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                                    <AlertTriangle size={28} className="text-rose-500" />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-2">Xác nhận lưu điểm danh</h3>
                                <p className="text-[11px] text-slate-500 font-bold leading-relaxed mb-6">
                                    {pendingSaveData.filter(e => e.currentStatus === 'ABSENT_UNEXCUSED' && !enrollments.find(orig => orig.id === e.id && orig.currentStatus === 'ABSENT_UNEXCUSED')).length} sinh viên chưa điểm danh sẽ bị đánh <span className="text-rose-600">Vắng không phép</span>. Bạn có thể bỏ dấu tích trước khi lưu nếu sinh viên có mặt.
                                </p>
                                <div className="flex gap-3 w-full">
                                    <Button
                                        variant="ghost"
                                        className="flex-1 h-10 text-xs font-black text-slate-500 hover:bg-slate-50 rounded-xl border border-slate-200"
                                        onClick={() => { setShowConfirmSave(false); setPendingSaveData([]); }}
                                    >
                                        Hủy
                                    </Button>
                                    <Button
                                        className="flex-1 h-10 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                                        onClick={() => doSave(pendingSaveData)}
                                    >
                                        <Save size={14} className="mr-1.5" /> Xác nhận lưu
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Toast message */}
            <AnimatePresence>
                {message.text && (
                    <motion.div
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 40 }}
                        className={cn(
                            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-black",
                            message.type === 'success' ? "bg-emerald-600 text-white border-emerald-700" : "bg-rose-600 text-white border-rose-700"
                        )}
                    >
                        {message.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {message.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {isQrModalOpen && (
                <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full relative flex flex-col items-center justify-center animate-in zoom-in-95 duration-200 border border-slate-100">
                        <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 p-2 bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all">
                            <X size={20} />
                        </button>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <QrCode size={18} className="text-indigo-600" /> QR Điểm Danh
                        </h3>
                        <p className="text-[10px] text-slate-500 font-bold uppercase mb-6 text-center leading-relaxed">
                            Yêu cầu sinh viên dùng Web Portal để quét mã này.<br />Mã sẽ tự động làm mới mỗi 10 giây.
                        </p>

                        <div className="w-full mb-4 space-y-3">
                            <div className={cn(
                                "rounded-2xl border px-4 py-3 text-[11px] font-bold",
                                geoError
                                    ? "border-rose-200 bg-rose-50 text-rose-600"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            )}>
                                {geoError ? (
                                    geoError
                                ) : (
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={13} />
                                            Vị trí giảng viên đã khóa
                                        </span>
                                        {geoAnchor?.accuracyMeters ? (
                                            <span className="text-emerald-600/80">Sai số {Math.round(geoAnchor.accuracyMeters)}m</span>
                                        ) : null}
                                        <span className="text-emerald-600/80">Bán kính {qrCodeData?.radiusMeters || 150}m</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border-2 border-indigo-50 rounded-2xl shadow-inner relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                                {currentSessionId ? (
                                    qrCodeData ? (
                                        <QRCodeSVG value={JSON.stringify({ ...qrCodeData, type: 'UNETI_ATTENDANCE' })} size={240} fgColor="#3730A3" />
                                    ) : (
                                        <div className="h-[240px] w-[240px] flex items-center justify-center bg-slate-50/50 rounded-xl relative">
                                            <div className="absolute inset-0 border-[3px] border-dashed border-slate-200 rounded-xl animate-[spin_10s_linear_infinite]"></div>
                                            <div className="h-8 w-8 animate-spin border-4 border-slate-200 border-t-indigo-600 rounded-full"></div>
                                        </div>
                                    )
                                ) : (
                                    <div className="h-[240px] w-[240px] flex flex-col items-center justify-center bg-rose-50/30 rounded-xl border-2 border-dashed border-rose-100 p-6 text-center">
                                        <AlertCircle size={40} className="text-rose-400 mb-3" />
                                        <p className="text-[11px] font-black text-rose-600 uppercase tracking-tighter">
                                            Không tìm thấy lịch học
                                        </p>
                                        <p className="text-[9px] font-bold text-rose-400 uppercase mt-1">
                                            QR chỉ khả dụng cho các buổi học đã được lên lịch
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100/50">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Đang phát dữ liệu trực tiếp</span>
                        </div>

                        {qrLiveFeed.length > 0 && (
                            <div className="w-full mt-4 space-y-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sinh viên vừa quét</p>
                                <div className="space-y-2">
                                    {qrLiveFeed.map((item, index) => (
                                        <div key={`${item.studentCode || item.studentName}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                                            <div>
                                                <p className="text-[11px] font-black text-slate-700">{item.studentName || "Sinh viên"}</p>
                                                <p className="text-[10px] font-bold text-slate-400">{item.studentCode || "N/A"}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-bold text-emerald-600">
                                                    {typeof item.distanceMeters === "number" ? `${item.distanceMeters}m` : "QR"}
                                                </p>
                                                <p className="text-[10px] font-bold text-slate-400">
                                                    {item.markedAt ? new Date(item.markedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
