"use client";

import { useEffect, useState } from "react";
import { StudentService } from "@/services/student.service";
import { getStudentProfileId, getStudentUserId, readStudentSessionUser } from "@/lib/student-session";
import { Printer, Download, CheckCircle2, Circle, Layout } from "lucide-react";

export default function CurriculumPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const user = readStudentSessionUser();
            const sid = getStudentProfileId(user) || (await StudentService.getProfile(getStudentUserId(user)))?.id;
            if (sid) setData(await StudentService.getCurriculumProgress(sid));
            setLoading(false);
        })();
    }, []);

    if (loading) return <div className="p-20 text-center animate-pulse">Đang tải dữ liệu...</div>;
    if (!data) return <div className="p-20 text-center">Không tìm thấy dữ liệu.</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-700 font-sans leading-relaxed">
            {/* Header: Clean & Simple */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-xl border shadow-sm gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Layout size={32} /></div>
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-tight">Chương trình khung</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{data.majorName} • KHÓA {data.cohort}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold border rounded-lg hover:bg-slate-50 transition-colors"><Printer size={16}/> In</button>
                    <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md shadow-blue-100 transition-all"><Download size={16}/> Tải xuống</button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatBox label="Tổng TC" value={data.stats.totalCredits} />
                <StatBox label="Bắt buộc" value={data.stats.mandatory} />
                <StatBox label="Tự chọn" value={data.stats.totalCredits - data.stats.mandatory} />
                <StatBox label="Đã đạt" value={data.stats.passed} isBlue />
            </div>

            {/* Simple Table structure */}
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b font-bold text-slate-500 uppercase">
                            <th className="px-4 py-3 text-center w-12">STT</th>
                            <th className="px-4 py-3">Tên môn học/Học phần</th>
                            <th className="px-4 py-3 w-32">Mã HP</th>
                            <th className="px-4 py-3 text-center w-16">TC</th>
                            <th className="px-4 py-3 text-center w-12">LT</th>
                            <th className="px-4 py-3 text-center w-12">TH</th>
                            <th className="px-4 py-3 text-center w-24">Bắt buộc</th>
                            <th className="px-4 py-3 text-center w-16">Đạt</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y italic">
                        {data.semesters.map((sem: any) => (
                            <React.Fragment key={sem.semester}>
                                <tr className="bg-slate-50/50"><td colSpan={8} className="px-4 py-2 font-bold text-blue-700 text-sm">Học kỳ {sem.semester} ({sem.totalCredits} TC)</td></tr>
                                {sem.items.map((item: any, i: number) => (
                                    <tr key={i} className={`hover:bg-slate-200/5 transition-colors ${item.isPassed ? 'bg-emerald-50/20' : ''}`}>
                                        <td className="px-4 py-3 text-center text-slate-300">{i + 1}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{item.name || item.subjectName}</td>
                                        <td className="px-4 py-3 text-slate-400 font-mono tracking-tighter">{item.code || item.subjectCode}</td>
                                        <td className="px-4 py-3 text-center font-bold">{item.credits}</td>
                                        <td className="px-4 py-3 text-center text-slate-400">{item.theoryPeriods}</td>
                                        <td className="px-4 py-3 text-center text-slate-400">{item.practicePeriods}</td>
                                        <td className="px-4 py-3 text-center text-[10px] uppercase font-bold tracking-tighter">{item.isRequired ? 'Bắt buộc' : <span className="text-slate-300">Tự chọn</span>}</td>
                                        <td className="px-4 py-3">{item.isPassed ? <CheckCircle2 className="mx-auto text-emerald-500" size={18}/> : <Circle className="mx-auto text-slate-100" size={18}/>}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

const StatBox = ({ label, value, isBlue }: any) => (
    <div className={`p-4 border rounded-xl ${isBlue ? 'bg-blue-50 border-blue-100' : 'bg-white'}`}>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className={`text-xl font-bold ${isBlue ? 'text-blue-600' : 'text-slate-800'}`}>{value}</p>
    </div>
);

import React from "react";
