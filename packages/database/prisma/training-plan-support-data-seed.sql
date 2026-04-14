SET NOCOUNT ON;

DECLARE @MinSubjectsPerDepartment INT = 8;
DECLARE @MinLecturersPerDepartment INT = 3;
DECLARE @MinClassesPerMajorPerCohort INT = 6;
DECLARE @MinStudentsPerAdminClass INT = 20;
DECLARE @DefaultPasswordHash NVARCHAR(255) = N'$2b$10$vM1s.I5j/yXHOooDcmnDv.VUSiS8u/qdmulPcbSnqnuFQ18zbLyRa';

IF OBJECT_ID('tempdb..#Numbers') IS NOT NULL DROP TABLE #Numbers;
CREATE TABLE #Numbers (
    n INT NOT NULL PRIMARY KEY
);

INSERT INTO #Numbers(n)
VALUES
    (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),
    (11),(12),(13),(14),(15),(16),(17),(18),(19),(20);

IF OBJECT_ID('tempdb..#StudentRealName') IS NOT NULL DROP TABLE #StudentRealName;
CREATE TABLE #StudentRealName (
    n INT NOT NULL PRIMARY KEY,
    fullName NVARCHAR(255) NOT NULL,
    gender NVARCHAR(20) NOT NULL
);

INSERT INTO #StudentRealName (n, fullName, gender)
VALUES
    (1,  N'Nguyễn Minh Anh', N'Nam'),
    (2,  N'Trần Quang Huy', N'Nam'),
    (3,  N'Lê Thu Hà', N'Nữ'),
    (4,  N'Phạm Gia Bảo', N'Nam'),
    (5,  N'Hoàng Ngọc Lan', N'Nữ'),
    (6,  N'Vũ Đức Anh', N'Nam'),
    (7,  N'Đặng Thùy Linh', N'Nữ'),
    (8,  N'Bùi Quốc Khánh', N'Nam'),
    (9,  N'Đỗ Mai Phương', N'Nữ'),
    (10, N'Phan Tuấn Kiệt', N'Nam'),
    (11, N'Hồ Khánh Linh', N'Nữ'),
    (12, N'Ngô Anh Tuấn', N'Nam'),
    (13, N'Dương Minh Châu', N'Nữ'),
    (14, N'Nguyễn Hoàng Long', N'Nam'),
    (15, N'Trịnh Thu Trang', N'Nữ'),
    (16, N'Lý Nhật Minh', N'Nam'),
    (17, N'Phạm Thanh Hằng', N'Nữ'),
    (18, N'Võ Thành Đạt', N'Nam'),
    (19, N'Đoàn Hải Yến', N'Nữ'),
    (20, N'Chu Đức Mạnh', N'Nam');

IF OBJECT_ID('tempdb..#LecturerRealName') IS NOT NULL DROP TABLE #LecturerRealName;
CREATE TABLE #LecturerRealName (
    n INT NOT NULL PRIMARY KEY,
    fullName NVARCHAR(255) NOT NULL,
    degree NVARCHAR(100) NOT NULL
);

INSERT INTO #LecturerRealName (n, fullName, degree)
VALUES
    (1,  N'Nguyễn Văn Bình', N'TS.'),
    (2,  N'Trần Thị Hương', N'TS.'),
    (3,  N'Lê Quang Dũng', N'ThS.'),
    (4,  N'Phạm Thu Hiền', N'TS.'),
    (5,  N'Hoàng Minh Đức', N'ThS.'),
    (6,  N'Vũ Thị Mai', N'TS.'),
    (7,  N'Đặng Quốc Cường', N'ThS.'),
    (8,  N'Bùi Thị Lan Anh', N'TS.'),
    (9,  N'Đỗ Mạnh Hùng', N'ThS.'),
    (10, N'Phan Thị Bích Ngọc', N'TS.'),
    (11, N'Hồ Đức Thịnh', N'TS.'),
    (12, N'Ngô Thị Thu Hà', N'ThS.'),
    (13, N'Dương Thành Nam', N'TS.'),
    (14, N'Nguyễn Thị Hải Yến', N'ThS.'),
    (15, N'Trịnh Việt Hoàng', N'TS.'),
    (16, N'Lý Thị Hạnh', N'ThS.'),
    (17, N'Phạm Ngọc Sơn', N'TS.'),
    (18, N'Võ Minh Tâm', N'ThS.'),
    (19, N'Đoàn Thu Phương', N'TS.'),
    (20, N'Chu Đức Thành', N'ThS.');

;WITH MissingFacultyDepartment AS (
    SELECT
        f.id AS facultyId,
        LEFT(CONCAT('DEPT_AUTO_', REPLACE(REPLACE(REPLACE(UPPER(f.code), '-', ''), '_', ''), ' ', '')), 50) AS departmentId,
        LEFT(CONCAT('BM_', REPLACE(REPLACE(REPLACE(UPPER(f.code), '-', ''), '_', ''), ' ', '')), 50) AS departmentCode,
        LEFT(CONCAT(N'Bộ môn tổng hợp ', f.name), 255) AS departmentName
    FROM [dbo].[Faculty] f
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[Department] d
        WHERE d.facultyId = f.id
    )
)
INSERT INTO [dbo].[Department] (
    [id],
    [facultyId],
    [code],
    [name],
    [headName]
)
SELECT
    src.departmentId,
    src.facultyId,
    src.departmentCode,
    src.departmentName,
    N'Trưởng bộ môn seed'
FROM MissingFacultyDepartment src
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Department] d
    WHERE d.id = src.departmentId OR d.code = src.departmentCode
);

IF OBJECT_ID('tempdb..#MajorToken') IS NOT NULL DROP TABLE #MajorToken;

;WITH BaseMajor AS (
    SELECT
        m.id AS majorId,
        m.facultyId,
        m.code AS majorCode,
        m.name AS majorName,
        cleanedCode = UPPER(
            REPLACE(
                REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                CASE
                                    WHEN m.code LIKE 'M[_]%' THEN STUFF(m.code, 1, 2, '')
                                    ELSE m.code
                                END,
                                '-', ''
                            ),
                            '_', ''
                        ),
                        ' ', ''
                    ),
                    '.', ''
                ),
                '/', ''
            )
        )
    FROM [dbo].[Major] m
),
PreparedMajor AS (
    SELECT
        majorId,
        facultyId,
        majorCode,
        majorName,
        baseToken = LEFT(
            CASE
                WHEN NULLIF(cleanedCode, '') IS NULL
                    THEN CONCAT('MAJ', ABS(CHECKSUM(majorId)) % 10000)
                ELSE cleanedCode
            END,
            12
        )
    FROM BaseMajor
),
DedupMajor AS (
    SELECT
        *,
        ROW_NUMBER() OVER (PARTITION BY baseToken ORDER BY majorId) AS rn,
        COUNT(*) OVER (PARTITION BY baseToken) AS cnt
    FROM PreparedMajor
)
SELECT
    majorId,
    facultyId,
    majorCode,
    majorName,
    majorToken = LEFT(
        CASE
            WHEN cnt = 1 THEN baseToken
            ELSE CONCAT(baseToken, rn)
        END,
        18
    )
INTO #MajorToken
FROM DedupMajor;

IF OBJECT_ID('tempdb..#DepartmentMajorMap') IS NOT NULL DROP TABLE #DepartmentMajorMap;

SELECT
    d.id AS departmentId,
    d.code AS departmentCode,
    d.name AS departmentName,
    d.facultyId,
    chosen.majorId,
    chosen.majorToken,
    chosen.majorName
