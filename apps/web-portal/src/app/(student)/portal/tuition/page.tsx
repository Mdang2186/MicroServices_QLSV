"use client";

import { useEffect, useMemo, useState } from "react";
import { StudentService } from "@/services/student.service";
import api from "@/lib/api";
import { AlertCircle, Check, Clock, FileText, ReceiptText, Wallet } from "lucide-react";
import { resolveCurrentStudentContext } from "@/lib/current-student";

const formatMoney = (value: unknown) =>
    `${Number(value || 0).toLocaleString("vi-VN")} đ`;

const formatDate = (value?: string | Date | null) => {
    if (!value) return "Chưa cập nhật";
    return new Date(value).toLocaleDateString("vi-VN");
};

const normalizeCohortCode = (value?: string | null) => {
    const raw = `${value || ""}`.trim().toUpperCase();
    if (!raw) return null;
    const direct = raw.match(/^K?(\d{1,2})$/);
    if (direct) return `K${Number(direct[1])}`;
    const kMatch = raw.match(/\bK(\d{1,2})\b/);
    if (kMatch) return `K${Number(kMatch[1])}`;
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
    ];

    for (const candidate of candidates) {
        const cohortCode = normalizeCohortCode(candidate);
        if (cohortCode) return cohortCode;
    }

    return null;
};

const resolveCohortStartYear = (student: any) => {
    const cohortCode = resolveStudentCohortCode(student);
    const cohortNumber = Number(`${cohortCode || ""}`.replace(/\D/g, ""));
    if (Number.isFinite(cohortNumber) && cohortNumber > 0) {
        return cohortNumber >= 2000 ? cohortNumber : 2006 + cohortNumber;
    }

    const admissionDate = student?.admissionDate ? new Date(student.admissionDate) : null;
    return admissionDate && !Number.isNaN(admissionDate.getTime())
        ? admissionDate.getFullYear()
        : null;
};

const parseConceptualSemester = (semester: any) => {
    const source = `${semester?.code || ""} ${semester?.name || ""}`;
    const match =
        source.match(/HK\s*([1-8])/i) ||
        source.match(/H[OỌ]C\s*K[YỲ]\s*([1-8])/i) ||
        source.match(/SEMESTER\s*([1-8])/i);
    if (match) return Number(match[1]);

    const semesterNumber = Number(
        semester?.cohortSemesterNumber || semester?.semesterNumber || 0,
    );
    return semesterNumber >= 1 && semesterNumber <= 8 ? semesterNumber : null;
};

const normalizeSemesterForCohort = (semester: any, student: any, slot?: number | null) => {
    const cohortCode = resolveStudentCohortCode(student);
    const startYear = resolveCohortStartYear(student);
    const semesterNumber = slot || parseConceptualSemester(semester);
    if (!cohortCode || !startYear || !semesterNumber) {
        return {
            ...semester,
            selectionKey: semester?.id || semester?.code || semester?.name || "",
        };
    }

    const studyYear = Math.ceil(semesterNumber / 2);
    const academicStartYear = startYear + studyYear - 1;
    const academicYearLabel = `${academicStartYear}-${academicStartYear + 1}`;
    const isOddSemester = semesterNumber % 2 === 1;
    const selectionKey = `${cohortCode}_HK${semesterNumber}`;

    return {
        ...semester,
        id: semester?.id || selectionKey,
        selectionKey,
        code: selectionKey,
        name: `HK${semesterNumber} - Năm ${studyYear} (${academicYearLabel})`,
        year: isOddSemester ? academicStartYear : academicStartYear + 1,
        startDate: isOddSemester
            ? new Date(academicStartYear, 8, 1)
            : new Date(academicStartYear + 1, 1, 1),
        endDate: isOddSemester
            ? new Date(academicStartYear + 1, 0, 20)
            : new Date(academicStartYear + 1, 5, 30),
        semesterNumber,
        cohortSemesterNumber: semesterNumber,
        cohortStudyYear: studyYear,
        cohortAcademicYear: academicYearLabel,
    };
};

const getSemesterCandidateScore = (semester: any, student: any, slot: number) => {
    const cohortCode = resolveStudentCohortCode(student);
    const startYear = resolveCohortStartYear(student);
    const expectedYear = startYear ? startYear + Math.floor((slot - 1) / 2) : 0;
    const startDate = semester?.startDate ? new Date(semester.startDate) : null;
    const startDateYear =
        startDate && !Number.isNaN(startDate.getTime())
            ? startDate.getFullYear()
            : Number(semester?.year || 0);
    const sameCohort = cohortCode && `${semester?.code || ""}`.startsWith(cohortCode);
    return (sameCohort ? 1000 : 0) - Math.abs(startDateYear - expectedYear);
};

