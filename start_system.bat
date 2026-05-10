@echo off
cd /d "%~dp0"
chcp 65001 >nul 2>&1

echo ================================================================
echo   START MICROSERVICES SYSTEM
echo ================================================================

REM ---------------------------------------------------------------
REM [0] Kiem tra dung luong o C
REM ---------------------------------------------------------------
echo.
echo [0] Kiem tra dung luong o C...
for /f "tokens=3" %%a in ('dir /-c C:\ 2^>nul ^| find "bytes free"') do set FREE_BYTES=%%a
powershell -NoProfile -Command "$free=[math]::Round((Get-PSDrive C).Free/1GB,2); Write-Host \"    O C con lai: $free GB\"; if($free -lt 2){ Write-Host ''; Write-Host '  [!!!] CANH BAO: O C chi con duoi 2GB! Chay scripts\clean_docker.bat truoc!' -ForegroundColor Red; exit 1 } elseif($free -lt 10){ Write-Host '  [!] Canh bao: O C duoi 10GB, nen don dep Docker som.' -ForegroundColor Yellow }"
if %ERRORLEVEL% EQU 1 (
    echo.
    echo [X] Dung lai. Chay scripts\clean_docker.bat truoc de giai phong o C!
    pause
    exit /b 1
)

REM ---------------------------------------------------------------
REM [1] Kiem tra Docker
REM ---------------------------------------------------------------
echo.
echo [1] Kiem tra Docker...
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] LOI: Docker chua chay!
    echo     Hay mo Docker Desktop va doi Engine running roi chay lai.
    pause
    exit /b 1
)
echo     Docker OK.

REM ---------------------------------------------------------------
REM [2] Khoi dong infrastructure (mssql + redis + mssql-init)
REM ---------------------------------------------------------------
echo.
echo [2] Starting infrastructure ^(mssql + redis + mssql-init^)...
docker compose up -d mssql redis mssql-init 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo     [!] "docker compose" that bai, thu voi "docker-compose"...
    docker-compose up -d mssql redis mssql-init 2>&1
)

REM ---------------------------------------------------------------
REM [2b] Cho mssql-init hoan thanh (dung script rieng tranh loi %)
REM ---------------------------------------------------------------
echo.
echo [2b] Cho mssql-init hoan thanh ^(toi da 90 giay^)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\wait_mssql_init.ps1"

REM ---------------------------------------------------------------
REM [3] Xoa tunnel Cloudflare cu
REM ---------------------------------------------------------------
echo.
echo [3] Removing old Cloudflare containers...
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin >nul 2>&1
echo     Done.

REM ---------------------------------------------------------------
REM [4] Tao tunnel moi
REM ---------------------------------------------------------------
echo.
echo [4] Starting Cloudflare tunnels...
docker run -d --name qlsv-cf-api    --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:3000 >nul
docker run -d --name qlsv-cf-portal --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4000 >nul
docker run -d --name qlsv-cf-admin  --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://host.docker.internal:4005 >nul
echo     3 tunnels started.

REM ---------------------------------------------------------------
REM [5] Lay public URLs (dung script rieng tranh loi %)
REM ---------------------------------------------------------------
echo.
echo [5] Getting public URLs ^(waiting up to 30 seconds^)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\get_tunnel_urls.ps1"

REM ---------------------------------------------------------------
echo.
echo ================================================================
echo   DONE! He thong dang chay.
echo   Nhan phim bat ky de thoat cua so nay.
echo ================================================================
pause
