IF OBJECT_ID(N'[dbo].[CohortSemester]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[CohortSemester] (
        [id] VARCHAR(50) NOT NULL,
        [cohortCode] VARCHAR(50) NOT NULL,
        [semesterId] VARCHAR(50) NOT NULL,
        [semesterNumber] INT NOT NULL,
        [studyYear] INT NOT NULL,
        [academicYear] VARCHAR(20) NOT NULL,
        [label] NVARCHAR(100) NOT NULL,
        [startDate] DATE NOT NULL,
        [endDate] DATE NOT NULL,
        [isCurrent] BIT NOT NULL CONSTRAINT [DF_CohortSemester_isCurrent] DEFAULT (0),
        [isRegistering] BIT NOT NULL CONSTRAINT [DF_CohortSemester_isRegistering] DEFAULT (0),
        [registerStartDate] DATETIME2 NULL,
        [registerEndDate] DATETIME2 NULL,
        [status] VARCHAR(30) NOT NULL CONSTRAINT [DF_CohortSemester_status] DEFAULT ('ACTIVE'),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_CohortSemester_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_CohortSemester_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_CohortSemester] PRIMARY KEY CLUSTERED ([id]),
        CONSTRAINT [UQ_CohortSemester_cohort_semesterNumber] UNIQUE NONCLUSTERED ([cohortCode], [semesterNumber]),
        CONSTRAINT [UQ_CohortSemester_cohort_semester] UNIQUE NONCLUSTERED ([cohortCode], [semesterId])
    );
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_CohortSemester_cohort_academicYear'
)
BEGIN
    CREATE INDEX [IX_CohortSemester_cohort_academicYear]
        ON [dbo].[CohortSemester]([cohortCode], [academicYear]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = N'IX_CohortSemester_semesterId'
)
BEGIN
    CREATE INDEX [IX_CohortSemester_semesterId]
        ON [dbo].[CohortSemester]([semesterId]);
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CohortSemester_AcademicCohort'
)
BEGIN
    ALTER TABLE [dbo].[CohortSemester]
        ADD CONSTRAINT [FK_CohortSemester_AcademicCohort]
        FOREIGN KEY ([cohortCode]) REFERENCES [dbo].[AcademicCohort]([code])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_CohortSemester_Semester'
)
BEGIN
    ALTER TABLE [dbo].[CohortSemester]
        ADD CONSTRAINT [FK_CohortSemester_Semester]
        FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id])
        ON DELETE NO ACTION ON UPDATE NO ACTION;
END;

;WITH StandardCohortSemester AS (
    SELECT
        ac.[code] AS cohortCode,
        s.[id] AS semesterId,
        v.semesterNumber,
        v.studyYear,
        CONCAT(v.yearStart, '-', v.yearEnd) AS academicYear,
        CONCAT('HK', v.semesterNumber, N' - Năm ', v.studyYear, N' (', v.yearStart, '-', v.yearEnd, N')') AS label,
        CAST(v.startDate AS DATE) AS startDate,
        CAST(v.endDate AS DATE) AS endDate,
        s.[isCurrent],
        s.[isRegistering],
        s.[registerStartDate],
        s.[registerEndDate],
        s.[code] AS semesterCode
    FROM [dbo].[AcademicCohort] ac
    CROSS APPLY (VALUES
        (1, 1, ac.[startYear], ac.[startYear] + 1, DATEFROMPARTS(ac.[startYear], 9, 1), DATEFROMPARTS(ac.[startYear] + 1, 1, 20)),
        (2, 1, ac.[startYear], ac.[startYear] + 1, DATEFROMPARTS(ac.[startYear] + 1, 2, 1), DATEFROMPARTS(ac.[startYear] + 1, 6, 30)),
        (3, 2, ac.[startYear] + 1, ac.[startYear] + 2, DATEFROMPARTS(ac.[startYear] + 1, 9, 1), DATEFROMPARTS(ac.[startYear] + 2, 1, 20)),
        (4, 2, ac.[startYear] + 1, ac.[startYear] + 2, DATEFROMPARTS(ac.[startYear] + 2, 2, 1), DATEFROMPARTS(ac.[startYear] + 2, 6, 30)),
        (5, 3, ac.[startYear] + 2, ac.[startYear] + 3, DATEFROMPARTS(ac.[startYear] + 2, 9, 1), DATEFROMPARTS(ac.[startYear] + 3, 1, 20)),
        (6, 3, ac.[startYear] + 2, ac.[startYear] + 3, DATEFROMPARTS(ac.[startYear] + 3, 2, 1), DATEFROMPARTS(ac.[startYear] + 3, 6, 30)),
        (7, 4, ac.[startYear] + 3, ac.[startYear] + 4, DATEFROMPARTS(ac.[startYear] + 3, 9, 1), DATEFROMPARTS(ac.[startYear] + 4, 1, 20)),
        (8, 4, ac.[startYear] + 3, ac.[startYear] + 4, DATEFROMPARTS(ac.[startYear] + 4, 2, 1), DATEFROMPARTS(ac.[startYear] + 4, 6, 30))
    ) v(semesterNumber, studyYear, yearStart, yearEnd, startDate, endDate)
    INNER JOIN [dbo].[Semester] s ON
        s.[startDate] <= v.endDate
        AND s.[endDate] >= v.startDate
        AND LOWER(CONCAT(s.[code], ' ', s.[name])) NOT LIKE '%hockyphu%'
        AND LOWER(CONCAT(s.[code], ' ', s.[name])) NOT LIKE '%hoc ky phu%'
        AND LOWER(CONCAT(s.[code], ' ', s.[name])) NOT LIKE '%summer%'
        AND LOWER(CONCAT(s.[code], ' ', s.[name])) NOT LIKE '%phu%'
)
MERGE [dbo].[CohortSemester] AS target
USING (
    SELECT *
    FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY cohortCode, semesterNumber
                ORDER BY
                    CASE WHEN semesterCode = CONCAT(cohortCode, '_HK', semesterNumber) THEN 0 ELSE 1 END,
                    semesterId
            ) AS rn
        FROM StandardCohortSemester
    ) ranked
    WHERE rn = 1
) AS source
ON target.[cohortCode] = source.[cohortCode]
AND target.[semesterNumber] = source.[semesterNumber]
WHEN MATCHED THEN
    UPDATE SET
        [semesterId] = source.[semesterId],
        [studyYear] = source.[studyYear],
        [academicYear] = source.[academicYear],
        [label] = source.[label],
        [startDate] = source.[startDate],
        [endDate] = source.[endDate],
        [isCurrent] = source.[isCurrent],
        [isRegistering] = source.[isRegistering],
        [registerStartDate] = source.[registerStartDate],
        [registerEndDate] = source.[registerEndDate],
        [updatedAt] = SYSUTCDATETIME()
WHEN NOT MATCHED THEN
    INSERT (
        [id],
        [cohortCode],
        [semesterId],
        [semesterNumber],
        [studyYear],
        [academicYear],
        [label],
        [startDate],
        [endDate],
        [isCurrent],
        [isRegistering],
        [registerStartDate],
        [registerEndDate],
        [status],
        [createdAt],
        [updatedAt]
    )
    VALUES (
        LEFT(CONCAT('CS_', source.[cohortCode], '_HK', source.[semesterNumber]), 50),
        source.[cohortCode],
        source.[semesterId],
        source.[semesterNumber],
        source.[studyYear],
        source.[academicYear],
        source.[label],
        source.[startDate],
        source.[endDate],
        source.[isCurrent],
        source.[isRegistering],
        source.[registerStartDate],
        source.[registerEndDate],
        'ACTIVE',
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
