$drive = Get-PSDrive C
$used = [math]::Round($drive.Used / 1GB, 2)
$free = [math]::Round($drive.Free / 1GB, 2)
$total = [math]::Round(($drive.Used + $drive.Free) / 1GB, 2)
Write-Host "=== O C TONG QUAN ===" -ForegroundColor Cyan
Write-Host "Tong: $total GB | Dung: $used GB | Con lai: $free GB" -ForegroundColor Yellow

Write-Host "`n=== CAC THU MUC LON NHAT TREN O C ===" -ForegroundColor Cyan

$folders = @(
    "$env:LOCALAPPDATA\Docker",
    "$env:LOCALAPPDATA\Temp",
    "C:\Windows\Temp",
    "C:\Windows\SoftwareDistribution\Download",
    "$env:LOCALAPPDATA\npm-cache",
    "$env:APPDATA\npm-cache",
    "$env:LOCALAPPDATA\Programs",
    "C:\ProgramData\Docker",
    "$env:USERPROFILE\.docker",
    "$env:LOCALAPPDATA\Microsoft\Windows\INetCache",
    "C:\Users\Admin\Downloads",
    "C:\ProgramData\Microsoft\Windows\WER",
    "$env:LOCALAPPDATA\CrashDumps",
    "C:\Windows\Logs"
)

$results = @()
foreach ($folder in $folders) {
    if (Test-Path $folder) {
        try {
            $size = (Get-ChildItem $folder -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
            $sizeGB = [math]::Round($size / 1GB, 2)
            if ($sizeGB -gt 0.1) {
                $results += [PSCustomObject]@{ Folder = $folder; Size_GB = $sizeGB }
            }
        } catch {}
    }
}

$results | Sort-Object Size_GB -Descending | Format-Table -AutoSize

Write-Host "`n=== DOCKER DISK USAGE ===" -ForegroundColor Cyan
docker system df 2>&1
