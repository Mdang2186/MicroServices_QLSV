import { GradeManagementWorkspace } from "@/components/grades/GradeManagementWorkspace";

export default function StaffGradesDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return <GradeManagementWorkspace role="staff" classId={params.id} />;
}
