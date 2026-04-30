"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import { useRouter } from "next/navigation";
import {
    ClipboardCheck,
    ChevronDown,
    Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import React from "react";
import { resolveCurrentStudentContext } from "@/lib/current-student";

export default function AttendancePage() {
    const router = useRouter();
    const [student, setStudent] = useState<any>(null);
    const [enrollments, setEnrollments] = useState<any[]>([]);
    const [curriculum, setCurriculum] = useState<any>(null);
    const [curriculumMap, setCurriculumMap] = useState<Map<string, number>>(new Map());
    const [loading, setLoading] = useState(true);
    const [expandedClass, setExpandedClass] = useState<string | null>(null);
    const [expandedSemesters, setExpandedSemesters] = useState<Record<string, boolean>>({});

    const parseAttendanceNote = (note?: string | null) => {
        if (!note) return { manualNote: "", meta: {} as any };
        try {
            const parsed = JSON.parse(note);
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
                return {
                    manualNote: `${parsed.manualNote || ""}`,
                    meta: parsed.meta && typeof parsed.meta === "object" ? parsed.meta : {},
                };
            }
        } catch {
            // Legacy note
        }
        return { manualNote: `${note}`, meta: {} as any };
    };

    const getSemesterFromCode = (code?: string) => {
        if (!code) return null;
        // Search for patterns like HK1, HK2... HK8
        const match = code.match(/HK(\d+)/i);
        return match ? parseInt(match[1]) : null;
    };

    const getSemesterStartYear = (semester: any) => {
        if (!semester) return 0;
        const startDate = semester.startDate ? new Date(semester.startDate) : null;
        if (startDate && !Number.isNaN(startDate.getTime())) return startDate.getFullYear();
        const codeMatch = `${semester.code || ""}`.match(/(20\d{2})/);
        if (codeMatch) return Number(codeMatch[1]);
        const nameMatch = `${semester.name || ""}`.match(/(20\d{2})\s*-\s*20\d{2}/);
        if (nameMatch) return Number(nameMatch[1]);
        return Number(semester.year || 0);
    };

    const expectedYearForSemester = (cohortStartYear: number, semesterNumber: number) =>
        cohortStartYear + Math.floor(semesterNumber / 2);

    const getEnrollmentSemesterNumber = (enrollment: any) => {
        const semester = enrollment?.courseClass?.semester;
        return getSemesterFromCode(semester?.code || semester?.name) || getSemesterFromCode(enrollment?.courseClass?.code);
    };

    const isEnrollmentInOfficialSemester = (
        enrollment: any,
        semesterNumber: number,
        curriculumSubjectCodes: Set<string>,
    ) => {
        const subjectCode = enrollment?.courseClass?.subject?.code;
        if (!subjectCode || !curriculumSubjectCodes.has(subjectCode)) return false;

        const actualSemester = getEnrollmentSemesterNumber(enrollment);
        if (actualSemester && actualSemester !== semesterNumber) return false;

        const actualYear = getSemesterStartYear(enrollment?.courseClass?.semester);
        const expectedYear = expectedYearForSemester(startYear, semesterNumber);
        if (actualYear && actualYear !== expectedYear) return false;

        return true;
    };

    const pickBestEnrollment = (items: any[]) => {
        return [...items].sort((left, right) => {
            const leftAttendance = left?.attendances?.length || 0;
            const rightAttendance = right?.attendances?.length || 0;
            if (leftAttendance !== rightAttendance) return rightAttendance - leftAttendance;

            const leftIsMirror = `${left?.student?.adminClass?.code || ""}`.startsWith("K") ? 1 : 0;
            const rightIsMirror = `${right?.student?.adminClass?.code || ""}`.startsWith("K") ? 1 : 0;
            if (leftIsMirror !== rightIsMirror) return rightIsMirror - leftIsMirror;

            return `${left?.courseClass?.code || ""}`.localeCompare(`${right?.courseClass?.code || ""}`);
        })[0];
    };

    const dedupeBySubject = (items: any[]) => {
        const buckets = new Map<string, any[]>();
        items.forEach((item) => {
            const key = `${item?.courseClass?.subject?.code || item?.courseClass?.subjectId || item?.courseClassId || item?.id}`;
            buckets.set(key, [...(buckets.get(key) || []), item]);
        });

        return [...buckets.values()]
            .map((bucket) => pickBestEnrollment(bucket))
            .filter(Boolean)
            .sort((left, right) =>
                `${left?.courseClass?.code || ""}`.localeCompare(`${right?.courseClass?.code || ""}`),
            );
    };

    const normalizeAttendance = (attendance: any) => {
        if (!attendance) return attendance;
        const parsed = parseAttendanceNote(attendance.note);
        return {
            ...attendance,
            note: parsed.manualNote,
            ...parsed.meta,
        };
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const context = await resolveCurrentStudentContext();
                if (!context.studentId) return;

                const studentData =
                    context.profile ||
                    (await StudentService.getProfileByStudentId(context.studentId).catch(() => null));
                if (!studentData) return;

                setStudent(studentData);
                
                // Fetch enrollments and curriculum in parallel
                const [enrollmentData, curriculumData] = await Promise.all([
                    StudentService.getEnrollments(context.studentId),
                    StudentService.getCurriculumProgress(context.studentId).catch(() => null)
                ]);

                setCurriculum(curriculumData);

                // 1. Build Curriculum Map (Subject Code -> Conceptual Semester)
                const cMap = new Map<string, number>();
                if (curriculumData?.semesters) {
                    curriculumData.semesters.forEach((sem: any) => {
                        (sem.items || []).forEach((item: any) => {
                            const code = item.code || item.subjectCode;
                            if (code) cMap.set(code, Number(sem.semester));
                        });
                    });
                }
                setCurriculumMap(cMap);

                setEnrollments(
                    (enrollmentData || []).map((enr: any) => ({
                        ...enr,
                        attendances: (enr.attendances || []).map(normalizeAttendance),
                    })),
                );
            } catch (error) {
                console.error("Failed to fetch attendance data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getPeriodsForAttendance = (date: string, schedules: any[]) => {
        if (!schedules || schedules.length === 0) return 0;
        const d = new Date(date);
        const jsDay = d.getDay();
        const prismaDay = jsDay === 0 ? 8 : jsDay + 1;
        const matchingSchedules = schedules.filter(s => s.dayOfWeek === prismaDay);
        return matchingSchedules.reduce((acc, s) => acc + (s.endShift - s.startShift + 1), 0);
    };

    const getAttendancePeriods = (attendance: any, enrollment: any) => {
        if (attendance?.session) {
            const p = Math.max(Number(attendance.session.endShift) - Number(attendance.session.startShift) + 1, 0);
            if (p > 0) return p;
        }
        
        const schedulePeriods = getPeriodsForAttendance(attendance?.date, enrollment.courseClass?.schedules || []);
        if (schedulePeriods > 0) return schedulePeriods;

        return enrollment.courseClass?.periodsPerSession || 3;
    };

    const formatAttendanceMethod = (attendance: any) => {
        if (attendance?.method === "QR_GEO") return "QR + GPS";
        if (attendance?.method === "QR") return "QR";
        return "Thủ công";
    };

    const getStartYear = (student: any) => {
        if (student?.intake) {
            const num = parseInt(student.intake.replace(/\D/g, ""));
            if (!isNaN(num)) return 2006 + num;
        }
        if (student?.admissionDate) {
            return new Date(student.admissionDate).getFullYear();
        }
        return 2024; // Fallback
    };

    const startYear = getStartYear(student);
    const academicSemesters = Array.from({ length: 8 }, (_, i) => {
        const semesterNum = i + 1;
        const yearOffset = Math.floor(i / 2);
        const currentYear = startYear + yearOffset;
        const semesterLabel = `HK${semesterNum % 2 === 0 ? 2 : 1}`;
        return {
            key: semesterNum,
            label: `Kỳ ${semesterNum}`,
            subLabel: `${semesterLabel} (${currentYear} - ${currentYear + 1})`,
            year: currentYear,
            isOdd: semesterNum % 2 === 1
        };
    });


    const groupedEnrollments = academicSemesters.reduce((acc: any, sem: any) => {
        // 1. Get curriculum-defined subjects for this semester
        const curriculumItems = curriculum?.semesters?.find((s: any) => s.semester === sem.key)?.items || [];
        const curriculumSubjectCodes = new Set<string>(
            curriculumItems
                .map((item: any) => `${item.code || item.subjectCode || ""}`.trim())
                .filter(Boolean),
        );

        const curriculumEnrollments = enrollments.filter(enr =>
            isEnrollmentInOfficialSemester(enr, sem.key, curriculumSubjectCodes)
        );

        // 3. Find enrollments that are NOT in the curriculum, 
        // but are explicitly marked with this HK number in the class code
        const codeMatchedEnrollments = enrollments.filter(enr => {
            const classCode = enr.courseClass?.code;
            const subjectCode = enr.courseClass?.subject?.code;
            const codeSem = getSemesterFromCode(classCode);
            
            if (subjectCode && curriculumMap.has(subjectCode)) return false;
            
            return codeSem === sem.key;
        });

        // 4. Fallback: If not matched by curriculum or code, check semester object's name/year
        const fallbackEnrollments = enrollments.filter(enr => {
            const s = enr.courseClass?.semester;
            const subjectCode = enr.courseClass?.subject?.code;
            
            // Only fall back if it hasn't been matched yet by stricter rules
            if (subjectCode && curriculumMap.has(subjectCode)) return false;
            if (getSemesterFromCode(enr.courseClass?.code) !== null) return false;
            
            if (!s) return false;
            const nameMatch = s.name?.includes(`HK${sem.isOdd ? 1 : 2}`);
            const yearMatch = Number(s.year) === sem.year;
            return nameMatch && yearMatch;
        });

        // Combine all, maintaining uniqueness
        const seenIds = new Set();
        const combined = dedupeBySubject([...curriculumEnrollments, ...codeMatchedEnrollments, ...fallbackEnrollments]).filter(e => {
            if (seenIds.has(e.id)) return false;
            seenIds.add(e.id);
            return true;
        });

        acc[sem.key] = {
            ...sem,
            enrollments: combined
        };
        return acc;
    }, {});

    // Catch-all for subjects that don't fit into the standard 8 slots (e.g., year 5+)
    const matchedIds = new Set();
    Object.values(groupedEnrollments).forEach((v: any) => v.enrollments.forEach((e: any) => matchedIds.add(e.id)));
    const otherEnrollments = curriculum?.semesters?.length
        ? []
        : enrollments.filter(e => !matchedIds.has(e.id));

    const sortedSemesterKeys = academicSemesters.map(s => s.key);

    const toggleSemester = (key: any) => {
        setExpandedSemesters(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Auto-expand ALL semesters that have data
    useEffect(() => {
        if (enrollments.length > 0 && Object.keys(expandedSemesters).length === 0) {
            const toExpand: Record<string, boolean> = {};
            sortedSemesterKeys.forEach(key => {
                if (groupedEnrollments[key].enrollments.length > 0) {
                    toExpand[key] = true;
                }
            });
            if (otherEnrollments.length > 0) toExpand["other"] = true;
            
            // Fallback to expanding at least the first if all are empty
            if (Object.keys(toExpand).length === 0) {
                toExpand[sortedSemesterKeys[0]] = true;
            }
            setExpandedSemesters(toExpand);
        }
    }, [enrollments]);

    const calculateTermAbsences = (enr: any, type: 'EXCUSED' | 'UNEXCUSED') => {
        const statuses = type === 'EXCUSED' 
            ? ["EXCUSED", "ABSENT_EXCUSED"] 
            : ["ABSENT", "ABSENT_UNEXCUSED"];
            
        return enr.attendances?.filter((a: any) => statuses.includes(a.status))
            .reduce((acc: number, a: any) => acc + getAttendancePeriods(a, enr), 0) || 0;
    };

    const renderEnrollmentRow = (enr: any, index: number) => {
        const excused = calculateTermAbsences(enr, 'EXCUSED');
        const unexcused = calculateTermAbsences(enr, 'UNEXCUSED');
        const isExpanded = expandedClass === enr.id;

        return (
            <React.Fragment key={enr.id}>
                <TableRow
                    className="hover:bg-slate-50 border-blue-100 transition-colors cursor-pointer h-12"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpandedClass(isExpanded ? null : enr.id);
                    }}
                >
                    <TableCell className="text-center font-medium border-x border-blue-50 text-slate-500">{index + 1}</TableCell>
                    <TableCell className="text-center font-bold border-x border-blue-50 text-slate-600 text-[12px]">{enr.courseClass?.code}</TableCell>
                    <TableCell className="font-bold text-slate-700 border-x border-blue-50 px-6 text-[13px]">{enr.courseClass?.subject?.name}</TableCell>
                    <TableCell className="text-center font-bold border-x border-blue-50 text-slate-600">{enr.courseClass?.subject?.credits || 0}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600 border-x border-blue-50 text-[14px]">{excused}</TableCell>
                    <TableCell className="text-center font-bold text-blue-600 border-x border-blue-50 text-[14px]">{unexcused}</TableCell>
                </TableRow>

                <AnimatePresence>
                    {isExpanded && (
                        <TableRow className="bg-blue-50/20 border-none">
                            <TableCell colSpan={6} className="p-0 border-x border-blue-100">
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden p-6"
                                >
                                    <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-center gap-2 mb-4 border-b border-blue-50 pb-2">
                                            <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                            <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest">Nhật ký điểm danh chi tiết</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {enr.attendances?.length > 0 ? (
                                                enr.attendances.map((att: any, i: number) => {
                                                    const periods = getAttendancePeriods(att, enr);
                                                    return (
                                                        <div key={i} className={cn(
                                                            "flex items-center gap-3 p-3 rounded-md border text-[12px] font-bold shadow-sm transition-all hover:translate-x-1",
                                                            att.status === "PRESENT" ? "bg-emerald-50 text-emerald-700 border-emerald-100/50" :
                                                            (att.status === "EXCUSED" || att.status === "ABSENT_EXCUSED") ? "bg-blue-50 text-blue-700 border-blue-100/50" :
                                                            "bg-rose-50 text-rose-700 border-rose-100/50"
                                                        )}>
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] opacity-60 uppercase">{new Date(att.date).toLocaleDateString("vi-VN", { weekday: 'short' })}</span>
                                                                <span className="text-[13px]">{new Date(att.date).toLocaleDateString("vi-VN")}</span>
                                                            </div>
                                                            <div className="h-8 w-px bg-current opacity-20"></div>
                                                            <div className="flex-1 flex flex-col">
                                                                <span className="text-[13px]">{att.status === "PRESENT" ? "Hiện diện" : (att.status === "EXCUSED" || att.status === "ABSENT_EXCUSED") ? "Nghỉ có phép" : "Nghỉ không phép"}</span>
                                                                <span className="text-[10px] opacity-60 font-medium italic">{periods} tiết học</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="col-span-full py-4 text-center">
                                                    <p className="text-xs italic text-slate-400 font-medium">Chưa có dữ liệu chi tiết cho học phần này</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            </TableCell>
                        </TableRow>
                    )}
                </AnimatePresence>
            </React.Fragment>
        );
    };

    // Calculate Grand Totals
    const visibleReportEnrollments = [
        ...Object.values(groupedEnrollments).flatMap((v: any) => v.enrollments || []),
        ...otherEnrollments,
    ];
    const grandTotalExcused = visibleReportEnrollments.reduce((acc, enr) => acc + calculateTermAbsences(enr, 'EXCUSED'), 0);
    const grandTotalUnexcused = visibleReportEnrollments.reduce((acc, enr) => acc + calculateTermAbsences(enr, 'UNEXCUSED'), 0);

    if (loading) {
        return (
            <div className="flex min-h-[80vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl min-h-screen space-y-6">
            <div className="bg-white border border-blue-200 shadow-md rounded-lg overflow-hidden">
                <div className="px-5 py-4 flex flex-col md:flex-row justify-between items-center bg-blue-50 border-b border-blue-200 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                            <ClipboardCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-blue-800 uppercase tracking-tight">Thông tin điểm danh</h1>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Dữ liệu chi tiết chuyên cần</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button 
                            variant="outline" 
                            size="sm"
                            className="h-9 rounded-md border-blue-200 text-blue-600 hover:bg-blue-50 font-bold text-xs"
                        >
                            <Printer className="mr-2 h-4 w-4" /> IN BÁO CÁO
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <Table className="border-collapse">
                        <TableHeader className="bg-blue-50/50">
                            <TableRow className="hover:bg-transparent border-blue-200">
                                <TableHead className="w-12 text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">STT</TableHead>
                                <TableHead className="w-40 text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">Mã lớp học phần</TableHead>
                                <TableHead className="text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">Tên môn học/học phần</TableHead>
                                <TableHead className="w-16 text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">TC</TableHead>
                                <TableHead className="w-48 text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">Số tiết nghỉ có phép</TableHead>
                                <TableHead className="w-48 text-center font-bold text-blue-700 uppercase py-4 border-x border-blue-100 text-[11px]">Số tiết nghỉ không phép</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* Standard Semesters */}
                            {sortedSemesterKeys.map((semesterKey) => {
                                const data = groupedEnrollments[semesterKey];
                                const isOpen = expandedSemesters[semesterKey];
                                const semesterEnrollments = data.enrollments || [];
                                
                                return (
                                    <React.Fragment key={semesterKey}>
                                        <TableRow
                                            className="bg-blue-50/40 hover:bg-blue-50/70 cursor-pointer border-blue-200"
                                            onClick={() => toggleSemester(semesterKey)}
                                        >
                                            <TableCell colSpan={6} className="py-2.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn("transition-transform", isOpen && "rotate-90")}>
                                                        <ChevronDown size={18} className="text-blue-600" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-blue-800 tracking-wide">{data.label}</span>
                                                        <span className="text-[10px] font-bold text-blue-400">{data.subLabel}</span>
                                                    </div>
                                                    {!isOpen && semesterEnrollments.length === 0 && (
                                                        <span className="text-[10px] italic text-slate-400 ml-auto">Chưa có dữ liệu</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>

                                        <AnimatePresence mode="wait">
                                            {isOpen && (
                                                semesterEnrollments.length > 0 ? (
                                                    semesterEnrollments.map((enr: any, index: number) => renderEnrollmentRow(enr, index))
                                                ) : (
                                                    <TableRow className="bg-slate-50/30">
                                                        <TableCell colSpan={6} className="py-8 text-center border-x border-blue-50">
                                                            <p className="text-xs italic text-slate-400 font-medium uppercase tracking-widest">Không tìm thấy dữ liệu điểm danh cho học kỳ này</p>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                );
                            })}

                            {/* Extra Semesters */}
                            {otherEnrollments.length > 0 && (
                                <React.Fragment key="other">
                                    <TableRow
                                        className="bg-slate-100 hover:bg-slate-200 cursor-pointer border-slate-300"
                                        onClick={() => toggleSemester("other")}
                                    >
                                        <TableCell colSpan={6} className="py-2.5 px-4">
                                            <div className="flex items-center gap-2">
                                                <div className={cn("transition-transform", expandedSemesters["other"] && "rotate-90")}>
                                                    <ChevronDown size={18} className="text-slate-600" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-800 tracking-wide">Học kỳ khác</span>
                                                    <span className="text-[10px] font-bold text-slate-400">Các môn học ngoài 8 học kỳ chính</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                    <AnimatePresence mode="wait">
                                        {expandedSemesters["other"] && (
                                            otherEnrollments.map((enr: any, index: number) => renderEnrollmentRow(enr, index))
                                        )}
                                    </AnimatePresence>
                                </React.Fragment>
                            )}

                            {enrollments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center bg-slate-50/30 border-x border-blue-50">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Không tìm thấy bất kỳ dữ liệu học tập nào</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                        <tfoot className="bg-slate-100/80 border-t-2 border-blue-200">
                            <TableRow className="h-14">
                                <TableCell colSpan={4} className="text-center font-black text-blue-900 uppercase tracking-widest text-[13px]">Tổng cộng số tiết đã nghỉ:</TableCell>
                                <TableCell className="text-center font-black text-red-600 text-xl border-x border-blue-100 shadow-inner">{grandTotalExcused}</TableCell>
                                <TableCell className="text-center font-black text-red-600 text-xl border-x border-blue-100 shadow-inner">{grandTotalUnexcused}</TableCell>
                            </TableRow>
                        </tfoot>
                    </Table>
                </div>
            </div>
        </div>
    );
}
