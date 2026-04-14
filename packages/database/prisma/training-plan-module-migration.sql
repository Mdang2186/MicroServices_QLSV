SET NOCOUNT ON;

IF COL_LENGTH(N'dbo.Subject', N'practiceSessionsPerWeek') IS NULL
BEGIN
    ALTER TABLE [dbo].[Subject]
    ADD [practiceSessionsPerWeek] INT NOT NULL
        CONSTRAINT [DF_Subject_practiceSessionsPerWeek] DEFAULT (1) WITH VALUES;
END;

IF COL_LENGTH(N'dbo.Subject', N'theorySessionsPerWeek') IS NULL
BEGIN
    ALTER TABLE [dbo].[Subject]
    ADD [theorySessionsPerWeek] INT NOT NULL
        CONSTRAINT [DF_Subject_theorySessionsPerWeek] DEFAULT (1) WITH VALUES;
END;

IF OBJECT_ID(N'[dbo].[AcademicCohort]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[AcademicCohort] (
        [code] VARCHAR(50) NOT NULL,
        [startYear] INT NOT NULL,
        [endYear] INT NOT NULL,
        [isActive] BIT NOT NULL CONSTRAINT [DF_AcademicCohort_isActive] DEFAULT (1),
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_AcademicCohort_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_AcademicCohort_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_AcademicCohort] PRIMARY KEY ([code])
    );
END;

IF OBJECT_ID(N'[dbo].[TrainingPlanTemplate]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TrainingPlanTemplate] (
        [id] VARCHAR(50) NOT NULL CONSTRAINT [DF_TrainingPlanTemplate_id] DEFAULT (CONVERT(VARCHAR(50), NEWID())),
        [majorId] VARCHAR(50) NOT NULL,
        [cohort] VARCHAR(50) NOT NULL,
        [version] INT NOT NULL,
        [status] VARCHAR(50) NOT NULL CONSTRAINT [DF_TrainingPlanTemplate_status] DEFAULT ('DRAFT'),
        [publishedAt] DATETIME2 NULL,
        [copiedFromTemplateId] VARCHAR(50) NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TrainingPlanTemplate_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_TrainingPlanTemplate_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_TrainingPlanTemplate] PRIMARY KEY ([id]),
        CONSTRAINT [FK_TrainingPlanTemplate_Major] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]),
        CONSTRAINT [FK_TrainingPlanTemplate_AcademicCohort] FOREIGN KEY ([cohort]) REFERENCES [dbo].[AcademicCohort]([code]),
        CONSTRAINT [FK_TrainingPlanTemplate_Copy] FOREIGN KEY ([copiedFromTemplateId]) REFERENCES [dbo].[TrainingPlanTemplate]([id])
    );
END;

IF OBJECT_ID(N'[dbo].[TrainingPlanTemplateItem]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[TrainingPlanTemplateItem] (
        [id] VARCHAR(50) NOT NULL CONSTRAINT [DF_TrainingPlanTemplateItem_id] DEFAULT (CONVERT(VARCHAR(50), NEWID())),
        [templateId] VARCHAR(50) NOT NULL,
        [subjectId] VARCHAR(50) NOT NULL,
        [conceptualSemester] INT NOT NULL,
        [isRequired] BIT NOT NULL CONSTRAINT [DF_TrainingPlanTemplateItem_isRequired] DEFAULT (1),
        [theoryPeriods] INT NULL,
        [practicePeriods] INT NULL,
        [theorySessionsPerWeek] INT NULL,
        [practiceSessionsPerWeek] INT NULL,
        [periodsPerSession] INT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_TrainingPlanTemplateItem_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_TrainingPlanTemplateItem_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_TrainingPlanTemplateItem] PRIMARY KEY ([id]),
        CONSTRAINT [FK_TrainingPlanTemplateItem_Template] FOREIGN KEY ([templateId]) REFERENCES [dbo].[TrainingPlanTemplate]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_TrainingPlanTemplateItem_Subject] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]) ON DELETE CASCADE
    );
