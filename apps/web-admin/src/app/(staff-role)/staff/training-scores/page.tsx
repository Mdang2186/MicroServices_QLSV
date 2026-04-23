"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import Cookies from "js-cookie";
import { Award, Save, Upload, Download, Loader2, Search, Check, Edit2 } from "lucide-react";
import * as XLSX from "xlsx";

export default function StaffTrainingScoresPage() {
    const [majors, setMajors] = useState<any[]>([]);
    const [adminClasses, setAdminClasses] = useState<any[]>([]);
    const [semesters, setSemesters] = useState<any[]>([]);
    const [cohorts, setCohorts] = useState<any[]>([]);
    
    // Filters
    const [selectedMajorId, setSelectedMajorId] = useState("");
    const [selectedClassId, setSelectedClassId] = useState("");

    const [students, setStudents] = useState<any[]>([]);
    const [originalScores, setOriginalScores] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    const TOKEN = Cookies.get("staff_accessToken") || Cookies.get("admin_accessToken");

    useEffect(() => {
        fetchMajors();
        fetchSemesters();
        fetchCohorts();
        
        // Parse classId from URL if exists
        const urlParams = new URLSearchParams(window.location.search);
        const classId = urlParams.get("classId");
        if (classId) {
            setSelectedClassId(classId);
        }
    }, []);

    useEffect(() => {
        fetchAdminClasses();
    }, [selectedMajorId]);

    useEffect(() => {
        if (selectedClassId) {
            fetchScores();
        } else {
            setStudents([]);
        }
    }, [selectedClassId]);

    const fetchMajors = async () => {
        try {
            const res = await fetch("/api/majors", { headers: { Authorization: `Bearer ${TOKEN}` } });
            if (res.ok) setMajors(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchCohorts = async () => {
        try {
            const res = await fetch("/api/cohorts", { headers: { Authorization: `Bearer ${TOKEN}` } });
            if (res.ok) setCohorts(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchAdminClasses = async () => {
        try {
            const params = selectedMajorId ? `?majorId=${selectedMajorId}` : "";
            const res = await fetch(`/api/admin-classes${params}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
            if (res.ok) {
                const data = await res.json();
                setAdminClasses(data);
                // If url had classId but we didn't have classes loaded yet, we can't select major correctly without more logic.
                // For simplicity, if selectedClassId is set but major is not, we find the major.
                const urlParams = new URLSearchParams(window.location.search);
                const classId = urlParams.get("classId");
                if (classId && !selectedMajorId) {
                    const cls = data.find((c: any) => c.id === classId);
                    if (cls) {
                        setSelectedMajorId(cls.majorId);
                    }
                }
            }
        } catch (error) { console.error(error); }
    };

    const fetchSemesters = async () => {
        try {
            const res = await fetch("/api/semesters", { headers: { Authorization: `Bearer ${TOKEN}` } });
            if (res.ok) setSemesters(await res.json());
        } catch (error) { console.error(error); }
    };

    const fetchScores = async () => {
        setLoading(true);
        try {
            // No semesterId = fetch all semesters for this class
            const res = await fetch(`/api/training-results/admin-class/${selectedClassId}`, {
                headers: { Authorization: `Bearer ${TOKEN}` }
            });
            if (res.ok) {
                const data = await res.json();
                
                // Map the students into a dictionary format: { studentCode: { semesterId: score } }
                const normalized = data.map((st: any) => {
                    const scoresMap: Record<string, { score: number, classification: string }> = {};
                    if (Array.isArray(st.scores)) {
                        st.scores.forEach((sc: any) => {
                            scoresMap[sc.semesterId] = { score: sc.score, classification: sc.classification };
                        });
                    }
                    
                    return {
                        id: st.id,
                        studentCode: st.studentCode,
                        fullName: st.fullName,
                        scores: scoresMap,
                        dirtyScores: {} as Record<string, { score: number, classification: string }>
                    };
                });
                setOriginalScores(JSON.parse(JSON.stringify(normalized))); // Deep copy for diffing
                setStudents(normalized);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate the exact 8 semesters for this class based on their Cohort startYear
    const classSemesters = useMemo(() => {
        if (!selectedClassId || semesters.length === 0) {
            // Generate placeholder slots with no DB semester
            return Array.from({ length: 8 }, (_, i) => ({ dbSemester: null, expectedYear: 0, expectedSemNo: 0 }));
        }
        
        const selectedClass = adminClasses.find(c => c.id === selectedClassId);
        if (!selectedClass) return Array.from({ length: 8 }, (_, i) => ({ dbSemester: null, expectedYear: 0, expectedSemNo: 0 }));

        const cohortObj = cohorts.find(c => c.code === selectedClass.cohort);
        let startYear = cohortObj?.startYear;
        if (!startYear && selectedClass.cohort) {
            const parsed = parseInt(selectedClass.cohort.replace(/\D/g, ''));
            if (!isNaN(parsed) && parsed < 100) startYear = 2006 + parsed;
            else if (!isNaN(parsed) && parsed >= 2000) startYear = parsed;
        }
        if (!startYear) startYear = new Date().getFullYear() - 4;
        
        // Sort all semesters by startDate
        const sorted = [...semesters].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        // Generate the 8 "expected" slots mathematically (like web-portal's generateSemesters)
        type SemSlot = { dbSemester: any; expectedYear: number; expectedSemNo: number };
        const slots: SemSlot[] = [];
        
        for (let y = 0; y < 4; y++) {
            for (let s = 1; s <= 2; s++) {
                const acadYear = startYear! + y;
                const toYear = acadYear + 1;
                const yearRange = `${acadYear}-${toYear}`; // e.g. "2024-2025"
                const namYear = y + 1; // Năm 1, Năm 2, Năm 3, Năm 4
                
                // Score-based matching: find the best semester in DB for this slot
                // Scoring criteria:
                // +3: name contains HKs + year range (e.g. "HK1 - Năm 1 (2024-2025)")
                // +2: name contains year range + "Năm namYear"  
                // +1: name starts with HKs or "Học kỳ s"
                // The "Năm X" label must match the year in 4-year sequence to avoid cross-cohort mixing
                
                let bestScore = -1;
                let bestSem: any = null;
                
                for (const sem of sorted) {
                    const n = (sem.name || '').toLowerCase().replace(/\s+/g, '');
                    const hasYearRange = n.includes(yearRange.replace('-', '')) || n.includes(yearRange);
                    if (!hasYearRange) continue; // Only consider semesters for this academic year
                    
                    // Exclude K16 legacy semesters (HK3, HK5, HK7 etc which are > 2)
                    // Those use HK numbering across 4 years, not per-year HK1/HK2
                    const isLegacyMultiSem = /^hk[3-9]|^hk[1-9][0-9]/.test(n);
                    if (isLegacyMultiSem) continue;
                    
                    let score = 0;
                    
                    // Check if it's the right HK (1 or 2) within the year
                    if (n.startsWith(`hk${s}`) || n.startsWith(`họckỳ${s}`)) score += 2;
                    
                    // Check if it's the right Năm in sequence  
                    if (n.includes(`năm${namYear}`) || n.includes(`năm${namYear}(`)) score += 2;
                    
                    if (score > bestScore) {
                        bestScore = score;
                        bestSem = sem;
                    }
                }
                
                // Fallback: any semester in the correct time window
                if (!bestSem) {
                    const sepStart = new Date(`${acadYear}-09-01`).getTime();
                    const febStart = new Date(`${toYear}-02-01`).getTime();
                    const julyEnd = new Date(`${toYear}-07-31`).getTime();
                    const windowStart = s === 1 ? sepStart : febStart;
                    const windowEnd = s === 1 ? febStart : julyEnd;
                    bestSem = sorted.find(sem => {
                        const t = new Date(sem.startDate).getTime();
                        const n = (sem.name || '').toLowerCase().replace(/\s+/g, '');
                        const isLegacyMultiSem = /^hk[3-9]|^hk[1-9][0-9]/.test(n);
                        return t >= windowStart && t < windowEnd && !isLegacyMultiSem;
                    }) || null;
                }
                
                slots.push({ dbSemester: bestSem || null, expectedYear: acadYear, expectedSemNo: s });
            }
        }
        
        return slots;

    }, [selectedClassId, adminClasses, semesters, cohorts]);



    const getClassification = (score: number) => {
        if (score >= 90) return "Xuất sắc";
        if (score >= 80) return "Tốt";
        if (score >= 70) return "Khá";
        if (score >= 60) return "Trung bình khá";
        if (score >= 50) return "Trung bình";
        if (score >= 35) return "Yếu";
        return "Kém";
    };

    const handleScoreChange = (studentIndex: number, semesterId: string, value: string) => {
        if (!semesterId) return;

        let num = parseInt(value, 10);
        if (isNaN(num)) num = 0;
        if (num < 0) num = 0;
        if (num > 100) num = 100;

        const updated = [...students];
        const student = updated[studentIndex];
        
        const originalScore = originalScores[studentIndex].scores[semesterId]?.score ?? null;

        // Either it's different from original, or it's a new insertion
        if (originalScore !== num) {
            student.dirtyScores[semesterId] = {
                score: num,
                classification: getClassification(num)
            };
        } else {
            // Reverted to original
            delete student.dirtyScores[semesterId];
        }

        // Update view model
        student.scores[semesterId] = {
            score: num,
            classification: getClassification(num)
        };

        setStudents(updated);
    };

    // Calculate total dirty cells
    const dirtyCount = students.reduce((acc, st) => acc + Object.keys(st.dirtyScores).length, 0);

    const handleSave = async () => {
        if (dirtyCount === 0) {
            alert("Không có thay đổi nào cần lưu!");
            return;
        }

        setSaving(true);
        try {
            // Flatten dirtyScores into payload array
            const payload: any[] = [];
            students.forEach(s => {
                Object.keys(s.dirtyScores).forEach(semId => {
                    payload.push({
                        studentId: s.id,
                        semesterId: semId,
                        score: s.dirtyScores[semId].score,
                        classification: s.dirtyScores[semId].classification
                    });
                });
            });

            if (payload.length === 0) return;

            const res = await fetch("/api/training-results/batch-save", {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${TOKEN}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert(`Đã lưu thành công ${payload.length} biên bản điểm rèn luyện!`);
                await fetchScores();
            } else {
                const err = await res.json();
                alert(err.message || "Lỗi lưu bảng điểm");
            }
        } catch (error) {
            alert("Đã xảy ra lỗi kết nối");
        } finally {
            setSaving(false);
        }
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                let importedCount = 0;
                const updatedStudents = [...students];
                
                data.forEach((row: any) => {
                    const code = row['Mã SV'] || row['studentCode'] || row['mã sv'];
                    
                    if (code) {
                        const idx = updatedStudents.findIndex(s => s.studentCode === code);
                        if (idx !== -1) {
                            const student = updatedStudents[idx];
                            // Check all 8 semester columns in excel
                            classSemesters.forEach((item, colIdx) => {
                                const sem = item.dbSemester;
                                if (sem) {
                                    const colName = `Kỳ ${colIdx + 1}`;
                                    const scoreRaw = row[colName];
                                    if (scoreRaw !== undefined && scoreRaw !== "") {
                                        let num = parseInt(scoreRaw, 10);
                                        if (!isNaN(num)) {
                                            if (num < 0) num = 0;
                                            if (num > 100) num = 100;

                                            const currentScore = student.scores[sem.id]?.score;
                                            if (currentScore !== num) {
                                                student.dirtyScores[sem.id] = {
                                                    score: num,
                                                    classification: getClassification(num)
                                                };
                                                student.scores[sem.id] = student.dirtyScores[sem.id];
                                                importedCount++;
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                });

                setStudents(updatedStudents);
                alert(`Đã map thành công ${importedCount} ô điểm cho sinh viên. Vui lòng bấm "Lưu bảng điểm".`);
            } catch (err) {
                alert("File Excel không đúng định dạng mẫu 8 Cột!");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsBinaryString(file);
    };

    const handleDownloadTemplate = () => {
        if (students.length === 0) {
            alert("Vui lòng chọn Lớp để có danh sách tải xuống!");
            return;
        }

        const data = students.map(s => {
            const rowProps: any = {
                'Mã SV': s.studentCode,
                'Họ và tên': s.fullName,
            };
            classSemesters.forEach((item, idx) => {
                const colName = `Kỳ ${idx + 1}`;
                const sem = item.dbSemester;
                rowProps[colName] = sem && s.scores[sem.id] ? s.scores[sem.id].score : "";
            });
            rowProps['Ghi chú'] = '';
            return rowProps;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        
        const cls = adminClasses.find(c => c.id === selectedClassId)?.code || "Lop";
        const filename = `DiemRenLuyen_ToanKhoa_${cls}.xlsx`;
        XLSX.writeFile(wb, filename);
    };

    return (
        <div className="h-[calc(100vh-2rem)] flex flex-col bg-slate-50/50 relative">
            <div className="px-8 py-6 bg-white border-b border-slate-100 flex-shrink-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-uneti-blue flex items-center justify-center text-white shadow-lg shadow-uneti-blue/20">
                            <Award size={24} />
                        </div>
                        <div>
                            <h1 className="text-[20px] font-black text-slate-800 tracking-tight">Điểm Rèn Luyện Toàn Khóa</h1>
                            <p className="text-[13px] font-medium text-slate-400 mt-1">Lưới tính điểm thông minh 8 Học kỳ theo đặc thù Khóa đào tạo.</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Upload size={16} /> Nhập Excel 8 Kỳ
                        </button>
                        <input 
                            type="file" 
                            accept=".xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={handleImportExcel}
                        />

                        <button 
                            onClick={handleDownloadTemplate}
                            className="bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 px-4 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-sm"
                        >
                            <Download size={16} /> Tải Mẫu Data
                        </button>

                        <div className="h-6 w-px bg-slate-200 mx-1"></div>

                        <button 
                            onClick={handleSave}
                            disabled={dirtyCount === 0 || saving}
                            className={`px-6 py-2.5 rounded-xl text-[13px] font-bold flex items-center gap-2 transition-all shadow-lg ${
                                dirtyCount > 0 && !saving 
                                ? "bg-uneti-blue text-white shadow-uneti-blue/20 hover:scale-[1.02]" 
                                : "bg-slate-100 text-slate-400 cursor-not-allowed"
                            }`}
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Lưu bảng điểm {dirtyCount > 0 ? `(${dirtyCount} ô)` : ''}
                        </button>
                    </div>
                </div>
            </div>

            <div className="px-8 py-4 bg-white border-b border-slate-100 flex-shrink-0 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 min-w-[250px]">
                    <div className="w-8 h-8 rounded-full border border-slate-200 flex flex-shrink-0 items-center justify-center text-slate-400">1</div>
                    <select
                        className="w-full bg-slate-50 border-transparent px-4 py-2 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none"
                        value={selectedMajorId}
                        onChange={(e) => { setSelectedMajorId(e.target.value); setSelectedClassId(""); }}
                    >
                        <option value="">Lọc theo khoa/ngành</option>
                        {majors.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                <div className="flex items-center gap-3 min-w-[300px]">
                    <div className={`w-8 h-8 rounded-full border flex flex-shrink-0 items-center justify-center ${selectedMajorId ? 'border-uneti-blue text-uneti-blue font-bold' : 'border-slate-200 text-slate-400'}`}>2</div>
                    <select
                        className="w-full bg-slate-50 border-transparent px-4 py-2 rounded-xl text-[13px] font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-uneti-blue/10 appearance-none disabled:opacity-50"
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        disabled={!selectedMajorId}
                    >
                        <option value="">Chọn Lớp danh nghĩa</option>
                        {adminClasses.filter(c => c.majorId === selectedMajorId).map((c: any) => <option key={c.id} value={c.id}>{c.code}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-hidden p-8">
                {!selectedClassId ? (
                    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100 h-full border-dashed">
                        <Search size={48} className="text-slate-200 mb-6" />
                        <h3 className="text-[16px] font-black text-slate-700 mb-2">Chưa chọn lớp danh nghĩa</h3>
                        <p className="text-[13px] font-medium text-slate-400 max-w-[300px] text-center">Hoàn thành thao tác lọc Ngành &gt; Lớp để hệ thống xuất 8 cột Học kỳ dựa trên biểu đồ Khóa học.</p>
                    </div>
                ) : loading ? (
                    <div className="flex items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-slate-100 h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-uneti-blue animate-spin mx-auto mb-4" />
                            <p className="text-[13px] font-bold text-slate-400">Đang sinh bảng 8 lưới...</p>
                        </div>
                    </div>
                ) : (
                    <div className="h-full bg-white border border-slate-300 overflow-auto relative">
                        <table className="w-max min-w-full text-left text-[13px] border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-20">
                                    <th className="px-3 py-2 border border-slate-300 sticky left-0 bg-slate-100 z-30 min-w-[50px] text-center">STT</th>
                                    <th className="px-3 py-2 border border-slate-300 sticky left-[50px] bg-slate-100 z-30 min-w-[120px]">Mã sinh viên</th>
                                    <th className="px-3 py-2 border border-slate-300 sticky left-[170px] bg-slate-100 z-30 min-w-[180px]">Họ và tên</th>
                                    {classSemesters.map((item, idx) => (
                                        <th key={idx} className="px-2 py-2 border border-slate-300 text-center min-w-[100px] bg-slate-100">
                                            <div>Kỳ {idx + 1}</div>
                                            {item.expectedYear > 0 && <div className="text-[10px] text-slate-500 font-normal">HK{item.expectedSemNo} ({item.expectedYear}-{item.expectedYear+1})</div>}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="font-medium text-slate-800">
                                {students.map((st, i) => {
                                    return (
                                        <tr key={st.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-3 py-2 border border-slate-300 sticky left-0 bg-white z-10 text-center">{i + 1}</td>
                                            <td className="px-3 py-2 border border-slate-300 sticky left-[50px] bg-white z-10">{st.studentCode}</td>
                                            <td className="px-3 py-2 border border-slate-300 sticky left-[170px] bg-white z-10 whitespace-nowrap">{st.fullName}</td>
                                            
                                            {classSemesters.map((item, idx) => {
                                                const sem = item.dbSemester;
                                                // Use semester ID as key if exists, else use a placeholder key
                                                const semKey = sem ? sem.id : `placeholder-${idx}`;
                                                const isDirty = !!st.dirtyScores[semKey];
                                                const scoreObj = st.scores[semKey];
                                                const val = scoreObj ? Math.round(scoreObj.score) : "";
                                                const classification = scoreObj?.classification || "";

                                                return (
                                                    <td key={idx} className="border border-slate-300 p-0 relative h-full">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max="100"
                                                            title={classification || (sem ? undefined : "Học kỳ này chưa được mở trong hệ thống, điểm sẽ được lưu sau khi học kỳ được khởi tạo")}
                                                            className={`w-full h-full min-h-[36px] px-2 py-2 text-center text-[13px] font-semibold border-none focus:outline-none focus:bg-blue-50 focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all ${
                                                                isDirty 
                                                                ? "bg-yellow-100 text-yellow-900" 
                                                                : !sem
                                                                    ? "bg-slate-50 text-slate-400"
                                                                    : val !== "" 
                                                                        ? "bg-white text-slate-800"
                                                                        : "bg-white text-slate-800 hover:bg-slate-50"
                                                            }`}
                                                            value={val}
                                                            placeholder={!sem ? "?" : ""}
                                                            disabled={!sem}
                                                            onChange={(e) => sem && handleScoreChange(i, semKey, e.target.value)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                                {students.length === 0 && (
                                    <tr>
                                        <td colSpan={12} className="text-center py-12 text-slate-400 font-medium">Lớp danh nghĩa này hiện tại không có sinh viên nào.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
