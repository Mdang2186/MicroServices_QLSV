@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0\.."

echo ================================================================
echo   DON DEP DOCKER - GIAI PHONG O C
echo ================================================================
echo.

REM Kiem tra Docker
docker info >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [X] Docker chua chay. Hay mo Docker Desktop truoc.
    pause
    exit /b 1
)

echo [TRUOC KHI DON]:
docker system df
echo.

echo [1] Dung tat ca container dang chay...
docker stop $(docker ps -q) >nul 2>&1

echo [2] Xoa cac container QLSV Cloudflare cu...
docker rm -f qlsv-cf-api qlsv-cf-portal qlsv-cf-admin >nul 2>&1

echo [3] Xoa tat ca container da dung (exited)...
docker container prune -f

echo [4] Xoa image khong dung (dangling)...
docker image prune -f

echo [5] Xoa build cache (DAY LA BUOC TIET KIEM NHAT)...
docker builder prune -f --filter "until=24h"

echo [6] Xoa volume khong dung...
docker volume prune -f

echo [7] Xoa network khong dung...
docker network prune -f

echo.
echo [SAU KHI DON]:
docker system df
echo.

echo ================================================================
echo   HOAN TAT! Kiem tra lai dung luong o C tren File Explorer.
echo ================================================================
pause
