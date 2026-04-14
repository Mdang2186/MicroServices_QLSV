USE [student_db];
GO

SET DATEFIRST 7;
GO

PRINT N'➤ Bước 0: Vá lỗi Schema';
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[Subject]') AND name = 'examType') ALTER TABLE [dbo].[Subject] ADD [examType] [varchar](50) NOT NULL DEFAULT 'TU_LUAN'; 
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CourseClass]') AND name = 'totalPeriods') ALTER TABLE [dbo].[CourseClass] ADD [totalPeriods] [int] NOT NULL DEFAULT 0;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CourseClass]') AND name = 'examType') ALTER TABLE [dbo].[CourseClass] ADD [examType] [varchar](50) NOT NULL DEFAULT 'TU_LUAN';
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SemesterPlan]') AND type in (N'U')) CREATE TABLE [dbo].[SemesterPlan]( [id] [varchar](50) NOT NULL DEFAULT NEWID(), [semesterId] [varchar](50) NOT NULL, [majorId] [varchar](50) NOT NULL, [cohort] [varchar](50) NOT NULL, [subjectId] [varchar](50) NOT NULL, CONSTRAINT [PK_SemesterPlan] PRIMARY KEY CLUSTERED ([id] ASC), CONSTRAINT [UQ_SemesterPlan] UNIQUE NONCLUSTERED ([semesterId], [majorId], [cohort], [subjectId]));
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ExamSchedule]') AND type in (N'U')) CREATE TABLE [dbo].[ExamSchedule]( [id] [varchar](50) NOT NULL DEFAULT NEWID(), [courseClassId] [varchar](50) NOT NULL, [roomId] [varchar](50) NOT NULL, [examDate] [date] NOT NULL, [shift] [int] NOT NULL, [examType] [varchar](50) NOT NULL, CONSTRAINT [PK_ExamSchedule] PRIMARY KEY CLUSTERED ([id] ASC), CONSTRAINT [UQ_ExamSchedule] UNIQUE NONCLUSTERED ([courseClassId]));
GO

-- Bắt đầu Batch duy nhất để giữ biến
DECLARE @SemId VARCHAR(50), @FacCNTT VARCHAR(50), @FacKT VARCHAR(50), @MajKTPM VARCHAR(50), @MajKToan VARCHAR(50);

-- Query hoặc tạo mới Semester
SELECT @SemId = id FROM Semester WHERE code = 'HK1_2025_2026';
IF @SemId IS NULL BEGIN SET @SemId = NEWID(); INSERT INTO Semester (id, code, name, year, startDate, endDate, isCurrent) VALUES (@SemId, 'HK1_2025_2026', N'Học kỳ I 2025-2026', 2025, '2025-09-01', '2025-12-25', 1); END

-- Query hoặc tạo mới Khoa
SELECT @FacCNTT = id FROM Faculty WHERE code = 'CNTT';
IF @FacCNTT IS NULL BEGIN SET @FacCNTT = NEWID(); INSERT INTO Faculty (id, code, name) VALUES (@FacCNTT, 'CNTT', N'Khoa Công nghệ thông tin'); END
SELECT @FacKT = id FROM Faculty WHERE code = 'KT';
IF @FacKT IS NULL BEGIN SET @FacKT = NEWID(); INSERT INTO Faculty (id, code, name) VALUES (@FacKT, 'KT', N'Khoa Kinh tế'); END

-- Query hoặc tạo mới Ngành
SELECT @MajKTPM = id FROM Major WHERE code = 'KTPM';
IF @MajKTPM IS NULL BEGIN SET @MajKTPM = NEWID(); INSERT INTO Major (id, facultyId, code, name, totalCreditsRequired) VALUES (@MajKTPM, @FacCNTT, 'KTPM', N'Kỹ thuật phần mềm', 135); END
SELECT @MajKToan = id FROM Major WHERE code = 'KTOAN';
IF @MajKToan IS NULL BEGIN SET @MajKToan = NEWID(); INSERT INTO Major (id, facultyId, code, name, totalCreditsRequired) VALUES (@MajKToan, @FacKT, 'KTOAN', N'Kế toán', 130); END