INTO #DepartmentMajorMap
FROM [dbo].[Department] d
OUTER APPLY (
    SELECT TOP 1
        mt.majorId,
        mt.majorToken,
        mt.majorName
    FROM #MajorToken mt
    WHERE mt.facultyId = d.facultyId
    ORDER BY
        CASE
            WHEN UPPER(d.code) COLLATE Latin1_General_CI_AI LIKE '%' + mt.majorToken + '%' THEN 0
            WHEN UPPER(d.name) COLLATE Latin1_General_CI_AI LIKE '%' + UPPER(mt.majorName) COLLATE Latin1_General_CI_AI + '%' THEN 1
            WHEN UPPER(mt.majorName) COLLATE Latin1_General_CI_AI LIKE '%' + UPPER(d.name) COLLATE Latin1_General_CI_AI + '%' THEN 2
            ELSE 100
        END,
        mt.majorToken
) chosen
WHERE chosen.majorId IS NOT NULL;

IF OBJECT_ID('tempdb..#MajorDefaultDepartment') IS NOT NULL DROP TABLE #MajorDefaultDepartment;

SELECT
    majorId,
    departmentId,
    departmentCode
INTO #MajorDefaultDepartment
FROM (
    SELECT
        dm.majorId,
        dm.departmentId,
        dm.departmentCode,
        ROW_NUMBER() OVER (
            PARTITION BY dm.majorId
            ORDER BY
                CASE
                    WHEN UPPER(dm.departmentCode) COLLATE Latin1_General_CI_AI LIKE '%' + mt.majorToken + '%' THEN 0
                    WHEN UPPER(dm.departmentName) COLLATE Latin1_General_CI_AI LIKE '%' + UPPER(mt.majorName) COLLATE Latin1_General_CI_AI + '%' THEN 1
                    ELSE 10
                END,
                dm.departmentCode
        ) AS rn
    FROM #DepartmentMajorMap dm
    JOIN #MajorToken mt ON mt.majorId = dm.majorId
) src
WHERE src.rn = 1;

UPDATE s
SET s.departmentId = mdd.departmentId
FROM [dbo].[Subject] s
JOIN #MajorDefaultDepartment mdd ON mdd.majorId = s.majorId
WHERE s.departmentId IS NULL;

UPDATE l
SET l.departmentId = dept.departmentId
FROM [dbo].[Lecturer] l
JOIN (
    SELECT
        d.facultyId,
        d.id AS departmentId,
        ROW_NUMBER() OVER (PARTITION BY d.facultyId ORDER BY d.code) AS rn
    FROM [dbo].[Department] d
) dept ON dept.facultyId = l.facultyId AND dept.rn = 1
WHERE l.departmentId IS NULL
  AND l.facultyId IS NOT NULL;

;WITH DepartmentSubjectCount AS (
    SELECT
        dm.departmentId,
        dm.departmentCode,
        dm.departmentName,
        dm.majorId,
        dm.majorToken,
        COUNT(s.id) AS subjectCount
    FROM #DepartmentMajorMap dm
    LEFT JOIN [dbo].[Subject] s ON s.departmentId = dm.departmentId
    GROUP BY
        dm.departmentId,
        dm.departmentCode,
        dm.departmentName,
        dm.majorId,
        dm.majorToken
),
MissingSubject AS (
    SELECT
        dsc.departmentId,
        dsc.departmentCode,
        dsc.departmentName,
        dsc.majorId,
        dsc.majorToken,
        departmentToken = LEFT(
            REPLACE(
                REPLACE(
                    REPLACE(UPPER(dsc.departmentCode), '-', ''),
                    '_', ''
                ),
                ' ', ''
            ),
            18
        ),
        n.n
    FROM DepartmentSubjectCount dsc
    JOIN #Numbers n
        ON n.n > dsc.subjectCount
       AND n.n <= @MinSubjectsPerDepartment
)
INSERT INTO [dbo].[Subject] (
    [id],
    [majorId],
    [code],
    [name],
    [credits],
    [theoryHours],
    [practiceHours],
    [selfStudyHours],
    [description],
    [departmentId],
    [examDuration],
    [examType],
    [examForm],
    [theoryPeriods],
    [practicePeriods],
    [practiceSessionsPerWeek],
    [theorySessionsPerWeek]
)
SELECT
    LEFT(CONCAT('SEED_SUB_', ms.departmentToken, '_', RIGHT(CONCAT('00', ms.n), 2)), 50) AS id,
    ms.majorId,
    LEFT(CONCAT('MH_', ms.departmentToken, '_', RIGHT(CONCAT('00', ms.n), 2)), 50) AS code,
    LEFT(CONCAT(N'Học phần ', ms.departmentName, N' ', ms.n), 255) AS name,
    cfg.credits,
    cfg.theoryPeriods,
    cfg.practicePeriods,
    cfg.credits * 15,
    CONCAT(N'Dữ liệu seed cho ', ms.departmentName, N' - học phần ', ms.n),
    ms.departmentId,
    90,
    CASE WHEN cfg.practicePeriods > 0 THEN 'THUC_HANH' ELSE 'TRAC_NGHIEM' END,
    CASE WHEN cfg.practicePeriods > 0 THEN N'Thực hành' ELSE N'Tự luận' END,
    cfg.theoryPeriods,
    cfg.practicePeriods,
    CASE
        WHEN cfg.theoryPeriods > 0 THEN 0
        WHEN cfg.practicePeriods > 0 THEN 1
        ELSE 0
    END,
    CASE
        WHEN cfg.theoryPeriods > 0 OR cfg.practicePeriods > 0 THEN 1
        ELSE 0
    END
FROM MissingSubject ms
CROSS APPLY (
    SELECT
        credits = CASE ((ms.n - 1) % 4)
            WHEN 0 THEN 2
            WHEN 1 THEN 3
            WHEN 2 THEN 4
            ELSE 3
        END,
        theoryPeriods = CASE ((ms.n - 1) % 4)
            WHEN 0 THEN 30
            WHEN 1 THEN 45
            WHEN 2 THEN 30
            ELSE 30
        END,
        practicePeriods = CASE ((ms.n - 1) % 4)
            WHEN 0 THEN 0
            WHEN 1 THEN 0
            WHEN 2 THEN 30
            ELSE 15
        END
) cfg
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Subject] s
    WHERE s.code = LEFT(CONCAT('MH_', ms.departmentToken, '_', RIGHT(CONCAT('00', ms.n), 2)), 50)
);

;WITH DepartmentLecturerCount AS (
    SELECT
        d.id AS departmentId,
        d.code AS departmentCode,
        d.name AS departmentName,
        d.facultyId,
        COUNT(l.id) AS lecturerCount
    FROM [dbo].[Department] d
    LEFT JOIN [dbo].[Lecturer] l ON l.departmentId = d.id
    GROUP BY
        d.id,
        d.code,
        d.name,
        d.facultyId
),
MissingLecturer AS (
    SELECT
        dlc.departmentId,
        dlc.departmentCode,
        dlc.departmentName,
        dlc.facultyId,
        n.n
    FROM DepartmentLecturerCount dlc
    JOIN #Numbers n
        ON n.n > dlc.lecturerCount
       AND n.n <= @MinLecturersPerDepartment
)
SELECT
    id = LEFT(CONCAT('SEED_LEC_', REPLACE(REPLACE(UPPER(ml.departmentCode), '-', ''), '_', ''), '_', RIGHT(CONCAT('00', ml.n), 2)), 50),
    facultyId = ml.facultyId,
    departmentId = ml.departmentId,
    userId = LEFT(CONCAT('USR_', REPLACE(REPLACE(UPPER(ml.departmentCode), '-', ''), '_', ''), '_', RIGHT(CONCAT('00', ml.n), 2)), 50),
    username = LEFT(CONCAT('GV_', REPLACE(REPLACE(UPPER(ml.departmentCode), '-', ''), '_', ''), '_', RIGHT(CONCAT('00', ml.n), 2)), 100),
    email = LEFT(CONCAT(LOWER(REPLACE(REPLACE(ml.departmentCode, '-', ''), '_', '')), RIGHT(CONCAT('00', ml.n), 2), '@uneti.edu.vn'), 100),
    lectureCode = LEFT(CONCAT('GV_', REPLACE(REPLACE(UPPER(ml.departmentCode), '-', ''), '_', ''), '_', RIGHT(CONCAT('00', ml.n), 2)), 50),
    fullName = lrn.fullName,
    degree = lrn.degree,
    phone = CONCAT('09', RIGHT(CONCAT('00000000', ABS(CHECKSUM(ml.departmentId, ml.n)) % 100000000), 8))
