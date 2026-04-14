SET NOCOUNT ON;

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
