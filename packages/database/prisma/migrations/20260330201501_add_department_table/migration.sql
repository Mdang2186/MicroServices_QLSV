/*
  Warnings:

  - You are about to drop the column `department` on the `Subject` table. All the data in the column will be lost.

*/
BEGIN TRY

BEGIN TRAN;

-- AlterTable
ALTER TABLE [dbo].[Grade] ADD [status] VARCHAR(50) NOT NULL CONSTRAINT [Grade_status_df] DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE [dbo].[Lecturer] ALTER COLUMN [userId] VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE [dbo].[Room] ADD [campus] NVARCHAR(100);

-- AlterTable
ALTER TABLE [dbo].[Student] ADD [academicStatus] VARCHAR(50) NOT NULL CONSTRAINT [Student_academicStatus_df] DEFAULT 'NORMAL',
[specializationId] VARCHAR(50),
[warningLevel] INT NOT NULL CONSTRAINT [Student_warningLevel_df] DEFAULT 0;

-- AlterTable
ALTER TABLE [dbo].[Subject] DROP COLUMN [department];
ALTER TABLE [dbo].[Subject] ADD [departmentId] VARCHAR(50);

-- CreateTable
CREATE TABLE [dbo].[Notification] (
    [id] VARCHAR(50) NOT NULL,
    [userId] VARCHAR(50) NOT NULL,
    [title] NVARCHAR(255) NOT NULL,
    [content] NVARCHAR(max) NOT NULL,
    [type] VARCHAR(50) NOT NULL CONSTRAINT [Notification_type_df] DEFAULT 'INFO',
    [isRead] BIT NOT NULL CONSTRAINT [Notification_isRead_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Notification_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Notification_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Department] (
    [id] VARCHAR(50) NOT NULL,
    [facultyId] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [headName] NVARCHAR(255),
    CONSTRAINT [Department_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Department_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Specialization] (
    [id] VARCHAR(50) NOT NULL,
    [majorId] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    CONSTRAINT [Specialization_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Specialization_code_key] UNIQUE NONCLUSTERED ([code])
);

-- AddForeignKey
ALTER TABLE [dbo].[Notification] ADD CONSTRAINT [Notification_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Department] ADD CONSTRAINT [Department_facultyId_fkey] FOREIGN KEY ([facultyId]) REFERENCES [dbo].[Faculty]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Specialization] ADD CONSTRAINT [Specialization_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Subject] ADD CONSTRAINT [Subject_departmentId_fkey] FOREIGN KEY ([departmentId]) REFERENCES [dbo].[Department]([id]) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Student] ADD CONSTRAINT [Student_specializationId_fkey] FOREIGN KEY ([specializationId]) REFERENCES [dbo].[Specialization]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
