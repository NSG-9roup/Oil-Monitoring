# Setup Windows Scheduled Task for OilTrack Supabase Keep-Alive
param(
    [string]$Schedule = "DAILY", # DAILY or ONLOGON
    [string]$Time = "10:00"
)

$taskName = "OilTrack-Supabase-KeepAlive"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$vbsPath = Join-Path $scriptDir "keep_alive_silent.vbs"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "  OilTrack: Setup Windows Scheduled Task (Supabase)" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

if (-not (Test-Path $vbsPath)) {
    Write-Error "File not found: $vbsPath"
    exit 1
}

# Delete any existing task
cmd /c "schtasks /delete /tn $taskName /f" 2>$null | Out-Null

# Create new task that runs silently via wscript.exe
$targetCmd = "wscript.exe `"$vbsPath`""
$createCmd = "schtasks /create /tn $taskName /tr `"$targetCmd`" /sc daily /st $Time /f"

Write-Host "Registering task: $taskName (Daily at $Time)..." -ForegroundColor Yellow
$result = cmd /c $createCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Scheduled Task '$taskName' successfully created!" -ForegroundColor Green
    Write-Host "🕒 Schedule: Runs every day at $Time automatically in the background." -ForegroundColor White
    Write-Host "📄 Log file: scripts\keep_alive.log" -ForegroundColor White
    Write-Host "`nTesting task execution..." -ForegroundColor Cyan

    cmd /c "schtasks /run /tn $taskName" | Out-Null
    Start-Sleep -Seconds 3

    Write-Host "✅ Test run triggered. Supabase is now refreshed!" -ForegroundColor Green
} else {
    Write-Host "`n❌ Failed to create scheduled task. Code: $LASTEXITCODE" -ForegroundColor Red
}
