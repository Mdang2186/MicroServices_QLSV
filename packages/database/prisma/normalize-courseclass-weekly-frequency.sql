SET NOCOUNT ON;

IF OBJECT_ID('tempdb..#TargetCourseClass') IS NOT NULL
    DROP TABLE #TargetCourseClass;

SELECT DISTINCT
    cc.id,
    cc.code
INTO #TargetCourseClass
FROM [dbo].[CourseClass] cc
JOIN [dbo].[Subject] sub ON sub.id = cc.subjectId
WHERE cc.code LIKE 'CCLASS[_]%'
  AND (
        ISNULL(cc.sessionsPerWeek, 1) <> 1
        OR (
            ISNULL(sub.theoryPeriods, 0) > 0
            AND ISNULL(sub.practicePeriods, 0) > 0
        )
    );

UPDATE sub
SET
    theorySessionsPerWeek = CASE
        WHEN ISNULL(sub.theoryPeriods, 0) > 0 OR ISNULL(sub.practicePeriods, 0) > 0 THEN 1
        ELSE ISNULL(sub.theorySessionsPerWeek, 1)
    END,
    practiceSessionsPerWeek = CASE
        WHEN ISNULL(sub.theoryPeriods, 0) > 0 THEN 0
        WHEN ISNULL(sub.practicePeriods, 0) > 0 THEN 1
        ELSE 0
    END
FROM [dbo].[Subject] sub
WHERE EXISTS (
    SELECT 1
    FROM #TargetCourseClass tc
    JOIN [dbo].[CourseClass] cc ON cc.id = tc.id
    WHERE cc.subjectId = sub.id
);

IF OBJECT_ID('[dbo].[TrainingPlanTemplateItem]') IS NOT NULL
BEGIN
    UPDATE t
    SET
        theorySessionsPerWeek = 1,
        practiceSessionsPerWeek = CASE
            WHEN ISNULL(t.theoryPeriods, 0) > 0 THEN 0
            WHEN ISNULL(t.practicePeriods, 0) > 0 THEN 1
            ELSE 0
        END
    FROM [dbo].[TrainingPlanTemplateItem] t
    WHERE ISNULL(t.theoryPeriods, 0) > 0 AND ISNULL(t.practicePeriods, 0) > 0;
END;

IF OBJECT_ID('[dbo].[SemesterPlanItem]') IS NOT NULL
BEGIN
    UPDATE s
    SET
        theorySessionsPerWeek = 1,
        practiceSessionsPerWeek = CASE
            WHEN ISNULL(s.theoryPeriods, 0) > 0 THEN 0
            WHEN ISNULL(s.practicePeriods, 0) > 0 THEN 1
            ELSE 0
        END
    FROM [dbo].[SemesterPlanItem] s
    WHERE ISNULL(s.theoryPeriods, 0) > 0 AND ISNULL(s.practicePeriods, 0) > 0;
END;

UPDATE cc
SET sessionsPerWeek = 1
FROM [dbo].[CourseClass] cc
JOIN #TargetCourseClass tc ON tc.id = cc.id;

DELETE a
FROM [dbo].[Attendance] a
JOIN [dbo].[ClassSession] cs ON cs.id = a.sessionId
JOIN #TargetCourseClass tc ON tc.id = cs.courseClassId;

DELETE cs
FROM [dbo].[ClassSession] cs
JOIN #TargetCourseClass tc ON tc.id = cs.courseClassId;

SELECT COUNT(*) AS normalizedClassCount
FROM #TargetCourseClass;
