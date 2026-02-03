# Start the dev server and keep it running
$ErrorActionPreference = "Continue"

Write-Host "Starting dev server..." -ForegroundColor Green
$process = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -NoNewWindow -PassThru -ErrorAction SilentlyContinue

Write-Host "Server PID: $($process.Id)" -ForegroundColor Yellow

# Wait for the server to start
Start-Sleep -Seconds 5

# Keep the process alive
do {
    if ($process.HasExited) {
        Write-Host "Process exited with code: $($process.ExitCode)" -ForegroundColor Red
        break
    }
    Start-Sleep -Seconds 2
} while ($true)
