# Chuyen Docker WSL distro tu o C sang o D
# YEU CAU: Chay voi quyen Administrator

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  CHUYEN DOCKER WSL DATA SANG O D:" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Kiem tra quyen Admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[X] Script nay can chay voi quyen Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Cach chay dung:" -ForegroundColor Yellow
    Write-Host "  1. Mo PowerShell voi 'Run as Administrator'" -ForegroundColor White
    Write-Host "  2. Chay lenh:" -ForegroundColor White
    Write-Host "     powershell -ExecutionPolicy Bypass -File `"d:\MyPepositoryGITHUB\MicroServices_QLSV\scripts\move_docker_wsl_to_D.ps1`"" -ForegroundColor Cyan
    Read-Host "Nhan Enter de thoat"
    exit 1
}

Write-Host "[INFO] Dung luong o C hien tai:" -ForegroundColor Gray
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
Write-Host "  Con lai: $freeGB GB" -ForegroundColor Yellow
Write-Host ""

# Dung Docker Desktop
Write-Host "[1] Dung Docker Desktop..." -ForegroundColor Yellow
Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 5

# Tat WSL
Write-Host "[2] Tat tat ca WSL distro..." -ForegroundColor Yellow
wsl --shutdown
Start-Sleep -Seconds 3

# Kiem tra distro hien co
Write-Host "[3] Danh sach WSL distro:" -ForegroundColor Yellow
$wslList = wsl --list --verbose 2>&1
Write-Host ($wslList | Out-String) -ForegroundColor Gray

# Tao thu muc dich
$destBase = "D:\DockerData"
$destData = "$destBase\wsl-data"
$destDesktop = "$destBase\wsl-desktop"
New-Item -ItemType Directory -Path $destData -Force | Out-Null
New-Item -ItemType Directory -Path $destDesktop -Force | Out-Null
Write-Host "[4] Da tao thu muc dich: $destBase" -ForegroundColor Green

# Export va import docker-desktop-data
Write-Host ""
Write-Host "[5] Chuyen docker-desktop-data (luu tru image + volume)..." -ForegroundColor Yellow
$hasData = wsl --list 2>&1 | Select-String "docker-desktop-data"
if ($hasData) {
    $exportFile = "$destBase\docker-desktop-data.tar"
    Write-Host "    Dang export... (co the mat 5-15 phut tuy kich thuoc)" -ForegroundColor Gray
    wsl --export docker-desktop-data $exportFile
    if ($LASTEXITCODE -eq 0) {
        Write-Host "    Xoa distro cu..." -ForegroundColor Gray
        wsl --unregister docker-desktop-data
        Write-Host "    Import vao o D..." -ForegroundColor Gray
        wsl --import docker-desktop-data $destData $exportFile --version 2
        Remove-Item $exportFile -Force -ErrorAction SilentlyContinue
        Write-Host "    [OK] docker-desktop-data -> $destData" -ForegroundColor Green
    } else {
        Write-Host "    [!] Export that bai, bo qua buoc nay." -ForegroundColor Red
    }
} else {
    Write-Host "    Khong tim thay docker-desktop-data, bo qua." -ForegroundColor Gray
}

# Export va import docker-desktop
Write-Host ""
Write-Host "[6] Chuyen docker-desktop (he dieu hanh container)..." -ForegroundColor Yellow
$hasDesktop = wsl --list 2>&1 | Select-String "docker-desktop$"
if ($hasDesktop) {
    $exportFile2 = "$destBase\docker-desktop.tar"
    Write-Host "    Dang export..." -ForegroundColor Gray
    wsl --export docker-desktop $exportFile2
    if ($LASTEXITCODE -eq 0) {
        wsl --unregister docker-desktop
        wsl --import docker-desktop $destDesktop $exportFile2 --version 2
        Remove-Item $exportFile2 -Force -ErrorAction SilentlyContinue
        Write-Host "    [OK] docker-desktop -> $destDesktop" -ForegroundColor Green
    } else {
        Write-Host "    [!] Export that bai, bo qua." -ForegroundColor Red
    }
} else {
    Write-Host "    Khong tim thay docker-desktop, bo qua." -ForegroundColor Gray
}

# Sua Docker Desktop settings
Write-Host ""
Write-Host "[7] Cap nhat cau hinh Docker Desktop..." -ForegroundColor Yellow
$settingsPath = "$env:APPDATA\Docker\settings-store.json"
if (-not (Test-Path $settingsPath)) {
    $settingsPath = "$env:APPDATA\Docker\settings.json"
}
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json
    if ($settings.PSObject.Properties.Name -contains "dataFolder") {
        $settings.dataFolder = "D:\DockerData\wsl-data"
    } else {
        $settings | Add-Member -NotePropertyName "dataFolder" -NotePropertyValue "D:\DockerData\wsl-data" -Force
    }
    $settings | ConvertTo-Json -Depth 20 | Set-Content $settingsPath -Encoding UTF8
    Write-Host "    [OK] Da cap nhat dataFolder -> D:\DockerData\wsl-data" -ForegroundColor Green
} else {
    Write-Host "    [!] Khong tim thay file settings Docker Desktop." -ForegroundColor Yellow
    Write-Host "    => Vao Docker Desktop -> Settings -> Resources -> doi Disk image location thu cong" -ForegroundColor Yellow
}

# Ket qua
Write-Host ""
$drive2 = Get-PSDrive C
$freeAfter = [math]::Round($drive2.Free / 1GB, 2)
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  HOAN TAT!" -ForegroundColor Green
Write-Host "  O C truoc: $freeGB GB  |  O C sau: $freeAfter GB" -ForegroundColor Yellow
Write-Host ""
Write-Host "  BUOC TIEP THEO:" -ForegroundColor Cyan
Write-Host "  1. Mo Docker Desktop binh thuong" -ForegroundColor White
Write-Host "  2. Vao Settings -> Resources -> Advanced" -ForegroundColor White
Write-Host "  3. Xac nhan Disk image location la D:\DockerData" -ForegroundColor White
Write-Host "  4. Nhan Apply & Restart" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan

Read-Host "Nhan Enter de mo Docker Desktop"
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe" -ErrorAction SilentlyContinue