-- Init Môn học
IF NOT EXISTS (SELECT 1 FROM Subject WHERE code = 'CS01') INSERT INTO Subject (id, majorId, code, name, credits, examType) VALUES (NEWID(), @MajKTPM, 'CS01', N'Nhập môn KTPM', 3, 'TU_LUAN');
IF NOT EXISTS (SELECT 1 FROM Subject WHERE code = 'CS02') INSERT INTO Subject (id, majorId, code, name, credits, examType) VALUES (NEWID(), @MajKTPM, 'CS02', N'CTDL Giải thuật', 4, 'TU_LUAN');
IF NOT EXISTS (SELECT 1 FROM Subject WHERE code = 'CS03') INSERT INTO Subject (id, majorId, code, name, credits, examType) VALUES (NEWID(), @MajKTPM, 'CS03', N'Cơ sở dữ liệu', 3, 'TRAC_NGHIEM');
IF NOT EXISTS (SELECT 1 FROM Subject WHERE code = 'CS04') INSERT INTO Subject (id, majorId, code, name, credits, examType) VALUES (NEWID(), @MajKTPM, 'CS04', N'Lập trình Web', 3, 'THUC_HANH');
IF NOT EXISTS (SELECT 1 FROM Subject WHERE code = 'EC01') INSERT INTO Subject (id, majorId, code, name, credits, examType) VALUES (NEWID(), @MajKToan, 'EC01', N'Nguyên lý kế toán', 3, 'TU_LUAN');

-- Init Lớp
IF NOT EXISTS (SELECT 1 FROM AdminClass WHERE code = 'DHTI16A1') INSERT INTO AdminClass (id, majorId, code, name, cohort) VALUES (NEWID(), @MajKTPM, 'DHTI16A1', N'DHTI16A1', 'K16');
IF NOT EXISTS (SELECT 1 FROM AdminClass WHERE code = 'DHTI17A1') INSERT INTO AdminClass (id, majorId, code, name, cohort) VALUES (NEWID(), @MajKTPM, 'DHTI17A1', N'DHTI17A1', 'K17');
IF NOT EXISTS (SELECT 1 FROM AdminClass WHERE code = 'DHKT16A1') INSERT INTO AdminClass (id, majorId, code, name, cohort) VALUES (NEWID(), @MajKToan, 'DHKT16A1', N'DHKT16A1', 'K16');

-- Semester Plan
DELETE FROM SemesterPlan WHERE semesterId = @SemId;
INSERT INTO SemesterPlan (semesterId, majorId, cohort, subjectId)
SELECT @SemId, @MajKTPM, 'K16', id FROM Subject WHERE majorId = @MajKTPM AND code IN ('CS02', 'CS04')
UNION SELECT @SemId, @MajKTPM, 'K17', id FROM Subject WHERE majorId = @MajKTPM AND code IN ('CS01', 'CS03')
UNION SELECT @SemId, @MajKToan, 'K16', id FROM Subject WHERE majorId = @MajKToan;

