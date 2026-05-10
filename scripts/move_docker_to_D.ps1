# Script chuyen Docker Desktop tu o C sang o D
# Chay voi quyen Administrator

$ErrorActionPreference = "Stop"

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  CHUYEN DOCKER DATA SANG O D:" -ForegroundColor Cyan
Write-Host "================================================================`n" -ForegroundColor Cyan

# --- Kiem tra quyen Admin ---
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[X] Can chay voi quyen Administrator!" -ForegroundColor Red
    Write-Host "    Click phai vao file nay -> Run as administrator" -ForegroundColor Yellow
    Read-Host "Nhan Enter de thoat"
    exit 1
}

$dockerDataOld = "$env:LOCALAPPDATA\Docker\wsl"
$dockerDataNew = "D:\DockerData"
$wslDistroPath = "$dockerDataNew\data"

Write-Host "[1] Dung Docker Desktop..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "[2] Tat WSL distro cua Docker..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3

Write-Host "[3] Kiem tra WSL distro Docker..." -ForegroundColor Yellow
$distros = wsl --list --verbose 2>&1 | Out-String
Write-Host $distros

Write-Host "[4] Tao thu muc dich tren o D..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $wslDistroPath -Force | Out-Null
Write-Host "    Da tao: $wslDistroPath" -ForegroundColor Green

# --- Xuat docker-desktop-data ---
$exportPath = "$dockerDataNew\docker-desktop-data.tar"
Write-Host "[5] Export docker-desktop-data (co the mat vai phut)..." -ForegroundColor Yellow
wsl --export docker-desktop-data $exportPath
if ($LASTEXITCODE -ne 0) {
    Write-Host "[!] docker-desktop-data khong tim thay, bo qua." -ForegroundColor Yellow
} else {
    Write-Host "    Xoa distro cu..." -ForegroundColor Yellow
    wsl --unregister docker-desktop-data
    Write-Host "    Import vao vi tri moi..." -ForegroundColor Yellow
    wsl --import docker-desktop-data $wslDistroPath $exportPath --version 2
    Remove-Item $exportPath -Force
    Write-Host "    [OK] docker-desktop-data da chuyen sang $wslDistroPath" -ForegroundColor Green
}

# --- Cau hinh Docker Desktop dung Data Root moi ---
Write-Host "[6] Cap nhat cau hinh Docker Desktop..." -ForegroundColor Yellow
$dockerConfigDir = "$env:APPDATA\Docker"
$configFile = "$dockerConfigDir\settings-store.json"

if (Test-Path $configFile) {
    $config = Get-Content $configFile -Raw | ConvertFrom-Json
} else {
    New-Item -ItemType Directory -Path $dockerConfigDir -Force | Out-Null
    $config = [PSCustomObject]@{}
}

# Dat duong dan Data Root sang o D
$config | Add-Member -NotePropertyName "dataFolder" -NotePropertyValue "D:\DockerData\desktop-wsl" -Force
$config | ConvertTo-Json -Depth 10 | Set-Content $configFile -Encoding UTF8
Write-Host "    Da cap nhat dataFolder -> D:\DockerData\desktop-wsl" -ForegroundColor Green

# --- Thay doi Docker daemon.json ---
Write-Host "[7] Cau hinh daemon.json (data-root)..." -ForegroundColor Yellow
$daemonDir = "$env:PROGRAMDATA\Docker\config"
$daemonFile = "$daemonDir\daemon.json"
New-Item -ItemType Directory -Path $daemonDir -Force | Out-Null

if (Test-Path $daemonFile) {
    $daemon = Get-Content $daemonFile -Raw | ConvertFrom-Json
} else {
    $daemon = [PSCustomObject]@{}
}
$daemon | Add-Member -NotePropertyName "data-root" -NotePropertyValue "D:\DockerData\daemon" -Force
$daemon | ConvertTo-Json -Depth 10 | Set-Content $daemonFile -Encoding UTF8
Write-Host "    Da cap nhat data-root -> D:\DockerData\daemon" -ForegroundColor Green

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "  HOAN TAT! Lam theo buoc sau:" -ForegroundColor Green
Write-Host "  1. Mo Docker Desktop binh thuong" -ForegroundColor White
Write-Host "  2. Vao Settings -> Resources -> Disk image location" -ForegroundColor White
Write-Host "  3. Doi sang D:\DockerData\desktop-wsl" -ForegroundColor White
Write-Host "  4. Apply & Restart" -ForegroundColor White
Write-Host "================================================================`n" -ForegroundColor Cyan

Read-Host "Nhan Enter de mo Docker Desktop"
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