INTO #MissingLecturerSeed
FROM MissingLecturer ml
JOIN #LecturerRealName lrn ON lrn.n = ml.n;

INSERT INTO [dbo].[User] (
    [id],
    [username],
    [email],
    [passwordHash],
    [role],
    [isActive]
)
SELECT
    mls.userId,
    mls.username,
    mls.email,
    @DefaultPasswordHash,
    'LECTURER',
    1
FROM #MissingLecturerSeed mls
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[User] u
    WHERE u.id = mls.userId
       OR u.username = mls.username
       OR u.email = mls.email
);

INSERT INTO [dbo].[Lecturer] (
    [id],
    [userId],
    [facultyId],
    [departmentId],
    [lectureCode],
    [fullName],
    [degree],
    [phone]
)
SELECT
    mls.id,
    mls.userId,
    mls.facultyId,
    mls.departmentId,
    mls.lectureCode,
    mls.fullName,
    mls.degree,
    mls.phone
FROM #MissingLecturerSeed mls
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Lecturer] l
    WHERE l.lectureCode = mls.lectureCode
);

IF OBJECT_ID('tempdb..#ActiveCohort') IS NOT NULL DROP TABLE #ActiveCohort;

SELECT
    code,
    startYear,
    endYear
INTO #ActiveCohort
FROM [dbo].[AcademicCohort]
WHERE isActive = 1
  AND code LIKE 'K%';

;WITH MajorCohortClassCount AS (
    SELECT
        mt.majorId,
        mt.facultyId,
        mt.majorToken,
        mt.majorName,
        ac.code AS cohort,
        ac.startYear,
        COUNT(ad.id) AS classCount
    FROM #MajorToken mt
    CROSS JOIN #ActiveCohort ac
    LEFT JOIN [dbo].[AdminClass] ad
        ON ad.majorId = mt.majorId
       AND ad.cohort = ac.code
    GROUP BY
        mt.majorId,
        mt.facultyId,
        mt.majorToken,
        mt.majorName,
        ac.code,
        ac.startYear
),
MissingAdminClass AS (
    SELECT
        mccc.majorId,
        mccc.facultyId,
        mccc.majorToken,
        mccc.majorName,
        mccc.cohort,
        mccc.startYear,
        n.n
    FROM MajorCohortClassCount mccc
    JOIN #Numbers n
        ON n.n > mccc.classCount
       AND n.n <= @MinClassesPerMajorPerCohort
)
INSERT INTO [dbo].[AdminClass] (
    [id],
    [majorId],
    [code],
    [name],
    [cohort],
    [advisorId]
)
SELECT
    LEFT(CONCAT('SEED_AC_', mac.cohort, '_', mac.majorToken, '_', RIGHT(CONCAT('00', mac.n), 2)), 50) AS id,
    mac.majorId,
    LEFT(CONCAT(mac.cohort, '-', mac.majorToken, '-', RIGHT(CONCAT('00', mac.n), 2)), 50) AS code,
    LEFT(CONCAT(mac.cohort, N' - ', mac.majorName, N' - Lớp ', RIGHT(CONCAT('00', mac.n), 2)), 255) AS name,
    mac.cohort,
    advisor.id
FROM MissingAdminClass mac
OUTER APPLY (
    SELECT TOP 1 l.id
    FROM [dbo].[Lecturer] l
    WHERE l.facultyId = mac.facultyId
    ORDER BY l.fullName
) advisor
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[AdminClass] ad
    WHERE ad.code = LEFT(CONCAT(mac.cohort, '-', mac.majorToken, '-', RIGHT(CONCAT('00', mac.n), 2)), 50)
);

IF OBJECT_ID('tempdb..#AdminClassStudentCount') IS NOT NULL DROP TABLE #AdminClassStudentCount;

SELECT
    ad.id AS adminClassId,
    ad.majorId,
    ad.code AS adminClassCode,
    ad.name AS adminClassName,
    ad.cohort,
    mt.majorToken,
    COALESCE(ac.startYear, YEAR(GETDATE())) AS startYear,
    COUNT(st.id) AS studentCount
INTO #AdminClassStudentCount
FROM [dbo].[AdminClass] ad
JOIN #MajorToken mt ON mt.majorId = ad.majorId
LEFT JOIN #ActiveCohort ac ON ac.code = ad.cohort
LEFT JOIN [dbo].[Student] st ON st.adminClassId = ad.id
WHERE ad.cohort IN (SELECT code FROM #ActiveCohort)
GROUP BY
    ad.id,
    ad.majorId,
    ad.code,
    ad.name,
    ad.cohort,
    mt.majorToken,
    ac.startYear;

;WITH MissingStudent AS (
    SELECT
        acs.adminClassId,
        acs.majorId,
        acs.adminClassCode,
        acs.adminClassName,
        acs.cohort,
        acs.majorToken,
        acs.startYear,
        n.n,
        classToken = LEFT(
            REPLACE(
                REPLACE(
                    REPLACE(UPPER(acs.adminClassCode), '-', ''),
                    '_', ''
                ),
                ' ', ''
            ),
            30
        )
    FROM #AdminClassStudentCount acs
    JOIN #Numbers n
        ON n.n > acs.studentCount
       AND n.n <= @MinStudentsPerAdminClass
)
SELECT
    id = LEFT(CONCAT('SEED_ST_', ms.classToken, '_', RIGHT(CONCAT('00', ms.n), 2)), 50),
    adminClassId = ms.adminClassId,
    majorId = ms.majorId,
    userId = LEFT(CONCAT('USR_', ms.classToken, RIGHT(CONCAT('00', ms.n), 2)), 50),
    username = LEFT(CONCAT('SV', ms.classToken, RIGHT(CONCAT('00', ms.n), 2)), 100),
    email = LEFT(CONCAT(LOWER(ms.classToken), RIGHT(CONCAT('00', ms.n), 2), '@sv.uneti.edu.vn'), 100),
    studentCode = LEFT(CONCAT('SV', ms.classToken, RIGHT(CONCAT('00', ms.n), 2)), 50),
    fullName = srn.fullName,
    dob = DATEFROMPARTS(ms.startYear - 18, ((ms.n - 1) % 12) + 1, ((ms.n - 1) % 28) + 1),
    gender = srn.gender,
    phone = CONCAT('09', RIGHT(CONCAT('00000000', ABS(CHECKSUM(ms.adminClassId, ms.n)) % 100000000), 8)),
    emailPersonal = CONCAT(LOWER(ms.classToken), RIGHT(CONCAT('00', ms.n), 2), '@sv.uneti.edu.vn'),
    admissionDate = DATEFROMPARTS(ms.startYear, 9, 1),
    campus = N'Hà Nội',
    educationLevel = N'Đại học',
    educationType = N'Chính quy',
    intake = ms.cohort
INTO #MissingStudentSeed
FROM MissingStudent ms
JOIN #StudentRealName srn ON srn.n = ms.n;

INSERT INTO [dbo].[User] (
    [id],
    [username],
    [email],
    [passwordHash],
    [role],
    [isActive]
)
SELECT
    mss.userId,
    mss.username,
    mss.email,
    @DefaultPasswordHash,
    'STUDENT',
    1
FROM #MissingStudentSeed mss
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[User] u
    WHERE u.id = mss.userId
       OR u.username = mss.username
       OR u.email = mss.email
);

INSERT INTO [dbo].[Student] (
    [id],
    [userId],
    [adminClassId],
    [majorId],
    [studentCode],
    [fullName],
    [dob],
    [gender],
    [phone],
    [emailPersonal],
    [admissionDate],
    [campus],
    [educationLevel],
    [educationType],
    [intake],
    [gpa],
    [cpa],
    [totalEarnedCredits],
    [status],
    [academicStatus],
    [warningLevel]
)
SELECT
    mss.id,
    mss.userId,
    mss.adminClassId,
    mss.majorId,
    mss.studentCode,
    mss.fullName,
    mss.dob,
    mss.gender,
    mss.phone,
    mss.emailPersonal,
    mss.admissionDate,
    mss.campus,
    mss.educationLevel,
    mss.educationType,
    mss.intake,
    0,
    0,
    0,
    'STUDYING',
    'NORMAL',
    0
