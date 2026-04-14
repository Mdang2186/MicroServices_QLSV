param(
    [string]$ServerInstance = "localhost",
    [string]$Database = "student_db",
    [string]$Username = "sa",
    [string]$Password = "Mdang2186"
)

$ErrorActionPreference = "Stop"

function Invoke-DbQuery {
    param([string]$Query)
    Invoke-Sqlcmd `
        -ServerInstance $ServerInstance `
        -Username $Username `
        -Password $Password `
        -Database $Database `
        -Query $Query
}

function New-DbConnection {
    $connectionString = "Server=$ServerInstance;Database=$Database;User ID=$Username;Password=$Password;TrustServerCertificate=True;Encrypt=False;"
    $connection = New-Object System.Data.SqlClient.SqlConnection $connectionString
    $connection.Open()
    return $connection
}

function Add-Occupancy {
    param(
        [System.Collections.Generic.HashSet[string]]$Target,
        [string]$SemesterId,
        [datetime]$Date,
        [int]$StartShift,
        [int]$EndShift,
        [string]$EntityId
    )

    if ([string]::IsNullOrWhiteSpace($EntityId)) {
        return
    }

    $dateKey = $Date.ToString("yyyy-MM-dd")
    foreach ($shift in $StartShift..$EndShift) {
        [void]$Target.Add("$SemesterId|$dateKey|$shift|$EntityId")
    }
}

function Test-Occupancy {
    param(
        [System.Collections.Generic.HashSet[string]]$Target,
        [string]$SemesterId,
        [datetime[]]$Dates,
        [int]$StartShift,
        [int]$EndShift,
        [string]$EntityId
    )

    if ([string]::IsNullOrWhiteSpace($EntityId)) {
        return $false
    }

    foreach ($date in $Dates) {
        $dateKey = $date.ToString("yyyy-MM-dd")
        foreach ($shift in $StartShift..$EndShift) {
            if ($Target.Contains("$SemesterId|$dateKey|$shift|$EntityId")) {
                return $true
            }
        }
    }

    return $false
}

function Get-OccurrenceDates {
    param(
        [datetime]$StartDate,
        [datetime]$EndDate,
        [int]$PortalDayOfWeek
    )

    $dates = New-Object System.Collections.Generic.List[datetime]
    $current = $StartDate.Date
    $target = $PortalDayOfWeek - 1 # 2=Mon -> 1

    while ($current -le $EndDate.Date) {
        if ([int]$current.DayOfWeek -eq $target) {
            [void]$dates.Add($current)
        }
        $current = $current.AddDays(1)
    }

    return $dates.ToArray()
}

function Get-CandidateStartShifts {
    param([int]$PeriodsPerSession)

    $candidateStarts = @(1, 4, 7, 10, 13, 2, 5, 8, 11, 12, 3, 6, 9)
    $valid = New-Object System.Collections.Generic.List[int]

    foreach ($start in $candidateStarts) {
        if (($start + $PeriodsPerSession - 1) -le 15 -and -not $valid.Contains($start)) {
            [void]$valid.Add($start)
        }
    }

    return $valid.ToArray()
}

Write-Host "[backfill] Loading missing course classes..." -ForegroundColor Cyan

$missingClasses = Invoke-DbQuery @"
SET NOCOUNT ON;
SELECT
    cc.id,
    cc.code,
    cc.semesterId,
    sem.startDate,
    sem.endDate,
    sessionsPerWeek = ISNULL(NULLIF(cc.sessionsPerWeek, 0), 1),
    periodsPerSession = ISNULL(NULLIF(cc.periodsPerSession, 0), 3),
    totalPeriods = CASE
        WHEN ISNULL(cc.totalPeriods, 0) > 0 THEN cc.totalPeriods
        WHEN ISNULL(sub.theoryPeriods, 0) + ISNULL(sub.practicePeriods, 0) > 0
            THEN ISNULL(sub.theoryPeriods, 0) + ISNULL(sub.practicePeriods, 0)
        ELSE ISNULL(sub.credits, 3) * 15
    END,
    requiredCapacity = ISNULL(NULLIF(cc.maxSlots, 0), 30),
    cc.lecturerId,
    adminClassId = ac.id,
    adminClassCode = ac.code,
    preferredType = CASE
        WHEN ISNULL(sub.practicePeriods, 0) > 0 AND ISNULL(sub.theoryPeriods, 0) = 0 THEN 'PRACTICE'
        WHEN ISNULL(sub.practicePeriods, 0) > 0 THEN 'PRACTICE'
        ELSE 'THEORY'
    END
FROM dbo.CourseClass cc
JOIN dbo.Semester sem ON sem.id = cc.semesterId
JOIN dbo.Subject sub ON sub.id = cc.subjectId
LEFT JOIN dbo._AdminClassToCourseClass map ON map.B = cc.id
LEFT JOIN dbo.AdminClass ac ON ac.id = map.A
LEFT JOIN dbo.ClassSession cs ON cs.courseClassId = cc.id
WHERE cs.id IS NULL
  AND EXISTS (SELECT 1 FROM dbo.Enrollment e WHERE e.courseClassId = cc.id)
ORDER BY sem.startDate, cc.code;
"@

if (-not $missingClasses -or $missingClasses.Count -eq 0) {
    Write-Host "[backfill] No course classes need session backfill." -ForegroundColor Green
    exit 0
}

Write-Host ("[backfill] Found {0} course classes without sessions." -f $missingClasses.Count) -ForegroundColor Yellow

$rooms = Invoke-DbQuery @"
SET NOCOUNT ON;
SELECT
    id,
    name,
    capacity,
    type
FROM dbo.Room
WHERE type IS NULL OR type <> 'EXAM_HALL'
ORDER BY capacity DESC, name ASC;
"@

if (-not $rooms -or $rooms.Count -eq 0) {
    throw "No rooms available to backfill sessions."
}

$existingSessions = Invoke-DbQuery @"
SET NOCOUNT ON;
SELECT
    cs.semesterId,
    CAST(cs.date AS date) AS studyDate,
    cs.startShift,
    cs.endShift,
    cs.roomId,
    cc.lecturerId,
    ac.id AS adminClassId
FROM dbo.ClassSession cs
JOIN dbo.CourseClass cc ON cc.id = cs.courseClassId
LEFT JOIN dbo._AdminClassToCourseClass map ON map.B = cc.id
LEFT JOIN dbo.AdminClass ac ON ac.id = map.A;
"@

$roomOccupancy = New-Object 'System.Collections.Generic.HashSet[string]'
$lecturerOccupancy = New-Object 'System.Collections.Generic.HashSet[string]'
$adminOccupancy = New-Object 'System.Collections.Generic.HashSet[string]'

foreach ($session in $existingSessions) {
    $studyDate = [datetime]$session.studyDate
    Add-Occupancy -Target $roomOccupancy -SemesterId $session.semesterId -Date $studyDate -StartShift ([int]$session.startShift) -EndShift ([int]$session.endShift) -EntityId $session.roomId
    Add-Occupancy -Target $lecturerOccupancy -SemesterId $session.semesterId -Date $studyDate -StartShift ([int]$session.startShift) -EndShift ([int]$session.endShift) -EntityId $session.lecturerId
    Add-Occupancy -Target $adminOccupancy -SemesterId $session.semesterId -Date $studyDate -StartShift ([int]$session.startShift) -EndShift ([int]$session.endShift) -EntityId $session.adminClassId
}

$connection = New-DbConnection
$insertCommand = $connection.CreateCommand()
$insertCommand.CommandText = @"
INSERT INTO dbo.ClassSession (
    id,
    courseClassId,
    roomId,
    semesterId,
    date,
    startShift,
    endShift,
    type,
    note
)
VALUES (
    @id,
    @courseClassId,
    @roomId,
    @semesterId,
    @date,
    @startShift,
    @endShift,
    @type,
    @note
);
"@
$null = $insertCommand.Parameters.Add("@id", [System.Data.SqlDbType]::VarChar, 50)
$null = $insertCommand.Parameters.Add("@courseClassId", [System.Data.SqlDbType]::VarChar, 50)
$null = $insertCommand.Parameters.Add("@roomId", [System.Data.SqlDbType]::VarChar, 50)
$null = $insertCommand.Parameters.Add("@semesterId", [System.Data.SqlDbType]::VarChar, 50)
$null = $insertCommand.Parameters.Add("@date", [System.Data.SqlDbType]::Date)
$null = $insertCommand.Parameters.Add("@startShift", [System.Data.SqlDbType]::Int)
$null = $insertCommand.Parameters.Add("@endShift", [System.Data.SqlDbType]::Int)
$null = $insertCommand.Parameters.Add("@type", [System.Data.SqlDbType]::VarChar, 30)
$null = $insertCommand.Parameters.Add("@note", [System.Data.SqlDbType]::NVarChar, 255)

$createdSessions = 0
$scheduledClasses = 0
$failedClasses = New-Object System.Collections.Generic.List[string]

$classesBySemester = $missingClasses | Group-Object semesterId

foreach ($semesterGroup in $classesBySemester) {
    $semesterClasses = $semesterGroup.Group | Sort-Object @{ Expression = { -[int]$_.sessionsPerWeek } }, @{ Expression = { -[int]$_.totalPeriods } }, code

    foreach ($class in $semesterClasses) {
        $startDate = ([datetime]$class.startDate).Date
        $endDate = ([datetime]$class.endDate).Date
        $periodsPerSession = [Math]::Max([int]$class.periodsPerSession, 1)
        $sessionsPerWeek = [Math]::Max([int]$class.sessionsPerWeek, 1)
        $requiredSessions = [Math]::Max(1, [int][Math]::Ceiling(([double][int]$class.totalPeriods) / $periodsPerSession))
        $targetOccurrencesPerPattern = [Math]::Max(1, [int][Math]::Ceiling($requiredSessions / $sessionsPerWeek))
        $candidateDays = @(2, 3, 4, 5, 6, 7)
        $candidateStarts = Get-CandidateStartShifts -PeriodsPerSession $periodsPerSession
        $candidateRooms =
            @($rooms | Where-Object { $_.capacity -ge [int]$class.requiredCapacity -and ($_.type -eq $class.preferredType -or [string]::IsNullOrWhiteSpace($_.type)) })

        if (-not $candidateRooms -or $candidateRooms.Count -eq 0) {
            $candidateRooms = @($rooms | Where-Object { $_.capacity -ge [int]$class.requiredCapacity })
        }
        if (-not $candidateRooms -or $candidateRooms.Count -eq 0) {
            $candidateRooms = @($rooms)
        }

        $selectedPatterns = New-Object System.Collections.Generic.List[object]

        for ($patternIndex = 0; $patternIndex -lt $sessionsPerWeek; $patternIndex++) {
            $foundPattern = $null

            foreach ($day in $candidateDays) {
                if ($selectedPatterns | Where-Object { $_.dayOfWeek -eq $day }) {
                    continue
                }

                $occurrenceDates = Get-OccurrenceDates -StartDate $startDate -EndDate $endDate -PortalDayOfWeek $day
                if (-not $occurrenceDates -or $occurrenceDates.Count -eq 0) {
                    continue
                }
                $usableDates = @($occurrenceDates | Select-Object -First $targetOccurrencesPerPattern)
                if (-not $usableDates -or $usableDates.Count -eq 0) {
                    continue
                }

                foreach ($startShift in $candidateStarts) {
                    $endShift = $startShift + $periodsPerSession - 1

                    if (Test-Occupancy -Target $lecturerOccupancy -SemesterId $class.semesterId -Dates $usableDates -StartShift $startShift -EndShift $endShift -EntityId $class.lecturerId) {
                        continue
                    }

                    if (Test-Occupancy -Target $adminOccupancy -SemesterId $class.semesterId -Dates $usableDates -StartShift $startShift -EndShift $endShift -EntityId $class.adminClassId) {
                        continue
                    }

                    foreach ($room in $candidateRooms) {
                        if (Test-Occupancy -Target $roomOccupancy -SemesterId $class.semesterId -Dates $usableDates -StartShift $startShift -EndShift $endShift -EntityId $room.id) {
                            continue
                        }

                        $foundPattern = [pscustomobject]@{
                            dayOfWeek = $day
                            startShift = $startShift
                            endShift = $endShift
                            roomId = $room.id
                            type = $class.preferredType
                            dates = $usableDates
                        }
                        break
                    }

                    if ($foundPattern) { break }
                }

                if ($foundPattern) { break }
            }

            if (-not $foundPattern) {
                break
            }

            [void]$selectedPatterns.Add($foundPattern)

            foreach ($date in $foundPattern.dates) {
                Add-Occupancy -Target $roomOccupancy -SemesterId $class.semesterId -Date $date -StartShift ([int]$foundPattern.startShift) -EndShift ([int]$foundPattern.endShift) -EntityId $foundPattern.roomId
                Add-Occupancy -Target $lecturerOccupancy -SemesterId $class.semesterId -Date $date -StartShift ([int]$foundPattern.startShift) -EndShift ([int]$foundPattern.endShift) -EntityId $class.lecturerId
                Add-Occupancy -Target $adminOccupancy -SemesterId $class.semesterId -Date $date -StartShift ([int]$foundPattern.startShift) -EndShift ([int]$foundPattern.endShift) -EntityId $class.adminClassId
            }
        }

        if ($selectedPatterns.Count -eq 0) {
            [void]$failedClasses.Add($class.code)
            continue
        }

        $occurrences = $selectedPatterns |
            ForEach-Object {
                $pattern = $_
                foreach ($date in $pattern.dates) {
                    [pscustomobject]@{
                        date = $date
                        roomId = $pattern.roomId
                        startShift = [int]$pattern.startShift
                        endShift = [int]$pattern.endShift
                        type = $pattern.type
                    }
                }
            } |
            Sort-Object date, startShift |
            Select-Object -First $requiredSessions

        foreach ($occurrence in $occurrences) {
            $insertCommand.Parameters["@id"].Value = [guid]::NewGuid().ToString()
            $insertCommand.Parameters["@courseClassId"].Value = $class.id
            $insertCommand.Parameters["@roomId"].Value = $occurrence.roomId
            $insertCommand.Parameters["@semesterId"].Value = $class.semesterId
            $insertCommand.Parameters["@date"].Value = $occurrence.date
            $insertCommand.Parameters["@startShift"].Value = $occurrence.startShift
            $insertCommand.Parameters["@endShift"].Value = $occurrence.endShift
            $insertCommand.Parameters["@type"].Value = $occurrence.type
            $insertCommand.Parameters["@note"].Value = "Backfill auto schedule"
            [void]$insertCommand.ExecuteNonQuery()
            $createdSessions += 1
        }

        if ($occurrences.Count -gt 0) {
            $scheduledClasses += 1
        } else {
            [void]$failedClasses.Add($class.code)
        }
    }
}

$connection.Close()

Write-Host ("[backfill] Scheduled classes: {0}" -f $scheduledClasses) -ForegroundColor Green
Write-Host ("[backfill] Created sessions: {0}" -f $createdSessions) -ForegroundColor Green

if ($failedClasses.Count -gt 0) {
    Write-Warning ("[backfill] Could not create sessions for {0} classes." -f $failedClasses.Count)
    $failedClasses | Select-Object -First 20 | ForEach-Object { Write-Warning (" - " + $_) }
}
