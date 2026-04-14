-- Clear data in order (safe for FKs)
DELETE FROM Enrollment;
DELETE FROM CourseClass;
DELETE FROM Student;
DELETE FROM AdminClass;
DELETE FROM Curriculum;
DELETE FROM Subject;
DELETE FROM Department;
DELETE FROM Major;
DELETE FROM Faculty;
DELETE FROM Semester;
GO

-- 1. Semester
INSERT INTO Semester (id, code, name, year, startDate, endDate, isCurrent, isRegistering, semesterNumber)
VALUES ('SEM20242', '20242', N'Học kỳ 2 - 2024-2025', 2024, '2025-02-15', '2025-06-15', 1, 1, 2);
GO

-- 2. Faculty
INSERT INTO Faculty (id, name) VALUES ('CNTT', N'Khoa Công nghệ thông tin');
GO

-- 3. Major
INSERT INTO Major (id, name, facultyId) VALUES ('CNTT', N'Công nghệ thông tin', 'CNTT');
GO

-- 4. Department
INSERT INTO Department (id, name, facultyId) VALUES ('BM_CNTT', N'Bộ môn Công nghệ thông tin', 'CNTT');
GO

-- 5. Subjects
INSERT INTO Subject (id, code, name, credits, majorId, departmentId) VALUES 
('THDC', 'THDC', N'Tin học đại cương', 3, 'CNTT', 'BM_CNTT'),
('TRR', 'TRR', N'Toán rời rạc', 3, 'CNTT', 'BM_CNTT'),
('LTCB', 'LTCB', N'Lập trình cơ bản', 4, 'CNTT', 'BM_CNTT'),
('CSDL', 'CSDL', N'Cơ sở dữ liệu', 3, 'CNTT', 'BM_CNTT');
GO

-- 6. Curriculum
INSERT INTO Curriculum (id, majorId, subjectId, cohort, suggestedSemester) VALUES 
('CUR1', 'CNTT', 'THDC', 'K19', 2),
('CUR2', 'CNTT', 'TRR', 'K19', 2),
('CUR3', 'CNTT', 'LTCB', 'K19', 2),
('CUR4', 'CNTT', 'CSDL', 'K19', 2);
GO

-- 7. Lecturer
INSERT INTO Lecturer (id, lectureCode, fullName, facultyId) VALUES 
('GV01', 'GV001', N'Nguyễn Văn A', 'CNTT');
GO

-- 8. AdminClass (Added 'code' field)
INSERT INTO AdminClass (id, code, name, majorId, cohort) VALUES 
('K19CNTT01', 'K19CNTT01', 'K19CNTT01', 'CNTT', 'K19');
GO

-- 9. Student
INSERT INTO Student (id, studentCode, fullName, dob, majorId, adminClassId, status) VALUES 
('SV01', 'SV001', N'Phạm Văn M', '2005-01-01', 'CNTT', 'K19CNTT01', 'STUDYING');
GO
