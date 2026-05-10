Write-Host "=== Don dep Docker ===" -ForegroundColor Cyan

Write-Host "[1] Xoa container da dung..." -ForegroundColor Yellow
docker container prune -f

Write-Host "[2] Xoa image khong can..." -ForegroundColor Yellow
docker image prune -f

Write-Host "[3] Xoa volume khong dung..." -ForegroundColor Yellow
docker volume prune -f

Write-Host "[4] Xoa network khong dung..." -ForegroundColor Yellow
docker network prune -f

Write-Host ""
Write-Host "=== Ket qua sau khi don ===" -ForegroundColor Cyan
docker system df

Write-Host ""
Write-Host "=== Dung luong o C hien tai ===" -ForegroundColor Cyan
$drive = Get-PSDrive C
$free = [math]::Round($drive.Free / 1GB, 2)
$used = [math]::Round($drive.Used / 1GB, 2)
Write-Host "Con lai: $free GB | Dang dung: $used GB" -ForegroundColor Yellow

Write-Host ""
Write-Host "=== Cac thu muc lon tren o C ===" -ForegroundColor Cyan
$paths = @(
    @{P="$env:LOCALAPPDATA\Docker"; N="Docker (AppData)"},
    @{P="C:\ProgramData\Docker"; N="Docker (ProgramData)"},
    @{P="$env:LOCALAPPDATA\Temp"; N="Temp (User)"},
    @{P="C:\Windows\Temp"; N="Temp (Windows)"},
    @{P="C:\Windows\SoftwareDistribution\Download"; N="Windows Update Cache"},
    @{P="$env:LOCALAPPDATA\npm-cache"; N="npm cache"},
    @{P="$env:USERPROFILE\.docker"; N=".docker config"},
    @{P="C:\Users\Admin\Downloads"; N="Downloads"}
)
foreach ($item in $paths) {
    if (Test-Path $item.P) {
        $bytes = (Get-ChildItem $item.P -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $gb = [math]::Round($bytes / 1GB, 2)
        if ($gb -ge 0.1) {
            Write-Host ("  {0,-30} {1,8} GB" -f $item.N, $gb)
        }
    }
}
