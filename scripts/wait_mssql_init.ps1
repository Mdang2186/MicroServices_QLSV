# wait_mssql_init.ps1
# Duoc goi tu start_system.bat - cho container mssql-init hoan thanh

$containerName = "microservices_qlsv-mssql-init-1"
$limit = 45        # So lan kiem tra (moi lan 2 giay = toi da 90 giay)
$done = $false

Write-Host "    Kiem tra container: $containerName" -ForegroundColor Gray

for ($i = 0; $i -lt $limit; $i++) {
    $status = docker inspect --format "{{.State.Status}}" $containerName 2>$null

    if (-not $status) {
        # Container chua ton tai - co the dang duoc tao
        if ($i -lt 5) {
            Write-Host "    Cho container khoi dong... ($($i * 2)s)" -ForegroundColor Gray
            Start-Sleep -Seconds 2
            continue
        } else {
            Write-Host "    [!] Khong tim thay container $containerName" -ForegroundColor Yellow
            break
        }
    }

    if ($status -eq "exited") {
        $exitCode = docker inspect --format "{{.State.ExitCode}}" $containerName 2>$null
        if ($exitCode -eq "0") {
            Write-Host "    [OK] mssql-init hoan thanh thanh cong." -ForegroundColor Green
            $done = $true
        } else {
            Write-Host "    [X] mssql-init that bai (exit code: $exitCode)" -ForegroundColor Red
            Write-Host "    --- LOG mssql-init ---" -ForegroundColor Red
            docker logs $containerName --tail 20 2>&1
            Write-Host "    ----------------------" -ForegroundColor Red
        }
        break
    }

    # Hien thi tien do moi 10 giay
    if ($i -eq 0 -or ($i % 5) -eq 0) {
        Write-Host "    Dang cho mssql-init... $($i * 2)s / 90s  [Status: $status]" -ForegroundColor Gray
    }

    Start-Sleep -Seconds 2
}

if (-not $done -and $status -ne "exited") {
    Write-Host "    [!] mssql-init van dang chay sau 90s - tiep tuc he thong..." -ForegroundColor Yellow
}

exit 0
