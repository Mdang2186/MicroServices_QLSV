"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import Cookies from "js-cookie";
import {
    GraduationCap,
    BookOpen,
    Award,
    CalendarCheck,
    Clock,
    MapPin,
    TrendingUp,
    Bell,
    ChevronRight
} from "lucide-react";
import { motion } from "framer-motion";

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
                    // studentId here is actually the user.id from the authentication token
                    // First we need to get the Student profile, which has its own unique UUID
                    const profileData = await StudentService.getProfile(studentId);

                    if (profileData && profileData.id) {
                        setStudent(profileData);
                        // Now we have the true student ID (profileData.id)
                        const [enrollmentsData, gradesData] = await Promise.all([
                            StudentService.getEnrollments(profileData.id),
                            StudentService.getGrades(profileData.id)
                        ]);
                        setEnrollments(enrollmentsData || []);
                        setGrades(gradesData || []);
                    } else {
                        // User exists but has no Student profile linked
                        setStudent(null);
                        setEnrollments([]);
                        setGrades([]);
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
                <div className="relative flex h-20 w-20 items-center justify-center">
                    <div className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-20"></div>
                    <div className="absolute h-16 w-16 animate-spin rounded-full border-4 border-solid border-blue-500 border-t-transparent"></div>
                    <GraduationCap className="h-8 w-8 text-blue-600" />
                </div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="flex min-h-[50vh] flex-col items-center justify-center rounded-2xl bg-white/50 p-8 backdrop-blur-xl">
                <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
                    <Bell className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-800">No Student Data Found</h2>
                <p className="mt-2 text-gray-500">We couldn't load your profile. Please contact IT support.</p>
            </div>
        );
    }

    // Schedule Calculation
    const jsDay = new Date().getDay();
    const currentDayOfWeek = jsDay === 0 ? 8 : jsDay + 1;

    // Fallback schedule parsing logic from enrollments (if class schedules existed)
    // The enrollment service doesn't return full schedules in the current implementation, but we prepare for it
    const todaysClasses = enrollments?.flatMap((e: any) =>
        e.courseClass?.schedules?.filter((s: any) => s.dayOfWeek === currentDayOfWeek).map((s: any) => ({
            ...s,
            subject: e.courseClass?.subject?.name,
            lecturer: e.courseClass?.lecturer?.fullName,
            courseCode: e.courseClass?.code
        })) || []
    ) || [];

    todaysClasses.sort((a: any, b: any) => a.startShift - b.startShift);

    // Calculate recent activities / grades stats
    const averageScore = grades.length > 0
        ? grades.reduce((acc, curr) => acc + (curr.totalScore10 || 0), 0) / grades.length
        : null;

    return (
        <div className="min-h-screen space-y-8 bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 p-1 pb-12">

            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-3xl bg-white/70 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-white/60 backdrop-blur-2xl"
            >
                {/* Decorative blob */}
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-blue-400/20 to-indigo-400/20 blur-3xl" />
                <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-400/20 to-blue-400/20 blur-3xl" />

                <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-3xl font-bold text-white shadow-lg shadow-blue-500/30">
                            {student.fullName?.charAt(0) || "S"}
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                                Welcome back, <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">{student.fullName || student.user?.username}</span>
                            </h1>
                            <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-500">
                                <GraduationCap className="h-4 w-4" />
                                {student.major?.name || "Computer Science"} • {student.studentCode}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-full bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 backdrop-blur-md">
                        <CalendarCheck className="h-4 w-4 text-blue-500" />
                        <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-4">
                {[
                    { title: "Current GPA", value: student.gpa?.toFixed(2) || "N/A", subtitle: "Cumulative", icon: GraduationCap, color: "from-blue-500 to-blue-600", light: "bg-blue-50" },
                    { title: "Credits Earned", value: student.totalCredits || 0, subtitle: "Total progression", icon: Award, color: "from-indigo-500 to-indigo-600", light: "bg-indigo-50" },
                    { title: "Active Courses", value: enrollments.length || 0, subtitle: "This semester", icon: BookOpen, color: "from-emerald-500 to-emerald-600", light: "bg-emerald-50" },
                    { title: "Avg. Grade", value: averageScore ? averageScore.toFixed(1) : "N/A", subtitle: "Based on recent", icon: TrendingUp, color: "from-violet-500 to-violet-600", light: "bg-violet-50" },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative overflow-hidden rounded-3xl bg-white/60 p-6 shadow-[0_4px_24px_rgba(0,0,0,0.02)] ring-1 ring-white/60 backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
                    >
                        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 transition-transform duration-500 group-hover:scale-150 bg-gradient-to-br ${stat.color}`} />
                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <p className="text-sm font-semibold text-slate-500">{stat.title}</p>
                                <h3 className="mt-2 text-3xl font-bold text-slate-800">{stat.value}</h3>
                                <p className="mt-1 text-xs font-medium text-slate-400">{stat.subtitle}</p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.light} text-slate-700`}>
                                <stat.icon className="h-6 w-6" />
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-3">

                {/* Enrolled Courses */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="col-span-2 flex flex-col overflow-hidden rounded-3xl bg-white/70 p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-white/60 backdrop-blur-2xl"
                >
                    <div className="flex items-center justify-between border-b border-slate-100/50 p-6">
                        <h2 className="text-xl font-bold text-slate-800">Current Enrollments</h2>
                        <button className="flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700">
                            View All <ChevronRight className="ml-1 h-4 w-4" />
                        </button>
                    </div>
                    <div className="flex-1 p-6">
                        {enrollments.length > 0 ? (
                            <div className="grid gap-4 sm:grid-cols-2">
                                {enrollments.map((enr, i) => (
                                    <div key={i} className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-100 bg-white/50 p-5 transition-colors hover:border-blue-100 hover:bg-blue-50/30">
                                        <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-400 to-indigo-500 opacity-0 transition-opacity group-hover:opacity-100" />
                                        <div>
                                            <div className="flex items-center justify-between">
                                                <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-700">
                                                    {enr.courseClass?.code || "COURSE"}
                                                </span>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${enr.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {enr.status}
                                                </span>
                                            </div>
                                            <h3 className="mt-3 line-clamp-2 text-base font-bold text-slate-800">
                                                {enr.courseClass?.subject?.name || "Unknown Subject"}
                                            </h3>
                                        </div>
                                        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <div className="h-6 w-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                    {enr.courseClass?.lecturer?.fullName?.charAt(0) || "T"}
                                                </div>
                                                <span className="truncate max-w-[100px]">{enr.courseClass?.lecturer?.fullName || "TBA"}</span>
                                            </div>
                                            <div className="flex items-center font-medium text-slate-700">
                                                <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                                                {enr.courseClass?.subject?.credits || 0} Cr
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-48 flex-col items-center justify-center text-slate-400">
                                <BookOpen className="mb-3 h-10 w-10 opacity-20" />
                                <p>You are not enrolled in any courses yet.</p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Vertical Stack: Today's Schedule & Recent Grades */}
                <div className="flex flex-col gap-8">

                    {/* Today's Schedule */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800 to-slate-900 p-1 text-slate-100 shadow-xl ring-1 ring-slate-800"
                    >
                        <div className="p-6 pb-2">
                            <h2 className="text-lg font-bold text-white">Today's Schedule</h2>
                        </div>
                        <div className="p-6 pt-2">
                            <div className="space-y-4">
                                {todaysClasses.length > 0 ? (
                                    todaysClasses.map((cls: any, i: number) => (
                                        <div key={i} className="flex items-start gap-4 rounded-xl bg-white/10 p-4 backdrop-blur-md">
                                            <div className="flex flex-col items-center justify-center rounded-lg bg-white/10 p-2 min-w-[3rem]">
                                                <span className="text-xs font-semibold text-slate-300">Shift</span>
                                                <span className="text-lg font-bold text-white">{cls.startShift}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white">{cls.subject || cls.courseCode}</p>
                                                <div className="mt-1 flex items-center gap-3 text-xs text-slate-300">
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> Room {cls.room}</span>
                                                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> S{cls.startShift}-{cls.endShift}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-slate-400">
                                        <div className="rounded-full bg-slate-800 p-3 mb-3">
                                            <CalendarCheck className="h-6 w-6 text-slate-500" />
                                        </div>
                                        <p className="text-sm font-medium text-slate-300">No classes today. Enjoy your day!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Recent Grades */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="flex-1 overflow-hidden rounded-3xl bg-white/70 p-1 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-white/60 backdrop-blur-2xl"
                    >
                        <div className="p-6 pb-2">
                            <h2 className="text-lg font-bold text-slate-800">Recent Grades</h2>
                        </div>
                        <div className="p-4">
                            {grades.length > 0 ? (
                                <div className="space-y-3">
                                    {grades.slice(0, 4).map((record: any, i: number) => (
                                        <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold
                                                    ${record.totalScore10 >= 8 ? 'bg-emerald-100 text-emerald-600' :
                                                        record.totalScore10 >= 5 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                    {record.letterGrade || (record.totalScore10 ? record.totalScore10.toFixed(1) : "-")}
                                                </div>
                                                <div className="truncate">
                                                    <p className="truncate text-sm font-bold text-slate-800">{record.subject?.name}</p>
                                                    <p className="text-xs text-slate-500">{record.courseClass?.code}</p>
                                                </div>
                                            </div>
                                            <div className="pl-3 text-right">
                                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
                                                    ${record.isPassed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                    {record.isPassed ? 'Pass' : 'Fail'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                                    <Award className="mb-2 h-8 w-8 opacity-20" />
                                    <p className="text-sm">No grades recorded yet.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                </div>
            </div>
        </div>
    );
}
