"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LecturerCourseAttendanceRedirectPage() {
    const { id } = useParams();
    const router = useRouter();

    useEffect(() => {
        if (!id) return;
        router.replace(`/lecturer/attendance/${id}`);
    }, [id, router]);

    return (
        <div className="flex min-h-[80vh] items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600"></div>
        </div>
    );
}
