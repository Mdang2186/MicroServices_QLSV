IF OBJECT_ID(N'[dbo].[SubjectPrerequisite]', N'U') IS NOT NULL
BEGIN
  INSERT INTO [dbo].[Prerequisite] ([id], [subjectId], [prerequisiteId], [type])
  SELECT CONVERT(VARCHAR(50), NEWID()), legacy.[subjectId], legacy.[prerequisiteSubjectId], 'TIEN_QUYET'
  FROM [dbo].[SubjectPrerequisite] legacy
  LEFT JOIN [dbo].[Prerequisite] current_map
    ON current_map.[subjectId] = legacy.[subjectId]
   AND current_map.[prerequisiteId] = legacy.[prerequisiteSubjectId]
  WHERE current_map.[id] IS NULL;
END

IF OBJECT_ID(N'[dbo].[ClassSchedule]', N'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[ClassSchedule];
END

IF OBJECT_ID(N'[dbo].[TeachingPlan]', N'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[TeachingPlan];
END

IF OBJECT_ID(N'[dbo].[SubjectPrerequisite]', N'U') IS NOT NULL
BEGIN
  DROP TABLE [dbo].[SubjectPrerequisite];
END
