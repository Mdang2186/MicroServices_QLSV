SELECT 
    (SELECT COUNT(*) FROM SemesterPlan) as TotalPlans,
    (SELECT COUNT(*) FROM CourseClass) as TotalCourseClasses,
    (SELECT COUNT(*) FROM ClassSession) as TotalSessions,
    (SELECT COUNT(*) FROM ExamSchedule) as TotalExams,
    (SELECT COUNT(*) FROM Subject) as TotalSubjects,
    (SELECT COUNT(*) FROM Lecturer) as TotalLecturers;

-- Check period spreading for a sample class
SELECT TOP 1 
    cc.code, 
    s.credits, 
    cc.totalPeriods as PlannedPeriods,
    (SELECT SUM(1) FROM ClassSession cs WHERE cs.courseClassId = cc.id) as SessionCount,
    (SELECT TOP 1 note FROM ClassSession cs WHERE cs.courseClassId = cc.id ORDER BY date DESC) as LastSessionNote
FROM CourseClass cc
JOIN Subject s ON cc.subjectId = s.id
ORDER BY NEWID();