FROM #MissingStudentSeed mss
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Student] st
    WHERE st.studentCode = mss.studentCode
);

;WITH PlaceholderLecturer AS (
    SELECT
        l.id,
        rn = ((ROW_NUMBER() OVER (PARTITION BY l.departmentId ORDER BY l.lectureCode) - 1) % 20) + 1
    FROM [dbo].[Lecturer] l
    WHERE l.fullName LIKE N'Giảng viên %'
)
UPDATE l
SET
    l.fullName = lrn.fullName,
    l.degree = COALESCE(l.degree, lrn.degree)
FROM [dbo].[Lecturer] l
JOIN PlaceholderLecturer pl ON pl.id = l.id
JOIN #LecturerRealName lrn ON lrn.n = pl.rn;

;WITH PlaceholderStudent AS (
    SELECT
        st.id,
        rn = ((ROW_NUMBER() OVER (PARTITION BY st.adminClassId ORDER BY st.studentCode) - 1) % 20) + 1
    FROM [dbo].[Student] st
    WHERE st.fullName LIKE N'Sinh viên %'
)
UPDATE st
SET
    st.fullName = srn.fullName,
    st.gender = srn.gender
FROM [dbo].[Student] st
JOIN PlaceholderStudent ps ON ps.id = st.id
JOIN #StudentRealName srn ON srn.n = ps.rn;

DECLARE @ReferenceDate DATE = '2026-04-11';
DECLARE @CurrentWeekMonday DATE = '2026-04-06';
DECLARE @PricePerCredit DECIMAL(12,2) = 500000;
DECLARE @FixedInsuranceFee DECIMAL(12,2) = 450000;

IF OBJECT_ID('tempdb..#TargetSemester') IS NOT NULL DROP TABLE #TargetSemester;

SELECT TOP 1
    semesterId = s.id,
    semesterCode = s.code,
    semesterName = s.name,
    conceptualSemester = CASE
        WHEN PATINDEX('%HK[1-8]%', UPPER(s.code)) > 0
            THEN TRY_CONVERT(INT, SUBSTRING(UPPER(s.code), PATINDEX('%HK[1-8]%', UPPER(s.code)) + 2, 1))
        WHEN s.semesterNumber BETWEEN 1 AND 8 THEN s.semesterNumber
        ELSE 1
    END,
    semesterToken = LEFT(
        REPLACE(REPLACE(REPLACE(UPPER(s.code), '-', ''), '_', ''), ' ', ''),
        12
    )
INTO #TargetSemester
FROM [dbo].[Semester] s
ORDER BY
    CASE WHEN s.isCurrent = 1 THEN 0 ELSE 1 END,
    s.startDate DESC,
    s.code DESC;

UPDATE [dbo].[Semester]
SET
    isCurrent = 0,
    isRegistering = 0
WHERE id NOT IN (SELECT semesterId FROM #TargetSemester);

UPDATE s
SET
    s.year = YEAR(@ReferenceDate),
    s.startDate = '2026-03-02',
    s.endDate = '2026-07-31',
    s.registerStartDate = '2026-03-01',
    s.registerEndDate = '2026-05-15',
    s.midtermGradeDeadline = '2026-05-31',
    s.examStartDate = '2026-07-15',
    s.examEndDate = '2026-07-31',
    s.isCurrent = 1,
    s.isRegistering = 1
FROM [dbo].[Semester] s
JOIN #TargetSemester ts ON ts.semesterId = s.id;

IF OBJECT_ID('tempdb..#OperationalSubject') IS NOT NULL DROP TABLE #OperationalSubject;

;WITH RankedCurriculum AS (
    SELECT
        c.majorId,
        c.cohort,
        s.id AS subjectId,
        s.code AS subjectCode,
        s.name AS subjectName,
        s.credits,
        s.departmentId,
        s.theoryPeriods,
        s.practicePeriods,
        rn = ROW_NUMBER() OVER (
            PARTITION BY c.majorId, c.cohort
            ORDER BY
                CASE WHEN ISNULL(c.isRequired, 1) = 1 THEN 0 ELSE 1 END,
                s.code
        )
    FROM [dbo].[Curriculum] c
    JOIN [dbo].[Subject] s ON s.id = c.subjectId
    CROSS JOIN #TargetSemester ts
    WHERE c.suggestedSemester = ts.conceptualSemester
)
SELECT
    majorId,
    cohort,
    subjectId,
    subjectCode,
    subjectName,
    credits,
    departmentId,
    theoryPeriods,
    practicePeriods
INTO #OperationalSubject
FROM RankedCurriculum
WHERE rn <= 3;

IF OBJECT_ID('tempdb..#OperationalClass') IS NOT NULL DROP TABLE #OperationalClass;

SELECT
    ad.id AS adminClassId,
    ad.code AS adminClassCode,
    ad.majorId,
    ad.cohort,
    os.subjectId,
    os.subjectCode,
    os.subjectName,
    os.credits,
    os.departmentId,
    os.theoryPeriods,
    os.practicePeriods,
    lecturerId = lec.id,
    totalPeriods = CASE
        WHEN ISNULL(os.theoryPeriods, 0) + ISNULL(os.practicePeriods, 0) > 0
            THEN ISNULL(os.theoryPeriods, 0) + ISNULL(os.practicePeriods, 0)
        ELSE os.credits * 15
    END,
    periodsPerSession = CASE
        WHEN ISNULL(os.practicePeriods, 0) > 0 AND ISNULL(os.theoryPeriods, 0) = 0 THEN 4
        ELSE 3
    END,
    courseClassCode = LEFT(CONCAT('PCC_', ts.semesterToken, '_', tok.subjectToken, '_', tok.classToken), 50),
    courseClassId = LEFT(CONCAT('SEEDCC_', ts.semesterToken, '_', tok.subjectToken, '_', tok.classToken), 50),
    courseClassName = LEFT(CONCAT(os.subjectName, N' - ', ad.code), 255),
    classSeq = ROW_NUMBER() OVER (ORDER BY ad.code, os.subjectCode)
INTO #OperationalClass
FROM [dbo].[AdminClass] ad
JOIN #OperationalSubject os
    ON os.majorId = ad.majorId
   AND os.cohort = ad.cohort
JOIN [dbo].[Major] m ON m.id = ad.majorId
CROSS JOIN #TargetSemester ts
CROSS APPLY (
    SELECT
        subjectToken = LEFT(REPLACE(REPLACE(REPLACE(UPPER(os.subjectCode), '-', ''), '_', ''), ' ', ''), 15),
        classToken = LEFT(REPLACE(REPLACE(REPLACE(UPPER(ad.code), '-', ''), '_', ''), ' ', ''), 15)
) tok
OUTER APPLY (
    SELECT TOP 1 l.id
    FROM [dbo].[Lecturer] l
    WHERE (
            os.departmentId IS NOT NULL
        AND l.departmentId = os.departmentId
    )
       OR l.facultyId = m.facultyId
    ORDER BY
        CASE
            WHEN os.departmentId IS NOT NULL AND l.departmentId = os.departmentId THEN 0
            ELSE 1
        END,
        l.fullName
) lec
WHERE ad.cohort IN (SELECT code FROM #ActiveCohort)
  AND EXISTS (
        SELECT 1
        FROM [dbo].[Student] st
        WHERE st.adminClassId = ad.id
          AND st.status = 'STUDYING'
    );

INSERT INTO [dbo].[CourseClass] (
    [id],
    [subjectId],
    [semesterId],
    [lecturerId],
    [cohort],
    [code],
    [name],
    [tuitionMultiplier],
    [maxSlots],
    [currentSlots],
    [status],
    [totalPeriods],
    [sessionsPerWeek],
    [periodsPerSession]
)
SELECT
    oc.courseClassId,
    oc.subjectId,
    ts.semesterId,
    oc.lecturerId,
    oc.cohort,
    oc.courseClassCode,
    oc.courseClassName,
    1,
    60,
    0,
    'OPEN',
    oc.totalPeriods,
    1,
    oc.periodsPerSession
FROM #OperationalClass oc
CROSS JOIN #TargetSemester ts
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[CourseClass] cc
    WHERE cc.code = oc.courseClassCode
);

UPDATE cc
SET
    cc.subjectId = oc.subjectId,
    cc.semesterId = ts.semesterId,
    cc.lecturerId = oc.lecturerId,
    cc.cohort = oc.cohort,
    cc.name = oc.courseClassName,
    cc.tuitionMultiplier = 1,
    cc.maxSlots = 60,
    cc.status = 'OPEN',
    cc.totalPeriods = oc.totalPeriods,
    cc.sessionsPerWeek = 1,
    cc.periodsPerSession = oc.periodsPerSession
FROM [dbo].[CourseClass] cc
JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
CROSS JOIN #TargetSemester ts;

INSERT INTO [dbo].[_AdminClassToCourseClass] ([A], [B])
SELECT
    oc.adminClassId,
    cc.id
FROM #OperationalClass oc
JOIN [dbo].[CourseClass] cc ON cc.code = oc.courseClassCode
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[_AdminClassToCourseClass] map
    WHERE map.[A] = oc.adminClassId
      AND map.[B] = cc.id
);

