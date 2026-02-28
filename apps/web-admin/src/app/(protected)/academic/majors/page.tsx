"use client";

import { useEffect, useState } from "react";

export default function MajorManagementPage() {
    const [majors, setMajors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMajors();
    }, []);

    const fetchMajors = async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
            const res = await fetch(`${apiUrl}/api/majors`);
            if (res.ok) {
                const data = await res.json();
                setMajors(data);
            }
        } catch (error) {
            console.error("Failed to fetch majors", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Major Management</h1>
                <button
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    onClick={() => alert("Add Major feature coming soon!")}
                >
                    Add Major
                </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-6 text-center">Loading majors...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-800">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Code</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-gray-700">
                                {majors.map((major) => (
                                    <tr key={major.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100 font-mono">{major.code}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{major.name}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4">Edit</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {majors.length === 0 && <p className="text-center py-4 text-gray-500">No majors found.</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