END;

IF OBJECT_ID(N'[dbo].[SemesterPlan]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SemesterPlan] (
        [id] VARCHAR(50) NOT NULL CONSTRAINT [DF_SemesterPlan_id] DEFAULT (CONVERT(VARCHAR(50), NEWID())),
        [semesterId] VARCHAR(50) NOT NULL,
        [majorId] VARCHAR(50) NOT NULL,
        [cohort] VARCHAR(50) NOT NULL,
        [templateId] VARCHAR(50) NOT NULL,
        [templateVersion] INT NOT NULL,
        [conceptualSemester] INT NOT NULL,
        [status] VARCHAR(50) NOT NULL CONSTRAINT [DF_SemesterPlan_status] DEFAULT ('DRAFT'),
        [executedAt] DATETIME2 NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_SemesterPlan_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_SemesterPlan_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_SemesterPlan] PRIMARY KEY ([id]),
        CONSTRAINT [FK_SemesterPlan_Semester] FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id]),
        CONSTRAINT [FK_SemesterPlan_Major] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]),
        CONSTRAINT [FK_SemesterPlan_AcademicCohort] FOREIGN KEY ([cohort]) REFERENCES [dbo].[AcademicCohort]([code]),
        CONSTRAINT [FK_SemesterPlan_Template] FOREIGN KEY ([templateId]) REFERENCES [dbo].[TrainingPlanTemplate]([id])
    );
END;

