"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { resolveCurrentStudentContext } from "@/lib/current-student";

type RegistrationMode = "new" | "retake" | "improve";

type Notice = {
    type: "success" | "error";
    text: string;
} | null;

type SubjectSelection = {
    subjectId: string;
    subjectCode: string;
    subjectName: string;
    semesterId?: string;
    credits?: number;
    isRequired?: boolean;
    totalScore10?: number | null;
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

const MODE_OPTIONS: Array<{ value: RegistrationMode; label: string; description: string }> = [
    {
        value: "new",
        label: "Học mới",
        description: "Môn trong kế hoạch chưa đạt/chưa học.",
    },
    {
        value: "retake",
        label: "Học lại",
        description: "Môn bắt buộc đã trượt, cần đăng ký học lại.",
    },
    {
        value: "improve",
        label: "Học cải thiện",
        description: "Môn đã đạt nhưng muốn cải thiện GPA.",
    },
];

const getDayOfWeek = (value: Date | string | undefined) => {
    if (!value) return 0;
    const day = new Date(value).getDay();
    return day === 0 ? 8 : day + 1;
};

const formatDay = (dayOfWeek: number) => DAY_LABELS[dayOfWeek] || "Chưa rõ";

const getRoomName = (schedule: any) => {
    if (typeof schedule?.room === "string" && schedule.room.trim()) return schedule.room;
    return schedule?.room?.name || schedule?.roomName || "Chưa xếp phòng";
};

const formatCompactDate = (value: unknown) => {
    if (!value) return "";
    const date = new Date(`${value}`);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
};

const getSchedules = (target: any) => {
    const rawSchedules =
        Array.isArray(target?.schedules) && target.schedules.length > 0
            ? target.schedules
            : Array.isArray(target?.sessions)
                ? target.sessions
                : [];

    const groupedSchedules = new Map<string, any>();

    for (const schedule of rawSchedules) {
        const normalized = {
            dayOfWeek: Number(schedule.dayOfWeek || getDayOfWeek(schedule.date)),
            startShift: Number(schedule.startShift || schedule.startPeriod || 0),
            endShift: Number(schedule.endShift || schedule.endPeriod || 0),
            roomName: getRoomName(schedule),
            type: `${schedule.type || "LECTURE"}`.trim().toUpperCase(),
            date: schedule.date,
        };

        if (!normalized.dayOfWeek || !normalized.startShift || !normalized.endShift) continue;

        const key = [
            normalized.dayOfWeek,
            normalized.startShift,
            normalized.endShift,
            normalized.type,
            normalized.roomName.trim().toLowerCase(),
        ].join("|");
        const existing = groupedSchedules.get(key);
        const dateTime = normalized.date ? new Date(normalized.date).getTime() : 0;

        if (!existing) {
            groupedSchedules.set(key, {
                ...normalized,
                firstDate: normalized.date || null,
                lastDate: normalized.date || null,
                firstTime: dateTime,
                lastTime: dateTime,
            });
            continue;
        }

        if (dateTime && (!existing.firstTime || dateTime < existing.firstTime)) {
            existing.firstDate = normalized.date;
            existing.firstTime = dateTime;
        }
        if (dateTime && (!existing.lastTime || dateTime > existing.lastTime)) {
            existing.lastDate = normalized.date;
            existing.lastTime = dateTime;
        }
    }

    return [...groupedSchedules.values()].sort((left: any, right: any) => {
        if (left.dayOfWeek !== right.dayOfWeek) return left.dayOfWeek - right.dayOfWeek;
        if (left.startShift !== right.startShift) return left.startShift - right.startShift;
        return `${left.roomName}`.localeCompare(`${right.roomName}`, "vi");
    });
};

const formatScheduleList = (target: any) => {
    const schedules = getSchedules(target);
    if (!schedules.length) return ["Chưa có lịch học"];

    return schedules.map((schedule: any) => {
        const firstDate = formatCompactDate(schedule.firstDate);
        const lastDate = formatCompactDate(schedule.lastDate);
        const dateRange = firstDate && lastDate && firstDate !== lastDate
            ? ` | ${firstDate} - ${lastDate}`
            : firstDate
                ? ` | ${firstDate}`
                : "";

        const typeLabel = schedule.type === "PRACTICE" ? "TH" : "LT";
        return `${typeLabel} - ${formatDay(schedule.dayOfWeek)} (Tiết ${schedule.startShift} -> ${schedule.endShift}) | ${schedule.roomName}${dateRange}`;
    });
};

const formatSemester = (semester: any) => {
    if (!semester) return "Chưa xác định";
    const code = `${semester.code || ""}`.trim();
    const name = `${semester.name || ""}`.trim();
    const codeSemester = code.match(/HK_?(\d+)/i)?.[1] || code.match(/HK(\d+)/i)?.[1];
    const nameSemester = name.match(/HK\s*0?(\d+)/i)?.[1];
    if (codeSemester && nameSemester && Number(codeSemester) === Number(nameSemester)) return name;
    if (code && name) return `${code} - ${name}`;
    return code || name || "Chưa xác định";
};

const formatSemesterDateRange = (semester: any) => {
    const startDate = formatCompactDate(semester?.startDate);
    const endDate = formatCompactDate(semester?.endDate);
    if (startDate && endDate) return `${startDate} - ${endDate}`;
    return startDate || endDate || "";
};

const formatScore = (value: unknown) => {
    const score = Number(value);
    if (!Number.isFinite(score)) return "";
    return score.toLocaleString("vi-VN", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    });
};

const formatMoney = (value: unknown) =>
    Number(value || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 });

const formatDate = (value: unknown) => {
    return formatCompactDate(value);
};

