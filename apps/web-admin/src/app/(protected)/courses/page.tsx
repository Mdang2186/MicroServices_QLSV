"use client";

import { Icons } from "@/components/icons";
import { CourseCard } from "@/components/course-card";

export default function CoursesPage() {
    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Courses</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage all courses and curriculum</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Course
                </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Courses</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900">6</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Courses</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900">5</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Enrolled</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900">1,664</h3>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg. Enrollment</p>
                    <h3 className="text-3xl font-bold mt-2 text-gray-900">277</h3>
                </div>
            </div>

            {/* Course Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <CourseCard
                    title="Introduction to Computer Science"
                    code="CS101"
                    instructor="Dr. Sarah Miller"
                    enrolled={342}
                    capacity={400}
                    schedule="Mon, Wed, Fri 10:00 AM"
                    duration="14 weeks"
                    status="Active"
                />
                <CourseCard
                    title="Business Administration Fundamentals"
                    code="BA201"
                    instructor="Prof. Michael Johnson"
                    enrolled={298}
                    capacity={350}
                    schedule="Tue, Thu 2:00 PM"
                    duration="14 weeks"
                    status="Active"
                />
                <CourseCard
                    title="Data Science and Analytics"
                    code="DS301"
                    instructor="Dr. Emily Chen"
                    enrolled={256}
                    capacity={300}
                    schedule="Mon, Wed 1:00 PM"
                    duration="12 weeks"
                    status="Active"
                />
                <CourseCard
                    title="Engineering Principles"
                    code="ENG101"
                    instructor="Prof. David Williams"
                    enrolled={412}
                    capacity={450}
                    schedule="Tue, Thu 9:00 AM"
                    duration="16 weeks"
                    status="Active"
                />
                <CourseCard
                    title="Advanced Mathematics"
                    code="MATH201"
                    instructor="Dr. Lisa Anderson"
                    enrolled={189}
                    capacity={200}
                    schedule="Mon, Wed 3:00 PM"
                    duration="14 weeks"
                    status="Active"
                />
                <CourseCard
                    title="Physics Fundamentals"
                    code="PHY101"
                    instructor="Prof. Robert Taylor"
                    enrolled={167}
                    capacity={200}
                    schedule="Fri 1:00 PM"
                    duration="12 weeks"
                    status="Upcoming"
                />
            </div>
        </div>
    );
}
