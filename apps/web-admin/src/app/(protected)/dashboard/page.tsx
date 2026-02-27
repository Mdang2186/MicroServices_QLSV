"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { EnrollmentChart, AttendancePieChart } from "@/components/charts";
import { StatsCard } from "@/components/stats-card";
import { ApiClient } from "@/services/mock-data"; // We kept the filename for now

export default function Dashboard() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        const userCookie = Cookies.get("admin_user");
        if (userCookie) {
            try {
                setUser(JSON.parse(userCookie));
            } catch (e) {
                console.error("Failed to parse user cookie");
            }
        }

        // Fetch Real Data from API
        ApiClient.getDashboardStats()
            .then(setStats)
            .catch(err => console.error("Dashboard Fetch Error", err));
    }, []);

    const handleLogout = () => {
        Cookies.remove("admin_accessToken");
        Cookies.remove("admin_role");
        Cookies.remove("admin_user");
        // Also clear potential legacy items or items set by shared logic if any
        Cookies.remove("accessToken");
        Cookies.remove("role");
        Cookies.remove("user");

        localStorage.removeItem("admin_accessToken");
        localStorage.removeItem("admin_user");
        // Clear legacy
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");

        router.push("/login");
    };

    if (!stats) return <div className="p-8">Loading dashboard...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {user?.username || "Admin"}!</p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={handleLogout} title="Logout">
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {user?.username?.[0]?.toUpperCase() || "A"}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatsCard
                    title="Total Students"
                    value={stats.totalStudents.toLocaleString()}
                    icon={Icons.Student}
                    color="blue"
                    trend="+12.5%"
                    trendLabel="from last month"
                />
                <StatsCard
                    title="Active Courses"
                    value={stats.activeCourses}
                    icon={Icons.Course}
                    color="green"
                    trend="+3"
                    trendLabel="new courses"
                />
                <StatsCard
                    title="Tuition Revenue"
                    value={`${(stats.totalRevenue / 1000000000).toFixed(1)}B VND`}
                    icon={Icons.Report}
                    color="purple"
                    trend="+5%"
                    trendLabel="vs last semester"
                />
                <StatsCard
                    title="Attendance Rate"
                    value={`${stats.attendanceRate}%`}
                    icon={Icons.Attendance}
                    color="orange"
                    trend="+2.1%"
                    trendLabel="improved"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-1">Student Enrollment Trends</h3>
                    <p className="text-sm text-gray-500 mb-6">Monthly enrollment over the last 6 months</p>
                    {stats.enrollmentTrends ? (
                        <EnrollmentChart trends={stats.enrollmentTrends} />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">No data available</div>
                    )}
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-1">Course Popularity</h3>
                    <p className="text-sm text-gray-500 mb-6">Number of enrolled students per course</p>

                    <div className="flex items-end justify-between h-48 gap-4 px-4 pb-2">
                        {stats.coursePopularity?.map((course: any, i: number) => {
                            // Find max value to calculate height percentage
                            const maxVal = Math.max(...(stats.coursePopularity?.map((c: any) => c.value) || [1]), 1);
                            const height = `${(course.value / maxVal) * 100}%`;

                            return (
                                <div key={i} className="flex flex-col items-center gap-2 flex-1 group" title={`${course.fullName}: ${course.value}`}>
                                    <div
                                        className="w-full bg-blue-500 rounded-t-md opacity-90 group-hover:opacity-100 transition-opacity flex items-end justify-center"
                                        style={{ height, minHeight: '5px' }}
                                    >
                                        <span className="text-[10px] text-white font-medium mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {course.value}
                                        </span>
                                    </div>
                                    <span className="-rotate-45 origin-top-left text-[10px] text-gray-500 mt-2 truncate max-w-full">
                                        {course.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Attendance Dist */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold text-gray-800 mb-4">Attendance Distribution</h3>
                    {stats.attendanceDistribution ? (
                        <AttendancePieChart distribution={stats.attendanceDistribution} rate={stats.attendanceRate} />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-gray-400">No data available</div>
                    )}
                </div>

                {/* Recent Enrollments */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 col-span-2 overflow-hidden flex flex-col">
                    <h3 className="font-bold text-gray-800 mb-4">Recent Enrollments</h3>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {stats.recentEnrollments?.length > 0 ? stats.recentEnrollments.map((student: any, i: number) => {
                            // Format relative time simply
                            const date = new Date(student.time);
                            const now = new Date();
                            const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
                            const timeStr = diffDays === 0 ? "Today" : `${diffDays} days ago`;

                            return (
                                <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                                            {student.img}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">{student.name}</p>
                                            <p className="text-xs text-gray-500">{student.course}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md">{timeStr}</span>
                                </div>
                            );
                        }) : (
                            <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg">No recent enrollments found</div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
