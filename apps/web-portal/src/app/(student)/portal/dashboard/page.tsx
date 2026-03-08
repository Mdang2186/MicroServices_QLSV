"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    GraduationCap,
    BookOpen,
    Award,
    Clock,
    MapPin,
    TrendingUp,
    Bell,
    ChevronRight,
    Search,
    Calculator,
    Calendar,
    User
} from "lucide-react";
import { motion } from "framer-motion";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from "recharts";
import { Button } from "@/components/ui/button";

export default function StudentDashboard() {
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userCookie = Cookies.get("student_user");
                if (!userCookie) return;

                const user = JSON.parse(userCookie);
                const studentId = user.student?.id || user.id;

                if (studentId) {
                    const profileData = await StudentService.getProfile(studentId);

                    if (profileData && profileData.id) {
                        setStudent(profileData);
                        const [enrollmentsData, gradesData] = await Promise.all([
                            StudentService.getEnrollments(profileData.id),
                            StudentService.getGrades(profileData.id)
                        ]);
                        setEnrollments(enrollmentsData || []);
                        setGrades(gradesData || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="relative flex h-24 w-24 items-center justify-center">
                    <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                    <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent shadow-lg shadow-blue-500/20"></div>
                    <GraduationCap className="h-10 w-10 text-blue-600 drop-shadow-md" />
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-[2.5rem] border border-white bg-white/40 p-12 shadow-2xl backdrop-blur-3xl">
                <div className="mb-6 rounded-3xl bg-red-50 p-6 text-red-500 shadow-inner">
                    <Bell className="h-10 w-10" />
                </div>
                <h2 className="text-xl font-black tracking-tight text-gray-900 lg:text-2xl">Không tìm thấy hồ sơ</h2>
                <p className="mt-4 text-center text-sm font-medium text-gray-500">
                    Chúng tôi không thể đồng bộ hóa hồ sơ học tập của bạn. <br />
                    Vui lòng liên hệ phòng đào tạo để xác minh.
                </p>
            </div>
        );
    }

    const jsDay = new Date().getDay();
    const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;
    const todaySchedule = enrollments?.flatMap((e: any) =>
        e.courseClass?.schedules?.filter((s: any) => s.dayOfWeek === currentDayOfWeek).map((s: any) => ({
            shift: s.shift,
            subject: e.courseClass?.subject,
            room: s.room,
        })) || []
    ).sort((a, b) => a.shift - b.shift) || [];

    const shiftTimes: { [key: number]: string } = {
        1: "07:00 - 09:30",
        2: "09:35 - 12:05",
        3: "12:30 - 15:00",
        4: "15:05 - 17:35",
        5: "18:00 - 20:30"
    };

    const chartData = grades.slice(0, 6).map((g) => ({
        name: g.subject?.code || "MÔN",
        fullName: g.subject?.name,
        score: g.totalScore10 || 0,
    }));

    return (
        <div className="min-h-screen space-y-6 pb-20">
            {/* Top Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-400/10 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-xl">
                            <GraduationCap className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-black uppercase tracking-widest text-blue-600">Xin chào,</span>
                                <span className="text-xs font-bold text-slate-400">|</span>
                                <span className="text-xs font-bold text-slate-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                            </div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">
                                {student?.fullName || "Sinh viên"}
                            </h1>
                            <div className="flex items-center gap-3 mt-0.5">
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 rounded-full">
                                    <span className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                                    {student?.studentCode}
                                </span>
                                <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-100 rounded-full">
                                    {student?.major?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button className="rounded-xl border-none bg-blue-600 text-white hover:bg-blue-700 shadow-xl shadow-blue-200 text-xs font-bold px-4 h-9">
                            Phản hồi nhanh
                        </Button>
                        <Button className="rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold px-4 h-9">
                            Chương trình khung
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Stats Cards Row */}
            <div className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "GPA Hệ 4", value: student?.gpa?.toFixed(2) || "0.00", icon: TrendingUp, color: "blue", trend: "+0.15" },
                    { label: "CPA Tích lũy", value: student?.cpa?.toFixed(2) || "0.00", icon: Award, color: "indigo", trend: "+0.08" },
                    { label: "Tín chỉ đạt", value: student?.totalEarnedCredits || "0", icon: BookOpen, color: "emerald", sub: "/ 135" },
                    { label: "Lớp học phần", value: enrollments.length || "0", icon: Calculator, color: "violet", sub: "Học kỳ này" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        className="rounded-[1.5rem] border border-white bg-white/60 p-5 shadow-sm backdrop-blur-2xl"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-${stat.color}-50 text-${stat.color}-600`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                            {stat.trend && (
                                <span className={`text-[10px] font-black text-${stat.color}-600 bg-${stat.color}-50 px-1.5 py-0.5 rounded-lg`}>
                                    {stat.trend}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
                        <div className="flex items-baseline gap-1">
                            <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
                            {stat.sub && <span className="text-[10px] font-bold text-slate-400">{stat.sub}</span>}
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-7">
                {/* Academic Chart Area */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="lg:col-span-5 rounded-[2rem] border border-white bg-white/60 p-6 shadow-2xl backdrop-blur-3xl"
                >
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-base font-black text-slate-900">Kết quả học tập</h2>
                            <p className="text-[10px] font-medium text-slate-400">Biểu đồ điểm số các môn học gần đây</p>
                        </div>
                        <select className="bg-slate-50 border-none text-[10px] font-black uppercase tracking-widest text-slate-500 rounded-xl px-3 py-1.5 outline-none cursor-pointer">
                            <option>Học kỳ hiện tại</option>
                            <option>Tất cả học kỳ</option>
                        </select>
                    </div>

                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <defs>
                                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
                                    </linearGradient>
                                </defs>
                                <XAxis
                                    dataKey="name"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                                    interval={0}
                                />
                                <YAxis
                                    hide
                                    domain={[0, 10]}
                                />
                                <Tooltip
                                    cursor={{ fill: '#f1f5f9' }}
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-white p-3 rounded-xl shadow-2xl border border-slate-100">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{payload[0].payload.name}</p>
                                                    <p className="text-lg font-black text-blue-600">{payload[0].value}</p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Bar dataKey="score" radius={[8, 8, 8, 8]} barSize={32}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.score >= 8.5 ? '#10b981' : entry.score >= 7.0 ? '#3b82f6' : entry.score >= 5.0 ? '#f59e0b' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Today's Schedule Card */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="lg:col-span-2 rounded-[2rem] border border-white bg-slate-900 p-6 text-white shadow-2xl overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Clock className="h-24 w-24" />
                    </div>
                    <div className="relative z-10 h-full flex flex-col">
                        <h2 className="text-base font-black mb-4">Lịch học hôm nay</h2>

                        <div className="space-y-4 flex-1">
                            {todaySchedule.length > 0 ? (
                                todaySchedule.map((sch, i) => (
                                    <div key={i} className="group relative flex gap-4">
                                        <div className="flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-blue-400 group-hover:scale-150 transition-transform" />
                                            <div className="w-[1px] flex-1 bg-white/10 my-1" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Ca {sch.shift}</span>
                                                <span className="text-[10px] font-bold text-slate-400 tracking-tighter">{shiftTimes[sch.shift]}</span>
                                            </div>
                                            <p className="text-sm font-bold text-white line-clamp-1">{sch.subject?.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <MapPin className="h-3 w-3 text-slate-500" />
                                                <span className="text-[10px] font-bold text-slate-400">Phòng {sch.room?.name || '---'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                                    <Calendar className="h-10 w-10 mb-2" />
                                    <p className="text-xs italic font-medium">Không có lịch học</p>
                                </div>
                            )}
                        </div>

                        <Button className="w-full mt-6 rounded-xl bg-white/10 text-white hover:bg-white/20 border-none text-[10px] font-black uppercase tracking-widest h-10">
                            Chi tiết tuần này
                        </Button>
                    </div>
                </motion.div>
            </div>

            {/* Current Enrolled Courses */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="rounded-[2.5rem] border border-white bg-white/60 p-6 shadow-sm backdrop-blur-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-base font-black text-slate-900">Lớp học phần đang tham gia</h2>
                        <p className="text-[10px] font-medium text-slate-400">Danh sách các môn học trong học kỳ hiện tại</p>
                    </div>
                    <Button variant="ghost" className="text-blue-600 font-black text-xs hover:bg-blue-50 rounded-xl px-4 h-8">
                        Xem tất cả
                    </Button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {enrollments.length > 0 ? (
                        enrollments.map((enr, i) => (
                            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/40 border border-slate-100 hover:border-blue-200 transition-all hover:shadow-md group">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                    <BookOpen className="h-6 w-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{enr.courseClass?.code}</span>
                                        <div className="h-0.5 w-0.5 rounded-full bg-slate-300" />
                                        <span className="text-[10px] font-bold text-slate-400">{enr.courseClass?.subject?.credits} Tín chỉ</span>
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase">{enr.courseClass?.subject?.name}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 mt-0.5 flex items-center gap-1.5">
                                        <User className="h-3 w-3" />
                                        GV: {enr.courseClass?.lecturer?.fullName || 'Chưa cập nhật'}
                                    </p>
                                </div>
                                <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                                    <ChevronRight className="h-4 w-4" />
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-slate-400 font-medium italic text-xs">
                            Chưa có dữ liệu đăng ký học phần
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
