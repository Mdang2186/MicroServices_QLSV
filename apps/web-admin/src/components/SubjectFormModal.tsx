import {
    useEffect,
    useMemo,
    useState,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
} from "react";
import { AlertCircle, BookOpen, Link2, X } from "lucide-react";
import Modal from "@/components/modal";

interface SubjectFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingSubject?: any;
    majors: any[];
    departments: any[];
    subjects: any[];
    headers: any;
    onSuccess: (message: string) => void;
}

const DEFAULT_TEACHING_WEEKS = 15;

const DEFAULT_FORM = {
    name: "",
    code: "",
    majorId: "",
    credits: 3,
    theoryHours: 30,
    practiceHours: 15,
    selfStudyHours: 90,
    theorySessionsPerWeek: 1,
    practiceSessionsPerWeek: 1,
    departmentId: "",
    examType: "TU_LUAN",
    examForm: "Tự luận",
    examDuration: 90,
    description: "",
    prerequisiteIds: [] as string[],
    precedingSubjectIds: [] as string[],
};

function normalizeIds(values: any): string[] {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => `${value || ""}`.trim()).filter(Boolean))];
}

function derivePeriodsPerSession(totalPeriods: number, sessionsPerWeek: number) {
    if (totalPeriods <= 0 || sessionsPerWeek <= 0) return 0;
    return Math.max(
        1,
        Math.ceil(totalPeriods / Math.max(DEFAULT_TEACHING_WEEKS, 1) / sessionsPerWeek),
    );
}

function suggestSessionsPerWeek(totalPeriods: number, configuredValue?: number) {
    const configured = Number(configuredValue || 0);
    if (configured > 0) {
        const configuredPeriodsPerSession = derivePeriodsPerSession(totalPeriods, configured);
        if (configuredPeriodsPerSession <= 4) {
            return configured;
        }
    }

    if (totalPeriods <= 0) return 0;

    for (const sessions of [1, 2, 3, 4]) {
        if (derivePeriodsPerSession(totalPeriods, sessions) <= 4) {
            return sessions;
        }
    }

    return Math.max(configured, 1);
}

function FieldLabel({ children }: { children: ReactNode }) {
    return (
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
            {children}
        </label>
    );
}

function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            {...props}
            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all"
        />
    );
}

function SelectInput(props: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            {...props}
            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-800 outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all"
        />
    );
}

function RelationPicker({
    label,
    helper,
    value,
    options,
    selectedItems,
    onAdd,
    onRemove,
}: {
    label: string;
    helper: string;
    value: string[];
    options: any[];
    selectedItems: any[];
    onAdd: (id: string) => void;
    onRemove: (id: string) => void;
}) {
    const [pendingId, setPendingId] = useState("");

    useEffect(() => {
        setPendingId("");
    }, [value.join("|"), options.length]);

    return (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <Link2 size={14} className="text-slate-400" />
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                        {label}
                    </p>
                </div>
                <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                    {helper}
                </p>
            </div>

            <div className="flex gap-2">
                <SelectInput
                    value={pendingId}
                    onChange={(event) => {
                        const nextId = event.target.value;
                        setPendingId(nextId);
                        if (nextId) {
                            onAdd(nextId);
                        }
                    }}
                >
                    <option value="">-- Chọn học phần để thêm --</option>
                    {options.map((item) => (
                        <option key={item.id} value={item.id}>
                            [{item.code}] {item.name}
                        </option>
                    ))}
                </SelectInput>
            </div>

            <div className="flex flex-wrap gap-2">
                {selectedItems.length > 0 ? (
                    selectedItems.map((item) => (
                        <span
                            key={item.id}
                            className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-uneti-blue"
                        >
                            <span>
                                [{item.code}] {item.name}
                            </span>
                            <button
                                type="button"
                                onClick={() => onRemove(item.id)}
                                className="rounded-full p-0.5 text-slate-400 hover:bg-white hover:text-rose-500 transition-all"
                            >
                                <X size={12} />
                            </button>
                        </span>
                    ))
                ) : (
                    <p className="text-[11px] font-medium text-slate-400">
                        Chưa chọn học phần nào.
                    </p>
                )}
            </div>
        </div>
    );
}

