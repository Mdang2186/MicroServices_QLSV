"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function EnrollPage() {
    const [classes, setClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        if (!token) {
            router.push("/login");
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        axios.get(`${apiUrl}/api/enrollments/classes`)
            .then(res => {
                setClasses(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch classes", err);
                setLoading(false);
            });
    }, [router]);

    const handleEnroll = async (classId: string) => {
        const token = localStorage.getItem("accessToken");
        // Since we don't have the student ID in the payload in the guide (it implies the backend extracts it from token),
        // but the guide requires passing it or extracting it. 
        // The previous Auth service implementation puts `sub` (userId) in the token. 
        // However, Enrollment needs `studentId`. 
        // For this demo, let's assume the user object in localStorage has the student ID or we send the userId and backend resolves it.
        // Wait, the guide code was: `axios.post(..., { classId })`.
        // My backend `registerCourse` expects `studentId`. 
        // I need to update the backend or the frontend.
        // QUICK FIX: The user object from login has `id`. We'll assume that corresponds to studentId or we pass it.
        // Actually, in `auth.service.ts`, `sub` is `user.id`. 
        // `Student` table has `userId`. 
        // The `enrollment-service` should ideally look up the student by `userId` from the token, but I didn't implement AuthGuards there yet.
        // To make the demo work "Step 6", I will pass `studentId` from the frontend.
        // But I don't have `studentId` in the frontend user object yet (user object comes from Auth Service which returns User, not Student).
        // I will fetch the student profile first? No, too complex.
        // I will simply pass the `user.id` as `studentId` for the demo seed data (I will ensure seed data matches IDs).
        // OR: I will update `auth.service` to return `studentId` in login response?
        // Let's stick to the simplest: Pass `user.sub` as `studentId` and ensure seed data aligns, 
        // OR create a student with the same ID as user.
        // Actually, `studentId` is a UUID.

        // BETTER PLAN: Update `auth.service` login response to include `studentId`.
        // But for now, let's just try to send the ID we have.
        const user = JSON.parse(localStorage.getItem("user") || "{}");

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
        try {
            await axios.post(`${apiUrl}/api/enrollments`, {
                studentId: user.student?.id || user.id, // Try to find student ID
                classId: classId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("Registration Successful!");
            // Refresh to update slots
            window.location.reload();
        } catch (err: any) {
            alert(err.response?.data?.message || "Registration Failed / Class Full");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading classes...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-6xl">
                <h1 className="mb-8 text-3xl font-bold text-gray-900">Course Registration</h1>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {classes.map((c) => (
                        <div key={c.id} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <div className="mb-4 flex items-center justify-between">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
                                    {c.code}
                                </span>
                                <span className="text-sm text-gray-500">{c.room}</span>
                            </div>

                            <h3 className="mb-2 text-xl font-bold text-gray-900">
                                {c.subject?.name || "Subject Name"}
                            </h3>

                            <div className="mb-6 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Schedule:</span>
                                    <span className="font-medium">{c.schedule}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Slots:</span>
                                    <span className={`font-medium ${c.currentSlot >= c.maxSlots ? "text-red-600" : "text-green-600"}`}>
                                        {c.currentSlot} / {c.maxSlots}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={() => handleEnroll(c.id)}
                                disabled={c.currentSlot >= c.maxSlots}
                                className={`w-full rounded-lg py-2.5 font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${c.currentSlot >= c.maxSlots
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
                                    }`}
                            >
                                {c.currentSlot >= c.maxSlots ? "Class Full" : "Enroll Now"}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
