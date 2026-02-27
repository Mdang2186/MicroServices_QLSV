"use client";

import { useState, useEffect } from "react";
import { Icons } from "@/components/icons";

interface ScheduleEvent {
    id: string;
    courseName: string;
    courseCode: string;
    instructor: string;
    room: string;
    type: "THEORY" | "LAB";
    dayOfWeek: number;
    startShift: number;
    endShift: number;
    color: string;
}

const SHIFT_TIMES = {
    1: "07:00 AM", 2: "07:50 AM", 3: "08:40 AM", 4: "09:35 AM", 5: "10:25 AM", 6: "11:15 AM",
    7: "12:30 PM", 8: "01:20 PM", 9: "02:10 PM", 10: "03:05 PM", 11: "03:55 PM", 12: "04:45 PM"
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function SchedulePage() {
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:3000/api/courses")
            .then((res) => res.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    const allEvents: ScheduleEvent[] = [];
                    data.forEach((course: any) => {
                        if (course.rawSchedules && Array.isArray(course.rawSchedules)) {
                            course.rawSchedules.forEach((sch: any) => {
                                allEvents.push({
                                    id: course.id + sch.id,
                                    courseName: course.title,
                                    courseCode: course.code,
                                    instructor: course.instructor,
                                    room: sch.room,
                                    type: sch.type,
                                    dayOfWeek: sch.dayOfWeek, // 2=Mon, 3=Tue...
                                    startShift: sch.startShift,
                                    endShift: sch.endShift,
                                    color: sch.type === "THEORY" ? "bg-blue-100 border-blue-200 text-blue-700" : "bg-purple-100 border-purple-200 text-purple-700"
                                });
                            });
                        }
                    });
                    setEvents(allEvents);
                }
            })
            .catch((err) => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    // Helper to get events for a specific day
    const getEventsForDay = (dayIndex: number) => {
        // DB: 2=Mon, 3=Tue... So dayIndex (0=Mon) -> dayIndex + 2
        return events.filter(e => e.dayOfWeek === dayIndex + 2).sort((a, b) => a.startShift - b.startShift);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans text-gray-900">
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage classes, exams, meetings, and events</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Add Event
                </button>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mb-8 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <span className="font-medium text-sm text-gray-700 mr-2">Event Types:</span>
                <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-blue-500 rounded-sm"></span> Classes</div>
                <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-red-500 rounded-sm"></span> Exams</div>
                <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-purple-500 rounded-sm"></span> Meetings</div>
                <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 bg-green-500 rounded-sm"></span> Events</div>
            </div>

            {/* Week View */}
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="font-bold text-lg">Week View</h2>
                    <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-lg">
                        <button className="p-1 hover:bg-white rounded shadow-sm transition"><Icons.ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-sm font-medium">Week of January 24, 2026</span>
                        <button className="p-1 hover:bg-white rounded shadow-sm transition"><Icons.ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-4 min-h-[500px]">
                    {DAYS.map((day, index) => (
                        <div key={day} className="flex flex-col gap-3">
                            <div className="uppercase text-xs font-bold text-gray-500 tracking-wider mb-2">{day}</div>

                            {loading && index === 0 ? <p className="text-xs text-gray-400">Loading...</p> : null}

                            {getEventsForDay(index).map(event => (
                                <div key={event.id} className={`p-3 rounded-lg border-l-4 shadow-sm hover:shadow-md transition-all ${event.color}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <h4 className="font-bold text-sm leading-tight">{event.courseCode}</h4>
                                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-white/50 rounded">{event.type}</span>
                                    </div>
                                    <p className="text-xs font-medium mb-1">{event.courseName}</p>
                                    <div className="text-[11px] opacity-80 flex flex-col gap-0.5">
                                        <div className="flex items-center gap-1">
                                            <Icons.Schedule className="w-3 h-3" />
                                            <span>
                                                {/* @ts-ignore */}
                                                {SHIFT_TIMES[event.startShift]} • {90} min
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Icons.User className="w-3 h-3" />
                                            <span>{event.instructor}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                            <span>{event.room}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Empty state placeholder for visualization if needed */}
                            {getEventsForDay(index).length === 0 && !loading && (
                                <div className="h-full bg-gray-50/50 rounded-lg border-dashed border border-gray-100 flex items-center justify-center">
                                    <span className="text-xs text-gray-300">No events</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Upcoming Stats Footer (as per screenshot roughly) */}
            <div className="grid grid-cols-4 gap-6 mt-8">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h4 className="text-2xl font-bold text-blue-700">{events.filter(e => e.type === "THEORY" || e.type === "LAB").length}</h4>
                    <p className="text-xs font-medium text-blue-600">Classes</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                    <h4 className="text-2xl font-bold text-red-700">3</h4>
                    <p className="text-xs font-medium text-red-600">Exams</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                    <h4 className="text-2xl font-bold text-purple-700">5</h4>
                    <p className="text-xs font-medium text-purple-600">Meetings</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                    <h4 className="text-2xl font-bold text-green-700">2</h4>
                    <p className="text-xs font-medium text-green-600">Events</p>
                </div>
            </div>
        </div>
    );
}
