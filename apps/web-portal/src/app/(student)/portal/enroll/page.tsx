"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { resolveCurrentStudentContext } from "@/lib/current-student";

type Notice = {
    type: "success" | "error";
    text: string;
} | null;

type SubjectSelection = {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    semesterId?: string;
};

const DAY_LABELS: Record<number, string> = {
    2: "Thứ 2",
    3: "Thứ 3",
    4: "Thứ 4",
    5: "Thứ 5",
    6: "Thứ 6",
    7: "Thứ 7",
    8: "Chủ nhật",
};

const getDayOfWeek = (value: Date | string | undefined) => {
    if (!value) return 0;
    const day = new Date(value).getDay();
    return day === 0 ? 8 : day + 1;
};

const formatDay = (dayOfWeek: number) => DAY_LABELS[dayOfWeek] || "Chưa rõ";

const getRoomName = (schedule: any) => {
    if (typeof schedule?.room === "string" && schedule.room.trim()) {
        return schedule.room;
    }

    return schedule?.room?.name || schedule?.roomName || "Chưa xếp phòng";
};

const getSchedules = (target: any) => {
    const rawSchedules =
        Array.isArray(target?.schedules) && target.schedules.length > 0
            ? target.schedules
            : Array.isArray(target?.sessions)
                ? target.sessions
                : [];

    return rawSchedules
        .map((schedule: any) => ({
            dayOfWeek: Number(schedule.dayOfWeek || getDayOfWeek(schedule.date)),
            startShift: Number(schedule.startShift || schedule.startPeriod || 0),
            endShift: Number(schedule.endShift || schedule.endPeriod || 0),
            roomName: getRoomName(schedule),
        }))
        .filter((schedule: any) => schedule.dayOfWeek && schedule.startShift && schedule.endShift)
        .sort((left: any, right: any) => {
            if (left.dayOfWeek !== right.dayOfWeek) {
                return left.dayOfWeek - right.dayOfWeek;
            }
            return left.startShift - right.startShift;
        });
};

const formatScheduleList = (target: any) => {
    const schedules = getSchedules(target);
    if (!schedules.length) {
        return ["Chưa có lịch học"];
    }

    return schedules.map(
        (schedule: any) =>
            `${formatDay(schedule.dayOfWeek)} • Tiết ${schedule.startShift}-${schedule.endShift} • ${schedule.roomName}`,
    );
};

const formatSemester = (semester: any) => {
    if (!semester) return "Chưa xác định";
    const code = `${semester.code || ""}`.trim();
    const name = `${semester.name || ""}`.trim();

    if (code && name) {
        return `${code} - ${name}`;
    }

    return code || name || "Chưa xác định";
};

const getSubjectSelection = (subject: any) => ({
    subjectId: subject?.subjectId || subject?.id || "",
    subjectCode: subject?.subjectCode || subject?.code || "",
    subjectName: subject?.subjectName || subject?.name || "Môn học",
    semesterId: subject?.semesterId || subject?.semester?.id || "",
});

const buildConflictMessage = (
    candidateClass: any,
    enrolledCourses: any[],
    excludedClassId?: string | null,
) => {
    const candidateSchedules = getSchedules(candidateClass);

    for (const enrollment of enrolledCourses) {
        const currentClass = enrollment?.courseClass;
        const currentClassId = enrollment?.courseClassId || currentClass?.id;

        if (excludedClassId && currentClassId === excludedClassId) {
            continue;
        }

        const currentSchedules = getSchedules(currentClass);

        for (const candidate of candidateSchedules) {
            for (const current of currentSchedules) {
                if (candidate.dayOfWeek !== current.dayOfWeek) {
                    continue;
                }

                const hasOverlap =
                    Math.max(candidate.startShift, current.startShift) <=
                    Math.min(candidate.endShift, current.endShift);

                if (hasOverlap) {
                    return `Trùng lịch với ${currentClass?.subject?.name || currentClass?.code || "lớp đang học"} (${formatDay(candidate.dayOfWeek)}, tiết ${current.startShift}-${current.endShift}).`;
                }
            }
        }
    }

    return null;
};

const extractErrorMessage = (error: any, fallback: string) => {
    const apiMessage = error?.response?.data?.message;
    if (Array.isArray(apiMessage)) {
        return apiMessage.join(", ");
    }

    if (typeof apiMessage === "string" && apiMessage.trim()) {
        return apiMessage;
    }

    if (!error?.response) {
        return "Không kết nối được đến máy chủ. Vui lòng kiểm tra API gateway và thử lại.";
    }

    return error?.message || fallback;
};

