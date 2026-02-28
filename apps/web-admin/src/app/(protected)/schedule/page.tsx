"use client";

import { useEffect, useState } from "react";
import {
    Calendar as CalendarIcon,
    Search,
    Filter,
    MapPin,
    UserCircle,
    Users,
    Clock,
    BookOpen,
    X,
} from "lucide-react";

interface ScheduleItem {
    id: string;
    courseClassId: string;
    dayOfWeek: number;
    startShift: number;
    endShift: number;
    room: string;
    type: string;
}

interface CourseClass {
    id: string;
    code: string;
    name: string;
    status: string;
    subject: { name: string; credits: number };
    lecturer: { fullName: string; lectureCode: string } | null;
    schedules: ScheduleItem[];
    _count: { enrollments: number };
}

export default function AdminSchedulePage() {
    const [classes, setClasses] = useState<CourseClass[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [filterDay, setFilterDay] = useState<number | "all">("all");

    // Selection state for Drawer/Modal
    const [selectedClass, setSelectedClass] = useState<CourseClass | null>(null);
    const [studentList, setStudentList] = useState<any[]>([]);
    const [loadingStudents, setLoadingStudents] = useState(false);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                // Fetch direct to api-gateway port 3000
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
                const res = await fetch(`${apiUrl}/api/enrollments/admin/classes/schedule`);
                if (res.ok) {
                    const data = await res.json();
                    setClasses(data || []);
                }
            } catch (error) {
                console.error("Failed to load admin schedule", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, []);

    const fetchClassDetails = async (classId: string) => {
        setLoadingStudents(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            const res = await fetch(`${apiUrl}/api/enrollments/admin/classes/${classId}/enrollments`);
            if (res.ok) {
                const data = await res.json();
                setStudentList(data || []);
            }
        } catch (error) {
            console.error("Failed to load student list", error);
        } finally {
            setLoadingStudents(false);
        }
    };

    const handleSelectClass = (cls: CourseClass) => {
        setSelectedClass(cls);
        fetchClassDetails(cls.id);
    };

    // Filter logic
    const filteredClasses = classes.filter(cls => {
        const matchesSearch =
            cls.subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cls.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (cls.lecturer && cls.lecturer.fullName.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesDay = filterDay === "all" || cls.schedules.some(s => s.dayOfWeek === filterDay);

        return matchesSearch && matchesDay;
    });

    const daysOfWeek = [
        { id: 2, name: "Thứ 2" },
        { id: 3, name: "Thứ 3" },
        { id: 4, name: "Thứ 4" },
        { id: 5, name: "Thứ 5" },
        { id: 6, name: "Thứ 6" },
        { id: 7, name: "Thứ 7" },
        { id: 8, name: "Chủ nhật" },
    ];

    if (loading) {
        return (
            <div className="flex h-full min-h-[500px] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 relative p-8 bg-gray-50 min-h-screen font-sans text-gray-900">
            {/* Header section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Schedule</h2>
                    <p className="text-sm text-gray-500 mt-1">Manage classes, students mapping, instructors and rooms.</p>
                </div>

                {/* Advanced Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm môn, mã, GV..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-10 w-64 rounded-xl border border-gray-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-sm transition-all"
                        />
                    </div>

                    <select
                        value={filterDay}
                        onChange={(e) => setFilterDay(e.target.value === "all" ? "all" : Number(e.target.value))}
                        className="h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus:border-blue-500 shadow-sm transition-all text-gray-700"
                    >
                        <option value="all">Tất cả các thứ</option>
                        {daysOfWeek.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Matrix View (Grid List for Admin) */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredClasses.length === 0 ? (
                    <div className="col-span-full py-20 text-center text-gray-500 bg-white rounded-xl border border-gray-100 shadow-sm">
                        Không tìm thấy lớp học phần nào phù hợp với bộ lọc.
                    </div>
                ) : (
                    filteredClasses.map((cls) => (
                        <div
                            key={cls.id}
                            onClick={() => handleSelectClass(cls)}
                            className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                        >
                            <div className="mb-3 flex items-start justify-between">
                                <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800 border border-gray-200">
                                    {cls.code}
                                </span>
                                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-bold ${cls.status === 'OPEN' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-amber-100 text-amber-700 border border-amber-200'}`}>
                                    {cls.status}
                                </span>
                            </div>

                            <h3 className="mb-1 text-base font-bold text-gray-900 line-clamp-2 leading-tight">{cls.subject.name}</h3>
                            <p className="mb-4 text-sm font-medium text-gray-500">{cls.subject.credits} Tín chỉ</p>

                            <div className="space-y-2 pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <UserCircle className="h-4 w-4 text-blue-500" />
                                    <span className="truncate">{cls.lecturer?.fullName || "Chưa phân công GV"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 font-medium">
                                    <Users className="h-4 w-4 text-emerald-500" />
                                    <span>Sĩ số: <strong className="text-gray-900">{cls._count.enrollments}</strong> sinh viên</span>
                                </div>

                                <div className="mt-3 rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs">
                                    {cls.schedules.length > 0 ? (
                                        <div className="space-y-2">
                                            {cls.schedules.map((s, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <span className="font-bold text-gray-700">
                                                        Thứ {s.dayOfWeek} (T.{s.startShift}-{s.endShift})
                                                    </span>
                                                    <span className="flex items-center gap-1 font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                                                        <MapPin className="h-3 w-3" /> P.{s.room}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 italic">Lớp chưa xếp thời gian biểu</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal / Side Panel for Class Details */}
            {selectedClass && (
                <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm transition-all">
                    <div className="h-full w-full max-w-2xl bg-white shadow-2xl animate-in slide-in-from-right overflow-y-auto">
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/90 backdrop-blur px-6 py-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Quản lý Lớp Học Phần</h3>
                                <p className="text-sm font-medium text-gray-500 mt-1">{selectedClass.code} - {selectedClass.subject.name}</p>
                            </div>
                            <button
                                onClick={() => setSelectedClass(null)}
                                className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6">
                            {/* Class Overview Cards */}
                            <div className="mb-8 grid grid-cols-2 gap-4">
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><UserCircle className="w-4 h-4" /> Giảng viên phụ trách</div>
                                    <div className="font-bold text-gray-900 text-lg">{selectedClass.lecturer?.fullName || "Chưa phân công"}</div>
                                    <div className="text-sm font-medium text-blue-600">{selectedClass.lecturer?.lectureCode}</div>
                                </div>
                                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                                    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5"><Clock className="w-4 h-4" /> Thông tin thời gian & phòng</div>
                                    <div className="space-y-1">
                                        {selectedClass.schedules.map((s, i) => (
                                            <div key={i} className="text-sm font-bold text-gray-800 flex justify-between">
                                                <span>Thứ {s.dayOfWeek} (Tiết {s.startShift}-{s.endShift})</span>
                                                <span className="text-indigo-600">Phòng {s.room}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {selectedClass.schedules.length === 0 && <span className="text-sm text-gray-400 italic">Chưa xếp lịch</span>}
                                </div>
                            </div>

                            {/* Student List */}
                            <div>
                                <h4 className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-lg font-bold text-gray-900">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        Danh sách Sinh viên
                                        <span className="bg-blue-100 text-blue-700 text-sm py-0.5 px-2.5 rounded-full">{selectedClass._count.enrollments}</span>
                                    </div>
                                    <button className="text-sm font-semibold text-blue-600 hover:text-blue-800">Xuất Excel</button>
                                </h4>

                                {loadingStudents ? (
                                    <div className="py-12 flex flex-col items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                                        <span className="text-sm font-medium text-gray-500">Đang tải dữ liệu sinh viên...</span>
                                    </div>
                                ) : studentList.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 flex flex-col items-center justify-center">
                                        <BookOpen className="h-8 w-8 text-gray-300 mb-3" />
                                        <span className="text-sm font-medium text-gray-500">Lớp hiện chưa có sinh viên đăng ký.</span>
                                    </div>
                                ) : (
                                    <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 text-gray-600">
                                                <tr>
                                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">STT</th>
                                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Mã SV</th>
                                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Họ và Tên</th>
                                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs">Lớp HC</th>
                                                    <th className="px-4 py-3 font-bold uppercase tracking-wider text-xs text-right">Trạng thái</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {studentList.map((enrollment, index) => (
                                                    <tr key={enrollment.id} className="hover:bg-blue-50/50 transition-colors">
                                                        <td className="px-4 py-3 text-gray-500 font-medium">{index + 1}</td>
                                                        <td className="px-4 py-3 font-bold text-gray-900">{enrollment.student.studentCode}</td>
                                                        <td className="px-4 py-3 font-medium text-gray-700">{enrollment.student.fullName}</td>
                                                        <td className="px-4 py-3 text-gray-500 font-medium">{enrollment.student.adminClass?.name || "N/A"}</td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="inline-flex rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-[11px] font-bold uppercase text-green-700">
                                                                {enrollment.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
