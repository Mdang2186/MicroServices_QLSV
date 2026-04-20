USE [student_db];
GO

/* 1) Mở rộng TuitionConfig */
IF COL_LENGTH('dbo.TuitionConfig', 'cohort') IS NULL
    ALTER TABLE dbo.TuitionConfig ADD cohort VARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.TuitionConfig', 'educationType') IS NULL
    ALTER TABLE dbo.TuitionConfig ADD educationType NVARCHAR(100) NULL;
GO

IF COL_LENGTH('dbo.TuitionConfig', 'isActive') IS NULL
    ALTER TABLE dbo.TuitionConfig ADD isActive BIT NOT NULL CONSTRAINT DF_TuitionConfig_isActive DEFAULT 1;
GO

IF COL_LENGTH('dbo.TuitionConfig', 'effectiveFrom') IS NULL
    ALTER TABLE dbo.TuitionConfig ADD effectiveFrom DATE NULL;
GO

IF COL_LENGTH('dbo.TuitionConfig', 'effectiveTo') IS NULL
    ALTER TABLE dbo.TuitionConfig ADD effectiveTo DATE NULL;
GO

/* 2) Mở rộng StudentFee */
IF COL_LENGTH('dbo.StudentFee', 'feeCode') IS NULL
    ALTER TABLE dbo.StudentFee ADD feeCode VARCHAR(50) NULL;
GO

IF COL_LENGTH('dbo.StudentFee', 'displayOrder') IS NULL
    ALTER TABLE dbo.StudentFee ADD displayOrder INT NOT NULL CONSTRAINT DF_StudentFee_displayOrder DEFAULT 0;
GO

IF COL_LENGTH('dbo.StudentFee', 'configId') IS NULL
    ALTER TABLE dbo.StudentFee ADD configId VARCHAR(50) NULL;
GO

/* 3) Bảng cấu hình khoản thu cố định */
IF OBJECT_ID('dbo.FixedFeeConfig', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.FixedFeeConfig (
        id VARCHAR(50) NOT NULL PRIMARY KEY,
        academicYear INT NOT NULL,
        semesterId VARCHAR(50) NULL,
        feeCode VARCHAR(50) NOT NULL,
        feeName NVARCHAR(255) NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        isMandatory BIT NOT NULL DEFAULT 1,
        applyForAllStudents BIT NOT NULL DEFAULT 1,
        majorId VARCHAR(50) NULL,
        cohort VARCHAR(50) NULL,
        educationType NVARCHAR(100) NULL,
        dueDate DATE NULL,
        displayOrder INT NOT NULL DEFAULT 0,
        isActive BIT NOT NULL DEFAULT 1
    );
END
GO
