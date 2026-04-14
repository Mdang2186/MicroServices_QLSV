-- FINAL COMPREHENSIVE SEED FOR ACADEMIC PLANNING
USE student_db;
GO

-- 1. Faculty
DELETE FROM Faculty WHERE id = 'CNTT';
INSERT INTO Faculty (id, name) VALUES ('CNTT', N'Công nghệ thông tin');

-- 2. Major
DELETE FROM Major WHERE id = 'CNTT';
INSERT INTO Major (id, name, facultyId) VALUES ('CNTT', N'Công nghệ thông tin', 'CNTT');

-- 3. Subject
DELETE FROM Subject WHERE id IN ('THDC', 'CSDL', 'PTUD');
INSERT INTO Subject (id, name, code, credits, theoryHours, practiceHours) VALUES 
('THDC', N'Tin học đại cương', 'THDC', 3, 30, 15),
('CSDL', N'Cơ sở dữ liệu', 'CSDL', 3, 30, 15),
('PTUD', N'Phát triển ứng dụng', 'PTUD', 3, 30, 15);

-- 4. Lecturer (Required for auto-assignment)
DELETE FROM Lecturer WHERE lectureCode = 'GV_CNTT_01';
INSERT INTO Lecturer (id, lectureCode, fullName, facultyId) VALUES 
(NEWID(), 'GV_CNTT_01', N'Nguyễn Hoàng Nam', 'CNTT');

-- 5. AdminClass (Required for cohort grouping)
DELETE FROM AdminClass WHERE id IN ('19CNTT1', '19CNTT2');
INSERT INTO AdminClass (id, code, name, majorId, cohort) VALUES 
('19CNTT1', '19CNTT1', N'Lớp 19 Công nghệ thông tin 1', 'CNTT', 'K19'),
('19CNTT2', '19CNTT2', N'Lớp 19 Công nghệ thông tin 2', 'CNTT', 'K19');

-- 6. Student (Required for auto-enrollment)
DELETE FROM Student WHERE id IN ('SV19001', 'SV19002');
INSERT INTO Student (id, studentCode, fullName, adminClassId, majorId, dob) VALUES 
('SV19001', 'SV19001', N'Nguyễn Văn A', '19CNTT1', 'CNTT', '2001-01-01'),
('SV19002', 'SV19002', N'Trần Thị B', '19CNTT1', 'CNTT', '2001-02-02');

-- 7. Curriculum (Requirements for Roadmap)
DELETE FROM Curriculum WHERE majorId = 'CNTT' AND cohort = 'K19';
INSERT INTO Curriculum (id, majorId, subjectId, cohort, suggestedSemester) VALUES 
(NEWID(), 'CNTT', 'THDC', 'K19', 1),
(NEWID(), 'CNTT', 'CSDL', 'K19', 2),
(NEWID(), 'CNTT', 'PTUD', 'K19', 3);

-- 8. Semester (Required for planning)
IF NOT EXISTS (SELECT * FROM Semester WHERE code = 'HK1-2025')
    INSERT INTO Semester (id, code, name, year, semesterNumber, startDate, endDate, isCurrent)
    VALUES (NEWID(), 'HK1-2025', N'Học kỳ 1 Năm 2025-2026', 2025, 1, '2025-09-01', '2026-01-15', 1);

PRINT 'Final SQL Seed Completed Successfully';
GO
