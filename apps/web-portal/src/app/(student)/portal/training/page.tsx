"use client";

import { motion } from "framer-motion";
import {
    Award,
    Zap,
    Star,
    ShieldCheck,
    Users,
    Heart,
    ChevronRight,
    TrendingUp,
    Calendar,
    Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const trainingData = [
    {
        semester: "Học kỳ 1 (2024 - 2025)",
        score: 85,
        rating: "Tốt",
        criteria: [
            { name: "Ý thức tham gia học tập", score: 18, max: 20, icon: Zap },
            { name: "Ý thức chấp hành nội quy", score: 25, max: 25, icon: ShieldCheck },
            { name: "Ý thức tham gia hoạt động CT-XH", score: 15, max: 20, icon: Users },
            { name: "Phẩm chất công dân và quan hệ cộng đồng", score: 12, max: 15, icon: Heart },
            { name: "Ý thức tham gia các hoạt động Đoàn, Hội", score: 15, max: 20, icon: Star },
        ]
    },
    {
        semester: "Học kỳ 2 (2023 - 2024)",
        score: 92,
        rating: "Xuất sắc",
        criteria: [
            { name: "Ý thức tham gia học tập", score: 20, max: 20, icon: Zap },
            { name: "Ý thức chấp hành nội quy", score: 25, max: 25, icon: ShieldCheck },
            { name: "Ý thức tham gia hoạt động CT-XH", score: 18, max: 20, icon: Users },
            { name: "Phẩm chất công dân và quan hệ cộng đồng", score: 14, max: 15, icon: Heart },
            { name: "Ý thức tham gia các hoạt động Đoàn, Hội", score: 15, max: 20, icon: Star },
        ]
    }
];

export default function TrainingResultsPage() {
    return (
        <div className="min-h-screen space-y-6 bg-transparent pb-20">
            {/* Header Section */}
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-[2rem] border border-white bg-white/70 p-6 shadow-[0_20px_50px_rgba(0,0,0,0.05)] backdrop-blur-3xl ring-1 ring-purple-500/5"
            >
                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-400/20 blur-3xl opacity-50" />
                <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl opacity-50" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-xl shadow-purple-500/30">
                            <Award className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Kết quả rèn luyện</h1>
                            <p className="mt-0.5 text-xs font-medium text-slate-500">Ghi nhận nỗ lực hoạt động và rèn luyện đạo đức</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button className="rounded-xl bg-white text-slate-900 hover:bg-slate-50 border border-slate-200 h-9 px-4 text-xs font-bold">
                            <Download className="mr-2 h-3.5 w-3.5" /> Xuất minh chứng
                        </Button>
                        <Button className="rounded-xl bg-purple-600 text-white hover:bg-purple-700 shadow-xl shadow-purple-200 h-9 px-4 text-xs font-bold">
                            Tất cả học kỳ
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Content Tabs / Semester Cards */}
            <div className="space-y-8">
                {trainingData.map((data, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 * idx }}
                        className="relative"
                    >
                        {/* Semester Header */}
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-1.5 w-8 rounded-full bg-purple-600" />
                            <h2 className="text-lg font-black text-slate-800">{data.semester}</h2>
                            <div className="hidden md:block h-[1px] flex-1 bg-slate-200" />
                        </div>

                        <div className="grid lg:grid-cols-3 gap-6">
                            {/* Score Card */}
                            <div className="lg:col-span-1 rounded-[1.5rem] border border-white bg-white/60 p-6 shadow-xl backdrop-blur-2xl flex flex-col items-center justify-center text-center">
                                <div className="relative mb-6">
                                    <svg className="h-32 w-32 -rotate-90">
                                        <circle
                                            cx="64" cy="64" r="54"
                                            fill="none"
                                            stroke="#f3f4f6"
                                            strokeWidth="12"
                                        />
                                        <motion.circle
                                            initial={{ strokeDasharray: "0, 340" }}
                                            animate={{ strokeDasharray: `${(data.score / 100) * 340}, 340` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            cx="64" cy="64" r="54"
                                            fill="none"
                                            stroke="url(#purpleGradient)"
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                        />
                                        <defs>
                                            <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                                <stop offset="0%" stopColor="#9333ea" />
                                                <stop offset="100%" stopColor="#4f46e5" />
                                            </linearGradient>
                                        </defs>
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-3xl font-black text-slate-800">{data.score}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điểm</span>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-xs font-black shadow-lg",
                                    data.rating === "Xuất sắc" ? "bg-amber-100 text-amber-700 shadow-amber-100" : "bg-emerald-100 text-emerald-700 shadow-emerald-100"
                                )}>
                                    Phân loại: {data.rating}
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className="lg:col-span-2 space-y-3">
                                {data.criteria.map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 rounded-2xl border border-white bg-white/60 p-4 shadow-sm backdrop-blur-xl transition-all hover:bg-white hover:shadow-md ring-1 ring-slate-100/50">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-purple-600">
                                            <item.icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-slate-800 flex justify-between">
                                                <span>{item.name}</span>
                                                <span className="text-purple-600">{item.score}/{item.max}</span>
                                            </h4>
                                            <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${(item.score / item.max) * 100}%` }}
                                                    transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                                                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Info Section */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-[1.5rem] bg-slate-900 p-6 text-white shadow-2xl relative overflow-hidden"
            >
                <div className="absolute right-0 top-0 p-4 opacity-10">
                    <TrendingUp className="h-24 w-24" />
                </div>
                <div className="relative z-10 max-w-2xl">
                    <h3 className="text-lg font-black mb-2">Lưu ý về Điểm rèn luyện</h3>
                    <p className="text-slate-400 text-xs font-medium leading-relaxed mb-6">
                        Điểm rèn luyện là cơ sở để xét học bổng, khen thưởng và các chế độ ưu tiên khác.
                        Sinh viên cần tích cực tham gia các hoạt động ngoại khóa, đoàn hội để cải thiện kết quả này.
                    </p>
                    <Button className="rounded-xl bg-white text-slate-900 hover:bg-white/90 px-6 h-9 font-bold text-xs">
                        Xem quy định chi tiết <ChevronRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}
