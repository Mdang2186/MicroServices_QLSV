"use client";

import React, { useRef, useState } from "react";
import { FileUp, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelImportButtonProps {
    semesterId: string;
    onSuccess: () => void;
    headers: Record<string, string>;
}

export function ExcelImportButton({ semesterId, onSuccess, headers }: ExcelImportButtonProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(null);

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

            if (jsonData.length === 0) {
                throw new Error("File Excel trống.");
            }

            // Map Excel data to API payload
            // Expected columns: subjectCode, lecturerCode, adminClassCodes (comma separated), dayOfWeek, startShift, endShift, roomName, type
            const items = jsonData.map((row) => ({
                subjectCode: row["Mã HP"] || row.subjectCode,
                lecturerCode: row["Mã GV"] || row.lecturerCode,
                adminClassCodes: String(row["Lớp HC"] || row.adminClassCodes || "").split(",").map((s: string) => s.trim()),
                maxSlots: Number(row["Sĩ số"] || row.maxSlots || 60),
                schedules: [
                    {
                        dayOfWeek: Number(row["Thứ"] || row.dayOfWeek),
                        startShift: Number(row["Tiết BD"] || row.startShift),
                        endShift: Number(row["Tiết KT"] || row.endShift),
                        roomName: row["Phòng"] || row.roomName,
                        type: row["Loại"] || row.type || "THEORY",
                    },
                ],
            }));

            const res = await fetch("/api/courses/bulk-import", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...headers },
                body: JSON.stringify({ items, semesterId }),
            });

            const result = await res.json();
            if (res.ok) {
                setStatus({ type: "success", message: `Thành công: ${result.count} lớp đã được tạo.` });
                onSuccess();
            } else {
                throw new Error(result.message || "Lỗi khi nhập dữ liệu.");
            }
        } catch (err: any) {
            setStatus({ type: "error", message: err.message });
        } finally {
            setLoading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    return (
        <div className="relative">
            <input
                type="file"
                ref={fileRef}
                className="hidden"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
            />
            <button
                onClick={() => fileRef.current?.click()}
                disabled={loading}
                className="px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-100 transition-all disabled:opacity-50"
            >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <FileUp size={14} />}
                Nhập từ Excel
            </button>

            {status && (
                <div className={`absolute top-full mt-2 right-0 w-64 p-3 rounded-xl border shadow-lg z-50 animate-in fade-in slide-in-from-top-2 ${status.type === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-700" : "bg-rose-50 border-rose-100 text-rose-700"}`}>
                    <div className="flex items-start gap-2">
                        {status.type === "success" ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                        <p className="text-[11px] font-bold leading-tight">{status.message}</p>
                    </div>
                </div>
            )}
        </div>
    );
}
