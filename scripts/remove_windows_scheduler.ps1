# Unregister Windows Scheduled Task for OilTrack Supabase Keep-Alive
$taskName = "OilTrack-Supabase-KeepAlive"

Write-Host "Removing Scheduled Task '$taskName'..." -ForegroundColor Cyan

cmd /c "schtasks /delete /tn $taskName /f" 2>$null

Write-Host "✅ Scheduled Task '$taskName' successfully removed!" -ForegroundColor Green