IF OBJECT_ID(N'[dbo].[SemesterPlanItem]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[SemesterPlanItem] (
        [id] VARCHAR(50) NOT NULL CONSTRAINT [DF_SemesterPlanItem_id] DEFAULT (CONVERT(VARCHAR(50), NEWID())),
        [semesterPlanId] VARCHAR(50) NOT NULL,
        [subjectId] VARCHAR(50) NOT NULL,
        [adminClassId] VARCHAR(50) NOT NULL,
        [lecturerId] VARCHAR(50) NULL,
        [status] VARCHAR(50) NOT NULL CONSTRAINT [DF_SemesterPlanItem_status] DEFAULT ('DRAFT'),
        [expectedStudentCount] INT NOT NULL CONSTRAINT [DF_SemesterPlanItem_expectedStudentCount] DEFAULT (0),
        [generatedCourseClassId] VARCHAR(50) NULL,
        [theoryPeriods] INT NULL,
        [practicePeriods] INT NULL,
        [theorySessionsPerWeek] INT NULL,
        [practiceSessionsPerWeek] INT NULL,
        [periodsPerSession] INT NULL,
        [createdAt] DATETIME2 NOT NULL CONSTRAINT [DF_SemesterPlanItem_createdAt] DEFAULT (SYSUTCDATETIME()),
        [updatedAt] DATETIME2 NOT NULL CONSTRAINT [DF_SemesterPlanItem_updatedAt] DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT [PK_SemesterPlanItem] PRIMARY KEY ([id]),
        CONSTRAINT [FK_SemesterPlanItem_SemesterPlan] FOREIGN KEY ([semesterPlanId]) REFERENCES [dbo].[SemesterPlan]([id]) ON DELETE CASCADE,
        CONSTRAINT [FK_SemesterPlanItem_Subject] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]),
        CONSTRAINT [FK_SemesterPlanItem_AdminClass] FOREIGN KEY ([adminClassId]) REFERENCES [dbo].[AdminClass]([id]),
        CONSTRAINT [FK_SemesterPlanItem_Lecturer] FOREIGN KEY ([lecturerId]) REFERENCES [dbo].[Lecturer]([id]),
        CONSTRAINT [FK_SemesterPlanItem_CourseClass] FOREIGN KEY ([generatedCourseClassId]) REFERENCES [dbo].[CourseClass]([id])
    );
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_TrainingPlanTemplate_major_cohort_version'
      AND object_id = OBJECT_ID(N'[dbo].[TrainingPlanTemplate]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_TrainingPlanTemplate_major_cohort_version]
        ON [dbo].[TrainingPlanTemplate] ([majorId], [cohort], [version]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_TrainingPlanTemplate_major_cohort_published'
      AND object_id = OBJECT_ID(N'[dbo].[TrainingPlanTemplate]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_TrainingPlanTemplate_major_cohort_published]
        ON [dbo].[TrainingPlanTemplate] ([majorId], [cohort])
        WHERE [status] = 'PUBLISHED';
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_TrainingPlanTemplate_major_cohort_status'
      AND object_id = OBJECT_ID(N'[dbo].[TrainingPlanTemplate]')
)
BEGIN
    CREATE INDEX [IX_TrainingPlanTemplate_major_cohort_status]
        ON [dbo].[TrainingPlanTemplate] ([majorId], [cohort], [status]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_TrainingPlanTemplateItem_template_subject'
      AND object_id = OBJECT_ID(N'[dbo].[TrainingPlanTemplateItem]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_TrainingPlanTemplateItem_template_subject]
        ON [dbo].[TrainingPlanTemplateItem] ([templateId], [subjectId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_TrainingPlanTemplateItem_template_semester'
      AND object_id = OBJECT_ID(N'[dbo].[TrainingPlanTemplateItem]')
)
BEGIN
    CREATE INDEX [IX_TrainingPlanTemplateItem_template_semester]
        ON [dbo].[TrainingPlanTemplateItem] ([templateId], [conceptualSemester]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_SemesterPlan_semester_major_cohort'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlan]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_SemesterPlan_semester_major_cohort]
        ON [dbo].[SemesterPlan] ([semesterId], [majorId], [cohort]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_SemesterPlan_major_cohort_status'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlan]')
)
BEGIN
    CREATE INDEX [IX_SemesterPlan_major_cohort_status]
        ON [dbo].[SemesterPlan] ([majorId], [cohort], [status]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'UX_SemesterPlanItem_plan_subject_adminClass'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlanItem]')
)
BEGIN
    CREATE UNIQUE INDEX [UX_SemesterPlanItem_plan_subject_adminClass]
        ON [dbo].[SemesterPlanItem] ([semesterPlanId], [subjectId], [adminClassId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_SemesterPlanItem_generatedCourseClass'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlanItem]')
)
BEGIN
    CREATE INDEX [IX_SemesterPlanItem_generatedCourseClass]
        ON [dbo].[SemesterPlanItem] ([generatedCourseClassId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_SemesterPlanItem_lecturer'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlanItem]')
)
BEGIN
    CREATE INDEX [IX_SemesterPlanItem_lecturer]
        ON [dbo].[SemesterPlanItem] ([lecturerId]);
END;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_SemesterPlanItem_status'
      AND object_id = OBJECT_ID(N'[dbo].[SemesterPlanItem]')
)
BEGIN
    CREATE INDEX [IX_SemesterPlanItem_status]
        ON [dbo].[SemesterPlanItem] ([status]);
END;

;WITH [source_data] AS (
    SELECT DISTINCT
        LTRIM(RTRIM([cohort])) AS [code],
        2006 + TRY_CAST(SUBSTRING(LTRIM(RTRIM([cohort])), 2, 10) AS INT) AS [startYear],
        2010 + TRY_CAST(SUBSTRING(LTRIM(RTRIM([cohort])), 2, 10) AS INT) AS [endYear]
    FROM [dbo].[AdminClass]
    WHERE [cohort] IS NOT NULL
      AND LTRIM(RTRIM([cohort])) <> ''
)
MERGE [dbo].[AcademicCohort] AS [target]
USING [source_data] AS [source]
    ON [target].[code] = [source].[code]
WHEN NOT MATCHED BY TARGET THEN
    INSERT ([code], [startYear], [endYear], [isActive], [createdAt], [updatedAt])
    VALUES (
        [source].[code],
        COALESCE([source].[startYear], YEAR(GETDATE())),
        COALESCE([source].[endYear], YEAR(GETDATE()) + 4),
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
