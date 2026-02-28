"use client";
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { StudentResponse } from '@repo/shared-dto';

export default function DashboardPage() {
    const [students, setStudents] = useState<StudentResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // New Student Form State
    const [newStudent, setNewStudent] = useState({ code: '', fullName: '', email: '', dob: '' });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/');
                return;
            }
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            const res = await axios.get(`${apiUrl}/api/students`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setStudents(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            router.push('/');
        }
    };

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('accessToken');
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            await axios.post(`${apiUrl}/api/students`, newStudent, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setNewStudent({ code: '', fullName: '', email: '', dob: '' });
            fetchStudents();
        } catch (error) {
            console.error(error);
            alert('Failed to add student');
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="min-h-screen p-8 bg-gray-100 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto space-y-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Student Dashboard</h1>

                {/* Add Student Form */}
                <div className="p-6 bg-white rounded-lg shadow dark:bg-gray-800">
                    <h2 className="mb-4 text-xl font-semibold text-gray-800 dark:text-gray-200">Add New Student</h2>
                    <form onSubmit={handleAddStudent} className="grid gap-4 md:grid-cols-4">
                        <input
                            type="text"
                            placeholder="Student Code (e.g. SV001)"
                            value={newStudent.code}
                            onChange={(e) => setNewStudent({ ...newStudent, code: e.target.value })}
                            className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Full Name"
                            value={newStudent.fullName}
                            onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
                            className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={newStudent.email}
                            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                            className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <input
                            type="date"
                            placeholder="Date of Birth"
                            value={newStudent.dob}
                            onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                            className="px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            required
                        />
                        <button
                            type="submit"
                            className="px-4 py-2 text-white bg-green-600 rounded hover:bg-green-700"
                        >
                            Add Student
                        </button>
                    </form>
                </div>

                {/* Student List */}
                <div className="overflow-hidden bg-white rounded-lg shadow dark:bg-gray-800">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Name</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Email</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">DoB</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase dark:text-gray-300">Created At</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                            {students.map((student) => (
                                <tr key={student.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{student.fullName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(student.dob).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 dark:text-gray-400">{new Date(student.createdAt).toLocaleDateString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
