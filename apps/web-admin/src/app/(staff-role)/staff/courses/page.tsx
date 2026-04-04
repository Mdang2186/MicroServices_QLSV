"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Cookies from "js-cookie";
import {
    Plus, Trash2, Users, Calendar, 
    BookMarked, Clock, AlertCircle, X, Search, ArrowLeft,
    Filter, Lock, AlertTriangle, Unlock, Copy, Loader2, CheckCircle2,
    Book, LayoutList
} from "lucide-react";
import { motion } from "framer-motion";
import { ScheduleRow, type ScheduleEntry } from "@/components/CourseScheduleEditor";
import { SubjectFormModal } from "@/components/SubjectFormModal";
import { ExcelImportButton } from "@/components/ExcelImportButton";
import ScheduleGrid from "@/components/ScheduleGrid";
import ScheduleCalendar from "@/components/ScheduleCalendar";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

const API = (path: string) => `/api${path}`;

// Minimalist Theme Configuration
const THEME = {
    primary: "indigo-600",
    primaryLight: "indigo-50",
    border: "slate-200",
    bg: "slate-50",
    textMain: "slate-900",
    textMuted: "slate-500",
    textSubtle: "slate-400",
    cardBg: "white",
    accent: "blue-600"
};

export default function StaffCoursesPage() {
    const TOKEN = Cookies.get("staff_accessToken");
    const headers = useMemo(() => ({ Authorization: `Bearer ${TOKEN}` }), [TOKEN]);

    // ── Master data
    const [faculties, setFaculties] = useState<any[]>([]);
    const [majors, setMajors] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [lecturers, setLecturers] = useState<any[]>([]);
    const [adminClasses, setAdminClasses] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);

    // ── Navigation state
    const [selectedSemesterId, setSelectedSemesterId] = useState<string>("");
    const [selectedFacultyId, setSelectedFacultyId] = useState<string>("");
    const [selectedMajorId, setSelectedMajorId] = useState<string>("");
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);

    // ── Form state
    const [form, setForm] = useState({
        name: "", lecturerId: "", maxSlots: 60,
        status: "OPEN", adminClassIds: [] as string[],
        schedules: [] as ScheduleEntry[]
    });
    const [formLoading, setFormLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [showAllAdminClasses, setShowAllAdminClasses] = useState(false);
    const [adminClassSearch, setAdminClassSearch] = useState("");
    const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
    const [viewTab, setViewTab] = useState<'config' | 'calendar'>('config');
    const [isCalendarView, setIsCalendarView] = useState(true);
    const [sessions, setSessions] = useState<any[]>([]);
    const [sessionLoading, setSessionLoading] = useState(false);

    // ── Session Modals
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedSession, setSelectedSession] = useState<any>(null);
    const [sessionForm, setSessionForm] = useState({
        date: format(new Date(), "yyyy-MM-dd"),
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        roomId: "",
        startShift: 1,
        endShift: 3,
        type: "THEORY",
        note: "",
        clearExisting: true
    });

    // ── Additional schedule previews
    const [lecturerSchedule, setLecturerSchedule] = useState<any[]>([]);
    const [adminClassesSchedule, setAdminClassesSchedule] = useState<any[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);

    // ── Derived
    const currentSemester = useMemo(() => semesters.find(s => s.isCurrent), [semesters]);
    const activeSemester = useMemo(() => semesters.find(s => s.id === selectedSemesterId), [semesters, selectedSemesterId]);
    const [semesterDeadline, setSemesterDeadline] = useState<string>('');

    useEffect(() => {
        if (activeSemester?.midtermGradeDeadline) {
            setSemesterDeadline(new Date(activeSemester.midtermGradeDeadline).toISOString().split('T')[0]);
        } else {
            setSemesterDeadline('');
        }
    }, [activeSemester]);

    const handleUpdateSemesterDeadline = async () => {
        if (!selectedSemesterId) return;
        setFormLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const res = await fetch(API(`/semesters/${selectedSemesterId}`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    midtermGradeDeadline: semesterDeadline ? new Date(semesterDeadline).toISOString() : null
                })
            });
            if (res.ok) {
                setSuccessMsg("Đã cập nhật hạn nhập điểm học kỳ thành công!");
                setSemesters(prev => prev.map(s => s.id === selectedSemesterId ? { ...s, midtermGradeDeadline: semesterDeadline } : s));
            } else {
                const data = await res.json().catch(() => ({}));
                setErrorMsg(data.message || "Không thể cập nhật hạn nhập điểm.");
            }
        } catch {
            setErrorMsg("Lỗi kết nối.");
        } finally { 
            setFormLoading(false); 
        }
    };

    const isLocked = useMemo(() => !!activeSemester && !activeSemester.isCurrent, [activeSemester]);

    const activeCourse = useMemo(() =>
        selectedCourseId ? courses.find(c => c.id === selectedCourseId) ?? null : null,
        [courses, selectedCourseId]);

    const filteredMajors = useMemo(() =>
        selectedFacultyId ? majors.filter(m => m.facultyId === selectedFacultyId) : majors,
        [majors, selectedFacultyId]);

    const filteredSubjects = useMemo(() => {
        let list = subjects;
        if (selectedMajorId) list = list.filter(s => s.majorId === selectedMajorId);
        else if (selectedFacultyId) list = list.filter(s => s.major?.facultyId === selectedFacultyId);
        
        if (searchTerm && !selectedFacultyId && !selectedMajorId) {
            const s = searchTerm.toLowerCase();
            list = list.filter(subj => subj.name.toLowerCase().includes(s) || subj.code.toLowerCase().includes(s));
        }
        return list;
    }, [subjects, selectedFacultyId, selectedMajorId, searchTerm]);

    const unifiedSearchResults = useMemo(() => {
        if (!searchTerm) return { subjects: [] as any[], courses: [] as any[] };
        const s = searchTerm.toLowerCase();
        
        const matchingSubjects = subjects.filter(subj => 
            subj.name.toLowerCase().includes(s) || subj.code.toLowerCase().includes(s)
        ).slice(0, 5);

        const matchingCourses = courses.filter(c => 
            c.name.toLowerCase().includes(s) || 
            c.code.toLowerCase().includes(s) ||
            ((c.adminClasses || []) as any[]).some((ac: any) => ac.code.toLowerCase().includes(s))
        ).slice(0, 10);

        return { subjects: matchingSubjects, courses: matchingCourses };
    }, [searchTerm, subjects, courses]);

    const availabilityMap = useMemo(() => {
        const map = {
            rooms: {} as Record<string, Record<number, Record<number, string>>>,
            lecturers: {} as Record<string, Record<number, Record<number, string>>>,
        };

        courses.filter(c => c.semesterId === selectedSemesterId).forEach(c => {
            if (c.id === activeCourse?.id) return;
            (c.schedules || []).forEach((s: any) => {
                const day = Number(s.dayOfWeek);
                if (s.roomId) {
                    if (!map.rooms[s.roomId]) map.rooms[s.roomId] = {};
                    if (!map.rooms[s.roomId][day]) map.rooms[s.roomId][day] = {};
                    for (let t = s.startShift; t <= s.endShift; t++) {
                        map.rooms[s.roomId][day][t] = c.name;
                    }
                }
                if (c.lecturerId || (c.lecturer && (c.lecturer.id || c.lecturerId))) {
                    const lid = c.lecturerId || c.lecturer.id;
                    if (!map.lecturers[lid]) map.lecturers[lid] = {};
                    if (!map.lecturers[lid][day]) map.lecturers[lid][day] = {};
                    for (let t = s.startShift; t <= s.endShift; t++) {
                        map.lecturers[lid][day][t] = c.name;
                    }
                }
            });
        });
        return map;
    }, [courses, selectedSemesterId, activeCourse]);

    const coursesForSubject = useMemo(() =>
        selectedSubjectId
            ? courses.filter(c => c.subjectId === selectedSubjectId && (!selectedSemesterId || c.semesterId === selectedSemesterId))
            : [],
        [courses, selectedSubjectId, selectedSemesterId]);

    const filteredLecturers = useMemo(() => {
        if (!selectedSubjectId) return lecturers;
        const subj = subjects.find(s => s.id === selectedSubjectId);
        const facultyId = subj?.major?.faculty?.id || subj?.major?.facultyId;
        return facultyId ? lecturers.filter(l => l.facultyId === facultyId) : lecturers;
    }, [lecturers, subjects, selectedSubjectId]);

    const filteredAdminClasses = useMemo(() => {
        let list = adminClasses;
        
        // 1. Initial filter by major (if not showing all)
        if (!showAllAdminClasses && selectedSubjectId) {
            const subj = subjects.find(s => s.id === selectedSubjectId);
            const majorId = subj?.majorId;
            if (majorId) list = list.filter(ac => ac.majorId === majorId);
        }

        // 2. Search filter
        if (adminClassSearch) {
            const s = adminClassSearch.toLowerCase();
            list = list.filter(ac => ac.code.toLowerCase().includes(s));
        }

        return list;
    }, [adminClasses, subjects, selectedSubjectId, showAllAdminClasses, adminClassSearch]);

    // ── Resilient Fetch Logic
    const fetchAll = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setLoading(true);
        const safeFetch = async (url: string, setter: (data: any) => void) => {
            try {
                const res = await fetch(API(url), { headers });
                if (res.ok) setter(await res.json());
                else console.warn(`API ${url} returned ${res.status}`);
            } catch (err) {
                console.error(`Failed to fetch ${url}:`, err);
            }
        };

        await Promise.allSettled([
            safeFetch("/courses/faculties", setFaculties),
            safeFetch("/courses/majors", setMajors),
            safeFetch("/semesters", (data) => {
                setSemesters(data);
                const cur = data.find((s: any) => s.isCurrent);
                if (cur && !selectedSemesterId) setSelectedSemesterId(cur.id);
            }),
            safeFetch(`/courses/subjects/by-faculty${selectedSemesterId ? `?semesterId=${selectedSemesterId}` : ''}`, setSubjects),
            safeFetch("/courses/lecturers/by-faculty", setLecturers),
            safeFetch("/admin-classes", setAdminClasses),
            safeFetch("/rooms", setRooms),
            safeFetch(`/courses${selectedSemesterId ? `?semesterId=${selectedSemesterId}` : ''}`, setCourses),
            safeFetch("/departments", setDepartments),
        ]);
        if (!isRefresh) setLoading(false);
    }, [headers, selectedSemesterId]);

    const fetchSessions = useCallback(async () => {
        if (!activeCourse) return;
        setSessionLoading(true);
        try {
            const res = await fetch(API(`/courses/${activeCourse.id}/sessions`), { headers });
            if (res.ok) setSessions(await res.json());
        } finally {
            setSessionLoading(false);
        }
    }, [activeCourse, headers]);

    useEffect(() => { 
        fetchAll(); 
    }, [fetchAll]);

    useEffect(() => {
        if (viewTab === 'calendar' && activeCourse) {
            fetchSessions();
        }
    }, [viewTab, activeCourse, fetchSessions]);

    // ── Fetch Preview Schedules
    useEffect(() => {
        const fetchPreviews = async () => {
            if (!selectedSemesterId) return;
            setPreviewLoading(true);
            try {
                if (form.lecturerId) {
                    const res = await fetch(API(`/courses/schedule/lecturer/${form.lecturerId}?semesterId=${selectedSemesterId}${activeCourse ? `&excludeId=${activeCourse.id}` : ''}`), { headers });
                    if (res.ok) setLecturerSchedule(await res.json());
                } else setLecturerSchedule([]);

                if (form.adminClassIds.length > 0) {
                    const params = new URLSearchParams();
                    form.adminClassIds.forEach(id => params.append('ids', id));
                    params.append('semesterId', selectedSemesterId);
                    if (activeCourse) params.append('excludeId', activeCourse.id);
                    const res = await fetch(API(`/courses/schedule/admin-classes?${params.toString()}`), { headers });
                    if (res.ok) setAdminClassesSchedule(await res.json());
                } else setAdminClassesSchedule([]);
            } catch (err) {
                console.error("Failed to fetch previews:", err);
            } finally {
                setPreviewLoading(false);
            }
        };
        fetchPreviews();
    }, [form.lecturerId, form.adminClassIds, selectedSemesterId, headers]);

    // ── Form population
    useEffect(() => {
        if (activeCourse) {
            setForm({
                name: activeCourse.name || "",
                lecturerId: activeCourse.lecturerId || activeCourse.lecturer?.id || "",
                maxSlots: activeCourse.capacity || activeCourse.maxSlots || 60,
                status: activeCourse.status || "OPEN",
                adminClassIds: activeCourse.adminClasses?.map((ac: any) => ac.id) || [],
                schedules: (activeCourse.schedules || []).map((s: any) => ({
                    dayOfWeek: s.dayOfWeek,
                    startShift: s.startShift,
                    endShift: s.endShift,
                    roomId: s.roomId || s.room?.id || "",
                    type: s.type || "THEORY"
                }))
            });
            setErrorMsg(null);
            setSuccessMsg(null);
            setDeleteConfirm(false);
        } else if (isCreating) {
            setForm({ name: "", lecturerId: "", maxSlots: 60, status: "OPEN", adminClassIds: [], schedules: [] });
            setErrorMsg(null);
            setSuccessMsg(null);
        }
    }, [activeCourse, isCreating]);

    const autoName = useMemo(() => {
        const subj = subjects.find(s => s.id === selectedSubjectId);
        if (!subj) return "";
        if (form.adminClassIds.length === 0) return `${subj.name}`;
        const code = adminClasses.find(ac => ac.id === form.adminClassIds[0])?.code;
        return code ? `${subj.name} - ${code}` : `${subj.name}`;
    }, [form.adminClassIds, subjects, adminClasses, selectedSubjectId]);

    const handleSubmit = async () => {
        if (!selectedSubjectId && !activeCourse) return;
        setFormLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const payload = {
                ...form,
                subjectId: selectedSubjectId || activeCourse?.subjectId,
                semesterId: selectedSemesterId,
            };

            const url = activeCourse ? API(`/courses/${activeCourse.id}`) : API("/courses");
            const method = activeCourse ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify(payload)
            });

            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                setSuccessMsg(activeCourse ? "Cập nhật thành công!" : "Tạo lớp thành công!");
                await fetchAll(true);
                if (!activeCourse) {
                    setIsCreating(false);
                    setSelectedCourseId(data.id || null);
                }
            } else {
                setErrorMsg(data.message || "Có lỗi xảy ra.");
            }
        } catch {
            setErrorMsg("Lỗi kết nối.");
        } finally { setFormLoading(false); }
    };

    const handleUnlock = async () => {
        if (!activeCourse) return;
        if (!confirm("Xác nhận mở khóa bảng điểm cho lớp này? Giảng viên sẽ có thể chỉnh sửa lại điểm.")) return;
        
        setFormLoading(true);
        try {
            const res = await fetch(`/api/grades/unlock/${activeCourse.id}`, {
                method: 'POST',
                headers
            });
            if (res.ok) {
                setSuccessMsg("Đã mở khóa bảng điểm thành công!");
                await fetchAll(true);
            } else {
                setErrorMsg("Không thể mở khóa bảng điểm.");
            }
        } catch {
            setErrorMsg("Lỗi kết nối.");
        } finally { setFormLoading(false); }
    };

    const handlePushStudents = async () => {
        if (!activeCourse) return;
        if (!confirm(`Hệ thống sẽ tự động đăng ký cho toàn bộ sinh viên từ các lớp hành chính [${activeCourse.adminClasses?.map((ac: any) => ac.code).join(", ")}] vào lớp học phần này. Tiếp tục?`)) return;
        
        setFormLoading(true);
        setErrorMsg(null);
        setSuccessMsg(null);
        try {
            const res = await fetch(API(`/courses/${activeCourse.id}/push-students`), {
                method: "POST",
                headers
            });
            const data = await res.json();
            if (res.ok) {
                const { stats } = data;
                setSuccessMsg(
                    `Đã đẩy sinh viên xong! ` +
                    (stats ? `(Thành công: ${stats.addedCount}, Đã có trước đó: ${stats.alreadyEnrolled}, Sĩ số mới: ${stats.addedCount + stats.alreadyEnrolled}/${activeCourse.maxSlots})` : data.message)
                );
                await fetchAll(true);
            } else {
                setErrorMsg(data.message || "Có lỗi xảy ra khi đẩy sinh viên.");
            }
        } catch {
            setErrorMsg("Lỗi kết nối khi đẩy sinh viên.");
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!activeCourse) return;
        setFormLoading(true);
        try {
            const res = await fetch(API(`/courses/${activeCourse.id}`), { method: "DELETE", headers });
            if (res.ok) {
                await fetchAll(true);
                setSelectedCourseId(null);
                setIsCreating(false);
            } else {
                const d = await res.json();
                setErrorMsg(d.message || "Không thể xóa lớp.");
            }
        } finally { setFormLoading(false); }
    };

    const handleDeleteSession = async (sessionId: string) => {
        if (!confirm("Xác nhận xóa buổi học này?")) return;
        setSessionLoading(true);
        try {
            const res = await fetch(API(`/courses/sessions/${sessionId}`), { method: "DELETE", headers });
            if (res.ok) {
                setSuccessMsg("Đã xóa buổi học.");
                setIsRescheduleModalOpen(false);
                fetchSessions();
            } else {
                setErrorMsg("Không thể xóa buổi học.");
            }
        } finally { setSessionLoading(false); }
    };

    const handleGenerateSessions = async (startDate: string, endDate: string, clearExisting: boolean) => {
        if (!activeCourse) return;
        if (form.schedules.length === 0) {
            alert("Vui lòng thiết lập Lịch học chi tiết (Weekly Pattern) trước khi sinh lịch.");
            return;
        }

        setFormLoading(true);
        try {
            const res = await fetch(API(`/courses/${activeCourse.id}/generate-sessions`), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    startDate: new Date(startDate),
                    endDate: new Date(endDate),
                    schedules: form.schedules,
                    clearExisting
                })
            });

            if (res.ok) {
                setSuccessMsg("Đã sinh lịch học thành công!");
                setIsGenerateModalOpen(false);
                fetchSessions();
            } else {
                const d = await res.json();
                setErrorMsg(d.message || "Lỗi khi sinh lịch.");
            }
        } catch {
            setErrorMsg("Lỗi kết nối.");
        } finally { setFormLoading(false); }
    };

    const handleSaveAndSync = async () => {
        if (!activeCourse) return;
        setFormLoading(true);
        try {
            // 1. Save pattern first
            const payload = { ...form, subjectId: activeCourse.subjectId, semesterId: selectedSemesterId };
            const saveRes = await fetch(API(`/courses/${activeCourse.id}`), {
                method: "PUT",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify(payload)
            });

            if (!saveRes.ok) {
                const d = await saveRes.json();
                throw new Error(d.message || "Lưu mẫu lịch học thất bại.");
            }

            // 2. Generate sessions
            const genRes = await fetch(API(`/courses/${activeCourse.id}/generate-sessions`), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    startDate: activeSemester?.startDate,
                    endDate: activeSemester?.endDate,
                    schedules: form.schedules,
                    clearExisting: true
                })
            });

            if (genRes.ok) {
                setSuccessMsg("Đã lưu và đồng bộ toàn bộ lịch học thành công!");
                await fetchAll(true);
                fetchSessions();
            } else {
                const d = await genRes.json();
                setErrorMsg(d.message || "Lưu mẫu thành công nhưng lỗi khi sinh lịch.");
            }
        } catch (err: any) {
            setErrorMsg(err.message || "Lỗi kết nối.");
        } finally { setFormLoading(false); }
    };

    const handleReschedule = async () => {
        if (!selectedSession) return;
        setFormLoading(true);
        try {
            const res = await fetch(API(`/courses/sessions/${selectedSession.id}/reschedule`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    date: new Date(sessionForm.date),
                    roomId: sessionForm.roomId,
                    startShift: sessionForm.startShift,
                    endShift: sessionForm.endShift,
                    note: sessionForm.note
                })
            });
            if (res.ok) {
                setSuccessMsg("Đã đổi lịch thành công.");
                setIsRescheduleModalOpen(false);
                fetchSessions();
            } else {
                const d = await res.json();
                setErrorMsg(d.message || "Không thể đổi lịch.");
            }
        } finally { setFormLoading(false); }
    };

    const handleAddManualSession = async () => {
        if (!activeCourse) return;
        setFormLoading(true);
        try {
            const res = await fetch(API(`/courses/${activeCourse.id}/manual-session`), {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({
                    date: new Date(sessionForm.date),
                    roomId: sessionForm.roomId,
                    startShift: sessionForm.startShift,
                    endShift: sessionForm.endShift,
                    type: sessionForm.type,
                    note: sessionForm.note
                })
            });
            if (res.ok) {
                setSuccessMsg("Đã thêm buổi học mới.");
                setIsManualModalOpen(false);
                fetchSessions();
            } else {
                const d = await res.json();
                setErrorMsg(d.message || "Không thể thêm buổi học.");
            }
        } finally { setFormLoading(false); }
    };


    const selectAdminClass = (id: string) => {
        setForm(p => ({
            ...p,
            adminClassIds: p.adminClassIds.includes(id) ? [] : [id]
        }));
    };

    const checkScheduleConflict = (s: ScheduleEntry, index: number) => {
        const { dayOfWeek, startShift, endShift, roomId } = s;
        if (!dayOfWeek || !startShift || !endShift) return null;

        const isOverlap = (s1: any, s2: any) => {
            return s1.dayOfWeek === s2.dayOfWeek && 
                   Math.max(s1.startShift, s2.startShift) <= Math.min(s1.endShift, s2.endShift);
        };

        // 1. Conflict with other rows in the same form
        for (let i = 0; i < form.schedules.length; i++) {
            if (i === index) continue;
            const other = form.schedules[i];
            if (isOverlap(s, other)) return `Trùng với buổi thứ ${i + 1} trong cùng lớp này`;
        }

        // 2. Conflict with Lecturer's existing schedule
        if (form.lecturerId) {
            const lecturerOverlap = lecturerSchedule.find(ls => isOverlap(s, ls));
            if (lecturerOverlap) return `Giảng viên đã có lịch dạy lớp "${lecturerOverlap.courseClass?.name}"`;
        }

        // 3. Conflict with Admin Classes' existing schedules
        if (form.adminClassIds.length > 0) {
            const adminOverlap = adminClassesSchedule.find(as => isOverlap(s, as));
            if (adminOverlap) return `Lớp hành chính đã có lịch học môn "${adminOverlap.courseClass?.subject?.name}"`;
        }

        // 4. Conflict with Room's existing schedule (from other courses)
        if (roomId) {
            for (const c of courses) {
                if (c.id === activeCourse?.id) continue;
                const roomOverlap = c.schedules?.find((rs: any) => 
                    rs.roomId === roomId && 
                    rs.dayOfWeek === dayOfWeek &&
                    Math.max(rs.startShift, startShift) <= Math.min(rs.endShift, endShift)
                );
                if (roomOverlap) return `Phòng học đã được lớp "${c.name}" sử dụng`;
            }
        }

        return null;
    };

    const addSchedule = () => setForm(p => ({
        ...p,
        schedules: [...p.schedules, { dayOfWeek: 2, startShift: 1, endShift: 3, roomId: "", type: "THEORY" }]
    }));

    const updateSchedule = (i: number, field: keyof ScheduleEntry, val: any) =>
        setForm(p => {
            const s = [...p.schedules];
            s[i] = { ...s[i], [field]: val };
            return { ...p, schedules: s };
        });

    const removeSchedule = (i: number) =>
        setForm(p => ({ ...p, schedules: p.schedules.filter((_, idx) => idx !== i) }));

    const showDetail = (selectedSubjectId && selectedCourseId) || isCreating;

    const inputCls = `w-full px-4 py-2.5 bg-white border border-${THEME.border} rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-${THEME.primary}/10 focus:border-${THEME.primary} transition-all disabled:opacity-50`;
    const labelCls = `text-[11px] font-bold text-${THEME.textMuted} uppercase tracking-wider mb-1.5 block`;

    if (loading && semesters.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-slate-400">
                <div className={`w-10 h-10 border-4 border-${THEME.bg} border-t-${THEME.primary} rounded-full animate-spin`} />
                <p className="text-xs font-bold uppercase tracking-widest">Đang tải dữ liệu...</p>
            </div>
        );
    }

    return (
        <div className={`h-[calc(100vh-140px)] flex flex-col gap-5 text-${THEME.textMain}`}>
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-indigo-900 uppercase">Quản lý Học phần & Xếp lịch</h1>
                    <p className={`text-xs text-${THEME.textMuted}`}>Thiết lập danh mục lớp học phần và tối ưu hóa thời khóa biểu</p>
                </div>
                <div className="flex items-center gap-3">
                    <ExcelImportButton 
                        semesterId={selectedSemesterId} 
                        onSuccess={() => fetchAll(true)} 
                        headers={headers} 
                    />
                    <div className="flex items-center gap-2 p-1 px-2 border border-slate-200 rounded-lg bg-indigo-50/50">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-bold text-indigo-500 uppercase tracking-tight">Hạn nhập điểm QT</span>
                            <input 
                                type="date" 
                                className="bg-transparent text-[10px] font-bold outline-none border-none p-0 h-4 w-28"
                                value={semesterDeadline}
                                onChange={e => setSemesterDeadline(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={handleUpdateSemesterDeadline}
                            className="p-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm"
                            title="Lưu hạn nhập điểm"
                        >
                            <Lock size={12} />
                        </button>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-${THEME.border} rounded-lg shadow-sm h-[42px]`}>
                        <Calendar size={14} className={`text-${THEME.primary}`} />
                        <select
                            className="bg-transparent text-xs font-bold outline-none cursor-pointer"
                            value={selectedSemesterId}
                            onChange={e => setSelectedSemesterId(e.target.value)}
                        >
                            {semesters.map(s => (
                                <option key={s.id} value={s.id}>{s.name} {s.year}{s.isCurrent ? " (Hiện tại)" : ""}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-5 min-h-0 items-stretch">
                {/* Sidebar */}
                <div className={`w-full md:w-80 flex-shrink-0 flex flex-col bg-white border border-${THEME.border} rounded-2xl overflow-hidden shadow-sm`}>
                    <div className={`p-4 border-b border-${THEME.bg} space-y-3`}>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm môn học hoặc tên lớp..."
                                    className={`w-full pl-9 pr-8 py-2 bg-${THEME.bg} border-transparent rounded-lg text-xs font-medium outline-none focus:bg-white focus:border-${THEME.primary}/20 transition-all`}
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm("")}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-slate-500 transition-colors"
                                    >
                                        <X size={12} />
                                    </button>
                                )}
                            </div>
                            <button 
                                onClick={() => setIsSubjectModalOpen(true)}
                                className={`w-9 h-9 bg-${THEME.primaryLight} text-${THEME.primary} rounded-lg flex items-center justify-center hover:bg-${THEME.primary} hover:text-white transition-all shrink-0`}
                                title="Thêm môn học mới"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                        <div className="flex gap-2">
                            <select
                                className={`flex-1 px-2 py-1.5 bg-${THEME.bg} border-transparent rounded-lg text-[11px] font-bold outline-none`}
                                value={selectedFacultyId}
                                onChange={e => { setSelectedFacultyId(e.target.value); setSelectedMajorId(""); }}
                            >
                                <option value="">Tất cả Khoa</option>
                                {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                            <select
                                className={`flex-1 px-2 py-1.5 bg-${THEME.bg} border-transparent rounded-lg text-[11px] font-bold outline-none`}
                                value={selectedMajorId}
                                onChange={e => setSelectedMajorId(e.target.value)}
                            >
                                <option value="">Tất cả Ngành</option>
                                {filteredMajors.map(m => <option key={m.id} value={m.id}>{m.code}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {searchTerm ? (
                            <div className="space-y-4">
                                {unifiedSearchResults.subjects.length > 0 && (
                                    <div>
                                        <div className="px-2 mb-2 flex items-center gap-2">
                                            <Book size={10} className="text-slate-400" />
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Môn học</span>
                                        </div>
                                        {unifiedSearchResults.subjects.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => { setSelectedSubjectId(s.id); setSelectedCourseId(null); setIsCreating(false); setSearchTerm(""); }}
                                                className={`w-full p-3 mb-1 rounded-xl text-left bg-white border border-slate-100 hover:border-indigo-200 transition-all shadow-sm`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-50 text-slate-500">{s.code}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium">{s.credits} TC</span>
                                                </div>
                                                <h3 className="text-xs font-bold text-slate-700">{s.name}</h3>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {unifiedSearchResults.courses.length > 0 && (
                                    <div>
                                        <div className="px-2 mb-2 flex items-center gap-2">
                                            <LayoutList size={10} className="text-indigo-400" />
                                            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Lớp học phần</span>
                                        </div>
                                        {unifiedSearchResults.courses.map(c => (
                                            <button
                                                key={c.id}
                                                onClick={() => { 
                                                    setSelectedSubjectId(c.subjectId); 
                                                    setSelectedCourseId(c.id); 
                                                    setIsCreating(false); 
                                                    setSearchTerm(""); 
                                                }}
                                                className={`w-full p-3 mb-1 rounded-xl text-left bg-indigo-50/30 border border-indigo-100 hover:border-indigo-300 transition-all`}
                                            >
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-600 uppercase">{c.code}</span>
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">{c.subject?.name}</span>
                                                </div>
                                                <h3 className="text-xs font-bold text-indigo-900 line-clamp-1">{c.name}</h3>
                                                <div className="flex justify-between items-center mb-1 text-[8px] font-bold text-slate-400 uppercase">
                                                    <div className="flex items-center gap-1">
                                                        <Users size={10} className="text-indigo-300" />
                                                        <span>{c._count?.enrollments || 0}/{c.maxSlots}</span>
                                                    </div>
                                                    <span className="bg-indigo-50 text-indigo-500 px-1 rounded">{c.lecturer?.fullName?.split(' ').pop()}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {unifiedSearchResults.subjects.length === 0 && unifiedSearchResults.courses.length === 0 && (
                                    <div className="py-20 text-center text-slate-300 italic text-[10px] uppercase font-bold tracking-widest">
                                        Không tìm thấy môn hoặc lớp
                                    </div>
                                )}
                            </div>
                        ) : filteredSubjects.map(s => {
                            const isActive = selectedSubjectId === s.id;
                            const count = s.classCountInSemester || 0;
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => { setSelectedSubjectId(s.id); setSelectedCourseId(null); setIsCreating(false); }}
                                    className={`w-full p-3 rounded-xl text-left transition-all ${isActive ? `bg-${THEME.primaryLight} border border-${THEME.primary}/10` : "hover:bg-slate-50 border border-transparent"}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{s.code}</span>
                                        <span className="text-[10px] text-slate-400 font-medium">{s.credits} TC</span>
                                    </div>
                                    <h3 className={`text-[13px] font-bold ${isActive ? `text-${THEME.primary}` : "text-slate-700"} line-clamp-2`}>{s.name}</h3>
                                    <div className="flex items-center gap-1.5 mt-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${count > 0 ? "bg-emerald-400" : "bg-slate-200"}`} />
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {count > 0 ? `${count} lớp học phần` : "Chưa mở lớp"}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main */}
                <div className={`flex-1 w-full bg-white border border-${THEME.border} rounded-2xl overflow-hidden flex flex-col shadow-sm min-h-full`}>
                    {showDetail ? (
                        <div className="flex-1 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className={`px-6 py-4 border-b border-${THEME.bg} flex items-center justify-between gap-4`}>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setSelectedCourseId(null); setIsCreating(false); }} className="p-2 hover:bg-slate-100 rounded-full transition-colors font-bold text-slate-500">
                                        <ArrowLeft size={18} />
                                    </button>
                                    <div>
                                        <h2 className="text-sm font-bold truncate">
                                            {activeCourse ? `Chỉnh sửa: ${activeCourse.name}` : `Mở lớp: ${subjects.find(s => s.id === selectedSubjectId)?.name}`}
                                        </h2>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            {activeCourse ? activeCourse.code : "Khởi tạo lớp học phần mới"}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!isLocked && activeCourse && (
                                        <button onClick={() => setDeleteConfirm(true)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                    {activeCourse && (
                                        <button
                                            onClick={handleUnlock}
                                            disabled={formLoading}
                                            className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-100 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all flex items-center gap-2"
                                            title="Mở khóa để giảng viên nhập lại điểm"
                                        >
                                            <Unlock size={14} /> Mở khóa điểm
                                        </button>
                                    )}
                                    {activeCourse && !isLocked && form.adminClassIds.length > 0 && (
                                        <button
                                            onClick={handlePushStudents}
                                            disabled={formLoading}
                                            className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-all flex items-center gap-2"
                                            title="Tự động ghi danh sinh viên từ các lớp danh nghĩa"
                                        >
                                            <Users size={14} /> Đẩy sinh viên
                                        </button>
                                    )}
                                    <button
                                        onClick={handleSaveAndSync}
                                        disabled={formLoading || isLocked}
                                        className={`px-5 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-md shadow-emerald-100 uppercase tracking-wider flex items-center gap-2`}
                                    >
                                        {formLoading ? "..." : <><CheckCircle2 size={14} /> Lưu & Đồng bộ</>}
                                    </button>
                                    <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 ml-2">
                                        <button
                                            onClick={() => setViewTab('config')}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewTab === 'config' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Thông tin & Lịch mẫu
                                        </button>
                                        <button
                                            onClick={() => setViewTab('calendar')}
                                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewTab === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Lịch chi tiết
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {viewTab === 'calendar' ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Quản lý buổi học trong kỳ</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
                                                <button 
                                                    onClick={() => setIsCalendarView(true)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${isCalendarView ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Lịch biểu
                                                </button>
                                                <button 
                                                    onClick={() => setIsCalendarView(false)}
                                                    className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${!isCalendarView ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Danh sách
                                                </button>
                                            </div>
                                            <div className="h-6 w-px bg-slate-200 mx-1" />
                                            <div className="flex items-center gap-3">
                                                <button 
                                                    onClick={() => {
                                                        setSessionForm(p => ({ ...p, startDate: activeSemester?.startDate ? format(new Date(activeSemester.startDate), "yyyy-MM-dd") : p.startDate, endDate: activeSemester?.endDate ? format(new Date(activeSemester.endDate), "yyyy-MM-dd") : p.endDate }));
                                                        setIsGenerateModalOpen(true);
                                                    }}
                                                    className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <Calendar size={12} /> Sinh lịch tự động
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        setSessionForm(p => ({ ...p, date: format(new Date(), "yyyy-MM-dd"), roomId: "", startShift: 1, endShift: 3, type: "THEORY", note: "" }));
                                                        setIsManualModalOpen(true);
                                                    }}
                                                    className="text-[11px] font-bold text-indigo-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <Plus size={12} /> Thêm buổi học bù / thi
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {sessionLoading ? (
                                        <div className="py-20 text-center">
                                            <Loader2 size={24} className="animate-spin mx-auto text-slate-300 mb-2" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Đang tải danh sách buổi học...</p>
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <div className="py-20 border-2 border-dashed border-slate-100 rounded-2xl text-center">
                                            <Calendar size={32} className="mx-auto mb-2 opacity-10" />
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Chưa có dữ liệu buổi học</p>
                                        </div>
                                    ) : isCalendarView ? (
                                        <ScheduleCalendar 
                                            sessions={sessions}
                                            onDateClick={(date) => {
                                                setSessionForm(p => ({ ...p, date, roomId: "", startShift: 1, endShift: 3, type: "THEORY", note: "" }));
                                                setIsManualModalOpen(true);
                                            }}
                                            onSessionClick={(s) => {
                                                setSelectedSession(s);
                                                setSessionForm({
                                                    ...sessionForm,
                                                    date: format(new Date(s.date), "yyyy-MM-dd"),
                                                    roomId: s.roomId || "",
                                                    startShift: s.startShift,
                                                    endShift: s.endShift,
                                                    note: s.note || ""
                                                });
                                                setIsRescheduleModalOpen(true);
                                            }}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 gap-3">
                                            {sessions.map((s: any) => (
                                                <div key={s.id} className="p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between group hover:border-indigo-200 transition-all">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-slate-50 rounded-lg flex flex-col items-center justify-center border border-slate-100 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                                                            <span className="text-[9px] font-black text-slate-400 uppercase leading-none mb-0.5">{format(new Date(s.date), "MMM", { locale: vi })}</span>
                                                            <span className="text-sm font-black text-slate-700 leading-none">{format(new Date(s.date), "dd")}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-0.5">
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${s.type === 'EXAM' ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                                    {s.type}
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-700">
                                                                    {format(new Date(s.date), "EEEE", { locale: vi })}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-[11px] text-slate-400 font-medium">
                                                                <span className="flex items-center gap-1"><Clock size={12} /> Tiết {s.startShift}-{s.endShift}</span>
                                                                <span className="flex items-center gap-1"><Search size={12} /> Phòng {s.room?.name || 'TBD'}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedSession(s);
                                                                setSessionForm({
                                                                    ...sessionForm,
                                                                    date: format(new Date(s.date), "yyyy-MM-dd"),
                                                                    roomId: s.roomId || "",
                                                                    startShift: s.startShift,
                                                                    endShift: s.endShift,
                                                                    note: s.note || ""
                                                                });
                                                                setIsRescheduleModalOpen(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-indigo-600 hover:text-white transition-all"
                                                        >
                                                            Đổi lịch
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteSession(s.id)}
                                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                                {errorMsg && (
                                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600 animate-in fade-in zoom-in-95">
                                        <AlertTriangle size={18} />
                                        <p className="text-xs font-bold">{errorMsg}</p>
                                        <button onClick={() => setErrorMsg(null)} className="ml-auto"><X size={14} /></button>
                                    </div>
                                )}
                                {successMsg && (
                                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3 text-emerald-600 animate-in fade-in">
                                        <CheckCircle2 size={18} />
                                        <p className="text-xs font-bold">{successMsg}</p>
                                        <button onClick={() => setSuccessMsg(null)} className="ml-auto"><X size={14} /></button>
                                    </div>
                                )}

                                {activeCourse && (
                                    <div className="bg-white border border-slate-200 rounded-2xl p-6 mb-8 shadow-sm">
                                        <div className="flex flex-wrap items-center gap-10">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                                                    <BookMarked size={24} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Mã học phần</p>
                                                    <p className="text-sm font-black text-slate-900">{activeCourse.subject?.code || 'N/A'}</p>
                                                </div>
                                            </div>

                                            <div className="h-10 w-px bg-slate-100 hidden md:block"></div>

                                            <div className="flex-1 min-w-[200px]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tỉ lệ đăng ký</p>
                                                    <span className="text-xs font-black text-slate-700">{(activeCourse._count?.enrollments || activeCourse.currentSlots || 0)}/{activeCourse.maxSlots || 60}</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, (((activeCourse._count?.enrollments || activeCourse.currentSlots || 0)) / (activeCourse.maxSlots || 60)) * 100)}%` }}
                                                        className={`h-full ${(((activeCourse._count?.enrollments || activeCourse.currentSlots || 0)) / (activeCourse.maxSlots || 60)) > 0.9 ? 'bg-rose-500' : 'bg-indigo-600'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="h-10 w-px bg-slate-100 hidden lg:block"></div>

                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Trạng thái lớp</p>
                                                <div className="flex items-center gap-2">
                                                    <div className={`h-2 w-2 rounded-full ${activeCourse.status === 'OPEN' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${activeCourse.status === 'OPEN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                        {activeCourse.status === 'OPEN' ? 'Đang mở đăng ký' : 'Lớp đã khóa'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className={labelCls}>Tên lớp học phần</label>
                                            <div className={`${inputCls} bg-slate-50 text-slate-500 font-bold border-dashed flex items-center gap-2`}>
                                                <Lock size={12} className="text-slate-300" />
                                                {autoName || activeCourse?.name || "Hệ thống tự đặt tên"}
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">* Định danh cố định dựa trên môn học và lớp hành chính</p>
                                        </div>
                                        <div>
                                            <label className={labelCls}>Giảng viên phụ trách</label>
                                            <select className={inputCls} value={form.lecturerId} onChange={e => setForm(p => ({ ...p, lecturerId: e.target.value }))} disabled={isLocked}>
                                                <option value="">-- Chưa phân công --</option>
                                                {filteredLecturers.map(l => <option key={l.id} value={l.id}>{l.fullName}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className={labelCls}>Mã lớp học phần</label>
                                                    <div className={`${inputCls} bg-slate-50 text-slate-400 border-dashed flex items-center gap-2 font-mono text-[11px]`}>
                                                        <Lock size={12} />
                                                        {activeCourse ? activeCourse.code : "Tự động sinh (CCLASS_...)"}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className={labelCls}>Trạng thái</label>
                                                    <select className={inputCls} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} disabled={isLocked}>
                                                        <option value="OPEN">Mở đăng ký</option>
                                                        <option value="LOCKED">Khóa lớp</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className={labelCls}>Sĩ số tối đa</label>
                                                <input type="number" className={inputCls} value={form.maxSlots} onChange={e => setForm(p => ({ ...p, maxSlots: parseInt(e.target.value) }))} disabled={isLocked} />
                                            </div>
                                        </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className={labelCls}>Lớp hành chính hỗ trợ ({form.adminClassIds.length})</label>
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                                <input 
                                                    type="text" 
                                                    placeholder="Tìm lớp..." 
                                                    className="pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-indigo-300 transition-all w-32"
                                                    value={adminClassSearch}
                                                    onChange={e => setAdminClassSearch(e.target.value)}
                                                />
                                            </div>
                                            <button 
                                                type="button"
                                                onClick={() => setShowAllAdminClasses(!showAllAdminClasses)}
                                                className={`text-[10px] font-black uppercase tracking-tight px-2 py-1 rounded border transition-all ${showAllAdminClasses ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}
                                            >
                                                {showAllAdminClasses ? "Đang hiện tất cả" : "Hiện tất cả"}
                                            </button>
                                        </div>
                                    </div>
                                    <div className={`p-4 bg-${THEME.bg} rounded-xl border border-${THEME.border} flex flex-wrap gap-2 shadow-inner`}>
                                        {filteredAdminClasses.map(ac => (
                                            <button
                                                key={ac.id}
                                                type="button"
                                                disabled={isLocked || !!activeCourse} // Lock if already created
                                                onClick={() => selectAdminClass(ac.id)}
                                                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${form.adminClassIds.includes(ac.id) ? `bg-${THEME.primary} border-${THEME.primary} text-white shadow-sm shadow-indigo-200` : "bg-white border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-70 disabled:cursor-not-allowed"}`}
                                            >
                                                <div className="flex flex-col items-center">
                                                    <span>{ac.code}</span>
                                                    <span className="text-[8px] opacity-60 font-black tracking-tight mt-0.5">
                                                        {ac._count?.students || 0} SV
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className={labelCls}>Lịch học chi tiết</label>
                                            {!isLocked && (
                                                <button onClick={addSchedule} className={`text-xs font-bold text-${THEME.primary} flex items-center gap-1`}>
                                                    <Plus size={14} /> Thêm buổi học
                                                </button>
                                            )}
                                        </div>
                                        <div className="space-y-3">
                                            {form.schedules.map((s, i) => (
                                                <ScheduleRow 
                                                    key={i} 
                                                    schedule={s} 
                                                    index={i} 
                                                    rooms={rooms} 
                                                    disabled={isLocked} 
                                                    conflict={checkScheduleConflict(s, i)} 
                                                    availabilityMap={availabilityMap}
                                                    onChange={updateSchedule} 
                                                    onRemove={removeSchedule} 
                                                />
                                            ))}
                                            {form.schedules.length === 0 && (
                                                <div className="p-10 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-300">
                                                    <Clock size={32} className="mx-auto mb-2 opacity-20" />
                                                    <p className="text-[10px] font-bold uppercase tracking-widest">Chưa có lịch học</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Visual Schedule Preview */}
                                    {(form.lecturerId || form.adminClassIds.length > 0) && (
                                        <div className="pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Calendar size={16} className={`text-${THEME.primary}`} />
                                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Đối soát lịch biểu (Visual Preview)</h3>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                {/* Lecturer Schedule */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lịch giảng dạy: {lecturers.find(l=>l.id===form.lecturerId)?.fullName || '...'}</span>
                                                        {previewLoading && <div className="w-3 h-3 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />}
                                                    </div>
                                                    <ScheduleGrid schedules={lecturerSchedule} color="indigo" />
                                                </div>
                                                {/* Admin Class Schedule */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">Lịch lớp hành chính: {activeCourse?.adminClasses?.map((ac: any) => ac.code).join(", ")}</span>
                                                        {previewLoading && <div className="w-3 h-3 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" />}
                                                    </div>
                                                    <ScheduleGrid schedules={adminClassesSchedule} color="emerald" />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : selectedSubjectId ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className={`px-6 py-4 border-b border-${THEME.bg} flex items-center justify-between`}>
                                <h1 className="text-sm font-bold uppercase tracking-tight text-slate-900 truncate pr-4">Học phần: {subjects.find(s => s.id === selectedSubjectId)?.name}</h1>
                                {!isLocked && (
                                    <button onClick={() => setIsCreating(true)} className={`px-4 py-2 flex-shrink-0 bg-${THEME.primary} text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm hover:opacity-90`}>
                                        <Plus size={14} /> Mở lớp mới
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {coursesForSubject.map(c => (
                                        <button key={c.id} onClick={() => setSelectedCourseId(c.id)} className={`p-4 bg-white border border-${THEME.border} rounded-xl text-left hover:border-${THEME.primary}/30 hover:shadow-md transition-all group`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-indigo-600 transition-colors uppercase">{c.code}</span>
                                                    {c.schedules?.some((s1: any, i1: number) => 
                                                        c.schedules.some((s2: any, i2: number) => 
                                                            i1 < i2 && s1.dayOfWeek === s2.dayOfWeek && 
                                                            Math.max(s1.startShift, s2.startShift) <= Math.min(s1.endShift, s2.endShift)
                                                        )
                                                    ) && (
                                                        <span className="text-[8px] font-black text-rose-500 uppercase mt-0.5 flex items-center gap-1">
                                                            <AlertTriangle size={8} /> Trùng lịch nội bộ
                                                        </span>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${c.status === "OPEN" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"}`}>{c.status}</span>
                                            </div>
                                            <h4 className="text-xs font-bold text-slate-800 line-clamp-1">{c.name}</h4>
                                            <div className="mt-3 space-y-2">
                                                <div className="flex items-center gap-1.5 text-[10px] text-indigo-600 font-bold">
                                                    <Users size={12} className="opacity-70" />
                                                    <span>GV: {c.instructor || c.lecturer?.fullName || "Chưa phân công"}</span>
                                                </div>
                                                <div className="space-y-1">
                                                    {c.schedules?.map((s: any, idx: number) => (
                                                        <div key={idx} className="flex items-center gap-1.5 text-[9px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                                            <Clock size={10} />
                                                            <span>Thứ {s.dayOfWeek === 8 ? 'CN' : s.dayOfWeek}: {s.startShift}-{s.endShift} ({s.room?.name || s.roomId})</span>
                                                        </div>
                                                    ))}
                                                    {(!c.schedules || c.schedules.length === 0) && (
                                                        <div className="text-[9px] text-slate-400 italic">Chưa xếp lịch</div>
                                                    )}
                                                </div>
                                                <div className="pt-1 flex items-center gap-1.5 text-[9px] text-slate-400">
                                                    <Users size={10} className="opacity-70" />
                                                    <span>Lớp: {c.adminClasses?.map((a: any) => a.code).join(", ") || "Chưa ghép lớp"}</span>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                    {coursesForSubject.length === 0 && (
                                        <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-300">
                                            <Filter size={32} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-[10px] font-bold uppercase tracking-widest">Chưa có lớp cho học phần này</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-3">
                            <BookMarked size={48} strokeWidth={1} className="opacity-10" />
                            <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Chọn học phần để xếp lịch</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Modal */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200">
                        <AlertTriangle className="text-rose-500 mb-4" size={32} />
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Xác nhận xóa lớp?</h3>
                        <p className="text-sm text-slate-500 mb-6">Mọi dữ liệu lịch học và đăng ký của lớp này sẽ bị xóa vĩnh viễn.</p>
                        <div className="flex gap-3">
                            <button onClick={handleDelete} className="flex-1 py-2.5 bg-rose-500 text-white rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors">Xóa vĩnh viễn</button>
                            <button onClick={() => setDeleteConfirm(false)} className="flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Hủy</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Subject Creation Modal */}
            <SubjectFormModal 
                isOpen={isSubjectModalOpen}
                onClose={() => setIsSubjectModalOpen(false)}
                majors={majors}
                departments={departments}
                headers={headers}
                onSuccess={(msg) => {
                    setSuccessMsg(msg);
                    fetchAll(true);
                }}
            />

            {/* Session Modals */}
            {isGenerateModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Sinh lịch học tự động</h3>
                            <button onClick={() => setIsGenerateModalOpen(false)}><X size={20} className="text-slate-400" /></button>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">Hệ thống sẽ dựa trên "Lịch học chi tiết (Weekly Pattern)" đã cấu hình để sinh các buổi học rời rạc.</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className={labelCls}>Từ ngày</label>
                                <input type="date" className={inputCls} value={sessionForm.startDate} onChange={e => setSessionForm(p => ({ ...p, startDate: e.target.value }))} />
                            </div>
                            <div>
                                <label className={labelCls}>Đến ngày</label>
                                <input type="date" className={inputCls} value={sessionForm.endDate} onChange={e => setSessionForm(p => ({ ...p, endDate: e.target.value }))} />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                            <input 
                                type="checkbox" 
                                id="clearExisting" 
                                className="w-4 h-4" 
                                checked={sessionForm.clearExisting} 
                                onChange={e => setSessionForm(p => ({ ...p, clearExisting: e.target.checked }))} 
                            />
                            <label htmlFor="clearExisting" className="text-[11px] font-bold text-amber-700">Xóa các buổi học đã có trong khoảng thời gian này</label>
                        </div>

                        <button 
                            onClick={() => handleGenerateSessions(sessionForm.startDate, sessionForm.endDate, sessionForm.clearExisting)}
                            disabled={formLoading}
                            className="w-full py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                            {formLoading ? "Đang xử lý..." : "Bắt đầu sinh lịch"}
                        </button>
                    </div>
                </div>
            )}

            {(isManualModalOpen || isRescheduleModalOpen) && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">{isRescheduleModalOpen ? "Chỉnh sửa buổi học" : "Thêm buổi học thủ công"}</h3>
                            <div className="flex items-center gap-2">
                                {isRescheduleModalOpen && (
                                    <button 
                                        onClick={() => handleDeleteSession(selectedSession.id)}
                                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-2 text-[11px] font-bold"
                                        title="Xóa buổi học này"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                <button onClick={() => { setIsManualModalOpen(false); setIsRescheduleModalOpen(false); }}><X size={20} className="text-slate-400" /></button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className={labelCls}>Ngày học</label>
                                <input type="date" className={inputCls} value={sessionForm.date} onChange={e => setSessionForm(p => ({ ...p, date: e.target.value }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Tiết bắt đầu</label>
                                    <input type="number" className={inputCls} value={sessionForm.startShift} onChange={e => setSessionForm(p => ({ ...p, startShift: parseInt(e.target.value) }))} />
                                </div>
                                <div>
                                    <label className={labelCls}>Tiết kết thúc</label>
                                    <input type="number" className={inputCls} value={sessionForm.endShift} onChange={e => setSessionForm(p => ({ ...p, endShift: parseInt(e.target.value) }))} />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Phòng học</label>
                                <select className={inputCls} value={sessionForm.roomId} onChange={e => setSessionForm(p => ({ ...p, roomId: e.target.value }))}>
                                    <option value="">-- Chọn phòng --</option>
                                    {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.campus})</option>)}
                                </select>
                            </div>
                            {!isRescheduleModalOpen && (
                                <div>
                                    <label className={labelCls}>Loại buổi học</label>
                                    <select className={inputCls} value={sessionForm.type} onChange={e => setSessionForm(p => ({ ...p, type: e.target.value }))}>
                                        <option value="THEORY">Lý thuyết</option>
                                        <option value="PRACTICE">Thực hành</option>
                                        <option value="EXAM">Thi kết thúc</option>
                                        <option value="MAKEUP">Học bù</option>
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className={labelCls}>Ghi chú</label>
                                <input type="text" placeholder="Ví dụ: Nghỉ lễ bù, Thi giữa kỳ..." className={inputCls} value={sessionForm.note} onChange={e => setSessionForm(p => ({ ...p, note: e.target.value }))} />
                            </div>
                        </div>

                        <button 
                            onClick={isRescheduleModalOpen ? handleReschedule : handleAddManualSession}
                            disabled={formLoading}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all uppercase tracking-widest disabled:opacity-50"
                        >
                            {formLoading ? "Đang xử lý..." : (isRescheduleModalOpen ? "Xác nhận đổi lịch" : "Thêm buổi học")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Visual Helper Components ──

function SectionHeader({ icon, label, note }: { icon: React.ReactNode; label: string; note?: string }) {
    return (
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <span className="p-1.5 bg-slate-50 text-slate-400 rounded-lg">{icon}</span>
                <div>
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">{label}</h3>
                    {note && <p className="text-[10px] text-slate-400 font-medium">{note}</p>}
                </div>
            </div>
        </div>
    );
}
