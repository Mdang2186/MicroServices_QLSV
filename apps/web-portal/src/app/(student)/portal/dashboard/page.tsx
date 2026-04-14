"use client";

import React, { useEffect, useState, useMemo } from "react";
import { StudentService } from "@/services/student.service";
import Link from "next/link";
import {
    GraduationCap,
    BookOpen,
    Award,
    Clock,
    MapPin,
    TrendingUp,
    ChevronRight,
    Calculator,
    Calendar,
    User,
    Trophy,
    CheckCircle2,
    ArrowRight,
    Bell,
    FileText,
    PieChart as PieChartIcon,
    Wallet,
    CreditCard,
    ClipboardList,
    AlertCircle,
    Camera
} from "lucide-react";

// ... (Rest of imports)
import { motion } from "framer-motion";
import {
    BarChart as RechartsBarChart,
    Bar as RechartsBar,
    XAxis as RechartsXAxis,
    YAxis as RechartsYAxis,
    Tooltip as RechartsTooltip,
    ResponsiveContainer as RechartsResponsiveContainer,
    Cell as RechartsCell,
    PieChart as RechartsPieChart,
    Pie as RechartsPie
} from "recharts";

// Cast Recharts components to any to bypass TypeScript JSX errors
const BarChart = RechartsBarChart as any;
const Bar = RechartsBar as any;
const XAxis = RechartsXAxis as any;
const YAxis = RechartsYAxis as any;
const Tooltip = RechartsTooltip as any;
const ResponsiveContainer = RechartsResponsiveContainer as any;
const Cell = RechartsCell as any;
const PieChart = RechartsPieChart as any;
const Pie = RechartsPie as any;

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getStudentProfileId, getStudentUserId, readStudentSessionUser } from "@/lib/student-session";