-- Auto Generate CourseClasses & Sessions
DECLARE @SemStart DATE, @SemEnd DATE; SELECT @SemStart = startDate, @SemEnd = endDate FROM Semester WHERE id = @SemId;
DECLARE @PM VARCHAR(50), @PC VARCHAR(50), @PS VARCHAR(50);
DECLARE P_CUR CURSOR FOR SELECT majorId, cohort, subjectId FROM SemesterPlan WHERE semesterId = @SemId;
OPEN P_CUR; FETCH NEXT FROM P_CUR INTO @PM, @PC, @PS;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Credits INT, @ExT VARCHAR(50), @SC VARCHAR(50); SELECT @Credits = credits, @ExT = examType, @SC = code FROM Subject WHERE id = @PS;
    DECLARE @Adm VARCHAR(50);
    DECLARE A_CUR CURSOR FOR SELECT code FROM AdminClass WHERE majorId = @PM AND cohort = @PC;
    OPEN A_CUR; FETCH NEXT FROM A_CUR INTO @Adm;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        DECLARE @Lid VARCHAR(50) = (SELECT TOP 1 id FROM Lecturer ORDER BY NEWID());
        DECLARE @CCid VARCHAR(50) = NEWID();
        INSERT INTO CourseClass (id, code, name, subjectId, semesterId, lecturerId, maxSlots, totalPeriods, examType)
        VALUES (@CCid, @SC + '_' + @Adm + '_' + LEFT(CAST(NEWID() AS VARCHAR(50)), 4), @SC + '_' + @Adm, @PS, @SemId, @Lid, 60, @Credits * 15, @ExT);
        
        DECLARE @Rid VARCHAR(50) = (SELECT TOP 1 id FROM Room WHERE type = (CASE WHEN @ExT='THUC_HANH' THEN 'PRACTICE' ELSE 'THEORY' END) ORDER BY NEWID());
        DECLARE @Dow INT = (ABS(CHECKSUM(@Adm)) % 6) + 2; DECLARE @Shi INT = (ABS(CHECKSUM(@SC)) % 4) + 1;
        DECLARE @Sessions INT = 0; DECLARE @Iter DATE = @SemStart;
        WHILE @Iter <= @SemEnd BEGIN IF DATEPART(dw, @Iter) = @Dow SET @Sessions = @Sessions + 1; SET @Iter = DATEADD(DAY, 1, @Iter); END
        IF @Sessions > 0 BEGIN
            DECLARE @Per INT = (@Credits * 15) / @Sessions; DECLARE @Rem INT = (@Credits * 15) % @Sessions; DECLARE @C_S INT = 0; SET @Iter = @SemStart;
            WHILE @Iter <= @SemEnd BEGIN
                IF DATEPART(dw, @Iter) = @Dow BEGIN
                    SET @C_S = @C_S + 1; DECLARE @Asn INT = @Per; IF @C_S = @Sessions SET @Asn = @Asn + @Rem;
                    INSERT INTO ClassSession (id, courseClassId, roomId, semesterId, date, startShift, endShift, type, note)
                    VALUES (NEWID(), @CCid, @Rid, @SemId, @Iter, @Shi, @Shi, 'LECTURE', N'Tiết: ' + CAST(@Asn AS NVARCHAR));
                END
                SET @Iter = DATEADD(DAY, 1, @Iter);
            END
        END
        FETCH NEXT FROM A_CUR INTO @Adm;
    END
    CLOSE A_CUR; DEALLOCATE A_CUR;
    FETCH NEXT FROM P_CUR INTO @PM, @PC, @PS;
END
CLOSE P_CUR; DEALLOCATE P_CUR;

-- Auto Generate Exams
DECLARE @ExamD DATE = DATEADD(DAY, 7, @SemEnd); DECLARE @ExamS INT = 1;
DECLARE @CC VARCHAR(50), @CT VARCHAR(50);
DECLARE E_CUR CURSOR FOR SELECT id, examType FROM CourseClass WHERE semesterId = @SemId;
OPEN E_CUR; FETCH NEXT FROM E_CUR INTO @CC, @CT;
WHILE @@FETCH_STATUS = 0
BEGIN
    DECLARE @Erid VARCHAR(50) = (SELECT TOP 1 id FROM Room WHERE type = (CASE WHEN @CT='THUC_HANH' THEN 'PRACTICE' ELSE 'THEORY' END) ORDER BY NEWID());
    WHILE EXISTS (SELECT 1 FROM ExamSchedule WHERE roomId = @Erid AND examDate = @ExamD AND shift = @ExamS)
    BEGIN
        SET @ExamS = @ExamS + 1; IF @ExamS > 4 BEGIN SET @ExamS = 1; SET @ExamD = DATEADD(DAY, 1, @ExamD); IF DATEPART(dw, @ExamD) = 1 SET @ExamD = DATEADD(DAY, 1, @ExamD); END
    END
    INSERT INTO ExamSchedule (id, courseClassId, roomId, examDate, shift, examType) VALUES (NEWID(), @CC, @Erid, @ExamD, @ExamS, @CT);
    SET @ExamS = @ExamS + 1; IF @ExamS > 4 BEGIN SET @ExamS = 1; SET @ExamD = DATEADD(DAY, 1, @ExamD); END
    FETCH NEXT FROM E_CUR INTO @CC, @CT;
END
CLOSE E_CUR; DEALLOCATE E_CUR;

PRINT N'✅ HOÀN TẤT DỮ LIỆU UNETI';
GO
