Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  DON DEP O C - WINDOWS TEMP + NPM CACHE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# --- Kiem tra dung luong truoc ---
$drive = Get-PSDrive C
$freeBefore = [math]::Round($drive.Free / 1GB, 3)
Write-Host "O C truoc khi don: $freeBefore GB con lai" -ForegroundColor Yellow
Write-Host ""

# --- 1. Xoa User Temp ---
Write-Host "[1] Xoa thu muc Temp nguoi dung..." -ForegroundColor Yellow
$userTemp = $env:TEMP
$count = 0
Get-ChildItem -Path $userTemp -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue; $count++ } catch {}
}
Write-Host "    Da xoa $count muc trong $userTemp" -ForegroundColor Green

# --- 2. Xoa Windows Temp ---
Write-Host "[2] Xoa Windows Temp..." -ForegroundColor Yellow
$winTemp = "C:\Windows\Temp"
$count2 = 0
Get-ChildItem -Path $winTemp -ErrorAction SilentlyContinue | ForEach-Object {
    try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue; $count2++ } catch {}
}
Write-Host "    Da xoa $count2 muc trong $winTemp" -ForegroundColor Green

# --- 3. Xoa npm cache ---
Write-Host "[3] Xoa npm cache..." -ForegroundColor Yellow
$npmCache = "$env:LOCALAPPDATA\npm-cache"
if (Test-Path $npmCache) {
    $size = (Get-ChildItem $npmCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeGB = [math]::Round($size / 1GB, 2)
    Write-Host "    npm-cache hien chiem $sizeGB GB" -ForegroundColor Gray
    npm cache clean --force 2>&1 | Out-Null
    Write-Host "    Da don npm cache" -ForegroundColor Green
} else {
    Write-Host "    Khong tim thay npm cache" -ForegroundColor Gray
}

# --- 4. Xoa Windows Update Cache ---
Write-Host "[4] Xoa Windows Update Download Cache..." -ForegroundColor Yellow
$wuCache = "C:\Windows\SoftwareDistribution\Download"
if (Test-Path $wuCache) {
    $size = (Get-ChildItem $wuCache -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
    $sizeGB = [math]::Round($size / 1GB, 2)
    Write-Host "    Windows Update cache: $sizeGB GB" -ForegroundColor Gray
    Get-ChildItem -Path $wuCache -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "    Da don Windows Update cache" -ForegroundColor Green
}

# --- 5. Xoa Internet Explorer / Edge cache ---
Write-Host "[5] Xoa IE/Edge cache..." -ForegroundColor Yellow
$ieCache = "$env:LOCALAPPDATA\Microsoft\Windows\INetCache"
if (Test-Path $ieCache) {
    Get-ChildItem -Path $ieCache -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "    Da don IE/Edge cache" -ForegroundColor Green
}

# --- 6. Xoa Prefetch ---
Write-Host "[6] Xoa Prefetch..." -ForegroundColor Yellow
$prefetch = "C:\Windows\Prefetch"
if (Test-Path $prefetch) {
    Get-ChildItem -Path $prefetch -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "    Da don Prefetch" -ForegroundColor Green
}

# --- 7. Xoa Thumbnails cache ---
Write-Host "[7] Xoa Thumbnails cache..." -ForegroundColor Yellow
$thumbCache = "$env:LOCALAPPDATA\Microsoft\Windows\Explorer"
if (Test-Path $thumbCache) {
    Get-ChildItem -Path $thumbCache -Filter "thumbcache_*.db" -ErrorAction SilentlyContinue | ForEach-Object {
        try { Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue } catch {}
    }
    Write-Host "    Da don Thumbnails" -ForegroundColor Green
}

# --- Ket qua ---
Write-Host ""
$drive2 = Get-PSDrive C
$freeAfter = [math]::Round($drive2.Free / 1GB, 3)
$freed = [math]::Round($freeAfter - $freeBefore, 3)
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  KET QUA:" -ForegroundColor Cyan
Write-Host "  Truoc: $freeBefore GB | Sau: $freeAfter GB | Giai phong: +$freed GB" -ForegroundColor Green
Write-Host "================================================================" -ForegroundColor Cyan

# --- Phan tich cac thu muc con lai lon ---
Write-Host ""
Write-Host "=== CAC THU MUC LON HIEN CON TREN O C ===" -ForegroundColor Cyan
$bigFolders = @(
    @{P="$env:LOCALAPPDATA\Docker"; N="Docker WSL (AppData)"},
    @{P="C:\ProgramData\Docker"; N="Docker ProgramData"},
    @{P="$env:LOCALAPPDATA\npm-cache"; N="npm cache"},
    @{P="$env:USERPROFILE\.docker"; N=".docker config"},
    @{P="C:\Users\Admin\Downloads"; N="Downloads"},
    @{P="C:\Program Files"; N="Program Files"},
    @{P="C:\Program Files (x86)"; N="Program Files (x86)"},
    @{P="C:\Windows\WinSxS"; N="Windows WinSxS"},
    @{P="C:\Users\Admin\AppData\Local\Programs"; N="AppData Programs"}
)
foreach ($item in $bigFolders) {
    if (Test-Path $item.P) {
        $bytes = (Get-ChildItem $item.P -Recurse -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum -ErrorAction SilentlyContinue).Sum
        $gb = [math]::Round($bytes / 1GB, 2)
        if ($gb -ge 0.5) {
            $bar = "#" * [math]::Min([int]($gb * 2), 40)
            Write-Host ("  {0,-30} {1,7} GB  {2}" -f $item.N, $gb, $bar)
        }
    }
}
Write-Host ""
Write-Host "Goi y: Thu muc Docker WSL la lon nhat - chuyen sang o D de tiet kiem!" -ForegroundColor Yellow
