# Script quản lý hạ tầng Redis (Dự án MicroServices QLSV)

$REDIS_CONTAINER = "sms_redis"

Write-Host "`n--- Hệ thống Quản lý Hạ tầng MicroServices ---" -ForegroundColor Cyan

# 1. Kiểm tra Docker
if (!(Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host ">>> [ERROR] Không tìm thấy Docker. Bạn cần cài đặt Docker Desktop để chạy Redis tự động." -ForegroundColor Red
    Write-Host ">>> Truy cập: https://www.docker.com/products/docker-desktop/"
    exit
}

# 2. Khởi động Redis
Write-Host ">>> Đang tối ưu hạ tầng (Redis)..." -ForegroundColor Cyan
try {
    # Thử chạy qua Docker Compose nếu có file
    docker-compose up -d redis
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ">>> [WARNING] Docker Compose có lỗi. Thử khởi động container đơn lẻ..." -ForegroundColor Yellow
        docker run --name $REDIS_CONTAINER -p 6379:6379 -d redis:7-alpine
    }
} catch {
    Write-Host ">>> [ERROR] Lỗi không mong muốn khi khởi động Docker." -ForegroundColor Red
}

# 3. Kiểm tra trạng thái kết nối
Write-Host ">>> Đang kiểm tra cổng 6379 (Redis)..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
$socket = New-Object Net.Sockets.TcpClient
$connect = $socket.BeginConnect("127.0.0.1", 6379, $null, $null)
Start-Sleep -Seconds 1

if ($connect.IsCompleted -and $socket.Connected) {
    Write-Host ">>> [SUCCESS] Redis đã sẵn sàng phục vụ cho Microservices!" -ForegroundColor Green
} else {
    Write-Host ">>> [FAIL] Không thể kết nối tới Redis trên cổng 6379. Hãy đảm bảo Docker đang chạy." -ForegroundColor Red
}
$socket.Close()

Write-Host "`n--- HOÀN TẤT ---" -ForegroundColor Green
