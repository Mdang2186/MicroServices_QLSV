# Script quan ly ha tang Docker: SQL Server + Redis

Write-Host "`n--- He thong Quan ly Ha tang MicroServices ---" -ForegroundColor Cyan

if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host ">>> [ERROR] Khong tim thay Docker. Ban can cai Docker Desktop." -ForegroundColor Red
    Write-Host ">>> Truy cap: https://www.docker.com/products/docker-desktop/"
    exit 1
}

function Invoke-Compose {
    param([string[]]$ComposeArgs)

    docker compose @ComposeArgs
    if ($LASTEXITCODE -eq 0) {
        return
    }

    if (Get-Command docker-compose -ErrorAction SilentlyContinue) {
        docker-compose @ComposeArgs
    }
}

function Test-Port {
    param(
        [string]$HostName,
        [int]$Port
    )

    $socket = New-Object Net.Sockets.TcpClient
    try {
        $connect = $socket.BeginConnect($HostName, $Port, $null, $null)
        $ready = $connect.AsyncWaitHandle.WaitOne(1500, $false)
        return ($ready -and $socket.Connected)
    } finally {
        $socket.Close()
    }
}

Write-Host ">>> Dang khoi dong SQL Server, Redis va buoc tao database..." -ForegroundColor Cyan
Invoke-Compose @("up", "-d", "mssql", "redis", "mssql-init")

if ($LASTEXITCODE -ne 0) {
    Write-Host ">>> [ERROR] Docker Compose khoi dong that bai." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host ">>> Dang cho SQL Server va Redis san sang..." -ForegroundColor Cyan
Start-Sleep -Seconds 8

$redisReady = Test-Port "127.0.0.1" 6379
$mssqlReady = Test-Port "127.0.0.1" 1433

if ($redisReady) {
    Write-Host ">>> [SUCCESS] Redis san sang tai localhost:6379" -ForegroundColor Green
} else {
    Write-Host ">>> [FAIL] Redis chua san sang tren cong 6379." -ForegroundColor Red
}

if ($mssqlReady) {
    Write-Host ">>> [SUCCESS] SQL Server san sang tai localhost:1433" -ForegroundColor Green
} else {
    Write-Host ">>> [FAIL] SQL Server chua san sang tren cong 1433." -ForegroundColor Red
}

Write-Host "`n--- HOAN TAT ---" -ForegroundColor Green
