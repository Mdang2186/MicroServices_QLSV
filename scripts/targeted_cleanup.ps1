Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DON DEP DOCKER - CHI GIU LAI NHUNG GI CAN THIET" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# --- Danh sach IMAGE can giu ---
# Project dung: mssql:2022-CU18, redis:7-alpine, cloudflared:latest
# User muon giu: postgres (cho minh_postgres)
# Microservices QLSV images: tat ca microservices_qlsv-*
$keepImages = @(
    "mcr.microsoft.com/mssql/server",   # SQL Server - DB chinh
    "redis",                             # Redis cache
    "cloudflare/cloudflared",           # Cloudflare tunnel
    "postgres",                          # minh_postgres (user yeu cau giu)
    "microservices_qlsv"                # Tat ca microservice images
)

Write-Host "=== [GIU LAI] Cac image quan trong ===" -ForegroundColor Green
foreach ($img in $keepImages) {
    Write-Host "  [GIU] $img" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== [XOA] Cac container khong can ===" -ForegroundColor Red

# --- XOA container cu khong can ---
$removeContainers = @(
    "sms_postgres",    # Container postgres cu (10 ngay truoc), trung voi mssql cua project
    "sms_redis"        # Container redis cu (10 ngay truoc), trung voi redis cua project
)

foreach ($c in $removeContainers) {
    $exists = docker ps -a --filter "name=^${c}$" --format "{{.Names}}" 2>$null
    if ($exists) {
        Write-Host "  Xoa container: $c" -ForegroundColor Yellow
        docker rm -f $c 2>&1 | Out-Null
        Write-Host "  [OK] Da xoa: $c" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Khong tim thay container: $c" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "=== [XOA] Cac image khong can ===" -ForegroundColor Red

# --- XOA image theo ID cu the ---
# Danh sach image can xoa (dua tren phan tich):
$removeImageSpecs = @(
    @{ Repo="curlimages/curl";                  Tag="latest";                   Reason="Tool test tam, khong dung trong project" },
    @{ Repo="mcr.microsoft.com/mssql/server";   Tag="2022-latest";              Reason="Phien ban MSSQL cu (2 thang truoc), project dung 2022-CU18" },
    @{ Repo="postgres";                          Tag="15-alpine";                Reason="Dung cho sms_postgres da xoa, khong can nua" },
    @{ Repo="microservices_qlsv-db-push";       Tag="latest";                   Reason="Chi chay 1 lan de tao DB, co the xoa sau khi DB da khoi tao" },
    @{ Repo="mcr.microsoft.com/mssql-tools";    Tag="latest";                   Reason="mssql-tools image (chi dung cho mssql-init 1 lan)" }
)

$totalFreed = 0

foreach ($img in $removeImageSpecs) {
    $fullName = "$($img.Repo):$($img.Tag)"
    $exists = docker images "$($img.Repo)" --filter "reference=$fullName" --format "{{.ID}}" 2>$null
    if (-not $exists) {
        # Thu tim khong co tag
        $exists = docker images --format "{{.Repository}}:{{.Tag}}\t{{.ID}}" 2>$null | 
                  Where-Object { $_ -match [regex]::Escape($img.Repo) -and $_ -match [regex]::Escape($img.Tag) }
    }
    if ($exists) {
        Write-Host "  Xoa: $fullName" -ForegroundColor Yellow
        Write-Host "       Ly do: $($img.Reason)" -ForegroundColor Gray
        docker rmi $fullName -f 2>&1 | Out-Null
        Write-Host "  [OK] Da xoa: $fullName" -ForegroundColor Green
    } else {
        Write-Host "  [SKIP] Khong tim thay: $fullName" -ForegroundColor Gray
    }
}

# --- Xoa dangling images (image khong co ten, la rac tu qua trinh build) ---
Write-Host ""
Write-Host "[Bonus] Xoa dangling images (rac build)..." -ForegroundColor Yellow
docker image prune -f 2>&1

# --- Ket qua ---
Write-Host ""
Write-Host "=== DANH SACH IMAGE CON LAI ===" -ForegroundColor Cyan
docker images

Write-Host ""
Write-Host "=== DANH SACH CONTAINER CON LAI ===" -ForegroundColor Cyan
docker ps -a --format "table {{.Names}}`t{{.Image}}`t{{.Status}}`t{{.Ports}}"

Write-Host ""
Write-Host "=== TONG DUNG LUONG DOCKER HIEN TAI ===" -ForegroundColor Cyan
docker system df

Write-Host ""
Write-Host "=== DUNG LUONG O C ===" -ForegroundColor Cyan
$drive = Get-PSDrive C
$freeGB = [math]::Round($drive.Free / 1GB, 2)
$usedGB = [math]::Round($drive.Used / 1GB, 2)
Write-Host "  Con lai: $freeGB GB  |  Dang dung: $usedGB GB" -ForegroundColor Yellow

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  HOAN TAT DON DEP!" -ForegroundColor Green
Write-Host "  Tiep theo: Chuyen Docker WSL sang o D de tiet kiem them ~20GB" -ForegroundColor Yellow
Write-Host "  Chay: scripts\move_docker_wsl_to_D.ps1 (voi quyen Admin)" -ForegroundColor Yellow
Write-Host "================================================================" -ForegroundColor Cyan
