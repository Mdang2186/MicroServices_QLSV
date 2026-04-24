"use client";

import { useParams } from "next/navigation";
import { GradeManagementWorkspace } from "@/components/grades/GradeManagementWorkspace";

export default function LecturerCourseGradesPage() {
    const { id } = useParams();
    const classId = `${id || ""}`;

    return <GradeManagementWorkspace role="lecturer" classId={classId} />;
}
