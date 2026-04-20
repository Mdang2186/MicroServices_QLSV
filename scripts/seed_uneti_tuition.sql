USE [student_db];
GO

/* ===== 1. ĐƠN GIÁ TÍN CHỈ =====
   Thay MAJ_CNTT, MAJ_KETOAN, K18... đúng theo DB của bạn
*/

INSERT INTO dbo.TuitionConfig (
    id, majorId, academicYear, cohort, educationType, pricePerCredit, isActive, effectiveFrom, effectiveTo
)
SELECT 'TC_CNTT_K18_2025', 'MAJ_CNTT', 2025, 'K18', N'Chính quy', 545000, 1, '2025-01-01', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TuitionConfig
    WHERE majorId = 'MAJ_CNTT' AND academicYear = 2025 AND ISNULL(cohort,'') = 'K18'
);

INSERT INTO dbo.TuitionConfig (
    id, majorId, academicYear, cohort, educationType, pricePerCredit, isActive, effectiveFrom, effectiveTo
)
SELECT 'TC_KETOAN_K18_2025', 'MAJ_KETOAN', 2025, 'K18', N'Chính quy', 495000, 1, '2025-01-01', NULL
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.TuitionConfig
    WHERE majorId = 'MAJ_KETOAN' AND academicYear = 2025 AND ISNULL(cohort,'') = 'K18'
);

/* ===== 2. KHOẢN THU CỐ ĐỊNH =====
   semesterId có thể để NULL nếu muốn áp theo năm học
   Các số tiền dưới đây bạn thay theo biểu phí UNETI thực tế của bạn
*/

INSERT INTO dbo.FixedFeeConfig (
    id, academicYear, semesterId, feeCode, feeName, amount,
    isMandatory, applyForAllStudents, majorId, cohort, educationType, dueDate, displayOrder, isActive
)
SELECT
    'FFC_BHYT_2025',
    2025,
    NULL,
    'BHYT',
    N'Bảo hiểm y tế đầu năm học theo quy định',
    631800,
    1, 1, NULL, NULL, NULL,
    '2025-10-31',
    10, 1
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.FixedFeeConfig WHERE id = 'FFC_BHYT_2025'
);

INSERT INTO dbo.FixedFeeConfig (
    id, academicYear, semesterId, feeCode, feeName, amount,
    isMandatory, applyForAllStudents, majorId, cohort, educationType, dueDate, displayOrder, isActive
)
SELECT
    'FFC_BHTT_2025',
    2025,
    NULL,
    'BHTT',
    N'Bảo hiểm thân thể mua cả khóa học',
    230000,
    1, 1, NULL, NULL, NULL,
    '2025-10-31',
    20, 1
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.FixedFeeConfig WHERE id = 'FFC_BHTT_2025'
);

INSERT INTO dbo.FixedFeeConfig (
    id, academicYear, semesterId, feeCode, feeName, amount,
    isMandatory, applyForAllStudents, majorId, cohort, educationType, dueDate, displayOrder, isActive
)
SELECT
    'FFC_DONGPHUC_2025',
    2025,
    NULL,
    'DPSV',
    N'Đồng phục sinh viên',
    430000,
    1, 1, NULL, NULL, NULL,
    '2025-10-31',
    30, 1
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.FixedFeeConfig WHERE id = 'FFC_DONGPHUC_2025'
);

INSERT INTO dbo.FixedFeeConfig (
    id, academicYear, semesterId, feeCode, feeName, amount,
    isMandatory, applyForAllStudents, majorId, cohort, educationType, dueDate, displayOrder, isActive
)
SELECT
    'FFC_KSK_2025',
    2025,
    NULL,
    'KSK',
    N'Hồ sơ và lệ phí khám sức khỏe đầu khóa',
    135000,
    1, 1, NULL, NULL, NULL,
    '2025-10-31',
    40, 1
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.FixedFeeConfig WHERE id = 'FFC_KSK_2025'
);
GO
