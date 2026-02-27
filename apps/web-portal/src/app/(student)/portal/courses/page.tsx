"use client";

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const availableCourses = [
    {
        id: "CS101",
        title: "Introduction to Computer Science",
        credits: 3,
        professor: "Dr. Smith",
        schedule: "Mon/Wed 09:00 - 10:30",
        slots: "25/30",
    },
    {
        id: "MATH201",
        title: "Calculus II",
        credits: 4,
        professor: "Prof. Johnson",
        schedule: "Tue/Thu 13:00 - 15:00",
        slots: "12/40",
    },
    {
        id: "PHYS101",
        title: "General Physics",
        credits: 4,
        professor: "Dr. Brown",
        schedule: "Fri 08:00 - 11:00",
        slots: "5/20",
    },
    {
        id: "ENG102",
        title: "Academic Writing",
        credits: 2,
        professor: "Ms. Davis",
        schedule: "Wed 15:00 - 17:00",
        slots: "0/25", // Full
    },
];

export default function CourseEnrollmentPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Registration</h1>
                <p className="text-muted-foreground">Select courses for the upcoming semester.</p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {availableCourses.map((course) => {
                    const isFull = course.slots.split('/')[0] === course.slots.split('/')[1]; // Simple logic

                    return (
                        <Card key={course.id} className="flex flex-col hover:border-student-primary transition-colors cursor-pointer">
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-indigo-100 text-indigo-800 hover:bg-indigo-200">
                                        {course.id}
                                    </div>
                                    <span className="text-sm text-gray-500">{course.credits} Credits</span>
                                </div>
                                <CardTitle className="mt-2 text-lg">{course.title}</CardTitle>
                                <CardDescription>Prof. {course.professor}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="space-y-2 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <BookOpen className="h-4 w-4" />
                                        <span>{course.schedule}</span>
                                    </div>
                                    <div className="flex items-center justify-between mt-4">
                                        <span>Slots:</span>
                                        <span className={isFull ? "text-red-600 font-bold" : "text-green-600 font-bold"}>
                                            {course.slots}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full bg-student-primary hover:bg-indigo-700 disabled:bg-gray-300"
                                    disabled={isFull}
                                >
                                    {isFull ? "Waitlist" : "Register"}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
