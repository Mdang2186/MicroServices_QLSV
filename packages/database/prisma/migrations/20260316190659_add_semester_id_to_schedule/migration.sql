BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[User] (
    [id] VARCHAR(50) NOT NULL,
    [username] VARCHAR(100) NOT NULL,
    [email] VARCHAR(100) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] VARCHAR(50) NOT NULL CONSTRAINT [User_role_df] DEFAULT 'STUDENT',
    [avatarUrl] NVARCHAR(1000),
    [isActive] BIT NOT NULL CONSTRAINT [User_isActive_df] DEFAULT 1,
    [lastLogin] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [User_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [User_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [User_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [User_username_key] UNIQUE NONCLUSTERED ([username]),
    CONSTRAINT [User_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[Faculty] (
    [id] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [deanName] NVARCHAR(255),
    CONSTRAINT [Faculty_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Faculty_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Major] (
    [id] VARCHAR(50) NOT NULL,
    [facultyId] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [totalCreditsRequired] INT NOT NULL CONSTRAINT [Major_totalCreditsRequired_df] DEFAULT 120,
    CONSTRAINT [Major_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Major_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Curriculum] (
    [id] VARCHAR(50) NOT NULL,
    [majorId] VARCHAR(50) NOT NULL,
    [cohort] VARCHAR(50) NOT NULL,
    [subjectId] VARCHAR(50) NOT NULL,
    [suggestedSemester] INT NOT NULL,
    [isMandatory] BIT NOT NULL CONSTRAINT [Curriculum_isMandatory_df] DEFAULT 1,
    CONSTRAINT [Curriculum_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Curriculum_majorId_cohort_subjectId_key] UNIQUE NONCLUSTERED ([majorId],[cohort],[subjectId])
);

-- CreateTable
CREATE TABLE [dbo].[Subject] (
    [id] VARCHAR(50) NOT NULL,
    [majorId] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [credits] INT NOT NULL,
    [theoryHours] INT NOT NULL CONSTRAINT [Subject_theoryHours_df] DEFAULT 30,
    [practiceHours] INT NOT NULL CONSTRAINT [Subject_practiceHours_df] DEFAULT 15,
    [selfStudyHours] INT NOT NULL CONSTRAINT [Subject_selfStudyHours_df] DEFAULT 0,
    [department] NVARCHAR(255),
    [description] NVARCHAR(max),
    CONSTRAINT [Subject_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Subject_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Prerequisite] (
    [id] VARCHAR(50) NOT NULL,
    [subjectId] VARCHAR(50) NOT NULL,
    [prerequisiteId] VARCHAR(50) NOT NULL,
    [type] VARCHAR(50) NOT NULL,
    CONSTRAINT [Prerequisite_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Prerequisite_subjectId_prerequisiteId_key] UNIQUE NONCLUSTERED ([subjectId],[prerequisiteId])
);

-- CreateTable
CREATE TABLE [dbo].[Lecturer] (
    [id] VARCHAR(50) NOT NULL,
    [userId] VARCHAR(50) NOT NULL,
    [facultyId] VARCHAR(50),
    [lectureCode] VARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(255) NOT NULL,
    [degree] NVARCHAR(100),
    [phone] VARCHAR(20),
    CONSTRAINT [Lecturer_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Lecturer_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [Lecturer_lectureCode_key] UNIQUE NONCLUSTERED ([lectureCode])
);

-- CreateTable
CREATE TABLE [dbo].[AdminClass] (
    [id] VARCHAR(50) NOT NULL,
    [majorId] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [cohort] VARCHAR(50),
    [advisorId] VARCHAR(50),
    CONSTRAINT [AdminClass_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdminClass_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Student] (
    [id] VARCHAR(50) NOT NULL,
    [userId] VARCHAR(50),
    [adminClassId] VARCHAR(50),
    [majorId] VARCHAR(50) NOT NULL,
    [studentCode] VARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(255) NOT NULL,
    [dob] DATE NOT NULL,
    [gender] NVARCHAR(20),
    [phone] VARCHAR(20),
    [address] NVARCHAR(500),
    [citizenId] VARCHAR(50),
    [emailPersonal] VARCHAR(100),
    [admissionDate] DATE,
    [campus] NVARCHAR(100),
    [educationLevel] NVARCHAR(100),
    [educationType] NVARCHAR(100),
    [intake] VARCHAR(50),
    [ethnicity] NVARCHAR(50),
    [religion] NVARCHAR(50),
    [nationality] NVARCHAR(50),
    [region] NVARCHAR(50),
    [idIssueDate] DATE,
    [idIssuePlace] NVARCHAR(200),
    [policyBeneficiary] NVARCHAR(200),
    [youthUnionDate] DATE,
    [partyDate] DATE,
    [birthPlace] NVARCHAR(200),
    [permanentAddress] NVARCHAR(500),
    [bankName] NVARCHAR(100),
    [bankBranch] NVARCHAR(100),
    [bankAccountName] NVARCHAR(100),
    [bankAccountNumber] VARCHAR(50),
    [gpa] FLOAT(53) NOT NULL CONSTRAINT [Student_gpa_df] DEFAULT 0.0,
    [cpa] FLOAT(53) NOT NULL CONSTRAINT [Student_cpa_df] DEFAULT 0.0,
    [totalEarnedCredits] INT NOT NULL CONSTRAINT [Student_totalEarnedCredits_df] DEFAULT 0,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [Student_status_df] DEFAULT 'STUDYING',
    CONSTRAINT [Student_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Student_userId_key] UNIQUE NONCLUSTERED ([userId]),
    CONSTRAINT [Student_studentCode_key] UNIQUE NONCLUSTERED ([studentCode])
);

-- CreateTable
CREATE TABLE [dbo].[FamilyMember] (
    [id] VARCHAR(50) NOT NULL,
    [studentId] VARCHAR(50) NOT NULL,
    [relationship] NVARCHAR(50) NOT NULL,
    [fullName] NVARCHAR(255) NOT NULL,
    [birthYear] INT,
    [job] NVARCHAR(200),
    [phone] VARCHAR(20),
    [ethnicity] NVARCHAR(50),
    [religion] NVARCHAR(50),
    [nationality] NVARCHAR(50),
    [workplace] NVARCHAR(255),
    [position] NVARCHAR(100),
    [address] NVARCHAR(500),
    CONSTRAINT [FamilyMember_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[TrainingScore] (
    [id] VARCHAR(50) NOT NULL,
    [studentId] VARCHAR(50) NOT NULL,
    [semesterId] VARCHAR(50) NOT NULL,
    [score] INT NOT NULL,
    [classification] NVARCHAR(50) NOT NULL,
    CONSTRAINT [TrainingScore_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [TrainingScore_studentId_semesterId_key] UNIQUE NONCLUSTERED ([studentId],[semesterId])
);

-- CreateTable
CREATE TABLE [dbo].[Semester] (
    [id] VARCHAR(50) NOT NULL,
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [year] INT NOT NULL CONSTRAINT [Semester_year_df] DEFAULT 2024,
    [startDate] DATE NOT NULL,
    [endDate] DATE NOT NULL,
    [isCurrent] BIT NOT NULL CONSTRAINT [Semester_isCurrent_df] DEFAULT 0,
    [isRegistering] BIT NOT NULL CONSTRAINT [Semester_isRegistering_df] DEFAULT 0,
    [registerStartDate] DATETIME2,
    [registerEndDate] DATETIME2,
    CONSTRAINT [Semester_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Semester_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[Room] (
    [id] VARCHAR(50) NOT NULL,
    [name] VARCHAR(100) NOT NULL,
    [building] VARCHAR(100),
    [capacity] INT NOT NULL CONSTRAINT [Room_capacity_df] DEFAULT 50,
    [type] VARCHAR(50) NOT NULL CONSTRAINT [Room_type_df] DEFAULT 'THEORY',
    CONSTRAINT [Room_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Room_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[CourseClass] (
    [id] VARCHAR(50) NOT NULL,
    [subjectId] VARCHAR(50) NOT NULL,
    [semesterId] VARCHAR(50) NOT NULL,
    [lecturerId] VARCHAR(50),
    [code] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [tuitionMultiplier] FLOAT(53) NOT NULL CONSTRAINT [CourseClass_tuitionMultiplier_df] DEFAULT 1.0,
    [maxSlots] INT NOT NULL CONSTRAINT [CourseClass_maxSlots_df] DEFAULT 60,
    [currentSlots] INT NOT NULL CONSTRAINT [CourseClass_currentSlots_df] DEFAULT 0,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [CourseClass_status_df] DEFAULT 'OPEN',
    CONSTRAINT [CourseClass_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [CourseClass_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[ClassSchedule] (
    [id] VARCHAR(50) NOT NULL,
    [courseClassId] VARCHAR(50) NOT NULL,
    [roomId] VARCHAR(50),
    [semesterId] VARCHAR(50) NOT NULL,
    [dayOfWeek] INT NOT NULL,
    [startShift] INT NOT NULL,
    [endShift] INT NOT NULL,
    [type] VARCHAR(50) NOT NULL,
    CONSTRAINT [ClassSchedule_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ClassSchedule_roomId_dayOfWeek_startShift_semesterId_key] UNIQUE NONCLUSTERED ([roomId],[dayOfWeek],[startShift],[semesterId])
);

-- CreateTable
CREATE TABLE [dbo].[Enrollment] (
    [id] VARCHAR(50) NOT NULL,
    [studentId] VARCHAR(50) NOT NULL,
    [courseClassId] VARCHAR(50) NOT NULL,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [Enrollment_status_df] DEFAULT 'REGISTERED',
    [registeredAt] DATETIME2 NOT NULL CONSTRAINT [Enrollment_registeredAt_df] DEFAULT CURRENT_TIMESTAMP,
    [isRetake] BIT NOT NULL CONSTRAINT [Enrollment_isRetake_df] DEFAULT 0,
    [tuitionFee] DECIMAL(10,2) NOT NULL CONSTRAINT [Enrollment_tuitionFee_df] DEFAULT 0,
    CONSTRAINT [Enrollment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Enrollment_studentId_courseClassId_key] UNIQUE NONCLUSTERED ([studentId],[courseClassId])
);

-- CreateTable
CREATE TABLE [dbo].[Attendance] (
    [id] VARCHAR(50) NOT NULL,
    [enrollmentId] VARCHAR(50) NOT NULL,
    [date] DATE NOT NULL,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [Attendance_status_df] DEFAULT 'PRESENT',
    [note] NVARCHAR(255),
    CONSTRAINT [Attendance_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Attendance_enrollmentId_date_key] UNIQUE NONCLUSTERED ([enrollmentId],[date])
);

-- CreateTable
CREATE TABLE [dbo].[Grade] (
    [id] VARCHAR(50) NOT NULL,
    [studentId] VARCHAR(50) NOT NULL,
    [courseClassId] VARCHAR(50) NOT NULL,
    [subjectId] VARCHAR(50) NOT NULL,
    [attendanceScore] FLOAT(53),
    [regularScore1] FLOAT(53),
    [regularScore2] FLOAT(53),
    [practiceScore] FLOAT(53),
    [midtermScore] FLOAT(53),
    [isEligibleForExam] BIT NOT NULL CONSTRAINT [Grade_isEligibleForExam_df] DEFAULT 1,
    [isAbsentFromExam] BIT NOT NULL CONSTRAINT [Grade_isAbsentFromExam_df] DEFAULT 0,
    [finalScore] FLOAT(53),
    [totalScore10] FLOAT(53),
    [totalScore4] FLOAT(53),
    [letterGrade] VARCHAR(10),
    [isPassed] BIT NOT NULL CONSTRAINT [Grade_isPassed_df] DEFAULT 0,
    [isLocked] BIT NOT NULL CONSTRAINT [Grade_isLocked_df] DEFAULT 0,
    CONSTRAINT [Grade_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Grade_studentId_subjectId_courseClassId_key] UNIQUE NONCLUSTERED ([studentId],[subjectId],[courseClassId])
);

-- CreateTable
CREATE TABLE [dbo].[TuitionConfig] (
    [id] VARCHAR(50) NOT NULL,
    [majorId] VARCHAR(50) NOT NULL,
    [academicYear] INT NOT NULL,
    [pricePerCredit] DECIMAL(12,2) NOT NULL,
    CONSTRAINT [TuitionConfig_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[StudentFee] (
    [id] VARCHAR(50) NOT NULL,
    [studentId] VARCHAR(50) NOT NULL,
    [semesterId] VARCHAR(50) NOT NULL,
    [feeType] VARCHAR(50) NOT NULL,
    [name] NVARCHAR(255) NOT NULL,
    [isMandatory] BIT NOT NULL CONSTRAINT [StudentFee_isMandatory_df] DEFAULT 1,
    [totalAmount] DECIMAL(12,2) NOT NULL,
    [discountAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [StudentFee_discountAmount_df] DEFAULT 0,
    [finalAmount] DECIMAL(12,2) NOT NULL,
    [paidAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [StudentFee_paidAmount_df] DEFAULT 0,
    [status] VARCHAR(50) NOT NULL CONSTRAINT [StudentFee_status_df] DEFAULT 'DEBT',
    [dueDate] DATE,
    CONSTRAINT [StudentFee_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[FeeTransaction] (
    [id] VARCHAR(50) NOT NULL,
    [studentFeeId] VARCHAR(50) NOT NULL,
    [amount] DECIMAL(12,2) NOT NULL,
    [transactionType] VARCHAR(50) NOT NULL CONSTRAINT [FeeTransaction_transactionType_df] DEFAULT 'PAYMENT',
    [paymentMethod] VARCHAR(50) NOT NULL,
    [transactionDate] DATETIME2 NOT NULL CONSTRAINT [FeeTransaction_transactionDate_df] DEFAULT CURRENT_TIMESTAMP,
    [transactionCode] VARCHAR(100),
    CONSTRAINT [FeeTransaction_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[_AdminClassToCourseClass] (
    [A] VARCHAR(50) NOT NULL,
    [B] VARCHAR(50) NOT NULL,
    CONSTRAINT [_AdminClassToCourseClass_AB_unique] UNIQUE NONCLUSTERED ([A],[B])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [_AdminClassToCourseClass_B_index] ON [dbo].[_AdminClassToCourseClass]([B]);

-- AddForeignKey
ALTER TABLE [dbo].[Major] ADD CONSTRAINT [Major_facultyId_fkey] FOREIGN KEY ([facultyId]) REFERENCES [dbo].[Faculty]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Curriculum] ADD CONSTRAINT [Curriculum_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Curriculum] ADD CONSTRAINT [Curriculum_subjectId_fkey] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Subject] ADD CONSTRAINT [Subject_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Prerequisite] ADD CONSTRAINT [Prerequisite_prerequisiteId_fkey] FOREIGN KEY ([prerequisiteId]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Prerequisite] ADD CONSTRAINT [Prerequisite_subjectId_fkey] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Lecturer] ADD CONSTRAINT [Lecturer_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Lecturer] ADD CONSTRAINT [Lecturer_facultyId_fkey] FOREIGN KEY ([facultyId]) REFERENCES [dbo].[Faculty]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdminClass] ADD CONSTRAINT [AdminClass_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[AdminClass] ADD CONSTRAINT [AdminClass_advisorId_fkey] FOREIGN KEY ([advisorId]) REFERENCES [dbo].[Lecturer]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Student] ADD CONSTRAINT [Student_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[User]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Student] ADD CONSTRAINT [Student_adminClassId_fkey] FOREIGN KEY ([adminClassId]) REFERENCES [dbo].[AdminClass]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Student] ADD CONSTRAINT [Student_majorId_fkey] FOREIGN KEY ([majorId]) REFERENCES [dbo].[Major]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FamilyMember] ADD CONSTRAINT [FamilyMember_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TrainingScore] ADD CONSTRAINT [TrainingScore_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[TrainingScore] ADD CONSTRAINT [TrainingScore_semesterId_fkey] FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CourseClass] ADD CONSTRAINT [CourseClass_subjectId_fkey] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CourseClass] ADD CONSTRAINT [CourseClass_semesterId_fkey] FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[CourseClass] ADD CONSTRAINT [CourseClass_lecturerId_fkey] FOREIGN KEY ([lecturerId]) REFERENCES [dbo].[Lecturer]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ClassSchedule] ADD CONSTRAINT [ClassSchedule_courseClassId_fkey] FOREIGN KEY ([courseClassId]) REFERENCES [dbo].[CourseClass]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ClassSchedule] ADD CONSTRAINT [ClassSchedule_roomId_fkey] FOREIGN KEY ([roomId]) REFERENCES [dbo].[Room]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Enrollment] ADD CONSTRAINT [Enrollment_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Enrollment] ADD CONSTRAINT [Enrollment_courseClassId_fkey] FOREIGN KEY ([courseClassId]) REFERENCES [dbo].[CourseClass]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Attendance] ADD CONSTRAINT [Attendance_enrollmentId_fkey] FOREIGN KEY ([enrollmentId]) REFERENCES [dbo].[Enrollment]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Grade] ADD CONSTRAINT [Grade_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Grade] ADD CONSTRAINT [Grade_courseClassId_fkey] FOREIGN KEY ([courseClassId]) REFERENCES [dbo].[CourseClass]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[Grade] ADD CONSTRAINT [Grade_subjectId_fkey] FOREIGN KEY ([subjectId]) REFERENCES [dbo].[Subject]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentFee] ADD CONSTRAINT [StudentFee_studentId_fkey] FOREIGN KEY ([studentId]) REFERENCES [dbo].[Student]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[StudentFee] ADD CONSTRAINT [StudentFee_semesterId_fkey] FOREIGN KEY ([semesterId]) REFERENCES [dbo].[Semester]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[FeeTransaction] ADD CONSTRAINT [FeeTransaction_studentFeeId_fkey] FOREIGN KEY ([studentFeeId]) REFERENCES [dbo].[StudentFee]([id]) ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[_AdminClassToCourseClass] ADD CONSTRAINT [_AdminClassToCourseClass_A_fkey] FOREIGN KEY ([A]) REFERENCES [dbo].[AdminClass]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[_AdminClassToCourseClass] ADD CONSTRAINT [_AdminClassToCourseClass_B_fkey] FOREIGN KEY ([B]) REFERENCES [dbo].[CourseClass]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
