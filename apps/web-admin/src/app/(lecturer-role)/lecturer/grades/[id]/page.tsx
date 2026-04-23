"use client";

import { useParams } from "next/navigation";
import { GradeManagementWorkspace } from "@/components/grades/GradeManagementWorkspace";

export default function LecturerGradeEntryPage() {
  const params = useParams();
  const classId = `${params?.id || ""}`;

  return <GradeManagementWorkspace role="lecturer" classId={classId} />;
}
