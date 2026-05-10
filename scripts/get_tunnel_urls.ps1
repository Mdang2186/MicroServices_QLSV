# get_tunnel_urls.ps1
# Duoc goi tu start_system.bat - lay URL tu 3 Cloudflare tunnel

$labels = @("API Gateway", "Web Portal", "Web Admin")
$names  = @("qlsv-cf-api", "qlsv-cf-portal", "qlsv-cf-admin")
$results = @{}

Write-Host "    Dang doi Cloudflare tunnel URL..." -ForegroundColor Gray

for ($i = 0; $i -lt 30; $i++) {
    for ($j = 0; $j -lt 3; $j++) {
        $label = $labels[$j]
        if ($results.ContainsKey($label)) { continue }

        $log = docker logs $names[$j] 2>&1 | Out-String
        if ($log -match "https://[-a-zA-Z0-9]+\.trycloudflare\.com") {
            $results[$label] = $Matches[0]
        }
    }

    if ($results.Count -eq 3) { break }
    Start-Sleep -Seconds 1
}

Write-Host ""
if ($results.Count -gt 0) {
    Write-Host "================================================================" -ForegroundColor Cyan
    Write-Host "  PUBLIC URLs:" -ForegroundColor Cyan
    foreach ($label in $labels) {
        $url = if ($results.ContainsKey($label)) { $results[$label] } else { "[Chua lay duoc - thu lai sau]" }
        Write-Host "  $label  =>  $url" -ForegroundColor Yellow
    }
    Write-Host "================================================================" -ForegroundColor Cyan

    $apiUrl = $results["API Gateway"]
    if ($apiUrl) {
        Write-Host ""
        Write-Host "  Mo trinh duyet: $apiUrl/api-docs" -ForegroundColor Green
        Start-Process ($apiUrl + "/api-docs")
    }
} else {
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host "  [X] Khong lay duoc bat ky URL nao sau 30 giay." -ForegroundColor Red
    Write-Host "================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "  --- LOG qlsv-cf-api (15 dong cuoi) ---" -ForegroundColor Yellow
    docker logs qlsv-cf-api --tail 15 2>&1
    Write-Host "  --------------------------------------" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Goi y: Cloudflare co the dang chan (Rate Limit)." -ForegroundColor Yellow
    Write-Host "         Hay doi 5 phut roi chay lai start_system.bat" -ForegroundColor Yellow
}