IF OBJECT_ID('tempdb..#OperationalEnrollmentSeed') IS NOT NULL DROP TABLE #OperationalEnrollmentSeed;

SELECT
    studentId = st.id,
    studentCode = st.studentCode,
    courseClassId = cc.id,
    subjectId = cc.subjectId,
    semesterId = cc.semesterId,
    tuitionFee = CAST(oc.credits * @PricePerCredit AS DECIMAL(10, 2)),
    enrollmentStatus = CASE
        WHEN ABS(CHECKSUM(st.id, cc.id)) % 4 = 0 THEN 'PAID'
        ELSE 'REGISTERED'
    END
INTO #OperationalEnrollmentSeed
FROM [dbo].[Student] st
JOIN #OperationalClass oc ON oc.adminClassId = st.adminClassId
JOIN [dbo].[CourseClass] cc ON cc.code = oc.courseClassCode
WHERE st.status = 'STUDYING';

INSERT INTO [dbo].[Enrollment] (
    [id],
    [studentId],
    [courseClassId],
    [status],
    [registeredAt],
    [isRetake],
    [tuitionFee]
)
SELECT
    CONVERT(VARCHAR(50), NEWID()),
    oes.studentId,
    oes.courseClassId,
    oes.enrollmentStatus,
    DATEADD(DAY, -7, @ReferenceDate),
    0,
    oes.tuitionFee
FROM #OperationalEnrollmentSeed oes
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Enrollment] e
    WHERE e.studentId = oes.studentId
      AND e.courseClassId = oes.courseClassId
);

UPDATE cc
SET cc.currentSlots = enrol.totalStudents
FROM [dbo].[CourseClass] cc
JOIN (
    SELECT
        e.courseClassId,
        COUNT(*) AS totalStudents
    FROM [dbo].[Enrollment] e
    WHERE e.courseClassId IN (
        SELECT cc.id
        FROM [dbo].[CourseClass] cc
        JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
    )
    GROUP BY e.courseClassId
) enrol ON enrol.courseClassId = cc.id;

IF OBJECT_ID('tempdb..#TheoryRoomSeq') IS NOT NULL DROP TABLE #TheoryRoomSeq;
IF OBJECT_ID('tempdb..#PracticeRoomSeq') IS NOT NULL DROP TABLE #PracticeRoomSeq;

;WITH LabRoomNumber AS (
    SELECT TOP 10 roomNo = 200 + ROW_NUMBER() OVER (ORDER BY (SELECT NULL))
    FROM sys.all_objects
),
TheoryRoomNumber AS (
    SELECT TOP 80 roomNo = 100 + ROW_NUMBER() OVER (ORDER BY (SELECT NULL))
    FROM sys.all_objects
),
StandardRoom AS (
    SELECT
        [id] = CONCAT('ROOM_L', roomNo),
        [name] = CONCAT(N'Lab.', roomNo),
        [building] = 'HA9',
        [capacity] = 40,
        [type] = 'PRACTICE',
        [campus] = CAST(NULL AS NVARCHAR(100))
    FROM LabRoomNumber
    UNION ALL
    SELECT
        [id] = CONCAT('ROOM_P', roomNo),
        [name] = CONCAT(N'P.', roomNo),
        [building] = 'HA8',
        [capacity] = 60,
        [type] = 'THEORY',
        [campus] = CAST(NULL AS NVARCHAR(100))
    FROM TheoryRoomNumber
)
MERGE [dbo].[Room] AS target
USING StandardRoom AS src
ON target.[id] = src.[id]
WHEN MATCHED THEN
    UPDATE SET
        target.[name] = src.[name],
        target.[building] = src.[building],
        target.[capacity] = src.[capacity],
        target.[type] = src.[type],
        target.[campus] = src.[campus]
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([id], [name], [building], [capacity], [type], [campus])
    VALUES (src.[id], src.[name], src.[building], src.[capacity], src.[type], src.[campus]);

;WITH TheoryRooms AS (
    SELECT
        id
    FROM [dbo].[Room]
    WHERE id LIKE 'ROOM_P%'
),
PracticeRooms AS (
    SELECT
        id
    FROM [dbo].[Room]
    WHERE id LIKE 'ROOM_L%'
),
SeedSession AS (
    SELECT
        cs.id,
        cs.semesterId,
        cs.[date],
        cs.startShift,
        cs.endShift,
        sessionType = CASE WHEN cs.[type] = 'PRACTICE' THEN 'PRACTICE' ELSE 'THEORY' END,
        slotRn = ROW_NUMBER() OVER (
            PARTITION BY
                cs.semesterId,
                cs.[date],
                cs.startShift,
                cs.endShift,
                CASE WHEN cs.[type] = 'PRACTICE' THEN 'PRACTICE' ELSE 'THEORY' END
            ORDER BY cs.courseClassId, cs.id
        )
    FROM [dbo].[ClassSession] cs
    WHERE cs.roomId LIKE 'SEED_ROOM_%'
),
AvailableTheoryRoom AS (
    SELECT
        slot.semesterId,
        slot.[date],
        slot.startShift,
        slot.endShift,
        tr.id,
        roomRn = ROW_NUMBER() OVER (
            PARTITION BY slot.semesterId, slot.[date], slot.startShift, slot.endShift
            ORDER BY tr.id
        )
    FROM (
        SELECT DISTINCT semesterId, [date], startShift, endShift
        FROM SeedSession
        WHERE sessionType = 'THEORY'
    ) slot
    CROSS JOIN TheoryRooms tr
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[ClassSession] currentSession
        WHERE currentSession.semesterId = slot.semesterId
          AND currentSession.[date] = slot.[date]
          AND currentSession.startShift = slot.startShift
          AND currentSession.endShift = slot.endShift
          AND currentSession.roomId = tr.id
          AND currentSession.roomId NOT LIKE 'SEED_ROOM_%'
    )
),
AvailablePracticeRoom AS (
    SELECT
        slot.semesterId,
        slot.[date],
        slot.startShift,
        slot.endShift,
        pr.id,
        roomRn = ROW_NUMBER() OVER (
            PARTITION BY slot.semesterId, slot.[date], slot.startShift, slot.endShift
            ORDER BY pr.id
        )
    FROM (
        SELECT DISTINCT semesterId, [date], startShift, endShift
        FROM SeedSession
        WHERE sessionType = 'PRACTICE'
    ) slot
    CROSS JOIN PracticeRooms pr
    WHERE NOT EXISTS (
        SELECT 1
        FROM [dbo].[ClassSession] currentSession
        WHERE currentSession.semesterId = slot.semesterId
          AND currentSession.[date] = slot.[date]
          AND currentSession.startShift = slot.startShift
          AND currentSession.endShift = slot.endShift
          AND currentSession.roomId = pr.id
          AND currentSession.roomId NOT LIKE 'SEED_ROOM_%'
    )
)
UPDATE cs
SET cs.roomId = COALESCE(theoryTarget.id, practiceTarget.id)
FROM [dbo].[ClassSession] cs
JOIN SeedSession ss ON ss.id = cs.id
OUTER APPLY (
    SELECT atr.id
    FROM AvailableTheoryRoom atr
    WHERE ss.sessionType = 'THEORY'
      AND atr.semesterId = ss.semesterId
      AND atr.[date] = ss.[date]
      AND atr.startShift = ss.startShift
      AND atr.endShift = ss.endShift
      AND atr.roomRn = ss.slotRn
) theoryTarget
OUTER APPLY (
    SELECT apr.id
    FROM AvailablePracticeRoom apr
    WHERE ss.sessionType = 'PRACTICE'
      AND apr.semesterId = ss.semesterId
      AND apr.[date] = ss.[date]
      AND apr.startShift = ss.startShift
      AND apr.endShift = ss.endShift
      AND apr.roomRn = ss.slotRn
) practiceTarget;