export function SubjectFormModal({
    isOpen,
    onClose,
    editingSubject,
    majors,
    departments,
    subjects,
    headers,
    onSuccess,
}: SubjectFormModalProps) {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;

        if (editingSubject) {
            setForm({
                name: editingSubject.name || "",
                code: editingSubject.code || "",
                majorId: editingSubject.majorId || majors[0]?.id || "",
                credits: Number(editingSubject.credits || 0) || 3,
                theoryHours: Number(editingSubject.theoryHours || 0),
                practiceHours: Number(editingSubject.practiceHours || 0),
                selfStudyHours: Number(editingSubject.selfStudyHours || 0),
                theorySessionsPerWeek:
                    Number(editingSubject.theorySessionsPerWeek || 0) ||
                    (Number(editingSubject.theoryHours || 0) > 0 ? 1 : 0),
                practiceSessionsPerWeek:
                    Number(editingSubject.practiceSessionsPerWeek || 0) ||
                    (Number(editingSubject.practiceHours || 0) > 0 ? 1 : 0),
                departmentId: editingSubject.departmentId || "",
                examType: editingSubject.examType || "TU_LUAN",
                examForm: editingSubject.examForm || "Tự luận",
                examDuration: Number(editingSubject.examDuration || 0) || 90,
                description: editingSubject.description || "",
                prerequisiteIds: normalizeIds(
                    editingSubject.prerequisiteIds ||
                    editingSubject.prerequisiteSubjects?.map((item: any) => item.id),
                ),
                precedingSubjectIds: normalizeIds(
                    editingSubject.precedingSubjectIds ||
                    editingSubject.precedingSubjects?.map((item: any) => item.id),
                ),
            });
        } else {
            setForm({
                ...DEFAULT_FORM,
                majorId: majors[0]?.id || "",
            });
        }

        setErrorMsg(null);
    }, [isOpen, editingSubject, majors]);

    const availableSubjects = useMemo(() => {
        return subjects
            .filter((item) => item.id !== editingSubject?.id)
            .filter((item) => !form.majorId || item.majorId === form.majorId)
            .sort((left, right) =>
                `${left.code || ""}`.localeCompare(`${right.code || ""}`, "vi"),
            );
    }, [subjects, editingSubject, form.majorId]);

    const selectedPrerequisites = useMemo(
        () =>
            form.prerequisiteIds
                .map((id) => availableSubjects.find((item) => item.id === id) || subjects.find((item) => item.id === id))
                .filter(Boolean),
        [availableSubjects, form.prerequisiteIds, subjects],
    );

    const selectedPrecedingSubjects = useMemo(
        () =>
            form.precedingSubjectIds
                .map((id) => availableSubjects.find((item) => item.id === id) || subjects.find((item) => item.id === id))
                .filter(Boolean),
        [availableSubjects, form.precedingSubjectIds, subjects],
    );

    const theoryPerSession = derivePeriodsPerSession(
        Number(form.theoryHours || 0),
        Number(form.theorySessionsPerWeek || 0),
    );
    const practicePerSession = derivePeriodsPerSession(
        Number(form.practiceHours || 0),
        Number(form.practiceSessionsPerWeek || 0),
    );

    const subjectMode = useMemo(() => {
        if (Number(form.theoryHours || 0) > 0 && Number(form.practiceHours || 0) > 0) {
            return "Học phần hỗn hợp";
        }
        if (Number(form.practiceHours || 0) > 0) {
            return "Học phần thực hành / thực tập";
        }
        return "Học phần lý thuyết";
    }, [form.practiceHours, form.theoryHours]);

    const addRelation = (key: "prerequisiteIds" | "precedingSubjectIds", id: string) => {
        if (!id) return;
        setForm((current) => ({
            ...current,
            [key]: normalizeIds([...(current[key] || []), id]),
        }));
    };

    const removeRelation = (
        key: "prerequisiteIds" | "precedingSubjectIds",
        id: string,
    ) => {
        setForm((current) => ({
            ...current,
            [key]: current[key].filter((item) => item !== id),
        }));
    };

    const handleSubmit = async () => {
        if (!form.code.trim() || !form.name.trim() || !form.majorId) {
            setErrorMsg("Mã môn, tên môn và ngành chủ quản là bắt buộc.");
            return;
        }

        setActionLoading(true);
        setErrorMsg(null);
        try {
            const url = editingSubject ? `/api/subjects/${editingSubject.id}` : "/api/subjects";
            const method = editingSubject ? "PUT" : "POST";
            const payload = {
                ...form,
                code: form.code.trim(),
                name: form.name.trim(),
                departmentId: form.departmentId || null,
                theoryHours: Number(form.theoryHours || 0),
                practiceHours: Number(form.practiceHours || 0),
                selfStudyHours: Number(form.selfStudyHours || 0),
                theorySessionsPerWeek:
                    Number(form.theoryHours || 0) > 0
                        ? Math.max(Number(form.theorySessionsPerWeek || 0), 1)
                        : 0,
                practiceSessionsPerWeek:
                    Number(form.practiceHours || 0) > 0
                        ? Math.max(Number(form.practiceSessionsPerWeek || 0), 1)
                        : 0,
                prerequisiteIds: normalizeIds(form.prerequisiteIds),
                precedingSubjectIds: normalizeIds(form.precedingSubjectIds),
            };

            const res = await fetch(url, {
                method,
                headers: {
                    ...headers,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                onSuccess(
                    editingSubject
                        ? "Cập nhật môn học thành công!"
                        : "Thêm môn học mới thành công!",
                );
                onClose();
                return;
            }

            const data = await res.json().catch(() => null);
            setErrorMsg(data?.message || "Có lỗi xảy ra khi lưu môn học.");
        } catch {
            setErrorMsg("Lỗi kết nối.");
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={editingSubject ? "Cập nhật Môn học" : "Thêm Môn học mới"}
            footer={
                <div className="flex items-center justify-end gap-3 w-full px-2">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-[12px] font-black text-slate-400 uppercase"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={actionLoading}
                        className="px-8 py-3 bg-uneti-blue text-white rounded-[20px] text-[12px] font-black hover:bg-slate-900 transition-all shadow-lg shadow-uneti-blue/10 disabled:opacity-50"
                    >
                        {actionLoading ? "ĐANG XỬ LÝ..." : "LƯU THÔNG TIN"}
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                        <AlertCircle size={18} />
                        <p className="text-xs font-bold">{errorMsg}</p>
                    </div>
                )}

                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <BookOpen size={18} className="text-uneti-blue mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-uneti-blue uppercase tracking-widest">
                                Logic nhập liệu theo UNETI
                            </p>
                            <p className="text-[12px] font-medium text-slate-700 leading-relaxed">
                                Nhập theo đúng khối lượng học tập của CTĐT/đề cương học phần:
                                <strong> LT, TH/TL, Tự học</strong>. Hệ thống dùng học kỳ chuẩn
                                <strong> 15 tuần</strong> để suy ra số tiết mỗi buổi, không bắt
                                nhập tay như trước.
                            </p>
                            <p className="text-[11px] font-medium text-slate-500 leading-relaxed">
                                Quy ước UNETI: <strong>1 TC lý thuyết = 15 tiết</strong>,
                                <strong> 1 TC thực hành thường từ 30 đến 45 tiết</strong>.
                                Chuyên cần được tính theo <strong>tổng số tiết vắng</strong>,
                                không tính theo số buổi nghỉ.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <FieldLabel>Mã môn học</FieldLabel>
                        <TextInput
                            type="text"
                            placeholder="Ví dụ: 001078"
                            value={form.code}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, code: event.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel>Số tín chỉ</FieldLabel>
                        <TextInput
                            type="number"
                            min={1}
                            value={form.credits}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    credits: parseInt(event.target.value || "0", 10) || 0,
                                }))
                            }
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <FieldLabel>Tên môn học</FieldLabel>
                    <TextInput
                        type="text"
                        placeholder="Ví dụ: Lập trình hướng đối tượng"
                        value={form.name}
                        onChange={(event) =>
                            setForm((current) => ({ ...current, name: event.target.value }))
                        }
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <FieldLabel>Ngành chủ quản</FieldLabel>
                        <SelectInput
                            value={form.majorId}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    majorId: event.target.value,
                                    prerequisiteIds: [],
                                    precedingSubjectIds: [],
                                }))
                            }
                        >
                            <option value="">-- Chọn ngành --</option>
                            {majors.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel>Bộ môn phụ trách</FieldLabel>
                        <SelectInput
                            value={form.departmentId}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    departmentId: event.target.value,
                                }))
                            }
                        >
                            <option value="">-- Chọn bộ môn --</option>
                            {departments.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                    {item.faculty?.code ? ` (${item.faculty.code})` : ""}
                                </option>
                            ))}
                        </SelectInput>
                    </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 space-y-5">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                Khối lượng học tập
                            </p>
                            <p className="text-[12px] font-medium text-slate-500">
                                {subjectMode} • học kỳ chuẩn 15 tuần
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <FieldLabel>Lý thuyết (tiết)</FieldLabel>
                            <TextInput
                                type="number"
                                min={0}
                                value={form.theoryHours}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        theoryHours: parseInt(event.target.value || "0", 10) || 0,
                                        theorySessionsPerWeek:
                                            parseInt(event.target.value || "0", 10) > 0
                                                ? suggestSessionsPerWeek(
                                                    parseInt(event.target.value || "0", 10) || 0,
                                                    Number(current.theorySessionsPerWeek || 0),
                                                )
                                                : 0,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel>Thực hành (tiết)</FieldLabel>
                            <TextInput
                                type="number"
                                min={0}
                                value={form.practiceHours}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        practiceHours: parseInt(event.target.value || "0", 10) || 0,
                                        practiceSessionsPerWeek:
                                            parseInt(event.target.value || "0", 10) > 0
                                                ? suggestSessionsPerWeek(
                                                    parseInt(event.target.value || "0", 10) || 0,
                                                    Number(current.practiceSessionsPerWeek || 0),
                                                )
                                                : 0,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel>Tự học</FieldLabel>
                            <TextInput
                                type="number"
                                min={0}
                                value={form.selfStudyHours}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        selfStudyHours: parseInt(event.target.value || "0", 10) || 0,
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <FieldLabel>Số buổi / tuần phần LT</FieldLabel>
                            <TextInput
                                type="number"
                                min={0}
                                value={form.theorySessionsPerWeek}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        theorySessionsPerWeek:
                                            parseInt(event.target.value || "0", 10) || 0,
                                    }))
                                }
                                disabled={Number(form.theoryHours || 0) <= 0}
                            />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel>Số buổi / tuần phần TH/TL</FieldLabel>
                            <TextInput
                                type="number"
                                min={0}
                                value={form.practiceSessionsPerWeek}
                                onChange={(event) =>
                                    setForm((current) => ({
                                        ...current,
                                        practiceSessionsPerWeek:
                                            parseInt(event.target.value || "0", 10) || 0,
                                    }))
                                }
                                disabled={Number(form.practiceHours || 0) <= 0}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-emerald-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                LT dự kiến
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-800">
                                {Number(form.theoryHours || 0) > 0
                                    ? `${theoryPerSession} tiết / buổi`
                                    : "Không có"}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                {Number(form.theoryHours || 0) > 0
                                    ? `${form.theoryHours} tiết / ${form.theorySessionsPerWeek || 1} buổi tuần / 15 tuần`
                                    : "Phần lý thuyết chưa khai báo"}
                            </p>
                        </div>
                        <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3">
                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                                TH/TL dự kiến
                            </p>
                            <p className="mt-1 text-sm font-black text-slate-800">
                                {Number(form.practiceHours || 0) > 0
                                    ? `${practicePerSession} tiết / buổi`
                                    : "Không có"}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                {Number(form.practiceHours || 0) > 0
                                    ? `${form.practiceHours} tiết / ${form.practiceSessionsPerWeek || 1} buổi tuần / 15 tuần`
                                    : "Phần thực hành / thảo luận chưa khai báo"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <FieldLabel>Loại thi</FieldLabel>
                        <SelectInput
                            value={form.examType}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, examType: event.target.value }))
                            }
                        >
                            <option value="TU_LUAN">Tự luận</option>
                            <option value="TRAC_NGHIEM">Trắc nghiệm</option>
                            <option value="THUC_HANH">Thực hành</option>
                            <option value="VAN_DAP">Vấn đáp</option>
                        </SelectInput>
                    </div>
                    <div className="space-y-2">
                        <FieldLabel>Hình thức thi</FieldLabel>
                        <TextInput
                            type="text"
                            value={form.examForm}
                            onChange={(event) =>
                                setForm((current) => ({ ...current, examForm: event.target.value }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <FieldLabel>Thời lượng thi (phút)</FieldLabel>
                        <TextInput
                            type="number"
                            min={0}
                            value={form.examDuration}
                            onChange={(event) =>
                                setForm((current) => ({
                                    ...current,
                                    examDuration: parseInt(event.target.value || "0", 10) || 0,
                                }))
                            }
                        />
                    </div>
                </div>

                <RelationPicker
                    label="Học phần tiên quyết"
                    helper="Dùng để khóa đăng ký học phần. Sinh viên phải đạt các môn này trước khi đăng ký."
                    value={form.prerequisiteIds}
                    options={availableSubjects.filter(
                        (item) => !form.prerequisiteIds.includes(item.id),
                    )}
                    selectedItems={selectedPrerequisites}
                    onAdd={(id) => addRelation("prerequisiteIds", id)}
                    onRemove={(id) => removeRelation("prerequisiteIds", id)}
                />

                <RelationPicker
                    label="Học phần học trước"
                    helper="Dùng để quản lý trình tự CTĐT và gợi ý xếp học kỳ. Không khóa đăng ký như tiên quyết."
                    value={form.precedingSubjectIds}
                    options={availableSubjects.filter(
                        (item) =>
                            !form.precedingSubjectIds.includes(item.id) &&
                            !form.prerequisiteIds.includes(item.id),
                    )}
                    selectedItems={selectedPrecedingSubjects}
                    onAdd={(id) => addRelation("precedingSubjectIds", id)}
                    onRemove={(id) => removeRelation("precedingSubjectIds", id)}
                />

                <div className="space-y-2">
                    <FieldLabel>Mô tả học phần</FieldLabel>
                    <textarea
                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[13px] font-bold text-slate-800 outline-none h-32 resize-none focus:ring-2 focus:ring-uneti-blue/10 focus:border-uneti-blue transition-all"
                        placeholder="Tóm tắt ngắn về học phần, nội dung chính và lưu ý triển khai..."
                        value={form.description}
                        onChange={(event) =>
                            setForm((current) => ({
                                ...current,
                                description: event.target.value,
                            }))
                        }
                    />
                </div>
            </div>
        </Modal>
    );
}
