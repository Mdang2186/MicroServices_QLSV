const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sqlDrop = `DROP PROCEDURE IF EXISTS sp_FinalizeTrainingPlan;`;

const sqlCreate = `
CREATE PROCEDURE sp_FinalizeTrainingPlan
    @SemesterId VARCHAR(50),
    @MajorId VARCHAR(50),
    @Cohort VARCHAR(50),
    @SubjectIds NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @SemesterCode VARCHAR(50);
        DECLARE @SemesterYear INT;
        SELECT @SemesterCode = code, @SemesterYear = year FROM Semester WHERE id = @SemesterId;

        DECLARE @Term VARCHAR(10) = CASE 
            WHEN @SemesterCode LIKE '%1%' THEN 'HK1' 
            WHEN @SemesterCode LIKE '%2%' THEN 'HK2' 
            ELSE 'HKH' 
        END;
        DECLARE @YearSuffix VARCHAR(10) = RIGHT(CAST(@SemesterYear AS VARCHAR), 2) + RIGHT(CAST(@SemesterYear + 1 AS VARCHAR), 2);

        -- Count expected students from AdminClass
        DECLARE @StudentCount INT;
        SELECT @StudentCount = COUNT(s.id) 
        FROM Student s
        INNER JOIN AdminClass ac ON s.adminClassId = ac.id
        WHERE ac.majorId = @MajorId AND ac.cohort = @Cohort;

        -- Split SubjectIds into temporary table (assuming STRING_SPLIT handles comma)
        CREATE TABLE #Subjects (id VARCHAR(50));
        INSERT INTO #Subjects (id) SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@SubjectIds, ',');

        DECLARE @CurrentSubjectId VARCHAR(50);
        
        DECLARE subject_cursor CURSOR FOR SELECT id FROM #Subjects;
        OPEN subject_cursor;
        FETCH NEXT FROM subject_cursor INTO @CurrentSubjectId;

        WHILE @@FETCH_STATUS = 0
        BEGIN
            IF ISNULL(@CurrentSubjectId, '') = '' 
            BEGIN
                FETCH NEXT FROM subject_cursor INTO @CurrentSubjectId;
                CONTINUE;
            END

            DECLARE @SubjectCode VARCHAR(50);
            DECLARE @SubjectName NVARCHAR(255);
            DECLARE @Credits INT;
            SELECT @SubjectCode = code, @SubjectName = name, @Credits = credits FROM Subject WHERE id = @CurrentSubjectId;

            -- Find Lecturer based on Subject -> Department -> Faculty -> Lecturer
            -- Uses NEWID() for random selection
            DECLARE @SelectedLecturerId VARCHAR(50);
            SELECT TOP 1 @SelectedLecturerId = l.id
            FROM Lecturer l
            INNER JOIN Subject s ON s.id = @CurrentSubjectId
            INNER JOIN Department d ON s.departmentId = d.id
            WHERE l.facultyId = d.facultyId
            ORDER BY NEWID();

            -- Generate CourseClass Code
            DECLARE @ClassCount INT;
            SELECT @ClassCount = COUNT(*) FROM CourseClass WHERE subjectId = @CurrentSubjectId AND semesterId = @SemesterId;
            DECLARE @Sequence VARCHAR(2) = RIGHT('00' + CAST(@ClassCount + 1 AS VARCHAR), 2);
            DECLARE @GeneratedCode VARCHAR(50) = 'CCLASS_' + ISNULL(@SubjectCode,'') + '_' + @Term + '_' + @Sequence + '_' + @YearSuffix;

            DECLARE @CourseClassId VARCHAR(50) = CAST(NEWID() AS VARCHAR(50));

            -- Calculate TuitionFee. E.g. Credits * 500k. 
            DECLARE @TuitionFee DECIMAL(10,2) = ISNULL(@Credits,0) * 500000;

            -- Insert CourseClass
            INSERT INTO CourseClass (id, subjectId, semesterId, lecturerId, code, name, maxSlots, currentSlots, status, totalPeriods)
            VALUES (@CourseClassId, @CurrentSubjectId, @SemesterId, @SelectedLecturerId, @GeneratedCode, ISNULL(@SubjectName,'') + ' (' + @Cohort + ')', 80, @StudentCount, 'OPEN', ISNULL(@Credits,0) * 15);

            -- Connect AdminClasses (Populate relation table _AdminClassToCourseClass)
            INSERT INTO _AdminClassToCourseClass (A, B)
            SELECT id, @CourseClassId
            FROM AdminClass
            WHERE majorId = @MajorId AND cohort = @Cohort;

            -- Bulk Insert Enrollments (Set-based)
            INSERT INTO Enrollment (id, studentId, courseClassId, status, registeredAt, isRetake, tuitionFee)
            SELECT CAST(NEWID() AS VARCHAR(50)), s.id, @CourseClassId, 'REGISTERED', GETDATE(), 0, @TuitionFee
            FROM Student s
            INNER JOIN AdminClass ac ON s.adminClassId = ac.id
            WHERE ac.majorId = @MajorId AND ac.cohort = @Cohort;

            -- Insert TeachingPlan
            DECLARE @TeachingPlanId VARCHAR(50) = CAST(NEWID() AS VARCHAR(50));
            INSERT INTO TeachingPlan (id, courseClassId, semesterId, lecturerId, status, totalPeriods)
            VALUES (@TeachingPlanId, @CourseClassId, @SemesterId, @SelectedLecturerId, N'DRAFT', ISNULL(@Credits,0) * 15);

            FETCH NEXT FROM subject_cursor INTO @CurrentSubjectId;
        END

        CLOSE subject_cursor;
        DEALLOCATE subject_cursor;
        DROP TABLE #Subjects;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF CURSOR_STATUS('global', 'subject_cursor') >= -1
        BEGIN
            CLOSE subject_cursor;
            DEALLOCATE subject_cursor;
        END
        IF OBJECT_ID('tempdb..#Subjects') IS NOT NULL DROP TABLE #Subjects;

        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
`;

async function main() {
    try {
        await prisma.$executeRawUnsafe(sqlDrop);
        console.log("Dropped existing SP if any.");
        await prisma.$executeRawUnsafe(sqlCreate);
        console.log("Successfully created stored procedure sp_FinalizeTrainingPlan!");
    } catch (e) {
        console.error("Failed to execute SQL:");
        console.error(e.message || e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
