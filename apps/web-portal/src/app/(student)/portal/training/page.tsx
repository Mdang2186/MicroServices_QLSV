"use client";

import React, { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import { resolveCurrentStudentContext } from "@/lib/current-student";

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function parseIntakeYear(intake: string | null | undefined): number | null {
    if (!intake) return null;
    const t = intake.trim().toUpperCase();
    
    // Dạng "2021", "2022"...
    if (/^\d{4}$/.test(t)) return parseInt(t);

    // Dạng K14, K15, K16... của UNETI (K14 = 2020 -> Khóa = 2006 + số)
    // Hoặc K64, K65... (K64 = 2021 -> Khóa = 1957 + số)
    const kMatch = t.match(/^K(\d{2})$/);
    if (kMatch) {
        const kNum = parseInt(kMatch[1]);
        if (kNum >= 10 && kNum <= 40) return 2006 + kNum; // ĐH
        if (kNum >= 50) return 1957 + kNum; // CĐ/Khác
    }

    // Dạng mã lớp "21DCNTT" -> lấy "21" làm 2021
    const yyMatch = t.match(/^(\d{2})/);
    if (yyMatch) {
        const n = parseInt(yyMatch[1]);
        if (n >= 10 && n <= 50) return 2000 + n;
    }

    return null;
}

function generateSemesters(startYear: number) {
    const list = [];
    for (let y = 0; y < 4; y++) {
        for (let s = 1; s <= 2; s++) {
            list.push({
                index: y * 2 + s,
                semNo: s,
                from: startYear + y,
                to: startYear + y + 1,
            });
        }
    }
    return list;
}

function matchSemester(name: string, semNo: number, from: number, to: number) {
    const n = (name || "").replace(/\s/g, "").toLowerCase();
    const yearA = `${from}-${to}`;
    const yearB = `${from}${to}`;
    const hasYear = n.includes(yearA) || n.includes(yearB);
    const hasSem = n.startsWith(`${semNo}(`) || n.startsWith(`hk${semNo}`) || n.startsWith(`học kỳ ${semNo}`.replace(/\s/g, "")) || (n.includes(`(${from}`) && n.startsWith(`${semNo}`));
    return hasYear && hasSem;
}

// -------------------------------------------------------
export default function TrainingResultsPage() {
    const [trainingData, setTrainingData] = useState<any[]>([]);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const ctx = await resolveCurrentStudentContext();
                if (ctx.profile) setProfile(ctx.profile);
                if (!ctx.studentId) return;
                const data = await StudentService.getTrainingResults(ctx.studentId);
                setTrainingData(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
            </div>
        );
    }

    const intakeRaw = profile?.intake || profile?.adminClass?.cohort || null;
    let startYear = null;
    
    // Ưu tiên 1: Ngày nhập học chính xác từ DB
    if (profile?.admissionDate) {
        startYear = new Date(profile.admissionDate).getFullYear();
    }
    
    // Ưu tiên 2: Phân tích mã Khoá học/Intake
    if (!startYear && intakeRaw) {
        startYear = parseIntakeYear(intakeRaw);
    }
    
    // Ưu tiên 3: Lấy từ kết quả dữ liệu rèn luyện (năm bé nhất xuất hiện)
    if (!startYear && trainingData.length > 0) {
        let minYear = 9999;
        for (const d of trainingData) {
            const m = String(d.semester).match(/\b(20\d{2})\b/);
            if (m) {
                const y = parseInt(m[1]);
                if (y < minYear) minYear = y;
            }
        }
        if (minYear !== 9999) startYear = minYear;
    }

    const semesters = startYear ? generateSemesters(startYear) : null;

    function getDataFor(semNo: number, from: number, to: number) {
        return trainingData.find(d => matchSemester(d.semester || "", semNo, from, to)) ?? null;
    }

    return (
        <div className="p-4 md:p-6 bg-white min-h-screen font-sans">
            {/* Tiêu đề */}
            <h1 className="text-lg font-bold text-slate-800 mb-4">Kết quả rèn luyện</h1>

            {/* Bảng */}
            <div className="overflow-x-auto border border-slate-300">
                <table className="w-full border-collapse min-w-[720px] text-sm">
                    {/* Header */}
                    <thead>
                        <tr className="bg-white">
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold w-[60px]">STT</th>
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold w-[120px]">Ngày vi phạm</th>
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold">Nội dung</th>
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold w-[100px]">Hình thức</th>
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold w-[110px]">Ghi chú</th>
                            <th className="border border-slate-300 px-3 py-2 text-center text-[#337ab7] font-bold w-[110px] leading-snug">
                                Điểm<br />Cộng/Trừ
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {semesters ? (
                            semesters.map((sem) => {
                                const data = getDataFor(sem.semNo, sem.from, sem.to);
                                const label = `${sem.semNo} (${sem.from} - ${sem.to})`;
                                const score = data ? Number(data.score).toFixed(2).replace(".", ",") : "";
                                const rating = data ? data.rating : "";

                                return (
                                    <React.Fragment key={sem.index}>
                                        {/* Dòng học kỳ */}
                                        <tr className="bg-[#eef3f7]">
                                            <td colSpan={2} className="border border-slate-300 px-3 py-1.5 text-[#337ab7] font-bold text-sm">
                                                {label}
                                            </td>
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                        </tr>

                                        {/* Dòng điểm rèn luyện */}
                                        <tr className="bg-white">
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5 text-center text-[#c87941] font-semibold">
                                                Điểm rèn luyện
                                            </td>
                                            <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">
                                                {score}
                                            </td>
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                        </tr>

                                        {/* Dòng xếp loại */}
                                        <tr className="bg-white">
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5 text-center text-[#c87941] font-semibold">
                                                Xếp loại
                                            </td>
                                            <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">
                                                {rating}
                                            </td>
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                            <td className="border border-slate-300 px-3 py-1.5" />
                                        </tr>
                                    </React.Fragment>
                                );
                            })
                        ) : (
                            // Fallback khi không có intake
                            trainingData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="border border-slate-300 px-3 py-8 text-center text-slate-400">
                                        Chưa có dữ liệu rèn luyện
                                    </td>
                                </tr>
                            ) : (
                                trainingData.map((d, idx) => {
                                    const score = d.score !== null && d.score !== undefined
                                        ? Number(d.score).toFixed(2).replace(".", ",") : "";
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr className="bg-[#eef3f7]">
                                                <td colSpan={2} className="border border-slate-300 px-3 py-1.5 text-[#337ab7] font-bold">
                                                    {d.semester}
                                                </td>
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300 px-3 py-1.5 text-center text-[#c87941] font-semibold">Điểm rèn luyện</td>
                                                <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">{score}</td>
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                            </tr>
                                            <tr className="bg-white">
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300 px-3 py-1.5 text-center text-[#c87941] font-semibold">Xếp loại</td>
                                                <td className="border border-slate-300 px-3 py-1.5 text-center text-slate-700">{d.rating}</td>
                                                <td className="border border-slate-300" />
                                                <td className="border border-slate-300" />
                                            </tr>
                                        </React.Fragment>
                                    );
                                })
                            )
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