const getStatusMeta = (status?: string, debt = 0) => {
    const normalized = `${status || ""}`.toUpperCase();
    if (normalized === "PAID" || debt <= 0) {
        return {
            label: "Đã nộp",
            className: "bg-emerald-50 text-emerald-700 border-emerald-200",
            icon: Check,
        };
    }

    if (normalized === "PARTIAL") {
        return {
            label: "Nộp một phần",
            className: "bg-amber-50 text-amber-700 border-amber-200",
            icon: Clock,
        };
    }

    return {
        label: "Còn nợ",
        className: "bg-rose-50 text-rose-700 border-rose-200",
        icon: AlertCircle,
    };
};

export default function TuitionPage() {
    const [studentId, setStudentId] = useState("");
    const [studentProfile, setStudentProfile] = useState<any>(null);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [selectedSemId, setSelectedSemId] = useState("");
    const [feeRecords, setFeeRecords] = useState<any[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const resolveStudentId = async () => {
            const context = await resolveCurrentStudentContext();
            setStudentProfile(context.profile || context.sessionUser?.student || context.sessionUser || null);
            if (context.studentId) setStudentId(context.studentId);
            else setError("Không tìm thấy hồ sơ sinh viên. Vui lòng đăng nhập lại.");
        };

        resolveStudentId()
            .catch(() => setError("Không thể xác định sinh viên đang đăng nhập."))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        if (!studentId) return;

        let isMounted = true;
        const loadTuition = async () => {
            setLoading(true);
            setError("");

            try {
                const [feesData, semesterResponse, transactionData] = await Promise.all([
                    StudentService.getStudentFees(studentId),
                    api.get("/api/enrollments/semesters").catch(() => ({ data: [] })),
                    StudentService.getFeeTransactions(studentId).catch(() => []),
                ]);

                if (!isMounted) return;

                const nextFees = Array.isArray(feesData) ? feesData : [];
                const nextSemesters = Array.isArray(semesterResponse.data)
                    ? semesterResponse.data
                    : [];

                setFeeRecords(nextFees);
                setSemesters(nextSemesters);
                setTransactions(Array.isArray(transactionData) ? transactionData : []);

                const semesterOptions = new Map<string, any>();
                nextSemesters.forEach((semester: any) => {
                    if (semester?.id) semesterOptions.set(semester.id, semester);
                });
                nextFees.forEach((record: any) => {
                    if (record?.semesterId) {
                        semesterOptions.set(record.semesterId, {
                            ...(semesterOptions.get(record.semesterId) || {}),
                            ...(record.semester || {}),
                            id: record.semesterId,
                        });
                    }
                });

                const options = [...semesterOptions.values()];
                const active =
                    options.find((semester) => semester.isRegistering || semester.isCurrent) ||
                    nextFees.find((record) => Number(record?.summary?.totalAmount || 0) > 0)
                        ?.semester ||
                    options[0];

                setSelectedSemId((current) =>
                    current && semesterOptions.has(current) ? current : active?.id || "",
                );
            } catch {
                if (isMounted) {
                    setError("Không tải được dữ liệu học phí. Vui lòng thử lại sau.");
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadTuition();
        return () => {
            isMounted = false;
        };
    }, [studentId]);

    const normalizedFeeRecords = useMemo(() => {
        const recordBySlot = new Map<number, any>();

        feeRecords.forEach((record) => {
            const slot = parseConceptualSemester(record?.semester);
            if (!slot || slot < 1 || slot > 8) return;

            const current = recordBySlot.get(slot);
            const currentScore = current
                ? getSemesterCandidateScore(current.semester, studentProfile, slot)
                : -Infinity;
            const nextScore = getSemesterCandidateScore(record.semester, studentProfile, slot);
            if (!current || nextScore > currentScore) {
                const normalizedSemester = normalizeSemesterForCohort(
                    record.semester || { id: record.semesterId },
                    studentProfile,
                    slot,
                );
                recordBySlot.set(slot, {
                    ...record,
                    semester: normalizedSemester,
                    selectionKey: normalizedSemester.selectionKey,
                });
            }
        });

        return [...recordBySlot.values()];
    }, [feeRecords, studentProfile]);

    const semesterOptions = useMemo(() => {
        const optionMap = new Map<string, any>();
        const cohortCode = resolveStudentCohortCode(studentProfile);
        const startYear = resolveCohortStartYear(studentProfile);

        if (cohortCode && startYear) {
            for (let slot = 1; slot <= 8; slot += 1) {
                const normalizedSemester = normalizeSemesterForCohort(
                    { id: `${cohortCode}_HK${slot}` },
                    studentProfile,
                    slot,
                );
                optionMap.set(normalizedSemester.selectionKey, normalizedSemester);
            }
        }

        semesters.forEach((semester) => {
            const slot = parseConceptualSemester(semester);
            if (!slot || slot < 1 || slot > 8) return;
            const normalizedSemester = normalizeSemesterForCohort(semester, studentProfile, slot);
            optionMap.set(normalizedSemester.selectionKey || normalizedSemester.id, {
                ...(optionMap.get(normalizedSemester.selectionKey) || {}),
                ...normalizedSemester,
            });
        });

        normalizedFeeRecords.forEach((record) => {
            if (!record?.selectionKey) return;
            optionMap.set(record.selectionKey, {
                ...(optionMap.get(record.selectionKey) || {}),
                ...record.semester,
            });
        });

        return [...optionMap.values()].sort((left, right) => {
            const leftDate = new Date(left?.startDate || 0).getTime();
            const rightDate = new Date(right?.startDate || 0).getTime();
            return rightDate - leftDate;
        });
    }, [normalizedFeeRecords, semesters, studentProfile]);

    const selectedRecord = useMemo(
        () =>
            normalizedFeeRecords.find((record) => record.selectionKey === selectedSemId) ||
            null,
        [normalizedFeeRecords, selectedSemId],
    );

    useEffect(() => {
        if (!semesterOptions.length) return;
        if (selectedSemId && semesterOptions.some((semester) => semester.selectionKey === selectedSemId)) {
            return;
        }

        const active =
            semesterOptions.find((semester) => semester.isRegistering || semester.isCurrent) ||
            normalizedFeeRecords[0]?.semester ||
            semesterOptions[0];
        setSelectedSemId(active?.selectionKey || active?.id || "");
    }, [normalizedFeeRecords, selectedSemId, semesterOptions]);

    const summary = selectedRecord?.summary || {
        totalAmount: 0,
        paidAmount: 0,
        debt: 0,
        totalCredits: 0,
        totalSubjects: 0,
        tuitionTotal: 0,
        fixedTotal: 0,
        status: "EMPTY",
    };

    const items = Array.isArray(selectedRecord?.items) ? selectedRecord.items : [];
    const selectedTransactions = useMemo(
        () =>
            transactions.filter(
                (transaction) =>
                    transaction?.studentFee?.semester?.id === selectedSemId ||
                    transaction?.studentFee?.semesterId === selectedRecord?.semesterId,
            ),
        [selectedRecord?.semesterId, selectedSemId, transactions],
    );

    if (loading && !studentId) {
        return (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-[#003366] border-t-transparent animate-spin rounded-full" />
                <span className="font-bold text-[#003366] text-sm uppercase">
                    Đang tải dữ liệu học phí...
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 p-8">
                <div className="max-w-3xl mx-auto bg-white border border-rose-100 rounded-lg p-6 text-rose-700 font-bold">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-16 font-sans">
            <div className="max-w-6xl mx-auto p-6 space-y-5">
                <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#003366] flex items-center justify-center">
                            <Wallet className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#003366] uppercase">
                                Học phí sinh viên
                            </h1>
                            <p className="text-xs text-slate-500 font-bold">
                                Dữ liệu đối soát từ phòng đào tạo và biên lai staff
                            </p>
                        </div>
                    </div>

                    <select
                        value={selectedSemId}
                        onChange={(event) => setSelectedSemId(event.target.value)}
                        className="w-full md:w-[340px] bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-200"
                    >
                        {semesterOptions.length === 0 && <option value="">Chưa có học kỳ</option>}
                        {semesterOptions.map((semester) => (
                            <option
                                key={semester.selectionKey || semester.id}
                                value={semester.selectionKey || semester.id}
                            >
                                {semester.code} - {semester.name}
                            </option>
                        ))}
                    </select>
                </div>

                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-500 font-bold">
                        Đang cập nhật dữ liệu...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                                <div className="text-xs font-black text-slate-400 uppercase">
                                    Tổng phải nộp
                                </div>
                                <div className="text-2xl font-black text-slate-900 mt-2">
                                    {formatMoney(summary.totalAmount)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    {Number(summary.totalCredits || 0)} tín chỉ,{" "}
                                    {Number(summary.totalSubjects || 0)} khoản học phần
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-emerald-200 p-5 shadow-sm">
                                <div className="text-xs font-black text-emerald-600 uppercase">
                                    Đã nộp
                                </div>
                                <div className="text-2xl font-black text-emerald-700 mt-2">
                                    {formatMoney(summary.paidAmount)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Ghi nhận từ biên lai staff
                                </div>
                            </div>
                            <div className="bg-white rounded-lg border border-rose-200 p-5 shadow-sm">
                                <div className="text-xs font-black text-rose-600 uppercase">
                                    Còn nợ
                                </div>
                                <div className="text-2xl font-black text-rose-700 mt-2">
                                    {formatMoney(summary.debt)}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Học phí: {formatMoney(summary.tuitionTotal)} • Phí khác:{" "}
                                    {formatMoney(summary.fixedTotal)}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
                            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
                                    <div>
                                        <h2 className="font-black text-slate-900">
                                            Chi tiết khoản thu
                                        </h2>
                                        <p className="text-xs text-slate-500">
                                            {selectedRecord?.semester?.name || "Học kỳ đang chọn"}
                                        </p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                                            <tr>
                                                <th className="px-5 py-3 text-left font-black">
                                                    Khoản thu
                                                </th>
                                                <th className="px-5 py-3 text-center font-black">
                                                    TC
                                                </th>
                                                <th className="px-5 py-3 text-right font-black">
                                                    Số tiền
                                                </th>
                                                <th className="px-5 py-3 text-right font-black">
                                                    Đã nộp
                                                </th>
                                                <th className="px-5 py-3 text-center font-black">
                                                    Trạng thái
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td
                                                        colSpan={5}
                                                        className="px-5 py-12 text-center text-slate-400 font-bold"
                                                    >
                                                        Chưa có khoản thu cho học kỳ này.
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.map((item: any) => {
                                                    const amount = Number(item.amount || item.fee || 0);
                                                    const paid = Number(item.paidAmount || 0);
                                                    const debt = Math.max(amount - paid, 0);
                                                    const status = getStatusMeta(item.status, debt);
                                                    const StatusIcon = status.icon;

                                                    return (
                                                        <tr key={item.id} className="hover:bg-slate-50">
                                                            <td className="px-5 py-4">
                                                                <div className="font-black text-slate-900">
                                                                    {item.subjectName || item.name}
                                                                </div>
                                                                <div className="text-xs text-slate-500 mt-1">
                                                                    {item.subjectCode || item.feeCode || "N/A"} •{" "}
                                                                    {item.isTuition || item.type === "ENROLLMENT"
                                                                        ? "Học phí học phần"
                                                                        : "Khoản thu khác"}
                                                                </div>
                                                            </td>
                                                            <td className="px-5 py-4 text-center font-bold text-slate-600">
                                                                {Number(item.credits || 0) > 0
                                                                    ? item.credits
                                                                    : "-"}
                                                            </td>
                                                            <td className="px-5 py-4 text-right font-black text-slate-900">
                                                                {formatMoney(amount)}
                                                            </td>
                                                            <td className="px-5 py-4 text-right font-bold text-emerald-700">
                                                                {formatMoney(paid)}
                                                            </td>
                                                            <td className="px-5 py-4 text-center">
                                                                <span
                                                                    className={`inline-flex items-center gap-1.5 border rounded-md px-2.5 py-1 text-xs font-black ${status.className}`}
                                                                >
                                                                    <StatusIcon className="w-3.5 h-3.5" />
                                                                    {status.label}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <aside className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 h-fit">
                                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                                    <ReceiptText className="w-4 h-4 text-[#003366]" />
                                    <h3 className="font-black text-slate-900">Biên lai</h3>
                                </div>

                                {selectedTransactions.length === 0 ? (
                                    <div className="py-8 text-sm text-slate-500">
                                        Chưa có biên lai cho học kỳ này.
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {selectedTransactions.map((transaction) => (
                                            <div key={transaction.id} className="py-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="font-black text-slate-900 text-sm">
                                                            {transaction.studentFee?.name || "Biên lai học phí"}
                                                        </div>
                                                        <div className="text-xs text-slate-500 mt-1">
                                                            {transaction.transactionCode || transaction.id}
                                                        </div>
                                                    </div>
                                                    <div className="font-black text-emerald-700 text-sm">
                                                        {formatMoney(transaction.amount)}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-2">
                                                    Ngày ghi nhận: {formatDate(transaction.transactionDate)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <button
                                    type="button"
                                    disabled={selectedTransactions.length === 0}
                                    onClick={() => window.print()}
                                    className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
                                >
                                    <FileText className="w-4 h-4" />
                                    In / lưu biên lai
                                </button>

                                <div className="mt-4 flex gap-2 rounded-lg bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 leading-relaxed">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Khi staff xác nhận hoặc hủy thanh toán, số đã nộp và biên lai
                                        tại đây sẽ cập nhật theo dữ liệu đối soát.
                                    </span>
                                </div>
                            </aside>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