export default function EnrollPage() {
    const router = useRouter();

    const [studentId, setStudentId] = useState("");
    const [semester, setSemester] = useState<any>(null);
    const [registrationStatus, setRegistrationStatus] = useState<any[]>([]);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectSelection | null>(null);
    const [switchingFromClassId, setSwitchingFromClassId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [submittingClassId, setSubmittingClassId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice>(null);

    const loadOverview = async (currentStudentId: string) => {
        setLoading(true);
        setNotice(null);

        try {
            const response = await api.get(
                `/api/enrollments/registration-overview/${currentStudentId}`,
            );

            setSemester(response.data?.semester || null);
            setRegistrationStatus(
                Array.isArray(response.data?.registrationStatus)
                    ? response.data.registrationStatus
                    : [],
            );
            setEnrolledCourses(
                Array.isArray(response.data?.enrolledCourses)
                    ? response.data.enrolledCourses
                    : [],
            );
        } catch (error: any) {
            try {
                const [enrollmentResponse, statusResponse] = await Promise.allSettled([
                    api.get(`/api/enrollments/student/${currentStudentId}`),
                    api.get(`/api/enrollments/registration-status/${currentStudentId}`),
                ]);

                setSemester(null);
                setEnrolledCourses(
                    enrollmentResponse.status === "fulfilled" &&
                        Array.isArray(enrollmentResponse.value.data)
                        ? enrollmentResponse.value.data
                        : [],
                );
                setRegistrationStatus(
                    statusResponse.status === "fulfilled" &&
                        Array.isArray(statusResponse.value.data)
                        ? statusResponse.value.data
                        : [],
                );

                setNotice({
                    type: "error",
                    text: extractErrorMessage(
                        error,
                        "Không tải đầy đủ dữ liệu đăng ký học phần.",
                    ),
                });
            } catch {
                setNotice({
                    type: "error",
                    text: extractErrorMessage(
                        error,
                        "Không tải được dữ liệu đăng ký học phần.",
                    ),
                });
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const bootstrap = async () => {
            const context = await resolveCurrentStudentContext();
            if (!context.studentId) {
                router.push("/login");
                return;
            }

            setStudentId(context.studentId);
            await loadOverview(context.studentId);
        };

        void bootstrap();
    }, [router]);

    const openClassPicker = async (
        subject: any,
        currentClassId?: string | null,
        semesterId?: string | null,
    ) => {
        const normalizedSubject = getSubjectSelection(subject);
        if (!normalizedSubject.subjectId) {
            setNotice({
                type: "error",
                text: "Không xác định được môn học để tải danh sách lớp.",
            });
            return;
        }

        setSelectedSubject(normalizedSubject);
        setSwitchingFromClassId(currentClassId || null);
        setAvailableClasses([]);
        setLoadingClasses(true);
        setNotice(null);

        try {
            const query = semesterId || normalizedSubject.semesterId
                ? `?semesterId=${encodeURIComponent(
                    `${semesterId || normalizedSubject.semesterId || ""}`,
                )}`
                : "";
            const response = await api.get(
                `/api/enrollments/subject/${normalizedSubject.subjectId}/classes${query}`,
            );
            setAvailableClasses(Array.isArray(response.data) ? response.data : []);
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(
                    error,
                    "Không tải được danh sách lớp học phần.",
                ),
            });
        } finally {
            setLoadingClasses(false);
        }
    };

    const closeClassPicker = () => {
        setSelectedSubject(null);
        setSwitchingFromClassId(null);
        setAvailableClasses([]);
        setSubmittingClassId(null);
    };

    const handleSelectClass = async (classId: string) => {
        if (!studentId) return;

        setSubmittingClassId(classId);
        setNotice(null);

        try {
            if (switchingFromClassId) {
                await api.post("/api/enrollments/switch", {
                    studentId,
                    oldClassId: switchingFromClassId,
                    newClassId: classId,
                });
                setNotice({
                    type: "success",
                    text: "Chuyển lớp thành công.",
                });
            } else {
                await api.post("/api/enrollments", {
                    studentId,
                    classId,
                });
                setNotice({
                    type: "success",
                    text: "Đăng ký học phần thành công.",
                });
            }

            closeClassPicker();
            await loadOverview(studentId);
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không thể thực hiện thao tác."),
            });
        } finally {
            setSubmittingClassId(null);
        }
    };

    const handleDropEnrollment = async (enrollmentId: string) => {
        if (!confirm("Bạn có chắc chắn muốn hủy đăng ký học phần này?")) {
            return;
        }

        setNotice(null);

        try {
            await api.delete(`/api/enrollments/${enrollmentId}`);
            setNotice({
                type: "success",
                text: "Hủy đăng ký thành công.",
            });
            await loadOverview(studentId);
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không thể hủy đăng ký."),
            });
        }
    };

    const sourceEnrollment = useMemo(() => {
        return (
            enrolledCourses.find((enrollment) => {
                const currentClassId =
                    enrollment?.courseClassId || enrollment?.courseClass?.id;
                return currentClassId === switchingFromClassId;
            }) || null
        );
    }, [enrolledCourses, switchingFromClassId]);

    const classOptions = useMemo(() => {
        return availableClasses.map((courseClass) => {
            const isCurrentClass =
                (courseClass?.id || "") === (switchingFromClassId || "");
            const isFull =
                Number(courseClass?.currentSlots || 0) >=
                Number(courseClass?.maxSlots || 0);
            const conflictMessage = buildConflictMessage(
                courseClass,
                enrolledCourses,
                switchingFromClassId,
            );

            return {
                ...courseClass,
                isCurrentClass,
                isFull,
                conflictMessage,
                canSelect: !isCurrentClass && !isFull && !conflictMessage,
            };
        });
    }, [availableClasses, enrolledCourses, switchingFromClassId]);

    const availableSubjects = useMemo(() => {
        return registrationStatus.filter((item) => !item.isPassed && !item.isEnrolled);
    }, [registrationStatus]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 px-4 py-12">
                <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
                    Đang tải dữ liệu đăng ký học phần...
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold text-gray-900">
                        Đăng ký học phần
                    </h1>
                    <p className="text-sm text-gray-600">
                        Dữ liệu được ưu tiên theo các lớp sinh viên đang học hiện tại.
                        Có thể đổi sang lớp khác nếu không trùng lịch và lớp còn chỗ.
                    </p>
                    {semester && (
                        <p className="text-sm text-gray-500">
                            Đợt đăng ký hiện hành: {formatSemester(semester)}
                        </p>
                    )}
                </header>

                {notice && (
                    <div
                        className={`rounded-lg border px-4 py-3 text-sm ${
                            notice.type === "success"
                                ? "border-green-200 bg-green-50 text-green-700"
                                : "border-red-200 bg-red-50 text-red-700"
                        }`}
                    >
                        {notice.text}
                    </div>
                )}

                <section className="rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Lớp học phần đang tham gia
                        </h2>
                    </div>

                    {enrolledCourses.length === 0 ? (
                        <div className="px-5 py-8 text-sm text-gray-500">
                            Chưa có học phần nào trong học kỳ hiện tại.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {enrolledCourses.map((enrollment) => (
                                <div
                                    key={enrollment.id}
                                    className="space-y-4 px-5 py-4 md:flex md:items-start md:justify-between md:space-y-0"
                                >
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                {enrollment.courseClass?.code}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {enrollment.courseClass?.subject?.name}
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600">
                                            {formatScheduleList(enrollment.courseClass).map((line) => (
                                                <div key={line}>{line}</div>
                                            ))}
                                        </div>

                                        <div className="text-sm text-gray-500">
                                            Giảng viên:{" "}
                                            {enrollment.courseClass?.lecturer?.fullName ||
                                                "Chưa phân công"}
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                openClassPicker(
                                                    enrollment.courseClass?.subject,
                                                    enrollment.courseClassId,
                                                    enrollment.courseClass?.semesterId ||
                                                        enrollment.courseClass?.semester?.id,
                                                )
                                            }
                                            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            Đổi lớp
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDropEnrollment(enrollment.id)}
                                            className="rounded border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                        >
                                            Hủy đăng ký
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="rounded-lg border border-gray-200 bg-white">
                    <div className="border-b border-gray-200 px-5 py-4">
                        <h2 className="text-base font-semibold text-gray-900">
                            Môn có thể đăng ký thêm
                        </h2>
                    </div>

                    {availableSubjects.length === 0 ? (
                        <div className="px-5 py-8 text-sm text-gray-500">
                            Không có môn học nào sẵn sàng để đăng ký thêm.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {availableSubjects.map((subject) => (
                                <div
                                    key={subject.subjectId}
                                    className="space-y-3 px-5 py-4 md:flex md:items-start md:justify-between md:space-y-0"
                                >
                                    <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                {subject.subjectCode}
                                            </span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {subject.subjectName}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {subject.credits} tín chỉ
                                            </span>
                                        </div>

                                        <div className="text-sm text-gray-600">
                                            {subject.isEligible
                                                ? "Đủ điều kiện đăng ký."
                                                : `Thiếu điều kiện tiên quyết: ${subject.missingPrereqs?.join(", ") || "Không xác định"}.`}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        disabled={!subject.isEligible}
                                        onClick={() =>
                                            openClassPicker(
                                                subject,
                                                null,
                                                subject.semesterId || semester?.id || null,
                                            )
                                        }
                                        className={`rounded border px-3 py-2 text-sm ${
                                            subject.isEligible
                                                ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                                : "cursor-not-allowed border-gray-200 text-gray-400"
                                        }`}
                                    >
                                        Xem lớp
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {selectedSubject && (
                <div className="fixed inset-0 z-50 bg-black/30 px-4 py-8">
                    <div className="mx-auto max-w-4xl rounded-lg border border-gray-200 bg-white shadow-sm">
                        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {switchingFromClassId ? "Chọn lớp để đổi" : "Chọn lớp để đăng ký"}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {selectedSubject.subjectCode
                                        ? `${selectedSubject.subjectCode} - ${selectedSubject.subjectName}`
                                        : selectedSubject.subjectName}
                                </p>
                                {sourceEnrollment && (
                                    <p className="text-sm text-gray-500">
                                        Lớp hiện tại: {sourceEnrollment.courseClass?.code}
                                    </p>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={closeClassPicker}
                                className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                Đóng
                            </button>
                        </div>

                        <div className="max-h-[70vh] overflow-y-auto">
                            {loadingClasses ? (
                                <div className="px-5 py-8 text-sm text-gray-600">
                                    Đang tải danh sách lớp...
                                </div>
                            ) : classOptions.length === 0 ? (
                                <div className="px-5 py-8 text-sm text-gray-500">
                                    Không có lớp học phần nào phù hợp trong học kỳ hiện tại.
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {classOptions.map((courseClass) => (
                                        <div
                                            key={courseClass.id}
                                            className="space-y-3 px-5 py-4 md:flex md:items-start md:justify-between md:space-y-0"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700">
                                                        {courseClass.code}
                                                    </span>

                                                    {courseClass.isCurrentClass && (
                                                        <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600">
                                                            Lớp hiện tại
                                                        </span>
                                                    )}

                                                    {courseClass.isFull && !courseClass.isCurrentClass && (
                                                        <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600">
                                                            Hết chỗ
                                                        </span>
                                                    )}

                                                    {courseClass.conflictMessage && (
                                                        <span className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600">
                                                            Trùng lịch
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="text-sm text-gray-600">
                                                    {formatScheduleList(courseClass).map((line) => (
                                                        <div key={`${courseClass.id}-${line}`}>{line}</div>
                                                    ))}
                                                </div>

                                                <div className="text-sm text-gray-500">
                                                    Giảng viên:{" "}
                                                    {courseClass.lecturer?.fullName || "Chưa phân công"}
                                                </div>

                                                <div className="text-sm text-gray-500">
                                                    Sĩ số: {courseClass.currentSlots}/{courseClass.maxSlots}
                                                </div>

                                                {courseClass.conflictMessage && (
                                                    <div className="text-sm text-red-600">
                                                        {courseClass.conflictMessage}
                                                    </div>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                disabled={
                                                    !courseClass.canSelect ||
                                                    submittingClassId === courseClass.id
                                                }
                                                onClick={() => handleSelectClass(courseClass.id)}
                                                className={`rounded border px-3 py-2 text-sm ${
                                                    courseClass.canSelect
                                                        ? "border-gray-300 text-gray-700 hover:bg-gray-50"
                                                        : "cursor-not-allowed border-gray-200 text-gray-400"
                                                }`}
                                            >
                                                {submittingClassId === courseClass.id
                                                    ? "Đang xử lý..."
                                                    : switchingFromClassId
                                                        ? "Chuyển sang lớp này"
                                                        : "Đăng ký lớp này"}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
