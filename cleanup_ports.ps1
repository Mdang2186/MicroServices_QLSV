$ports = 3000, 3001, 3002, 3003, 3004, 3005, 4005
foreach ($port in $ports) {
    $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($conns) {
        foreach ($conn in $conns) {
            try {
                Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
                Write-Host "Killed process on port $port"
            } catch {
                Write-Host "Failed to kill process on port $port"
            }
        }
    }
}