DELETE r
FROM [dbo].[Room] r
WHERE r.id LIKE 'SEED_ROOM_%'
  AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[ClassSession] cs
      WHERE cs.roomId = r.id
  )
  AND NOT EXISTS (
      SELECT 1
      FROM [dbo].[ClassSchedule] sch
      WHERE sch.roomId = r.id
  );

SELECT
    roomId = r.id,
    rn = ROW_NUMBER() OVER (ORDER BY r.capacity DESC, r.id)
INTO #TheoryRoomSeq
FROM [dbo].[Room] r
WHERE r.id LIKE 'ROOM_P%';

SELECT
    roomId = r.id,
    rn = ROW_NUMBER() OVER (ORDER BY r.capacity DESC, r.id)
INTO #PracticeRoomSeq
FROM [dbo].[Room] r
WHERE r.id LIKE 'ROOM_L%';

DECLARE @TheoryRoomCount INT = (SELECT COUNT(*) FROM #TheoryRoomSeq);
DECLARE @PracticeRoomCount INT = (SELECT COUNT(*) FROM #PracticeRoomSeq);
DECLARE @RoomCount INT;
IF @TheoryRoomCount IS NULL OR @TheoryRoomCount = 0 SET @TheoryRoomCount = 1;
IF @PracticeRoomCount IS NULL OR @PracticeRoomCount = 0 SET @PracticeRoomCount = 1;
SET @RoomCount = CASE WHEN @TheoryRoomCount >= @PracticeRoomCount THEN @TheoryRoomCount ELSE @PracticeRoomCount END;

IF OBJECT_ID('tempdb..#OperationalScheduleSeed') IS NOT NULL DROP TABLE #OperationalScheduleSeed;

SELECT
    cc.id AS courseClassId,
    cc.semesterId,
    roomId = CASE
        WHEN ISNULL(oc.practicePeriods, 0) > 0 AND ISNULL(oc.theoryPeriods, 0) = 0
            THEN prs.roomId
        ELSE trs.roomId
    END,
    startShift = ((((oc.classSeq - 1) / @RoomCount) % 11) + 1),
    endShift = ((((oc.classSeq - 1) / @RoomCount) % 11) + 1) + oc.periodsPerSession - 1,
    weekBucket = ((((oc.classSeq - 1) / @RoomCount) / 11) / 7),
    dayOffset = ((((oc.classSeq - 1) / @RoomCount) / 11) % 7),
    sessionType = CASE
        WHEN ISNULL(oc.practicePeriods, 0) > 0 AND ISNULL(oc.theoryPeriods, 0) = 0 THEN 'PRACTICE'
        ELSE 'THEORY'
    END
INTO #OperationalScheduleSeed
FROM #OperationalClass oc
JOIN [dbo].[CourseClass] cc ON cc.code = oc.courseClassCode
OUTER APPLY (
    SELECT TOP 1 roomId
    FROM #TheoryRoomSeq
    WHERE rn = ((oc.classSeq - 1) % @TheoryRoomCount) + 1
) trs
OUTER APPLY (
    SELECT TOP 1 roomId
    FROM #PracticeRoomSeq
    WHERE rn = ((oc.classSeq - 1) % @PracticeRoomCount) + 1
) prs;

DELETE a
FROM [dbo].[Attendance] a
JOIN [dbo].[ClassSession] cs ON cs.id = a.sessionId
WHERE cs.courseClassId IN (
    SELECT cc.id
    FROM [dbo].[CourseClass] cc
    JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
)
  AND cs.note = N'Lịch học seed cho cổng sinh viên';

DELETE cs
FROM [dbo].[ClassSession] cs
WHERE cs.courseClassId IN (
    SELECT cc.id
    FROM [dbo].[CourseClass] cc
    JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
)
  AND cs.note = N'Lịch học seed cho cổng sinh viên';

INSERT INTO [dbo].[ClassSession] (
    [id],
    [courseClassId],
    [roomId],
    [semesterId],
    [date],
    [startShift],
    [endShift],
    [type],
    [note]
)
SELECT
    CONVERT(VARCHAR(50), NEWID()),
    oss.courseClassId,
    oss.roomId,
    oss.semesterId,
    DATEADD(DAY, oss.dayOffset + (oss.weekBucket * 14) + (wk.weekOffset * 7), @CurrentWeekMonday),
    oss.startShift,
    oss.endShift,
    oss.sessionType,
    N'Lịch học seed cho cổng sinh viên'
FROM #OperationalScheduleSeed oss
CROSS JOIN (VALUES (0), (1)) wk(weekOffset)
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[ClassSession] cs
    WHERE cs.courseClassId = oss.courseClassId
      AND cs.date = DATEADD(DAY, oss.dayOffset + (oss.weekBucket * 14) + (wk.weekOffset * 7), @CurrentWeekMonday)
      AND cs.startShift = oss.startShift
);

IF OBJECT_ID('tempdb..#CourseSessionSeed') IS NOT NULL DROP TABLE #CourseSessionSeed;

SELECT
    cs.courseClassId,
    cs.id AS sessionId,
    cs.date,
    sessionNo = ROW_NUMBER() OVER (PARTITION BY cs.courseClassId ORDER BY cs.date, cs.startShift)
INTO #CourseSessionSeed
FROM [dbo].[ClassSession] cs
WHERE cs.courseClassId IN (
    SELECT cc.id
    FROM [dbo].[CourseClass] cc
    JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
);

INSERT INTO [dbo].[Attendance] (
    [id],
    [enrollmentId],
    [date],
    [status],
    [note],
    [sessionId]
)
SELECT
    CONVERT(VARCHAR(50), NEWID()),
    e.id,
    css.date,
    CASE ABS(CHECKSUM(e.studentId, css.sessionId)) % 10
        WHEN 0 THEN 'ABSENT'
        WHEN 1 THEN 'EXCUSED'
        ELSE 'PRESENT'
    END,
    CASE ABS(CHECKSUM(e.studentId, css.sessionId)) % 10
        WHEN 0 THEN N'Nghỉ không phép'
        WHEN 1 THEN N'Nghỉ có phép'
        ELSE N'Đi học đầy đủ'
    END,
    css.sessionId
FROM [dbo].[Enrollment] e
JOIN #CourseSessionSeed css
    ON css.courseClassId = e.courseClassId
   AND css.sessionNo <= 2
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Attendance] a
    WHERE a.enrollmentId = e.id
      AND a.date = css.date
);

IF OBJECT_ID('tempdb..#GradeSeed') IS NOT NULL DROP TABLE #GradeSeed;