const isRegularSemester = (semester: any) => {
    const text = `${semester?.code || ""} ${semester?.name || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
    return !/(hoc\s*ky\s*phu|hockyphu|he|summer|phu)/.test(text);
};

const normalizeCohortCode = (value?: string | null) => {
    const raw = `${value || ""}`.trim().toUpperCase();
    if (!raw) return null;

    const direct = raw.match(/^K?(\d{1,2})$/);
    if (direct) return `K${Number(direct[1])}`;

    const kMatch = raw.match(/\bK(\d{1,2})\b/);
    if (kMatch) return `K${Number(kMatch[1])}`;

    const legacyClass = raw.match(/^(\d{2})A[12]/);
    if (legacyClass) return `K${Number(legacyClass[1])}`;

    const studentCode = raw.match(/^SVK?(\d{2})/);
    if (studentCode) return `K${Number(studentCode[1])}`;

    return null;
};

const resolveStudentCohortCode = (student: any) => {
    const candidates = [
        student?.intake,
        student?.adminClass?.cohort,
        student?.adminClass?.code,
        student?.studentCode,
        student?.student?.studentCode,
    ];

    for (const candidate of candidates) {
        const cohortCode = normalizeCohortCode(candidate);
        if (cohortCode) return cohortCode;
    }

    return null;
};

const resolveStudentCohortStartYear = (student: any) => {
    const cohortCode = resolveStudentCohortCode(student);
    const cohortNumber = Number(`${cohortCode || ""}`.replace(/\D/g, ""));
    if (Number.isFinite(cohortNumber) && cohortNumber > 0) {
        return cohortNumber >= 2000 ? cohortNumber : 2006 + cohortNumber;
    }

    const admissionDate = parseDateOnly(student?.admissionDate);
    return admissionDate ? admissionDate.getFullYear() : null;
};

const isSemesterInCohortWindow = (semester: any, startYear: number | null) => {
    if (!startYear) return true;

    const startDate = parseDateOnly(semester?.startDate);
    const endDate = parseDateOnly(semester?.endDate);
    const windowStart = new Date(startYear, 7, 1);
    const windowEnd = new Date(startYear + 4, 7, 31, 23, 59, 59);

    if (startDate) {
        const compareDate = endDate || startDate;
        return compareDate >= windowStart && startDate <= windowEnd;
    }

    const semesterYear = Number(semester?.year || 0);
    return semesterYear >= startYear && semesterYear <= startYear + 4;
};

const getCohortSemesterSlot = (semester: any, startYear: number | null) => {
    if (!startYear) return null;

    const startDate = parseDateOnly(semester?.startDate);
    const endDate = parseDateOnly(semester?.endDate);
    if (!startDate) return null;

    const compareDate = endDate || startDate;
    for (let yearIndex = 0; yearIndex < 4; yearIndex += 1) {
        const academicStartYear = startYear + yearIndex;
        const oddSemester = yearIndex * 2 + 1;
        const evenSemester = yearIndex * 2 + 2;
        const firstStart = new Date(academicStartYear, 8, 1);
        const firstEnd = new Date(academicStartYear + 1, 0, 31, 23, 59, 59);
        const secondStart = new Date(academicStartYear + 1, 1, 1);
        const secondEnd = new Date(academicStartYear + 1, 6, 31, 23, 59, 59);

        if (compareDate >= firstStart && startDate <= firstEnd) {
            return {
                semesterNumber: oddSemester,
                studyYear: yearIndex + 1,
                academicYearLabel: `${academicStartYear}-${academicStartYear + 1}`,
                standardStartDate: firstStart,
                standardEndDate: new Date(academicStartYear + 1, 0, 20),
            };
        }

        if (compareDate >= secondStart && startDate <= secondEnd) {
            return {
                semesterNumber: evenSemester,
                studyYear: yearIndex + 1,
                academicYearLabel: `${academicStartYear}-${academicStartYear + 1}`,
                standardStartDate: secondStart,
                standardEndDate: new Date(academicStartYear + 1, 5, 30),
            };
        }
    }

    return null;
};

const normalizeSemesterForCohort = (semester: any, cohortCode: string | null, startYear: number | null) => {
    const slot = getCohortSemesterSlot(semester, startYear);
    if (!slot) return semester;

    const baseYear = startYear || 0;
    return {
        ...semester,
        code: `${cohortCode || "KHOA"}_HK${slot.semesterNumber}`,
        name: `HK${slot.semesterNumber} - Năm ${slot.studyYear} (${slot.academicYearLabel})`,
        year: slot.semesterNumber % 2 === 1 ? baseYear + slot.studyYear - 1 : baseYear + slot.studyYear,
        startDate: slot.standardStartDate,
        endDate: slot.standardEndDate,
        semesterNumber: slot.semesterNumber,
        cohortSemesterNumber: slot.semesterNumber,
        cohortStudyYear: slot.studyYear,
        cohortAcademicYear: slot.academicYearLabel,
    };
};

const normalizeStudentSemesters = (items: any[], student?: any) => {
    const cohortStartYear = resolveStudentCohortStartYear(student);
    const cohortCode = resolveStudentCohortCode(student);
    const semesterBySlot = new Map<number, any>();
    const seenSemesterIds = new Set<string>();

    for (const semester of items || []) {
        if (
            !semester?.id ||
            seenSemesterIds.has(semester.id) ||
            !isRegularSemester(semester) ||
            !isSemesterInCohortWindow(semester, cohortStartYear)
        ) {
            continue;
        }

        seenSemesterIds.add(semester.id);
        const normalizedSemester = normalizeSemesterForCohort(semester, cohortCode, cohortStartYear);
        const slot = Number(normalizedSemester?.cohortSemesterNumber || 0);
        if (slot >= 1 && slot <= 8 && !semesterBySlot.has(slot)) {
            semesterBySlot.set(slot, normalizedSemester);
        }
    }

    return [...semesterBySlot.values()]
        .sort((left, right) => {
            const leftTime = left?.startDate ? new Date(left.startDate).getTime() : 0;
            const rightTime = right?.startDate ? new Date(right.startDate).getTime() : 0;
            return rightTime - leftTime;
        })
        .slice(0, 8);
};

const parseDateOnly = (value: unknown) => {
    if (!value) return null;
    const text = `${value}`;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
        return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }

    const date = new Date(text);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const toDateInputValue = (value: unknown) => {
    const date = parseDateOnly(value) || new Date();
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const isDateInSemester = (dateValue: unknown, targetSemester: any) => {
    const target = parseDateOnly(dateValue);
    const startDate = parseDateOnly(targetSemester?.startDate);
    const endDate = parseDateOnly(targetSemester?.endDate);
    if (!target || !startDate || !endDate) return false;
    return target >= startDate && target <= endDate;
};

const findSemesterByDate = (dateValue: unknown, semesterList: any[]) =>
    semesterList.find((item) => isDateInSemester(dateValue, item)) || null;

const isRegistrationWindowOpen = (targetSemester: any) => {
    if (!targetSemester) return false;
    if (targetSemester.isRegistering) return true;

    const now = new Date();
    const startDate = targetSemester.registerStartDate
        ? new Date(targetSemester.registerStartDate)
        : null;
    const endDate = targetSemester.registerEndDate
        ? new Date(targetSemester.registerEndDate)
        : null;

    if (!startDate && !endDate) return false;
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;
    return true;
};

const getRegistrationWindowText = (targetSemester: any) => {
    if (!targetSemester) return "Chưa xác định học kỳ.";
    if (isRegistrationWindowOpen(targetSemester)) return "Cổng đăng ký/đổi lịch đang mở.";

    const startDate = formatCompactDate(targetSemester.registerStartDate);
    const endDate = formatCompactDate(targetSemester.registerEndDate);
    if (startDate || endDate) {
        return `Cổng đăng ký/đổi lịch đã khóa${startDate || endDate ? ` (${startDate || "..."} - ${endDate || "..."})` : ""}.`;
    }

    return "Cổng đăng ký/đổi lịch đã khóa.";
};

const getInitialDateForSemesters = (semesterList: any[], preferredSemester: any) => {
    const today = toDateInputValue(new Date());
    if (findSemesterByDate(today, semesterList)) return today;

    const preferred =
        semesterList.find((item) => item.id === preferredSemester?.id) ||
        semesterList.find((item) => item.isRegistering || item.isCurrent) ||
        semesterList[0] ||
        preferredSemester ||
        null;

    return toDateInputValue(preferred?.startDate || new Date());
};

const getSubjectSelection = (subject: any): SubjectSelection => ({
    subjectId: subject?.subjectId || subject?.id || "",
    subjectCode: subject?.subjectCode || subject?.code || "",
    subjectName: subject?.subjectName || subject?.name || "Môn học",
    semesterId: subject?.semesterId || subject?.semester?.id || "",
    credits: Number(subject?.credits || 0),
    isRequired: Boolean(subject?.isRequired),
    totalScore10:
        subject?.totalScore10 === null || subject?.totalScore10 === undefined
            ? null
            : Number(subject.totalScore10),
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
        if (excludedClassId && currentClassId === excludedClassId) continue;

        const currentSchedules = getSchedules(currentClass);
        for (const candidate of candidateSchedules) {
            for (const current of currentSchedules) {
                if (candidate.dayOfWeek !== current.dayOfWeek) continue;

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
    if (Array.isArray(apiMessage)) return apiMessage.join(", ");
    if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage;
    if (!error?.response) return "Không kết nối được đến máy chủ. Vui lòng kiểm tra API gateway và thử lại.";
    return error?.message || fallback;
};

export default function EnrollPage() {
    const router = useRouter();

    const [studentId, setStudentId] = useState("");
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(() => toDateInputValue(new Date()));
    const [selectedSemesterId, setSelectedSemesterId] = useState("");
    const [semester, setSemester] = useState<any>(null);
    const [registrationMode, setRegistrationMode] = useState<RegistrationMode>("new");
    const [registrationStatus, setRegistrationStatus] = useState<any[]>([]);
    const [grades, setGrades] = useState<any[]>([]);
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);
    const [availableClasses, setAvailableClasses] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<SubjectSelection | null>(null);
    const [selectedClassId, setSelectedClassId] = useState("");
    const [switchingFromClassId, setSwitchingFromClassId] = useState<string | null>(null);
    const [hideConflictClasses, setHideConflictClasses] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingClasses, setLoadingClasses] = useState(false);
    const [submittingClassId, setSubmittingClassId] = useState<string | null>(null);
    const [notice, setNotice] = useState<Notice>(null);

    const gradeBySubject = useMemo(() => {
        const map = new Map<string, any>();
        for (const grade of grades || []) {
            const subjectId = grade?.subjectId || grade?.subject?.id;
            if (!subjectId) continue;

            const current = map.get(subjectId);
            const currentScore = Number(current?.totalScore10 ?? -1);
            const nextScore = Number(grade?.totalScore10 ?? -1);
            if (!current || nextScore > currentScore) map.set(subjectId, grade);
        }
        return map;
    }, [grades]);

    const enrichSubjects = (items: any[]) =>
        items.map((item) => {
            const grade = gradeBySubject.get(item.subjectId);
            const totalScore10 =
                grade?.totalScore10 === null || grade?.totalScore10 === undefined
                    ? null
                    : Number(grade.totalScore10);
            const hasFinalScore = totalScore10 !== null && Number.isFinite(totalScore10);
            const isPassed = Boolean(item.isPassed || (hasFinalScore && totalScore10 >= 4));
            const isFailed = Boolean(hasFinalScore && totalScore10 < 4);

            return {
                ...item,
                totalScore10,
                hasFinalScore,
                isPassed,
                isFailed,
            };
        });

    const loadSemesterData = async (
        currentStudentId: string,
        semesterId?: string,
        knownSemesters: any[] = semesters,
    ) => {
        setLoading(true);
        setNotice(null);
        setSelectedSubject(null);
        setSelectedClassId("");
        setAvailableClasses([]);
        setSwitchingFromClassId(null);

        try {
            if (!semesterId) {
                setSemester(null);
                setRegistrationStatus([]);
                setEnrolledCourses([]);
                setNotice({
                    type: "error",
                    text: "Ngày đã chọn không thuộc 8 học kỳ chính quy của khóa sinh viên.",
                });
                return;
            }

            const query = semesterId ? `?semesterId=${encodeURIComponent(semesterId)}` : "";
            const [statusResponse, enrolledResponse] = await Promise.all([
                api.get(`/api/enrollments/registration-status/${currentStudentId}${query}`),
                api.get(`/api/enrollments/student/${currentStudentId}${query}`),
            ]);

            const selectedSemester =
                knownSemesters.find((item) => item.id === semesterId) ||
                findSemesterByDate(selectedDate, knownSemesters) ||
                null;

            setSemester(selectedSemester);
            setRegistrationStatus(Array.isArray(statusResponse.data) ? statusResponse.data : []);
            setEnrolledCourses(Array.isArray(enrolledResponse.data) ? enrolledResponse.data : []);
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không tải được dữ liệu đăng ký học phần."),
            });
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
            setLoading(true);

            try {
                const [overviewResponse, semestersResponse, gradesResponse] = await Promise.all([
                    api.get(`/api/enrollments/registration-overview/${context.studentId}`),
                    api.get(`/api/enrollments/semesters/student/${context.studentId}`).catch(() => ({ data: [] })),
                    api.get(`/api/grades/student/${context.studentId}`).catch(() => ({ data: [] })),
                ]);

                const semesterList = normalizeStudentSemesters(
                    Array.isArray(semestersResponse.data) ? semestersResponse.data : [],
                    context.profile || context.sessionUser,
                );
                const overviewSemester = overviewResponse.data?.semester || null;
                const initialDate = getInitialDateForSemesters(semesterList, overviewSemester);
                const activeSemester =
                    findSemesterByDate(initialDate, semesterList) ||
                    semesterList.find((item) => item.id === overviewSemester?.id) ||
                    semesterList.find((item) => item.isRegistering || item.isCurrent) ||
                    semesterList[0] ||
                    overviewSemester ||
                    null;
                let registrationStatus = Array.isArray(overviewResponse.data?.registrationStatus)
                    ? overviewResponse.data.registrationStatus
                    : [];
                let enrolledCourses = Array.isArray(overviewResponse.data?.enrolledCourses)
                    ? overviewResponse.data.enrolledCourses
                    : [];

                if (activeSemester?.id && overviewSemester?.id !== activeSemester.id) {
                    const query = `?semesterId=${encodeURIComponent(activeSemester.id)}`;
                    const [statusResponse, enrolledResponse] = await Promise.all([
                        api.get(`/api/enrollments/registration-status/${context.studentId}${query}`),
                        api.get(`/api/enrollments/student/${context.studentId}${query}`),
                    ]);
                    registrationStatus = Array.isArray(statusResponse.data) ? statusResponse.data : [];
                    enrolledCourses = Array.isArray(enrolledResponse.data) ? enrolledResponse.data : [];
                }

                setSemesters(semesterList);
                setSelectedDate(initialDate);
                setSemester(activeSemester);
                setSelectedSemesterId(activeSemester?.id || "");
                setGrades(Array.isArray(gradesResponse.data) ? gradesResponse.data : []);
                setRegistrationStatus(registrationStatus);
                setEnrolledCourses(enrolledCourses);
            } catch (error: any) {
                setNotice({
                    type: "error",
                    text: extractErrorMessage(error, "Không tải được dữ liệu đăng ký học phần."),
                });
            } finally {
                setLoading(false);
            }
        };

        void bootstrap();
    }, [router]);

    const handleDateChange = async (dateValue: string) => {
        setSelectedDate(dateValue);
        const matchedSemester = findSemesterByDate(dateValue, semesters);
        setSelectedSemesterId(matchedSemester?.id || "");
        setSemester(matchedSemester);

        if (!matchedSemester) {
            setSelectedSubject(null);
            setSelectedClassId("");
            setAvailableClasses([]);
            setSwitchingFromClassId(null);
            setRegistrationStatus([]);
            setEnrolledCourses([]);
            setNotice({
                type: "error",
                text: "Ngày đã chọn không thuộc 8 học kỳ chính quy của khóa sinh viên.",
            });
            return;
        }

        if (studentId) await loadSemesterData(studentId, matchedSemester.id, semesters);
    };

    const openClassPicker = async (
        subject: any,
        currentClassId?: string | null,
        semesterId?: string | null,
    ) => {
        const normalizedSubject = getSubjectSelection(subject);
        if (!normalizedSubject.subjectId) {
            setNotice({ type: "error", text: "Không xác định được học phần để tải danh sách lớp." });
            return;
        }

        setSelectedSubject(normalizedSubject);
        setSwitchingFromClassId(currentClassId || null);
        setSelectedClassId("");
        setAvailableClasses([]);
        setLoadingClasses(true);
        setNotice(null);

        try {
            const targetSemesterId = semesterId || normalizedSubject.semesterId || selectedSemesterId;
            if (!targetSemesterId) {
                setNotice({
                    type: "error",
                    text: "Vui lòng chọn ngày thuộc học kỳ chính quy của khóa sinh viên trước khi xem lớp.",
                });
                return;
            }
            const query = targetSemesterId
                ? `?semesterId=${encodeURIComponent(`${targetSemesterId}`)}`
                : "";
            const response = await api.get(
                `/api/enrollments/subject/${normalizedSubject.subjectId}/classes${query}`,
            );
            const classes = Array.isArray(response.data) ? response.data : [];
            setAvailableClasses(classes);
            setSelectedClassId(classes[0]?.id || "");
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không tải được danh sách lớp học phần."),
            });
        } finally {
            setLoadingClasses(false);
        }
    };

    const handleSelectClass = async (classId: string) => {
        if (!studentId || !classId) return;
        const targetClass = availableClasses.find(c => c.id === classId);
        const isTargetClassOpen = `${targetClass?.status || "OPEN"}`.toUpperCase() === "OPEN";

        if (!canChangeSchedule && !isTargetClassOpen) {
            setNotice({
                type: "error",
                text: "Học kỳ này đã khóa đăng ký/ghi danh nên không thể đăng ký lớp học này.",
            });
            return;
        }

        setSubmittingClassId(classId);
        setNotice(null);

        try {
            const successText = switchingFromClassId
                ? "Đổi lớp học phần thành công. Lịch học đã cập nhật và lớp cũ đã được xóa ghi danh."
                : "Đăng ký học phần thành công. Lịch học đã cập nhật.";

            if (switchingFromClassId) {
                await api.post("/api/enrollments/switch", {
                    studentId,
                    oldClassId: switchingFromClassId,
                    newClassId: classId,
                });
            } else {
                await api.post("/api/enrollments", { studentId, classId });
            }

            await loadSemesterData(studentId, selectedSemesterId, semesters);
            setNotice({ type: "success", text: successText });
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không thể đăng ký lớp học phần."),
            });
        } finally {
            setSubmittingClassId(null);
        }
    };

    const handleDropEnrollment = async (enrollmentId: string) => {
        const enrollment = enrolledCourses.find(e => e.id === enrollmentId);
        const isClassOpen = `${enrollment?.courseClass?.status || "OPEN"}`.toUpperCase() === "OPEN";

        if (!canChangeSchedule && !isClassOpen) {
            setNotice({
                type: "error",
                text: "Học kỳ này đã khóa đăng ký/ghi danh nên không thể hủy lớp học này.",
            });
            return;
        }
        if (!confirm("Bạn có chắc chắn muốn hủy đăng ký học phần này?")) return;
        setNotice(null);

        try {
            await api.delete(`/api/enrollments/${enrollmentId}`);
            await loadSemesterData(studentId, selectedSemesterId, semesters);
            setNotice({ type: "success", text: "Hủy đăng ký thành công. Lịch học đã cập nhật." });
        } catch (error: any) {
            setNotice({
                type: "error",
                text: extractErrorMessage(error, "Không thể hủy đăng ký."),
            });
        }
    };

    const enrichedSubjects = useMemo(
        () => enrichSubjects(registrationStatus),
        [registrationStatus, gradeBySubject],
    );

    const waitingSubjects = useMemo(() => {
        return enrichedSubjects.filter((subject) => {
            if (subject.isEnrolled) return false;
            if (registrationMode === "new") {
                return !subject.isPassed && !subject.isFailed && subject.isEligible;
            }
            if (registrationMode === "retake") {
                return subject.isRequired && subject.isFailed;
            }
            return subject.isPassed;
        });
    }, [enrichedSubjects, registrationMode]);

    const classOptions = useMemo(() => {
        const canChangeSchedule = isRegistrationWindowOpen(semester);
        const options = availableClasses.map((courseClass) => {
            const isCurrentClass = (courseClass?.id || "") === (switchingFromClassId || "");
            const maxSlots = Number(courseClass?.maxSlots || 0);
            const currentSlots = Number(courseClass?.currentSlots || 0);
            const isFull = maxSlots > 0 && currentSlots >= maxSlots;
            const isClassOpen = `${courseClass?.status || "OPEN"}`.toUpperCase() === "OPEN";
            const conflictMessage = buildConflictMessage(
                courseClass,
                enrolledCourses,
                switchingFromClassId,
            );

            return {
                ...courseClass,
                isCurrentClass,
                isClassOpen,
                isFull,
                conflictMessage,
                // Allow selecting as long as the class itself is OPEN (regardless of the registration window),
                // OR the registration window is open. Only block if both are closed.
                canSelect: (isClassOpen || canChangeSchedule) && !isCurrentClass && !isFull && !conflictMessage,
            };
        });

        return hideConflictClasses
            ? options.filter((item) => !item.conflictMessage && !item.isFull && item.isClassOpen)
            : options;
    }, [availableClasses, enrolledCourses, hideConflictClasses, semester, switchingFromClassId]);

    const selectedClass = useMemo(
        () => classOptions.find((item) => item.id === selectedClassId) || classOptions[0] || null,
        [classOptions, selectedClassId],
    );

    const totalCredits = enrolledCourses.reduce(
        (sum, enrollment) => sum + Number(enrollment?.courseClass?.subject?.credits || 0),
        0,
    );
    const totalTuition = enrolledCourses.reduce(
        (sum, enrollment) => sum + Number(enrollment?.tuitionFee || 0),
        0,
    );

    const getEnrollmentModeLabel = (enrollment: any) => {
        const subjectId = enrollment?.courseClass?.subjectId || enrollment?.courseClass?.subject?.id;
        const bestGrade = gradeBySubject.get(subjectId);
        const bestScore = Number(bestGrade?.totalScore10);
        if (enrollment?.isRetake && Number.isFinite(bestScore) && bestScore >= 4) {
            return "Học cải thiện";
        }
        if (enrollment?.isRetake) return "Học lại";
        return "Đăng ký mới";
    };

    const canChangeSchedule = isRegistrationWindowOpen(semester);
    const registrationWindowText = getRegistrationWindowText(semester);

    const dateBounds = useMemo(() => {
        const startDates = semesters
            .map((item) => parseDateOnly(item?.startDate))
            .filter(Boolean) as Date[];
        const endDates = semesters
            .map((item) => parseDateOnly(item?.endDate))
            .filter(Boolean) as Date[];

        if (!startDates.length || !endDates.length) {
            return { min: "", max: "" };
        }

        const minDate = new Date(Math.min(...startDates.map((item) => item.getTime())));
        const maxDate = new Date(Math.max(...endDates.map((item) => item.getTime())));
        return {
            min: toDateInputValue(minDate),
            max: toDateInputValue(maxDate),
        };
    }, [semesters]);

    return (
        <div className="min-h-screen bg-[#edf2f6] px-3 py-4 text-slate-700">
            <div className="mx-auto max-w-[1240px] rounded bg-white px-3 py-4 shadow-sm">
                <div className="border-b border-slate-200 pb-3">
                    <h1 className="text-[20px] font-bold text-slate-700">Đăng ký học phần</h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 py-4">
                    <div className="flex w-full max-w-[460px] flex-col gap-1">
                        <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                            Chọn ngày
                        </label>
                        <input
                            type="date"
                            value={selectedDate}
                            min={dateBounds.min}
                            max={dateBounds.max}
                            onChange={(event) => void handleDateChange(event.target.value)}
                            className="h-9 border border-slate-300 bg-white px-3 text-sm font-semibold outline-none"
                        />
                        <div className="text-xs text-slate-500">
                            {semester
                                ? `Dữ liệu ngày ${formatDate(selectedDate)} thuộc ${formatSemester(semester)}${formatSemesterDateRange(semester) ? ` (${formatSemesterDateRange(semester)})` : ""}.`
                                : "Ngày đã chọn không thuộc 8 học kỳ chính quy của khóa sinh viên."}
                        </div>
                        <div
                            className={`w-fit border px-2 py-1 text-xs font-bold ${
                                canChangeSchedule
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                    : "border-red-200 bg-red-50 text-red-700"
                            }`}
                        >
                            {registrationWindowText}
                            {!canChangeSchedule && (
                                <span className="ml-2 font-normal italic opacity-80">
                                    (Các lớp có trạng thái <span className="font-bold underline">OPEN</span> vẫn có thể đăng ký/đổi)
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-5 text-sm">
                        {MODE_OPTIONS.map((option) => (
                            <label key={option.value} className="inline-flex cursor-pointer items-center gap-2">
                                <span
                                    className={`h-4 w-4 rounded-full border ${
                                        registrationMode === option.value
                                            ? "border-slate-400 bg-slate-400"
                                            : "border-slate-300 bg-slate-200"
                                    }`}
                                />
                                <input
                                    type="radio"
                                    className="sr-only"
                                    checked={registrationMode === option.value}
                                    onChange={() => {
                                        setRegistrationMode(option.value);
                                        setSelectedSubject(null);
                                        setSelectedClassId("");
                                        setAvailableClasses([]);
                                        setSwitchingFromClassId(null);
                                    }}
                                />
                                {option.label}
                            </label>
                        ))}
                    </div>
                </div>

                {notice && (
                    <div
                        className={`mb-4 border px-3 py-2 text-sm ${
                            notice.type === "success"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-red-200 bg-red-50 text-red-700"
                        }`}
                    >
                        {notice.text}
                    </div>
                )}

                <section className="mb-7">
                    <h2 className="mb-2 border-l-2 border-rose-500 pl-2 text-[17px] font-bold text-[#0072bc]">
                        Môn học/học phần đang chờ đăng ký
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[#1687d9]">
                                    <th className="w-10 border border-slate-300 py-3"></th>
                                    <th className="w-14 border border-slate-300 py-3">STT</th>
                                    <th className="w-[150px] border border-slate-300 px-3 py-3">Mã học phần</th>
                                    <th className="border border-slate-300 px-3 py-3">Tên môn học/học phần</th>
                                    {registrationMode !== "new" && (
                                        <th className="w-32 border border-slate-300 px-3 py-3">Điểm tổng kết</th>
                                    )}
                                    <th className="w-16 border border-slate-300 px-3 py-3">TC</th>
                                    <th className="w-32 border border-slate-300 px-3 py-3">Bắt buộc</th>
                                    <th className="w-[280px] border border-slate-300 px-3 py-3">
                                        học phần: học trước (a),<br />tiên quyết (b),<br />song hành (c)
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={registrationMode !== "new" ? 8 : 7} className="border border-slate-300 py-6 text-center font-semibold">
                                            Đang tải dữ liệu đăng ký học phần...
                                        </td>
                                    </tr>
                                ) : waitingSubjects.length === 0 ? (
                                    <tr>
                                        <td colSpan={registrationMode !== "new" ? 8 : 7} className="border border-slate-300 py-4 text-center font-semibold text-slate-600">
                                            Không tìm thấy môn học/học phần đang chờ đăng ký
                                        </td>
                                    </tr>
                                ) : (
                                    waitingSubjects.map((subject, index) => {
                                        const selected = selectedSubject?.subjectId === subject.subjectId;
                                        return (
                                            <tr
                                                key={subject.subjectId}
                                                onClick={() => void openClassPicker(subject, null, subject.semesterId || selectedSemesterId)}
                                                className={`cursor-pointer ${selected ? "bg-[#fff8b8]" : "hover:bg-yellow-50"}`}
                                            >
                                                <td className="border border-slate-300 py-2 text-center">
                                                    <span className={`mx-auto block h-4 w-4 rounded-full ${selected ? "bg-slate-400" : "bg-slate-200"}`} />
                                                </td>
                                                <td className="border border-slate-300 py-2 text-center">{index + 1}</td>
                                                <td className="border border-slate-300 px-3 py-2 text-center">{subject.subjectCode}</td>
                                                <td className="border border-slate-300 px-3 py-2">{subject.subjectName}</td>
                                                {registrationMode !== "new" && (
                                                    <td className="border border-slate-300 px-3 py-2 text-center">
                                                        {formatScore(subject.totalScore10)}
                                                    </td>
                                                )}
                                                <td className="border border-slate-300 px-3 py-2 text-center">{subject.credits}</td>
                                                <td className="border border-slate-300 px-3 py-2 text-center">
                                                    {subject.isRequired ? (
                                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
                                                    ) : (
                                                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">×</span>
                                                    )}
                                                </td>
                                                <td className="border border-slate-300 px-3 py-2 text-center text-slate-500">
                                                    {subject.missingPrereqs?.length ? subject.missingPrereqs.join(", ") : ""}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                        {MODE_OPTIONS.find((item) => item.value === registrationMode)?.description}
                    </p>
                </section>

                {selectedSubject && (
                    <section className="mb-7 grid gap-4 lg:grid-cols-[1fr_1fr]">
                        <div>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                <h2 className="border-l-2 border-rose-500 pl-2 text-[17px] font-bold text-[#0072bc]">
                                    Lớp học phần chờ đăng ký
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => setHideConflictClasses((current) => !current)}
                                    className={`border px-3 py-2 text-xs font-bold ${
                                        hideConflictClasses
                                            ? "border-[#0072bc] bg-[#e8f4ff] text-[#0072bc]"
                                            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                                >
                                    {hideConflictClasses ? "Đang chỉ hiện lớp không trùng lịch" : "Chỉ hiện lớp không trùng lịch"}
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                    <thead>
                                        <tr className="bg-slate-50 text-[#1687d9]">
                                            <th className="w-14 border border-slate-300 py-3">STT</th>
                                            <th className="border border-slate-300 px-3 py-3">Thông tin lớp học phần</th>
                                            <th className="w-28 border border-slate-300 px-3 py-3">Đã đăng ký</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingClasses ? (
                                            <tr>
                                                <td colSpan={3} className="border border-slate-300 py-6 text-center font-semibold">
                                                    Đang tải danh sách lớp học phần...
                                                </td>
                                            </tr>
                                        ) : classOptions.length === 0 ? (
                                            <tr>
                                                <td colSpan={3} className="border border-slate-300 py-6 text-center font-semibold">
                                                    Không có lớp học phần phù hợp
                                                </td>
                                            </tr>
                                        ) : (
                                            classOptions.map((courseClass, index) => (
                                                <tr
                                                    key={courseClass.id}
                                                    onClick={() => setSelectedClassId(courseClass.id)}
                                                    className={`cursor-pointer ${selectedClass?.id === courseClass.id ? "bg-[#fff8b8]" : "hover:bg-yellow-50"}`}
                                                >
                                                    <td className="border border-slate-300 py-3 text-center">{index + 1}</td>
                                                    <td className="border border-slate-300 px-3 py-3">
                                                        <div className="font-bold text-slate-900">{selectedSubject.subjectName}</div>
                                                        <div>
                                                            Trạng thái:{" "}
                                                            <span className={courseClass.canSelect ? "text-green-600" : "text-red-600"}>
                                                                {courseClass.isCurrentClass
                                                                    ? "Lớp hiện tại"
                                                                    : !courseClass.isClassOpen && !canChangeSchedule
                                                                        ? "Đã khóa ghi danh"
                                                                        : !courseClass.isClassOpen
                                                                            ? "Lớp đã đóng"
                                                                        : courseClass.isFull
                                                                        ? "Đã đủ"
                                                                        : courseClass.conflictMessage
                                                                            ? "Trùng lịch"
                                                                            : "Ghi danh"}
                                                            </span>
                                                        </div>
                                                        <div>Mã lớp học phần: {courseClass.code}</div>
                                                        {courseClass.conflictMessage && (
                                                            <div className="mt-1 text-xs text-red-600">{courseClass.conflictMessage}</div>
                                                        )}
                                                    </td>
                                                    <td className="border border-slate-300 px-3 py-3 text-center text-[#0072bc]">
                                                        {courseClass.currentSlots} / {courseClass.maxSlots}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div>
                            <div className="mb-2 flex items-center justify-between">
                                <h2 className="border-l-2 border-rose-500 pl-2 text-[17px] font-bold text-[#0072bc]">
                                    Chi tiết lớp học phần
                                </h2>
                                {selectedClass?.conflictMessage && (
                                    <span className="text-xs font-bold text-red-600">{selectedClass.conflictMessage}</span>
                                )}
                            </div>
                            <table className="w-full border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 text-[#1687d9]">
                                        <th className="border border-slate-300 px-3 py-3">
                                            Trạng thái:{" "}
                                            <span className={selectedClass?.canSelect ? "text-green-600" : "text-red-600"}>
                                                {selectedClass?.canSelect
                                                    ? "Có thể ghi danh"
                                                    : selectedClass
                                                        ? selectedClass.isCurrentClass
                                                            ? "Lớp hiện tại (Đã ghi danh)"
                                                            : selectedClass.conflictMessage
                                                                ? "Bị trùng lịch học"
                                                                : selectedClass.isFull
                                                                    ? "Lớp đã đủ sĩ số"
                                                                    : !selectedClass.isClassOpen && !canChangeSchedule
                                                                        ? "Đã khóa ghi danh"
                                                                        : selectedClass.isClassOpen
                                                                            ? "Có thể ghi danh"
                                                                            : "Không thể ghi danh"
                                                        : "Chưa chọn lớp"}
                                            </span>
                                        </th>
                                        <th className="w-52 border border-slate-300 px-3 py-3">
                                            Sĩ số tối đa: {selectedClass?.maxSlots || ""}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedClass ? (
                                        formatScheduleList(selectedClass).map((line, index) => (
                                            <tr key={`${selectedClass.id}-${line}`} className="bg-[#fff8b8]">
                                                <td className="border border-slate-300 px-3 py-3">
                                                    <div>{line}</div>
                                                    <div>Cơ sở: Hà Nội</div>
                                                    <div>
                                                        GV:{" "}
                                                        <span className="font-bold">
                                                            {selectedClass.lecturer?.fullName || "Chưa phân công"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="border border-slate-300 px-3 py-3">
                                                    <div>{index === 0 ? selectedClass.semester?.name || formatSemester(semester) : ""}</div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={2} className="border border-slate-300 py-8 text-center font-semibold text-slate-500">
                                                Chọn một lớp học phần để xem chi tiết
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                            <div className="mt-5 text-center">
                                <button
                                    type="button"
                                    disabled={!selectedClass?.canSelect || submittingClassId === selectedClass?.id}
                                    onClick={() => selectedClass && void handleSelectClass(selectedClass.id)}
                                    className={`w-56 px-6 py-3 text-sm font-semibold text-white ${
                                        selectedClass?.canSelect
                                            ? "bg-[#0b8fe8] hover:bg-[#0878c4]"
                                            : "cursor-not-allowed bg-slate-300"
                                    }`}
                                >
                                    {submittingClassId === selectedClass?.id
                                        ? "Đang xử lý..."
                                        : !canChangeSchedule && !selectedClass?.isClassOpen
                                            ? "Đã khóa ghi danh"
                                            : switchingFromClassId
                                            ? "Ghi danh"
                                            : "Ghi danh"}
                                </button>
                            </div>
                        </div>
                    </section>
                )}

                <section>
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="border-l-2 border-rose-500 pl-2 text-[17px] font-bold text-[#0072bc]">
                            Lớp HP đã đăng ký trong học kỳ này
                        </h2>
                        <button type="button" className="rounded bg-[#17a2e8] px-3 py-1 text-white">
                            ⎙
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-[#1687d9]">
                                    <th className="w-20 border border-slate-300 px-2 py-3">Thao tác</th>
                                    <th className="w-12 border border-slate-300 px-2 py-3">STT</th>
                                    <th className="w-[110px] border border-slate-300 px-2 py-3">Mã lớp HP</th>
                                    <th className="border border-slate-300 px-2 py-3">Tên môn học/HP</th>
                                    <th className="w-[130px] border border-slate-300 px-2 py-3">Lớp học dự kiến</th>
                                    <th className="w-12 border border-slate-300 px-2 py-3">TC</th>
                                    <th className="w-[100px] border border-slate-300 px-2 py-3">Nhóm TH</th>
                                    <th className="w-[120px] border border-slate-300 px-2 py-3">Học phí</th>
                                    <th className="w-[70px] border border-slate-300 px-2 py-3">Thu</th>
                                    <th className="w-[110px] border border-slate-300 px-2 py-3">Trạng thái ĐK</th>
                                    <th className="w-[100px] border border-slate-300 px-2 py-3">Ngày ĐK</th>
                                    <th className="w-[90px] border border-slate-300 px-2 py-3">TT lớp HP</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="font-bold">
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2 text-center">Tổng</td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2 text-center">{totalCredits}</td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(totalTuition)}</td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                    <td className="border border-slate-300 px-2 py-2"></td>
                                </tr>

                                {enrolledCourses.length === 0 ? (
                                    <tr>
                                        <td colSpan={12} className="border border-slate-300 py-6 text-center font-semibold text-slate-500">
                                            Chưa đăng ký lớp học phần nào trong học kỳ này
                                        </td>
                                    </tr>
                                ) : (
                                    enrolledCourses.map((enrollment, index) => {
                                        const courseClass = enrollment.courseClass || {};
                                        const isClassOpen = `${courseClass.status || "OPEN"}`.toUpperCase() === "OPEN";
                                        const canAction = canChangeSchedule || isClassOpen;
                                        return (
                                            <tr key={enrollment.id}>
                                                <td className="border border-slate-300 px-2 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        disabled={!canAction}
                                                        onClick={() =>
                                                            void openClassPicker(
                                                                courseClass.subject,
                                                                enrollment.courseClassId || courseClass.id,
                                                                courseClass.semesterId || courseClass.semester?.id,
                                                            )
                                                        }
                                                        className={`mr-2 rounded border px-2 py-1 text-xs font-semibold ${
                                                            canAction
                                                                ? "border-slate-300 text-[#0072bc] hover:bg-slate-50"
                                                                : "cursor-not-allowed border-slate-200 text-slate-400"
                                                        }`}
                                                        title={canAction ? "Đổi lớp cùng môn" : "Học kỳ đã khóa ghi danh"}
                                                    >
                                                        Ghi danh
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={!canAction}
                                                        onClick={() => void handleDropEnrollment(enrollment.id)}
                                                        className={`text-xs ${canAction ? "text-red-600" : "cursor-not-allowed text-slate-400"}`}
                                                        title={canAction ? "Hủy đăng ký" : "Học kỳ đã khóa ghi danh"}
                                                    >
                                                        Hủy
                                                    </button>
                                                </td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">{index + 1}</td>
                                                <td className="border border-slate-300 px-2 py-2">{courseClass.code}</td>
                                                <td className="border border-slate-300 px-2 py-2">{courseClass.subject?.name}</td>
                                                <td className="border border-slate-300 px-2 py-2">{courseClass.adminClasses?.[0]?.code || courseClass.code}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">{courseClass.subject?.credits}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-center"></td>
                                                <td className="border border-slate-300 px-2 py-2 text-right">{formatMoney(enrollment.tuitionFee)}</td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">
                                                    <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</span>
                                                </td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">
                                                    {getEnrollmentModeLabel(enrollment)}
                                                </td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">
                                                    {formatDate(enrollment.registeredAt)}
                                                </td>
                                                <td className="border border-slate-300 px-2 py-2 text-center">
                                                    {courseClass.status === "OPEN" ? "Đang mở" : "Đã khóa"}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