export default function StudentDashboard() {
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [trainingResults, setTrainingResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = readStudentSessionUser();
                const userId = getStudentUserId(user);
                if (!userId) return;

                const profileData = await StudentService.getProfile(userId);

                if (profileData && profileData.id) {
                    const studentId = profileData.id || getStudentProfileId(user);
                    setStudent(profileData);
                    const [enrollmentsData, gradesData, trainingData] = await Promise.all([
                        StudentService.getEnrollments(studentId),
                        StudentService.getGrades(studentId),
                        StudentService.getTrainingResults(studentId)
                    ]);
                    setEnrollments(enrollmentsData || []);
                    setGrades(gradesData || []);
                    setTrainingResults(trainingData || []);
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const lastSemesterChartData = useMemo(() => {
        return grades.slice(0, 8).map((g) => ({
            name: g.subject?.code || "MÔN",
            score: g.totalScore10 || 0,
        }));
    }, [grades]);

    const creditsData = [
        { name: 'Đạt', value: student?.totalEarnedCredits || 0 },
        { name: 'Còn lại', value: Math.max(0, 135 - (student?.totalEarnedCredits || 0)) }
    ];

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2.5rem] border border-slate-200 bg-white p-12">
                <h2 className="text-xl font-bold text-slate-800">Không tìm thấy hồ sơ sinh viên</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen space-y-6 pb-20 text-slate-700">
            {/* Top Section: Info & Counters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Information Box */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row gap-8 shadow-sm">
                    <div className="flex flex-col items-center gap-4 w-fit">
                        <div className="text-xs font-bold text-slate-800 self-start uppercase">Thông tin sinh viên</div>
                        <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-slate-100 shadow-inner">
                            <img
                                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=2576&auto=format&fit=crop"
                                alt="Profile"
                                className="h-full w-full object-cover"
                            />
                        </div>
                        <Link href="/portal/dashboard">
                            <Button variant="link" className="text-blue-600 text-[10px] font-bold h-auto p-0 hover:no-underline">Xem chi tiết</Button>
                        </Link>
                    </div>

                    <div className="flex-1 grid grid-cols-2 gap-x-8 gap-y-3 pt-6 border-l border-slate-100 pl-8">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">MSSV: <span className="text-slate-700 ml-1">{student?.studentCode}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Họ tên: <span className="text-slate-700 ml-1 font-black">{student?.fullName}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Giới tính: <span className="text-slate-700 ml-1">Nam</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Ngày sinh: <span className="text-slate-700 ml-1">{new Date(student?.dob || "2004-10-29").toLocaleDateString('vi-VN')}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Nơi sinh: <span className="text-slate-700 ml-1">{student?.birthPlace || "Lào Cai"}</span></p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Lớp học: <span className="text-slate-700 ml-1">{student?.adminClass?.code || "Chưa xếp lớp"}</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Khóa học: <span className="text-slate-700 ml-1">2023 - 2027</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Bậc đào tạo: <span className="text-slate-700 ml-1">Đại học</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Loại hình đào tạo: <span className="text-slate-700 ml-1">Chính quy</span></p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-2">Ngành: <span className="text-slate-700 ml-1">{student?.major?.name}</span></p>
                        </div>
                    </div>
                </div>

                {/* Status Cards */}
                <div className="space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-start justify-between relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Nhắc nhở mới, chưa xem</p>
                            <p className="text-3xl font-black text-slate-800 mt-1">0</p>
                            <Link href="/portal/dashboard">
                                <Button variant="link" className="text-blue-600 text-[10px] font-bold h-auto p-0 mt-2 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                        </div>
                        <div className="h-10 w-10 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400">
                            <Bell className="h-5 w-5" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-sky-50/50 rounded-xl border border-sky-100 p-4 border-l-4 border-l-sky-400 shadow-sm relative overflow-hidden group hover:bg-sky-50 transition-colors">
                            <p className="text-[10px] font-bold text-sky-600/70 uppercase">Lịch học trong tuần</p>
                            <p className="text-2xl font-black text-sky-700 mt-1">{enrollments.length}</p>
                            <Link href="/portal/schedule">
                                <Button variant="link" className="text-sky-600 text-[10px] font-bold h-auto p-0 mt-1 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                            <Calendar className="absolute -right-2 -bottom-2 h-10 w-10 text-sky-200 opacity-50 group-hover:scale-125 transition-transform" />
                        </div>
                        <div className="bg-amber-50/50 rounded-xl border border-amber-100 p-4 border-l-4 border-l-amber-400 shadow-sm relative overflow-hidden group hover:bg-amber-50 transition-colors">
                            <p className="text-[10px] font-bold text-amber-600/70 uppercase">Lịch thi trong tuần</p>
                            <p className="text-2xl font-black text-amber-700 mt-1">0</p>
                            <Link href="/portal/schedule">
                                <Button variant="link" className="text-amber-600 text-[10px] font-bold h-auto p-0 mt-1 hover:no-underline">Xem chi tiết</Button>
                            </Link>
                            <Clock className="absolute -right-2 -bottom-2 h-10 w-10 text-amber-200 opacity-50 group-hover:scale-125 transition-transform" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                {[
                    { label: "Điểm danh QR", icon: Camera, color: "text-indigo-500", href: "/portal/attendance/scan" },
                    { label: "Đề xuất biểu mẫu", icon: FileText, color: "text-sky-500", href: "/portal/enroll" },
                    { label: "Nhắc nhở", icon: Bell, color: "text-blue-500", href: "/portal/dashboard" },
                    { label: "Kết quả học tập", icon: TrendingUp, color: "text-indigo-500", href: "/portal/results" },
                    { label: "Lịch theo tuần", icon: Calendar, color: "text-blue-600", href: "/portal/schedule" },
                    { label: "Lịch theo tiến độ", icon: ClipboardList, color: "text-sky-600", href: "/portal/training" },
                    { label: "Tra cứu công nợ", icon: Wallet, color: "text-emerald-600", href: "/portal/tuition" },
                    { label: "Phiếu thu tổng hợp", icon: FileText, color: "text-sky-700", href: "/portal/tuition?tab=history" },
                ].map((action, i) => (
                    <Link key={i} href={action.href} className="flex flex-col items-center justify-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className={cn("p-2 rounded-lg bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300", action.color)}>
                            <action.icon className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 text-center leading-tight">{action.label}</span>
                    </Link>
                ))}
            </div>

            {/* Today's Schedule (Specifically requested) */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-2">
                        <div className="h-6 w-1 bg-blue-600 rounded-full" />
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Lịch học hôm nay</h3>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {(() => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const jsDay = today.getDay();
                        const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

                        const todaySchedule = enrollments?.flatMap((e: any) => {
                            const exactSessions = (e.courseClass?.sessions || [])
                                .filter((session: any) => {
                                    const sessionDate = new Date(session.date);
                                    sessionDate.setHours(0, 0, 0, 0);
                                    return sessionDate.getTime() === today.getTime();
                                })
                                .map((session: any) => ({
                                    startShift: session.startShift,
                                    subject: e.courseClass?.subject,
                                    room: session.room,
                                }));

                            if (exactSessions.length > 0) {
                                return exactSessions;
                            }

                            const semesterStart = e.courseClass?.semester?.startDate
                                ? new Date(e.courseClass.semester.startDate)
                                : null;
                            const semesterEnd = e.courseClass?.semester?.endDate
                                ? new Date(e.courseClass.semester.endDate)
                                : null;

                            if (semesterStart && semesterEnd) {
                                semesterStart.setHours(0, 0, 0, 0);
                                semesterEnd.setHours(0, 0, 0, 0);
                                if (today < semesterStart || today > semesterEnd) {
                                    return [];
                                }
                            }

                            return (
                                e.courseClass?.schedules?.filter((s: any) => s.dayOfWeek === currentDayOfWeek).map((s: any) => ({
                                    startShift: s.startShift,
                                    subject: e.courseClass?.subject,
                                    room: s.room,
                                })) || []
                            );
                        }).sort((a, b) => a.startShift - b.startShift) || [];

                        const shiftTimes: { [key: number]: string } = {
                            1: "07:00 - 09:30",
                            2: "09:35 - 12:05",
                            3: "12:30 - 15:00",
                            4: "15:05 - 17:35",
                            5: "18:00 - 20:30",
                            // Fallback for higher shifts if any
                            6: "07:00 - 09:30",
                            7: "09:35 - 12:05",
                            8: "12:30 - 15:00",
                            9: "15:05 - 17:35",
                            10: "18:00 - 20:30"
                        };

                        if (todaySchedule.length === 0) {
                            return (
                                <div className="flex-1 py-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-50 rounded-xl text-slate-300">
                                    <Calendar className="h-6 w-6 mb-1 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest italic font-sans">Nghỉ ngơi thôi! Hôm nay bạn không có tiết học.</p>
                                </div>
                            );
                        }

                        return todaySchedule.map((sch, i) => (
                            <Link key={i} href="/portal/schedule" className="min-w-[240px] bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center gap-4 group hover:bg-white hover:border-blue-200 transition-all shadow-sm">
                                <div className="flex flex-col items-center justify-center bg-white border border-slate-100 h-12 w-12 rounded-xl text-blue-600 font-black group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <span className="text-[10px] opacity-70">TIẾT</span>
                                    <span className="text-lg leading-none">{sch.startShift}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-[11px] font-black text-slate-700 truncate uppercase leading-tight group-hover:text-blue-600 transition-colors">{sch.subject?.name}</h4>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] font-bold text-slate-400">
                                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {shiftTimes[sch.startShift]}</span>
                                        <span className="flex items-center gap-1 italic"><MapPin className="h-3 w-3" /> P.{sch.room?.name || '---'}</span>
                                    </div>
                                </div>
                            </Link>
                        ));
                    })()}
                </div>
            </div>

            {/* Visualization Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-12 gap-6">
                {/* Academic results (Bar chart) */}
                <div className="lg:col-span-2 xl:col-span-5 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                        <h3 className="text-sm font-black text-slate-800">Kết quả học tập</h3>
                        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none">
                            <option>Kỳ 1 (2025-2026)</option>
                        </select>
                    </div>
                    <div className="h-64 w-full bg-[url('https://www.transparenttextures.com/patterns/graph-paper.png')] bg-fixed rounded-xl p-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={lastSemesterChartData}>
                                <XAxis dataKey="name" hide />
                                <YAxis hide domain={[0, 10]} />
                                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={24}>
                                    {lastSemesterChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.score >= 8.5 ? '#10b981' : entry.score >= 7.0 ? '#3b82f6' : entry.score >= 5.0 ? '#f59e0b' : '#ef4444'}
                                            fillOpacity={0.6}
                                        />
                                    ))}
                                </Bar>
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-bold">
                                                    {payload[0].value}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                        {lastSemesterChartData.length === 0 && (
                            <div className="flex items-center justify-center h-full -mt-64 relative z-10 pointer-events-none">
                                <p className="text-slate-400 text-xs font-bold bg-white/50 px-4 py-2 rounded-lg backdrop-blur-sm">Chưa có dữ liệu hiển thị</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Credit progress (Doughnut chart) */}
                <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-between">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4 w-full">
                        <h3 className="text-sm font-black text-slate-800 self-start">Tiến độ học tập</h3>
                        <Link href="/portal/training">
                            <ChevronRight className="h-4 w-4 text-slate-300 hover:text-blue-500 cursor-pointer" />
                        </Link>
                    </div>
                    <div className="h-56 w-56 relative flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={creditsData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    <Cell fill="#00e5ff" />
                                    <Cell fill="#f1f5f9" />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute flex flex-col items-center">
                            <span className="text-2xl font-black text-blue-600">{student?.totalEarnedCredits || 0}</span>
                            <div className="w-12 h-0.5 bg-slate-200 my-1" />
                            <span className="text-sm font-black text-slate-400">135</span>
                        </div>
                    </div>
                    <div className="w-full h-1" /> {/* Spacer */}
                </div>

                {/* Course List */}
                <div className="lg:col-span-4 xl:col-span-4 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                        <h3 className="text-sm font-black text-slate-800">Lớp học phần</h3>
                        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold outline-none">
                            <option>Kỳ 1 (2025-2026)</option>
                        </select>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-12 text-[10px] font-bold text-slate-400 uppercase tracking-tight pb-2 border-b border-slate-50">
                            <div className="col-span-9">Môn học/Học phần</div>
                            <div className="col-span-3 text-right">Số tín chỉ</div>
                        </div>
                        {enrollments.length > 0 ? (
                            enrollments.map((enr, i) => (
                                <div key={i} className="grid grid-cols-12 items-center group">
                                    <div className="col-span-9 pr-4">
                                        <Link href="/portal/courses">
                                            <p className="text-[10px] font-bold text-blue-500 hover:underline cursor-pointer tracking-tight">{enr.courseClass?.code}</p>
                                        </Link>
                                        <h4 className="text-[11px] font-bold text-slate-600 truncate">{enr.courseClass?.subject?.name}</h4>
                                    </div>
                                    <div className="col-span-3 text-right text-xs font-black text-slate-800">
                                        {enr.courseClass?.subject?.credits}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-8 text-center text-slate-400 text-xs italic">
                                Không có học phần trong kỳ này
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