;WITH AttendanceSummary AS (
    SELECT
        e.studentId,
        e.courseClassId,
        cc.subjectId,
        absentCount = SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END),
        excusedCount = SUM(CASE WHEN a.status IN ('EXCUSED', 'ABSENT_EXCUSED') THEN 1 ELSE 0 END)
    FROM [dbo].[Enrollment] e
    JOIN [dbo].[CourseClass] cc ON cc.id = e.courseClassId
    LEFT JOIN [dbo].[Attendance] a ON a.enrollmentId = e.id
    WHERE e.courseClassId IN (
        SELECT cc.id
        FROM [dbo].[CourseClass] cc
        JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
    )
    GROUP BY
        e.studentId,
        e.courseClassId,
        cc.subjectId
)
SELECT
    att.studentId,
    att.courseClassId,
    att.subjectId,
    attendanceScore = CAST(
        CASE
            WHEN att.absentCount >= 2 THEN 7.0
            WHEN att.absentCount = 1 THEN 8.0
            WHEN att.excusedCount >= 1 THEN 8.5
            ELSE 9.0
        END
        AS FLOAT
    ),
    regularScore1 = CAST(6.0 + (ABS(CHECKSUM(att.studentId, 'R1', att.subjectId)) % 31) / 10.0 AS FLOAT),
    regularScore2 = CAST(6.0 + (ABS(CHECKSUM(att.studentId, 'R2', att.subjectId)) % 31) / 10.0 AS FLOAT),
    finalScore = CAST(5.5 + (ABS(CHECKSUM(att.studentId, 'FIN', att.courseClassId)) % 36) / 10.0 AS FLOAT)
INTO #GradeSeed
FROM AttendanceSummary att;

UPDATE g
SET
    g.attendanceScore = seed.attendanceScore,
    g.regularScore1 = seed.regularScore1,
    g.regularScore2 = seed.regularScore2,
    g.midtermScore = calc.midtermScore,
    g.finalScore = seed.finalScore,
    g.totalScore10 = calc.totalScore10,
    g.totalScore4 = calc.totalScore4,
    g.letterGrade = calc.letterGrade,
    g.isPassed = calc.isPassed,
    g.isEligibleForExam = CASE WHEN seed.attendanceScore > 0 THEN 1 ELSE 0 END,
    g.isAbsentFromExam = 0,
    g.isLocked = 1,
    g.status = 'FINALIZED'
FROM [dbo].[Grade] g
JOIN #GradeSeed seed
    ON seed.studentId = g.studentId
   AND seed.courseClassId = g.courseClassId
   AND seed.subjectId = g.subjectId
CROSS APPLY (
    SELECT
        midtermScore = ROUND((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0, 1),
        totalScore10 = ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1)
) mid
CROSS APPLY (
    SELECT
        midtermScore = mid.midtermScore,
        totalScore10 = mid.totalScore10,
        totalScore4 = CASE
            WHEN mid.totalScore10 >= 8.5 THEN 4.0
            WHEN mid.totalScore10 >= 7.8 THEN 3.5
            WHEN mid.totalScore10 >= 7.0 THEN 3.0
            WHEN mid.totalScore10 >= 6.3 THEN 2.5
            WHEN mid.totalScore10 >= 5.5 THEN 2.0
            WHEN mid.totalScore10 >= 4.8 THEN 1.5
            WHEN mid.totalScore10 >= 4.0 THEN 1.0
            ELSE 0.0
        END,
        letterGrade = CASE
            WHEN mid.totalScore10 >= 8.5 THEN 'A'
            WHEN mid.totalScore10 >= 7.8 THEN 'B+'
            WHEN mid.totalScore10 >= 7.0 THEN 'B'
            WHEN mid.totalScore10 >= 6.3 THEN 'C+'
            WHEN mid.totalScore10 >= 5.5 THEN 'C'
            WHEN mid.totalScore10 >= 4.8 THEN 'D+'
            WHEN mid.totalScore10 >= 4.0 THEN 'D'
            ELSE 'F'
        END,
        isPassed = CASE WHEN mid.totalScore10 >= 4.0 THEN 1 ELSE 0 END
) calc;

INSERT INTO [dbo].[Grade] (
    [id],
    [studentId],
    [courseClassId],
    [subjectId],
    [attendanceScore],
    [regularScore1],
    [regularScore2],
    [midtermScore],
    [isEligibleForExam],
    [isAbsentFromExam],
    [finalScore],
    [totalScore10],
    [totalScore4],
    [letterGrade],
    [isPassed],
    [isLocked],
    [status]
)
SELECT
    CONVERT(VARCHAR(50), NEWID()),
    seed.studentId,
    seed.courseClassId,
    seed.subjectId,
    seed.attendanceScore,
    seed.regularScore1,
    seed.regularScore2,
    calc.midtermScore,
    CASE WHEN seed.attendanceScore > 0 THEN 1 ELSE 0 END,
    0,
    seed.finalScore,
    calc.totalScore10,
    calc.totalScore4,
    calc.letterGrade,
    calc.isPassed,
    1,
    'FINALIZED'
FROM #GradeSeed seed
CROSS APPLY (
    SELECT
        midtermScore = ROUND((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0, 1),
        totalScore10 = ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1),
        totalScore4 = CASE
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 8.5 THEN 4.0
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 7.8 THEN 3.5
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 7.0 THEN 3.0
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 6.3 THEN 2.5
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 5.5 THEN 2.0
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 4.8 THEN 1.5
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 4.0 THEN 1.0
            ELSE 0.0
        END,
        letterGrade = CASE
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 8.5 THEN 'A'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 7.8 THEN 'B+'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 7.0 THEN 'B'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 6.3 THEN 'C+'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 5.5 THEN 'C'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 4.8 THEN 'D+'
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 4.0 THEN 'D'
            ELSE 'F'
        END,
        isPassed = CASE
            WHEN ROUND((((seed.attendanceScore + (seed.regularScore1 * 2) + seed.regularScore2) / 4.0) * 0.4) + (seed.finalScore * 0.6), 1) >= 4.0 THEN 1
            ELSE 0
        END
) calc
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[Grade] g
    WHERE g.studentId = seed.studentId
      AND g.courseClassId = seed.courseClassId
      AND g.subjectId = seed.subjectId
);

;WITH StudentGradeSummary AS (
    SELECT
        g.studentId,
        avgScale4 = ROUND(AVG(COALESCE(g.totalScore4, 0)), 2),
        totalCredits = SUM(CASE WHEN g.isPassed = 1 THEN s.credits ELSE 0 END)
    FROM [dbo].[Grade] g
    JOIN [dbo].[Subject] s ON s.id = g.subjectId
    WHERE g.courseClassId IN (
        SELECT cc.id
        FROM [dbo].[CourseClass] cc
        JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
    )
    GROUP BY g.studentId
)
UPDATE st
SET
    st.gpa = summary.avgScale4,
    st.cpa = summary.avgScale4,
    st.totalEarnedCredits = summary.totalCredits
FROM [dbo].[Student] st
JOIN StudentGradeSummary summary ON summary.studentId = st.id;

IF OBJECT_ID('tempdb..#TuitionSummary') IS NOT NULL DROP TABLE #TuitionSummary;

SELECT
    st.id AS studentId,
    st.studentCode,
    ts.semesterId,
    ts.semesterName,
    ts.semesterToken,
    totalAmount = SUM(CAST(e.tuitionFee AS DECIMAL(12, 2))),
    paidAmount = SUM(CASE WHEN e.status = 'PAID' THEN CAST(e.tuitionFee AS DECIMAL(12, 2)) ELSE 0 END)
INTO #TuitionSummary
FROM [dbo].[Student] st
JOIN [dbo].[Enrollment] e ON e.studentId = st.id
JOIN [dbo].[CourseClass] cc ON cc.id = e.courseClassId
JOIN #TargetSemester ts ON ts.semesterId = cc.semesterId
WHERE cc.id IN (
    SELECT cc.id
    FROM [dbo].[CourseClass] cc
    JOIN #OperationalClass oc ON oc.courseClassCode = cc.code
)
GROUP BY
    st.id,
    st.studentCode,
    ts.semesterId,
    ts.semesterName,
    ts.semesterToken;

