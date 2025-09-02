Write-Host "🔄 Restarting backend server..." -ForegroundColor Yellow

# Kill any existing node processes on port 5000
Write-Host "Killing processes on port 5000..." -ForegroundColor Cyan
try {
    $processes = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
    foreach ($processId in $processes) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Write-Host "Killed process $processId" -ForegroundColor Green
    }
} catch {
    Write-Host "No processes found on port 5000" -ForegroundColor Gray
}

# Wait a moment for processes to fully terminate
Start-Sleep -Seconds 2

Write-Host "🚀 Starting server..." -ForegroundColor Green

# Start the server
try {
    node server.js
} catch {
    Write-Host "❌ Failed to start server: $_" -ForegroundColor Red
    exit 1
}
