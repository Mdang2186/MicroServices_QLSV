
-- Ensure columns exist (just in case)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'regularScores')
    ALTER TABLE dbo.Grade ADD regularScores NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'coef1Scores')
    ALTER TABLE dbo.Grade ADD coef1Scores NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'coef2Scores')
    ALTER TABLE dbo.Grade ADD coef2Scores NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'practiceScores')
    ALTER TABLE dbo.Grade ADD practiceScores NVARCHAR(MAX) NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'examScore1')
    ALTER TABLE dbo.Grade ADD examScore1 FLOAT NULL;
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('dbo.Grade') AND name = 'examScore2')
    ALTER TABLE dbo.Grade ADD examScore2 FLOAT NULL;

-- Migrate data
UPDATE dbo.Grade 
SET 
    regularScores = '[]',
    coef1Scores = '[]',
    coef2Scores = '[]',
    practiceScores = '[]'
WHERE regularScores IS NULL;

-- Map midterm to examScore1 if applicable
UPDATE dbo.Grade SET examScore1 = midtermScore WHERE examScore1 IS NULL AND midtermScore IS NOT NULL;
GO