UPDATE sf
SET
    sf.name = CONCAT(N'Học phí ', src.semesterName),
    sf.totalAmount = src.totalAmount,
    sf.finalAmount = src.totalAmount,
    sf.paidAmount = src.paidAmount,
    sf.status = CASE
        WHEN src.paidAmount >= src.totalAmount THEN 'PAID'
        WHEN src.paidAmount > 0 THEN 'PARTIAL'
        ELSE 'DEBT'
    END,
    sf.isMandatory = 1
FROM [dbo].[StudentFee] sf
JOIN #TuitionSummary src
    ON src.studentId = sf.studentId
   AND src.semesterId = sf.semesterId
   AND sf.feeType = 'TUITION';

INSERT INTO [dbo].[StudentFee] (
    [id],
    [studentId],
    [semesterId],
    [feeType],
    [name],
    [isMandatory],
    [totalAmount],
    [discountAmount],
    [finalAmount],
    [paidAmount],
    [status]
)
SELECT
    LEFT(CONCAT('TF_', src.studentCode, '_', src.semesterToken), 50),
    src.studentId,
    src.semesterId,
    'TUITION',
    CONCAT(N'Học phí ', src.semesterName),
    1,
    src.totalAmount,
    0,
    src.totalAmount,
    src.paidAmount,
    CASE
        WHEN src.paidAmount >= src.totalAmount THEN 'PAID'
        WHEN src.paidAmount > 0 THEN 'PARTIAL'
        ELSE 'DEBT'
    END
FROM #TuitionSummary src
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[StudentFee] sf
    WHERE sf.studentId = src.studentId
      AND sf.semesterId = src.semesterId
      AND sf.feeType = 'TUITION'
);

IF OBJECT_ID('tempdb..#InsuranceFeeSeed') IS NOT NULL DROP TABLE #InsuranceFeeSeed;

SELECT
    st.id AS studentId,
    st.studentCode,
    ts.semesterId,
    ts.semesterName,
    ts.semesterToken,
    totalAmount = @FixedInsuranceFee,
    paidAmount = CASE
        WHEN ABS(CHECKSUM(st.id, 'INSURANCE')) % 3 = 0 THEN @FixedInsuranceFee
        ELSE 0
    END
INTO #InsuranceFeeSeed
FROM [dbo].[Student] st
CROSS JOIN #TargetSemester ts
WHERE EXISTS (
    SELECT 1
    FROM [dbo].[Enrollment] e
    JOIN [dbo].[CourseClass] cc ON cc.id = e.courseClassId
    WHERE e.studentId = st.id
      AND cc.semesterId = ts.semesterId
);

UPDATE sf
SET
    sf.name = CONCAT(N'Bảo hiểm y tế ', src.semesterName),
    sf.totalAmount = src.totalAmount,
    sf.finalAmount = src.totalAmount,
    sf.paidAmount = src.paidAmount,
    sf.status = CASE WHEN src.paidAmount >= src.totalAmount THEN 'PAID' ELSE 'DEBT' END,
    sf.isMandatory = 1
FROM [dbo].[StudentFee] sf
JOIN #InsuranceFeeSeed src
    ON src.studentId = sf.studentId
   AND src.semesterId = sf.semesterId
   AND sf.feeType = 'INSURANCE';

INSERT INTO [dbo].[StudentFee] (
    [id],
    [studentId],
    [semesterId],
    [feeType],
    [name],
    [isMandatory],
    [totalAmount],
    [discountAmount],
    [finalAmount],
    [paidAmount],
    [status]
)
SELECT
    LEFT(CONCAT('IF_', src.studentCode, '_', src.semesterToken), 50),
    src.studentId,
    src.semesterId,
    'INSURANCE',
    CONCAT(N'Bảo hiểm y tế ', src.semesterName),
    1,
    src.totalAmount,
    0,
    src.totalAmount,
    src.paidAmount,
    CASE WHEN src.paidAmount >= src.totalAmount THEN 'PAID' ELSE 'DEBT' END
FROM #InsuranceFeeSeed src
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[StudentFee] sf
    WHERE sf.studentId = src.studentId
      AND sf.semesterId = src.semesterId
      AND sf.feeType = 'INSURANCE'
);

IF OBJECT_ID('tempdb..#TrainingScoreSeed') IS NOT NULL DROP TABLE #TrainingScoreSeed;

SELECT
    st.id AS studentId,
    ts.semesterId,
    score = CASE
        WHEN st.gpa >= 3.6 THEN 95
        WHEN st.gpa >= 3.2 THEN 88
        WHEN st.gpa >= 2.5 THEN 82
        WHEN st.gpa >= 2.0 THEN 74
        ELSE 65
    END,
    classification = CASE
        WHEN st.gpa >= 3.6 THEN N'Xuất sắc'
        WHEN st.gpa >= 3.2 THEN N'Giỏi'
        WHEN st.gpa >= 2.5 THEN N'Tốt'
        WHEN st.gpa >= 2.0 THEN N'Khá'
        ELSE N'Trung bình'
    END
INTO #TrainingScoreSeed
FROM [dbo].[Student] st
CROSS JOIN #TargetSemester ts
WHERE EXISTS (
    SELECT 1
    FROM [dbo].[Enrollment] e
    JOIN [dbo].[CourseClass] cc ON cc.id = e.courseClassId
    WHERE e.studentId = st.id
      AND cc.semesterId = ts.semesterId
);

UPDATE tr
SET
    tr.score = seed.score,
    tr.classification = seed.classification
FROM [dbo].[TrainingScore] tr
JOIN #TrainingScoreSeed seed
    ON seed.studentId = tr.studentId
   AND seed.semesterId = tr.semesterId;

INSERT INTO [dbo].[TrainingScore] (
    [id],
    [studentId],
    [semesterId],
    [score],
    [classification]
)
SELECT
    CONVERT(VARCHAR(50), NEWID()),
    seed.studentId,
    seed.semesterId,
    seed.score,
    seed.classification
FROM #TrainingScoreSeed seed
WHERE NOT EXISTS (
    SELECT 1
    FROM [dbo].[TrainingScore] tr
    WHERE tr.studentId = seed.studentId
      AND tr.semesterId = seed.semesterId
);

UPDATE [dbo].[User]
SET
    [passwordHash] = @DefaultPasswordHash,
    [isActive] = 1
WHERE [passwordHash] IS NULL
   OR [passwordHash] <> @DefaultPasswordHash
   OR [isActive] = 0;

DROP TABLE IF EXISTS #MissingStudentSeed;
DROP TABLE IF EXISTS #MissingLecturerSeed;
DROP TABLE IF EXISTS #AdminClassStudentCount;
DROP TABLE IF EXISTS #ActiveCohort;
DROP TABLE IF EXISTS #TargetSemester;
DROP TABLE IF EXISTS #OperationalSubject;
DROP TABLE IF EXISTS #OperationalClass;
DROP TABLE IF EXISTS #OperationalEnrollmentSeed;
DROP TABLE IF EXISTS #RoomSeq;
DROP TABLE IF EXISTS #OperationalScheduleSeed;
DROP TABLE IF EXISTS #CourseSessionSeed;
DROP TABLE IF EXISTS #GradeSeed;
DROP TABLE IF EXISTS #TuitionSummary;
DROP TABLE IF EXISTS #InsuranceFeeSeed;
DROP TABLE IF EXISTS #TrainingScoreSeed;
DROP TABLE IF EXISTS #StudentRealName;
DROP TABLE IF EXISTS #LecturerRealName;
DROP TABLE IF EXISTS #MajorDefaultDepartment;
DROP TABLE IF EXISTS #DepartmentMajorMap;
DROP TABLE IF EXISTS #MajorToken;
DROP TABLE IF EXISTS #Numbers;
