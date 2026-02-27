import React from "react";
import { Icons } from "@/components/icons";

interface CourseCardProps {
    title: string;
    code: string;
    instructor: string;
    enrolled: number;
    capacity: number;
    schedule: string;
    duration: string;
    status: "Active" | "Upcoming" | "Completed";
    color?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
    title,
    code,
    instructor,
    enrolled,
    capacity,
    schedule,
    duration,
    status
}) => {
    const percentage = Math.min((enrolled / capacity) * 100, 100);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col h-full hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{title}</h3>
                    <p className="text-sm text-gray-500 mt-1 uppercase font-semibold tracking-wide">{code}</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${status === "Active" ? "bg-green-100 text-green-700" :
                            status === "Upcoming" ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-700"
                        }`}>
                        {status}
                    </span>
                    <button className="text-gray-400 hover:text-gray-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1" />
                            <circle cx="19" cy="12" r="1" />
                            <circle cx="5" cy="12" r="1" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
                <Icons.User className="w-4 h-4 text-gray-400" />
                <span>Instructor: <span className="text-gray-900 font-medium">{instructor}</span></span>
            </div>

            <div className="mt-auto">
                <div className="flex justify-between text-xs mb-2">
                    <span className="text-gray-500">Enrollment</span>
                    <span className="font-bold text-gray-900">{enrolled} / {capacity} students</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 mb-6">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-50 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                        <Icons.Schedule className="w-3.5 h-3.5" />
                        <span>{schedule}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                        </svg>
                        <span>{duration}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
